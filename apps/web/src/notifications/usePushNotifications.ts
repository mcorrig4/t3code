import { useCallback, useEffect, useState } from "react";

import { APP_VERSION } from "../branding";
import { useAppSettings } from "../appSettings";
import {
  decodeBase64UrlPublicKey,
  deleteSubscription,
  fetchWebPushConfig,
  putSubscription,
} from "./client";
import { canRequestNotificationPermission, isPushSupported } from "./pushSupport";
import { registerPushServiceWorker } from "./registerServiceWorker";

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
}

function asSubscriptionJson(subscription: PushSubscription): PushSubscriptionJSON | null {
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return null;
  }
  return json;
}

export function usePushNotifications() {
  const { settings, updateSettings } = useAppSettings();
  const supported = isPushSupported();
  const [serverEnabled, setServerEnabled] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const permission = supported ? Notification.permission : "unsupported";

  const refreshSubscriptionState = useCallback(async () => {
    if (!supported) {
      setSubscribed(false);
      return null;
    }

    const registration = await registerPushServiceWorker();
    const subscription = await registration.pushManager.getSubscription();
    setSubscribed(subscription !== null);
    return subscription;
  }, [supported]);

  const loadServerConfig = useCallback(async () => {
    const config = await fetchWebPushConfig();
    setServerEnabled(config.enabled);
    return config;
  }, []);

  const enable = useCallback(async () => {
    if (!supported) {
      setError("Push notifications are not supported in this browser.");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const config = await loadServerConfig();
      if (!config.enabled) {
        updateSettings({ pushNotificationsEnabled: false });
        setSubscribed(false);
        throw new Error("Web push notifications are not configured on this server.");
      }

      const registration = await registerPushServiceWorker();
      const nextPermission = await Notification.requestPermission();
      if (nextPermission !== "granted") {
        updateSettings({ pushNotificationsEnabled: false });
        setSubscribed(false);
        throw new Error(
          nextPermission === "denied"
            ? "Notifications are blocked in your browser settings."
            : "Notification permission was not granted.",
        );
      }

      let subscription = await registration.pushManager.getSubscription();
      if (subscription === null) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: decodeBase64UrlPublicKey(config.publicKey) as BufferSource,
        });
      }

      const subscriptionJson = asSubscriptionJson(subscription);
      if (!subscriptionJson) {
        throw new Error("The browser returned an incomplete push subscription.");
      }

      await putSubscription({
        subscription: subscriptionJson,
        appVersion: APP_VERSION,
      });

      updateSettings({ pushNotificationsEnabled: true });
      setSubscribed(true);
    } catch (nextError) {
      setError(errorMessage(nextError, "Unable to enable push notifications."));
    } finally {
      setBusy(false);
    }
  }, [loadServerConfig, supported, updateSettings]);

  const disable = useCallback(async () => {
    if (!supported) {
      updateSettings({ pushNotificationsEnabled: false });
      setSubscribed(false);
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const subscription = await refreshSubscriptionState();
      const endpoint = subscription?.endpoint ?? null;

      if (endpoint) {
        await deleteSubscription({ endpoint }).catch(() => undefined);
      }

      if (subscription) {
        await subscription.unsubscribe().catch(() => false);
      }

      updateSettings({ pushNotificationsEnabled: false });
      setSubscribed(false);
    } catch (nextError) {
      setError(errorMessage(nextError, "Unable to disable push notifications."));
    } finally {
      setBusy(false);
    }
  }, [refreshSubscriptionState, supported, updateSettings]);

  const refreshIfNeeded = useCallback(async () => {
    if (!supported) {
      setSubscribed(false);
      return;
    }

    try {
      const config = await loadServerConfig();
      if (!config.enabled) {
        setSubscribed(false);
        return;
      }

      const subscription = await refreshSubscriptionState();
      if (!settings.pushNotificationsEnabled || Notification.permission !== "granted") {
        return;
      }

      if (!subscription) {
        setSubscribed(false);
        return;
      }

      const subscriptionJson = asSubscriptionJson(subscription);
      if (!subscriptionJson) {
        setSubscribed(false);
        return;
      }

      await putSubscription({
        subscription: subscriptionJson,
        appVersion: APP_VERSION,
      });
      setSubscribed(true);
    } catch (nextError) {
      setError(errorMessage(nextError, "Unable to refresh push notification state."));
    }
  }, [loadServerConfig, refreshSubscriptionState, settings.pushNotificationsEnabled, supported]);

  useEffect(() => {
    if (!supported) {
      setServerEnabled(false);
      setSubscribed(false);
      return;
    }

    let active = true;

    void (async () => {
      try {
        const config = await fetchWebPushConfig();
        if (!active) {
          return;
        }
        setServerEnabled(config.enabled);

        const subscription = await refreshSubscriptionState();
        if (!active) {
          return;
        }
        setSubscribed(subscription !== null);
      } catch (nextError) {
        if (!active) {
          return;
        }
        setError(errorMessage(nextError, "Unable to load push notification settings."));
      }
    })();

    return () => {
      active = false;
    };
  }, [refreshSubscriptionState, supported]);

  return {
    supported,
    serverEnabled,
    permission,
    subscribed,
    busy,
    error,
    enable,
    disable,
    refreshIfNeeded,
    canRequestPermission: canRequestNotificationPermission(),
    locallyEnabled: settings.pushNotificationsEnabled,
  } as const;
}
