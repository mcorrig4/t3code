import { registerServiceWorker } from "../../pwa";

export function installPwaBootstrap(): void {
  void registerServiceWorker();
}
