import type { ForkSettings } from "./schema";

export interface ForkSettingsRegistryEntry {
  readonly key: keyof ForkSettings;
  readonly label: string;
}

export const FORK_SETTINGS_REGISTRY: readonly ForkSettingsRegistryEntry[] = [
  {
    key: "pushNotificationsEnabled",
    label: "Push notifications",
  },
  {
    key: "suppressCodexAppServerNotifications",
    label: "Codex session overrides",
  },
];

export function getForkDirtyLabels(
  settings: ForkSettings,
  defaults: ForkSettings,
): ReadonlyArray<string> {
  return FORK_SETTINGS_REGISTRY.filter((entry) => settings[entry.key] !== defaults[entry.key]).map(
    (entry) => entry.label,
  );
}
