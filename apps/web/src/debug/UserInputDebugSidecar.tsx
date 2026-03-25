import { useEffect } from "react";

import { UserInputDebugPanel } from "../components/debug/UserInputDebugPanel";
import { logUserInputDebug } from "./userInputDebug";

function withDetail(detail: string | undefined): { detail: string } | undefined {
  return typeof detail === "string" ? { detail } : undefined;
}

export function UserInputDebugSidecar() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      logUserInputDebug({
        level: "error",
        stage: "window-error",
        message: event.message || "Unhandled window error",
        ...withDetail(
          event.error instanceof Error
            ? (event.error.stack ?? event.error.message)
            : typeof event.error === "string"
              ? event.error
              : undefined,
        ),
      });
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      logUserInputDebug({
        level: "error",
        stage: "unhandled-rejection",
        message:
          reason instanceof Error
            ? reason.message
            : typeof reason === "string"
              ? reason
              : "Unhandled promise rejection",
        ...withDetail(
          reason instanceof Error
            ? (reason.stack ?? reason.message)
            : typeof reason === "string"
              ? reason
              : undefined,
        ),
      });
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return <UserInputDebugPanel />;
}
