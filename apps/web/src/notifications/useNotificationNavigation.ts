import { useEffect } from "react";
import { scopeThreadRef } from "@t3tools/client-runtime";
import type { ThreadId } from "@t3tools/contracts";
import { useRouter } from "@tanstack/react-router";

import { usePrimaryEnvironmentId } from "../environments/primary";
import { buildThreadRouteParams } from "../threadRoutes";

export function useNotificationNavigation(): void {
  const router = useRouter();
  const primaryEnvironmentId = usePrimaryEnvironmentId();

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !primaryEnvironmentId) {
      return;
    }

    function navigateToThread(threadId: string, replace = false): void {
      const threadRef = scopeThreadRef(primaryEnvironmentId, threadId as ThreadId);
      void router.navigate({
        to: "/$environmentId/$threadId",
        params: buildThreadRouteParams(threadRef),
        replace,
      });
    }

    function handleMessage(event: MessageEvent): void {
      if (
        event.data &&
        typeof event.data === "object" &&
        event.data.type === "notification-navigate"
      ) {
        if (typeof event.data.threadId === "string" && event.data.threadId.length > 0) {
          navigateToThread(event.data.threadId);
          return;
        }
        if (typeof event.data.url === "string") {
          void router.navigate({ to: event.data.url });
        }
      }
    }

    navigator.serviceWorker.addEventListener("message", handleMessage);
    return () => {
      navigator.serviceWorker.removeEventListener("message", handleMessage);
    };
  }, [primaryEnvironmentId, router]);

  useEffect(() => {
    if (!primaryEnvironmentId) {
      return;
    }

    const url = new URL(window.location.href);
    const threadId = url.searchParams.get("notificationThreadId");
    if (!threadId) {
      return;
    }

    const threadRef = scopeThreadRef(primaryEnvironmentId, threadId as ThreadId);
    void router.navigate({
      to: "/$environmentId/$threadId",
      params: buildThreadRouteParams(threadRef),
      replace: true,
    });
  }, [primaryEnvironmentId, router]);
}
