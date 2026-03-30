import type { ForkWebBootstrapInput } from "./brandingBootstrap";
import {
  initializeCrashDebugSession,
  logCrashBreadcrumb,
  logCrashBreadcrumbLazy,
  setCrashSessionDisposition,
} from "../../debug/crashDebug";

let debugBootstrapInstalled = false;

function withDetail(detail: string | undefined): { detail: string } | undefined {
  return typeof detail === "string" ? { detail } : undefined;
}

export function installDebugBootstrap(_input: ForkWebBootstrapInput): void {
  if (debugBootstrapInstalled || typeof window === "undefined") {
    return;
  }

  debugBootstrapInstalled = true;
  initializeCrashDebugSession();

  const onError = (event: ErrorEvent) => {
    logCrashBreadcrumb({
      level: "error",
      stage: "window-error",
      message: event.message || "Unhandled window error",
      route: `${window.location.pathname}${window.location.search}${window.location.hash}`,
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
    logCrashBreadcrumb({
      level: "error",
      stage: "unhandled-rejection",
      message:
        reason instanceof Error
          ? reason.message
          : typeof reason === "string"
            ? reason
            : "Unhandled promise rejection",
      route: `${window.location.pathname}${window.location.search}${window.location.hash}`,
      ...withDetail(
        reason instanceof Error
          ? (reason.stack ?? reason.message)
          : typeof reason === "string"
            ? reason
            : undefined,
      ),
    });
  };

  const onPageShow = (event: PageTransitionEvent) => {
    logCrashBreadcrumb({
      level: "info",
      stage: "page-show",
      message: event.persisted ? "Page restored from back-forward cache." : "Page shown.",
    });
  };

  const onPageHide = (event: PageTransitionEvent) => {
    logCrashBreadcrumb({
      level: "info",
      stage: "page-hide",
      message: event.persisted ? "Page hidden into back-forward cache." : "Page hidden.",
    });
    setCrashSessionDisposition("clean-exit");
  };

  const onVisibilityChange = () => {
    logCrashBreadcrumb({
      level: "info",
      stage: "visibility-change",
      message: `Document visibility changed to ${document.visibilityState}.`,
    });
  };

  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onUnhandledRejection);
  window.addEventListener("pageshow", onPageShow);
  window.addEventListener("pagehide", onPageHide);
  document.addEventListener("visibilitychange", onVisibilityChange);

  logCrashBreadcrumbLazy(() => ({
    level: "info",
    stage: "debug-bootstrap-installed",
    message: "Fork debug bootstrap installed crash listeners.",
  }));
}
