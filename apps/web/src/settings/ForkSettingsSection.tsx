import { Button } from "../components/ui/button";
import { useAppSettings } from "../appSettings";
import { usePushNotifications } from "../notifications/usePushNotifications";

export function ForkSettingsSection() {
  const { settings, defaults } = useAppSettings();
  const pushNotifications = usePushNotifications();

  const notificationsStatus = !pushNotifications.supported
    ? "This browser does not support PWA push notifications."
    : !pushNotifications.serverEnabled
      ? "Push notifications are not configured on this server."
      : pushNotifications.permission === "denied"
        ? "Browser notifications are currently blocked."
        : pushNotifications.subscribed
          ? "Notifications are enabled for this device."
          : pushNotifications.locallyEnabled && pushNotifications.permission === "granted"
            ? "Permission is granted and the app is ready to resubscribe."
            : pushNotifications.canRequestPermission
              ? "Notifications are ready to enable."
              : pushNotifications.permission === "granted"
                ? "Browser permission is granted, but notifications are off in T3 Code."
                : "Notifications are not enabled yet.";

  return (
    <section className="space-y-3">
      <h2 className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        Fork Extensions
      </h2>
      <div className="relative overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-xs/5">
        <div className="border-t border-border px-4 py-4 first:border-t-0 sm:px-5">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex min-h-5 items-center gap-1.5">
              <h3 className="text-sm font-medium text-foreground">Notifications</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Enable web push notifications for assistant completions, approvals, and user input
              requests. Notification clicks deep-link back into the matching thread.
            </p>
          </div>

          <div className="mt-4 space-y-3">
            <div className="rounded-lg border border-border bg-background px-3 py-3">
              <p className="text-sm font-medium text-foreground">Status</p>
              <p className="mt-1 text-xs text-muted-foreground">{notificationsStatus}</p>
              {pushNotifications.error ? (
                <p className="mt-2 text-xs text-destructive">{pushNotifications.error}</p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => void pushNotifications.enable()}
                disabled={
                  pushNotifications.busy ||
                  !pushNotifications.supported ||
                  !pushNotifications.serverEnabled ||
                  pushNotifications.permission === "denied"
                }
              >
                {pushNotifications.busy ? "Updating..." : "Enable notifications"}
              </Button>

              <Button
                variant="outline"
                onClick={() => void pushNotifications.disable()}
                disabled={
                  pushNotifications.busy ||
                  (!pushNotifications.subscribed && !pushNotifications.locallyEnabled)
                }
              >
                Disable notifications
              </Button>
            </div>

            {pushNotifications.permission === "denied" ? (
              <p className="text-xs text-muted-foreground">
                Re-enable notifications from your browser&apos;s site settings, then come back here
                and turn them on again.
              </p>
            ) : null}

            {settings.pushNotificationsEnabled !== defaults.pushNotificationsEnabled ? (
              <div className="flex justify-end">
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => void pushNotifications.disable()}
                  disabled={pushNotifications.busy}
                >
                  Restore default
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
