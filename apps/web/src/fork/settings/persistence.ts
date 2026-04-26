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
  LEGACY_CLIENT_SETTINGS_STORAGE_KEY,
  type ForkSettings,
} from "./schema";

interface LegacySettingsLike {
  pushNotificationsEnabled?: unknown;
  suppressCodexAppServerNotifications?: unknown;
  [key: string]: unknown;
}

const LEGACY_SETTINGS_STORAGE_KEYS = [
  LEGACY_APP_SETTINGS_STORAGE_KEY,
  LEGACY_CLIENT_SETTINGS_STORAGE_KEY,
] as const;

function readLegacySettingsDocument(
  storageKey: (typeof LEGACY_SETTINGS_STORAGE_KEYS)[number],
): LegacySettingsLike | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? (parsed as LegacySettingsLike) : null;
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
    removeLocalStorageItem(FORK_SETTINGS_STORAGE_KEY);
  }

  for (const storageKey of LEGACY_SETTINGS_STORAGE_KEYS) {
    const legacy = readLegacySettingsDocument(storageKey);
    if (!legacy) {
      continue;
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
        window.localStorage.setItem(storageKey, JSON.stringify(legacy));
      } catch {
        // Ignore best-effort cleanup failures.
      }
    }

    return migrated;
  }

  return null;
}

export function readForkSettingsSnapshot(): ForkSettings {
  try {
    const stored = getLocalStorageItem(FORK_SETTINGS_STORAGE_KEY, ForkSettingsSchema);
    if (stored) {
      return stored;
    }
  } catch {
    removeLocalStorageItem(FORK_SETTINGS_STORAGE_KEY);
  }

  return migrateLegacyForkSettings() ?? DEFAULT_FORK_SETTINGS;
}
