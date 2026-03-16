import { isElectron } from "./env";
import {
  PUSH_SERVICE_WORKER_PATH as SERVICE_WORKER_PATH,
  PUSH_SERVICE_WORKER_SCOPE as SERVICE_WORKER_SCOPE,
  registerPushServiceWorker,
} from "./notifications/registerServiceWorker";

export { SERVICE_WORKER_PATH, SERVICE_WORKER_SCOPE };

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
    await registerPushServiceWorker();
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn("Service worker registration failed", error);
    }
  }
}
