import { resolveAppBranding } from "@t3tools/shared/branding";

import { registerServiceWorker } from "../../pwa";
import { applyRuntimeBranding } from "../../runtimeBranding";

const APP_BOOT_MIN_DURATION_MS = 320;
const APP_BOOT_FAIL_SAFE_MS = 2500;
type IconSet = {
  readonly appleTouchIcon: string;
  readonly favicon16: string;
  readonly favicon32: string;
  readonly faviconIco: string;
};

export interface ForkWebBootstrapInput {
  readonly doc: Document;
  readonly hostname: string;
}

export interface ForkWebShellHandle {
  readonly bootReady: Promise<void>;
}

export function installForkWebShell(input: ForkWebBootstrapInput): ForkWebShellHandle {
  applyHostBranding(input.doc, input.hostname);
  void registerServiceWorker();

  const bootReady = Promise.all([waitForInitialFrame(), delay(APP_BOOT_MIN_DURATION_MS)])
    .catch(() => undefined)
    .finally(() => {
      dismissBootShell(input.doc);
    });

  window.setTimeout(() => {
    dismissBootShell(input.doc);
  }, APP_BOOT_FAIL_SAFE_MS);

  return { bootReady };
}

function applyHostBranding(doc: Document, hostname: string): void {
  const branding = resolveAppBranding(hostname);
  const icons: IconSet = {
    appleTouchIcon: branding.appleTouchIconAssetPath,
    favicon16: branding.favicon16AssetPath,
    favicon32: branding.favicon32AssetPath,
    faviconIco: branding.faviconIcoAssetPath,
  };

  applyRuntimeBranding(doc, hostname);
  setLinkHref(doc, "app-apple-touch-icon", icons.appleTouchIcon);
  setLinkHref(doc, "app-favicon-16", icons.favicon16);
  setLinkHref(doc, "app-favicon-32", icons.favicon32);
  setLinkHref(doc, "app-favicon-ico", icons.faviconIco);
}

function setLinkHref(doc: Document, id: string, href: string): void {
  const link = doc.getElementById(id);
  if (link instanceof HTMLLinkElement) {
    link.href = href;
  }
}

function waitForInitialFrame(): Promise<void> {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve());
    });
  });
}

function dismissBootShell(doc: Document): void {
  const bootShell = doc.getElementById("boot-shell");
  if (!(bootShell instanceof HTMLElement) || bootShell.dataset.state === "dismissed") {
    return;
  }

  bootShell.dataset.state = "dismissed";
  window.setTimeout(() => {
    bootShell.remove();
  }, 220);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
