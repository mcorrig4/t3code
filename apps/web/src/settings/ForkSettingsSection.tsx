import { Button } from "../components/ui/button";
import { Switch } from "../components/ui/switch";
import { useForkSettings } from "../fork/settings";
import { usePushNotifications } from "../notifications/usePushNotifications";
import {
  SettingResetButton,
  SettingsRow,
  SettingsSection,
} from "../components/settings/settingsLayout";

export function ForkSettingsSection() {
  const { settings, defaults, updateForkSettings } = useForkSettings();
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
    <SettingsSection title="Fork extensions">
      <SettingsRow
        title="Push notifications"
        description="Enable web push alerts for assistant completions, approvals, and user input requests. Notification clicks reopen the matching thread."
        resetAction={
          settings.pushNotificationsEnabled !== defaults.pushNotificationsEnabled ? (
            <SettingResetButton
              label="push notifications"
              onClick={() => {
                void pushNotifications.disable();
              }}
            />
          ) : null
        }
        status={
          pushNotifications.error ? (
            <span className="text-destructive">{pushNotifications.error}</span>
          ) : (
            notificationsStatus
          )
        }
        control={
          <div className="flex w-full flex-wrap justify-end gap-2 sm:w-auto">
            <Button
              size="xs"
              aria-label="Enable push notifications"
              onClick={() => {
                void pushNotifications.enable();
              }}
              disabled={
                pushNotifications.busy ||
                !pushNotifications.supported ||
                !pushNotifications.serverEnabled ||
                pushNotifications.permission === "denied"
              }
            >
              {pushNotifications.busy ? "Updating..." : "Enable"}
            </Button>
            <Button
              size="xs"
              variant="outline"
              aria-label="Disable push notifications"
              onClick={() => {
                void pushNotifications.disable();
              }}
              disabled={
                pushNotifications.busy ||
                (!pushNotifications.subscribed && !pushNotifications.locallyEnabled)
              }
            >
              Disable
            </Button>
          </div>
        }
      />

      <SettingsRow
        title="Suppress Codex native notifications"
        description="Disable Codex CLI notify hooks for T3-launched Codex app-server sessions only. Your normal Codex CLI config still applies outside T3 Code."
        resetAction={
          settings.suppressCodexAppServerNotifications !==
          defaults.suppressCodexAppServerNotifications ? (
            <SettingResetButton
              label="codex session overrides"
              onClick={() =>
                updateForkSettings({
                  suppressCodexAppServerNotifications: defaults.suppressCodexAppServerNotifications,
                })
              }
            />
          ) : null
        }
        control={
          <Switch
            checked={settings.suppressCodexAppServerNotifications}
            onCheckedChange={(checked) =>
              updateForkSettings({
                suppressCodexAppServerNotifications: Boolean(checked),
              })
            }
            aria-label="Suppress Codex native notifications"
          />
        }
      />
    </SettingsSection>
  );
}
