import { type ReactNode } from "react";

import { Button } from "../components/ui/button";
import { Switch } from "../components/ui/switch";
import {
  clearUserInputDebugEntries,
  setUserInputDebugCollapsed,
  setUserInputDebugEnabled,
  useUserInputDebugStore,
} from "../debug/userInputDebug";
import { useForkSettings } from "../fork/settings";
import { usePushNotifications } from "../notifications/usePushNotifications";

function ForkSettingsCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="border-t border-border px-4 py-4 first:border-t-0 sm:px-5">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex min-h-5 items-center gap-1.5">
          <h3 className="text-sm font-medium text-foreground">{title}</h3>
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="mt-4 space-y-3">{children}</div>
    </div>
  );
}

export function ForkSettingsSection() {
  const { settings, defaults, updateForkSettings } = useForkSettings();
  const pushNotifications = usePushNotifications();
  const userInputDebugEnabled = useUserInputDebugStore((store) => store.enabled);
  const userInputDebugEntryCount = useUserInputDebugStore((store) => store.entries.length);

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

  const codexNotificationsDirty =
    settings.suppressCodexAppServerNotifications !== defaults.suppressCodexAppServerNotifications;

  return (
    <section className="space-y-3">
      <h2 className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        Fork Extensions
      </h2>
      <div className="relative overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-xs/5">
        <ForkSettingsCard
          title="Notifications"
          description="Enable web push notifications for assistant completions, approvals, and user input requests. Notification clicks deep-link back into the matching thread."
        >
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
        </ForkSettingsCard>

        <ForkSettingsCard
          title="Codex session overrides"
          description="Apply fork-specific behavior to T3-launched Codex app-server sessions without changing your normal Codex CLI setup."
        >
          <div className="rounded-lg border border-border/70 bg-background/70 px-3 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <span className="block text-xs font-medium text-foreground">
                  Suppress Codex native notifications
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  Disable Codex CLI notify hooks for T3-launched Codex app-server sessions only.
                  Your normal Codex CLI config still applies outside T3.
                </span>
              </div>
              <Switch
                checked={settings.suppressCodexAppServerNotifications}
                onCheckedChange={(checked) =>
                  updateForkSettings({
                    suppressCodexAppServerNotifications: Boolean(checked),
                  })
                }
                aria-label="Suppress Codex native notifications"
              />
            </div>
          </div>

          {codexNotificationsDirty ? (
            <div className="flex justify-end">
              <Button
                size="xs"
                variant="outline"
                onClick={() =>
                  updateForkSettings({
                    suppressCodexAppServerNotifications:
                      defaults.suppressCodexAppServerNotifications,
                  })
                }
              >
                Restore default
              </Button>
            </div>
          ) : null}
        </ForkSettingsCard>

        <ForkSettingsCard
          title="Diagnostics"
          description="Open the fork-only debug sidecar for user-input breadcrumbs and crash/OOM diagnostics without editing the URL."
        >
          <div className="rounded-lg border border-border bg-background px-3 py-3">
            <p className="text-sm font-medium text-foreground">Status</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {userInputDebugEnabled
                ? `Debug panel enabled with ${userInputDebugEntryCount} captured breadcrumb${userInputDebugEntryCount === 1 ? "" : "s"}.`
                : "Debug panel currently hidden."}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Uses the same sidecar as <code>?debugUserInput=1</code> and is intended for dev/local
              diagnostics.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="xs"
              variant="outline"
              onClick={() => {
                setUserInputDebugEnabled(true);
                setUserInputDebugCollapsed(false);
              }}
            >
              {userInputDebugEnabled ? "Show panel" : "Open panel"}
            </Button>
            <Button
              size="xs"
              variant="ghost"
              disabled={!userInputDebugEnabled && userInputDebugEntryCount === 0}
              onClick={() => {
                clearUserInputDebugEntries();
              }}
            >
              Clear
            </Button>
          </div>
        </ForkSettingsCard>
      </div>
    </section>
  );
}
