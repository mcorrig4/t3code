import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";

/**
 * Listens for `notification-navigate` messages from the service worker
 * and performs client-side navigation via TanStack Router.
 *
 * iOS Safari does not support `WindowClient.navigate()` in service workers,
 * so the notificationclick handler sends a postMessage instead. This hook
 * picks up that message and drives the in-app router to the target URL.
 */
export function useNotificationNavigation(): void {
  const router = useRouter();

  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    function handleMessage(event: MessageEvent): void {
      if (
        event.data &&
        typeof event.data === "object" &&
        event.data.type === "notification-navigate" &&
        typeof event.data.url === "string"
      ) {
        void router.navigate({ to: event.data.url });
      }
    }

    navigator.serviceWorker.addEventListener("message", handleMessage);
    return () => {
      navigator.serviceWorker.removeEventListener("message", handleMessage);
    };
  }, [router]);
}
