export const PUSH_SERVICE_WORKER_PATH = "/sw.js";
export const PUSH_SERVICE_WORKER_SCOPE = "/";

export async function registerPushServiceWorker(): Promise<ServiceWorkerRegistration> {
  const registration = await navigator.serviceWorker.register(PUSH_SERVICE_WORKER_PATH, {
    scope: PUSH_SERVICE_WORKER_SCOPE,
  });

  await navigator.serviceWorker.ready;
  return registration;
}
