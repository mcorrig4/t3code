import { isElectron } from "./env";

export const SERVICE_WORKER_PATH = "/sw.js";
export const SERVICE_WORKER_SCOPE = "/";

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
    await navigator.serviceWorker.register(SERVICE_WORKER_PATH, {
      scope: SERVICE_WORKER_SCOPE,
    });
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn("Service worker registration failed", error);
    }
  }
}
