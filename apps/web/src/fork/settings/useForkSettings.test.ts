import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import {
  getLocalStorageItem,
  removeLocalStorageItem,
  setLocalStorageItem,
} from "../../hooks/useLocalStorage";
import { buildForkSettingsResetPlan } from "./resetPlan";
import { migrateLegacyForkSettings, readForkSettingsSnapshot } from "./persistence";
import {
  DEFAULT_FORK_SETTINGS,
  FORK_SETTINGS_STORAGE_KEY,
  ForkSettingsSchema,
  LEGACY_APP_SETTINGS_STORAGE_KEY,
} from "./schema";

describe("fork settings persistence", () => {
  beforeAll(() => {
    const storage = new Map<string, string>();

    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
      clear: () => {
        storage.clear();
      },
    });
    vi.stubGlobal("window", {
      localStorage,
    });
  });

  beforeEach(() => {
    window.localStorage.clear();
  });

  it("defaults fork-only settings to disabled", () => {
    expect(readForkSettingsSnapshot()).toEqual(DEFAULT_FORK_SETTINGS);
  });

  it("migrates fork-only keys out of the legacy unified app settings payload", () => {
    window.localStorage.setItem(
      LEGACY_APP_SETTINGS_STORAGE_KEY,
      JSON.stringify({
        pushNotificationsEnabled: true,
        suppressCodexAppServerNotifications: true,
        timestampFormat: "locale",
      }),
    );

    const migrated = migrateLegacyForkSettings();
    expect(migrated).toEqual({
      pushNotificationsEnabled: true,
      suppressCodexAppServerNotifications: true,
    });
    expect(getLocalStorageItem(FORK_SETTINGS_STORAGE_KEY, ForkSettingsSchema)).toEqual(migrated);

    const legacyRaw = window.localStorage.getItem(LEGACY_APP_SETTINGS_STORAGE_KEY);
    expect(legacyRaw).not.toContain("pushNotificationsEnabled");
    expect(legacyRaw).not.toContain("suppressCodexAppServerNotifications");
  });

  it("prefers the dedicated fork settings store when present", () => {
    setLocalStorageItem(
      FORK_SETTINGS_STORAGE_KEY,
      {
        pushNotificationsEnabled: true,
        suppressCodexAppServerNotifications: false,
      },
      ForkSettingsSchema,
    );

    expect(readForkSettingsSnapshot()).toEqual({
      pushNotificationsEnabled: true,
      suppressCodexAppServerNotifications: false,
    });
  });

  it("allows removing the dedicated store during reset", () => {
    removeLocalStorageItem(FORK_SETTINGS_STORAGE_KEY);
    expect(getLocalStorageItem(FORK_SETTINGS_STORAGE_KEY, ForkSettingsSchema)).toBeNull();
  });
});

describe("buildForkSettingsResetPlan", () => {
  it("includes fork-only labels alongside upstream labels", () => {
    expect(
      buildForkSettingsResetPlan({
        upstreamDirtyLabels: ["Theme", "Custom models"],
        forkSettings: {
          pushNotificationsEnabled: true,
          suppressCodexAppServerNotifications: false,
        },
        forkDefaults: DEFAULT_FORK_SETTINGS,
      }),
    ).toEqual({
      forkDirtyLabels: ["Push notifications"],
      allDirtyLabels: ["Theme", "Custom models", "Push notifications"],
      hasChanges: true,
    });
  });

  it("reports no changes when both stores match defaults", () => {
    expect(
      buildForkSettingsResetPlan({
        upstreamDirtyLabels: [],
        forkSettings: DEFAULT_FORK_SETTINGS,
        forkDefaults: DEFAULT_FORK_SETTINGS,
      }),
    ).toEqual({
      forkDirtyLabels: [],
      allDirtyLabels: [],
      hasChanges: false,
    });
  });
});
