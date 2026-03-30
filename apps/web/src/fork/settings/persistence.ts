import {
  getLocalStorageItem,
  removeLocalStorageItem,
  setLocalStorageItem,
} from "../../hooks/useLocalStorage";
import {
  DEFAULT_FORK_SETTINGS,
  FORK_SETTINGS_STORAGE_KEY,
  ForkSettingsSchema,
  LEGACY_APP_SETTINGS_STORAGE_KEY,
  type ForkSettings,
} from "./schema";

interface LegacyAppSettingsLike {
  pushNotificationsEnabled?: unknown;
  suppressCodexAppServerNotifications?: unknown;
  [key: string]: unknown;
}

function readLegacyAppSettingsLike(): LegacyAppSettingsLike | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(LEGACY_APP_SETTINGS_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? (parsed as LegacyAppSettingsLike) : null;
  } catch {
    return null;
  }
}

export function migrateLegacyForkSettings(): ForkSettings | null {
  try {
    const existing = getLocalStorageItem(FORK_SETTINGS_STORAGE_KEY, ForkSettingsSchema);
    if (existing) {
      return existing;
    }
  } catch {
    // Corrupt fork-settings store — remove and fall through to legacy migration.
    removeLocalStorageItem(FORK_SETTINGS_STORAGE_KEY);
  }

  const legacy = readLegacyAppSettingsLike();
  if (!legacy) {
    return null;
  }

  const migrated: ForkSettings = {
    pushNotificationsEnabled: legacy.pushNotificationsEnabled === true,
    suppressCodexAppServerNotifications: legacy.suppressCodexAppServerNotifications === true,
  };

  setLocalStorageItem(FORK_SETTINGS_STORAGE_KEY, migrated, ForkSettingsSchema);

  if (typeof window !== "undefined") {
    delete legacy.pushNotificationsEnabled;
    delete legacy.suppressCodexAppServerNotifications;
    try {
      window.localStorage.setItem(LEGACY_APP_SETTINGS_STORAGE_KEY, JSON.stringify(legacy));
    } catch {
      // Ignore best-effort cleanup failures.
    }
  }

  return migrated;
}

export function readForkSettingsSnapshot(): ForkSettings {
  try {
    const stored = getLocalStorageItem(FORK_SETTINGS_STORAGE_KEY, ForkSettingsSchema);
    if (stored) return stored;
  } catch {
    // Corrupt fork-settings store — fall through to migration/defaults.
    removeLocalStorageItem(FORK_SETTINGS_STORAGE_KEY);
  }
  return migrateLegacyForkSettings() ?? DEFAULT_FORK_SETTINGS;
}
