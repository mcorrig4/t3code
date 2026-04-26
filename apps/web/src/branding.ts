import type { DesktopAppBranding } from "@t3tools/contracts";
import { resolveAppBranding } from "@t3tools/shared/branding";

function readInjectedDesktopAppBranding(): DesktopAppBranding | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.desktopBridge?.getAppBranding?.() ?? null;
}

function readRuntimeWebBranding(): DesktopAppBranding | null {
  if (typeof window === "undefined") {
    return null;
  }

  const branding = resolveAppBranding(window.location.hostname);
  if (!branding.hostVariant) {
    return null;
  }

  return {
    baseName: "T3 Code",
    stageLabel: "Dev",
    displayName: branding.applicationName,
  };
}

const injectedDesktopAppBranding = readInjectedDesktopAppBranding();
const runtimeWebBranding = readRuntimeWebBranding();
const appBranding = injectedDesktopAppBranding ?? runtimeWebBranding;

export const APP_BASE_NAME = appBranding?.baseName ?? "T3 Code";
export const APP_STAGE_LABEL = appBranding?.stageLabel ?? (import.meta.env.DEV ? "Dev" : "Alpha");
export const APP_DISPLAY_NAME = appBranding?.displayName ?? `${APP_BASE_NAME} (${APP_STAGE_LABEL})`;
export const APP_VERSION = import.meta.env.APP_VERSION || "0.0.0";
