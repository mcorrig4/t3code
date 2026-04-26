import { isElectron } from "../env";

export function isPushSupported(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }

  if (isElectron || !window.isSecureContext) {
    return false;
  }

  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export function canRequestNotificationPermission(): boolean {
  return isPushSupported() && Notification.permission === "default";
}
