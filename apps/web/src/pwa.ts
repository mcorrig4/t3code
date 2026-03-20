import { useSyncExternalStore } from "react";
import { isElectron } from "./env";
import { useMediaQuery } from "./hooks/useMediaQuery";
import {
  PUSH_SERVICE_WORKER_PATH as SERVICE_WORKER_PATH,
  PUSH_SERVICE_WORKER_SCOPE as SERVICE_WORKER_SCOPE,
  registerPushServiceWorker,
} from "./notifications/registerServiceWorker";

export { SERVICE_WORKER_PATH, SERVICE_WORKER_SCOPE };

const PWA_DISPLAY_MODE_QUERIES = [
  "(display-mode: standalone)",
  "(display-mode: fullscreen)",
  "(display-mode: minimal-ui)",
] as const;

type NavigatorWithStandalone = Navigator & {
  standalone?: boolean;
};

export function shouldRegisterServiceWorker(input: {
  readonly isElectron: boolean;
  readonly hasServiceWorkerApi: boolean;
  readonly protocol: string;
}): boolean {
  if (input.isElectron || !input.hasServiceWorkerApi) {
    return false;
  }

  return input.protocol === "http:" || input.protocol === "https:";
}

export function isStandalonePwa(input: {
  readonly matchesDisplayMode: boolean;
  readonly isIosStandalone: boolean;
}): boolean {
  return input.matchesDisplayMode || input.isIosStandalone;
}

export function shouldHideHeaderOpenInPicker(input: {
  readonly isStandalonePwa: boolean;
  readonly isCompactTouchViewport: boolean;
}): boolean {
  return input.isStandalonePwa && input.isCompactTouchViewport;
}

function getServerSnapshot(): boolean {
  return false;
}

function getStandalonePwaSnapshot(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return isStandalonePwa({
    matchesDisplayMode: PWA_DISPLAY_MODE_QUERIES.some((query) => window.matchMedia(query).matches),
    isIosStandalone: (window.navigator as NavigatorWithStandalone).standalone === true,
  });
}

function subscribeStandalonePwa(listener: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const mediaQueries = PWA_DISPLAY_MODE_QUERIES.map((query) => window.matchMedia(query));
  for (const mediaQuery of mediaQueries) {
    mediaQuery.addEventListener("change", listener);
  }

  window.addEventListener("pageshow", listener);

  return () => {
    for (const mediaQuery of mediaQueries) {
      mediaQuery.removeEventListener("change", listener);
    }
    window.removeEventListener("pageshow", listener);
  };
}

export function useIsStandalonePwa(): boolean {
  return useSyncExternalStore(subscribeStandalonePwa, getStandalonePwaSnapshot, getServerSnapshot);
}

export function useShouldHideHeaderOpenInPicker(): boolean {
  const isStandalone = useIsStandalonePwa();
  const isCompactTouchViewport = useMediaQuery({ max: "md", pointer: "coarse" });

  return shouldHideHeaderOpenInPicker({
    isStandalonePwa: isStandalone,
    isCompactTouchViewport,
  });
}

export async function registerServiceWorker(): Promise<void> {
  if (
    !shouldRegisterServiceWorker({
      isElectron,
      hasServiceWorkerApi: "serviceWorker" in navigator,
      protocol: window.location.protocol,
    })
  ) {
    return;
  }

  try {
    // Service worker lifecycle is the standards-based app upgrade path.
    // Manifest metadata may refresh lazily, especially on iOS.
    await registerPushServiceWorker();
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn("Service worker registration failed", error);
    }
  }
}
