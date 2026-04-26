import { useCallback, useEffect } from "react";

import { useLocalStorage } from "../../hooks/useLocalStorage";
import { migrateLegacyForkSettings } from "./persistence";
import {
  DEFAULT_FORK_SETTINGS,
  FORK_SETTINGS_STORAGE_KEY,
  ForkSettingsSchema,
  type ForkSettings,
} from "./schema";

export function useForkSettings() {
  const [settings, setSettings] = useLocalStorage(
    FORK_SETTINGS_STORAGE_KEY,
    DEFAULT_FORK_SETTINGS,
    ForkSettingsSchema,
  );

  useEffect(() => {
    const migrated = migrateLegacyForkSettings();
    if (migrated) {
      setSettings(migrated);
    }
  }, [setSettings]);

  const updateForkSettings = useCallback(
    (patch: Partial<ForkSettings>) => {
      setSettings((previous) => ({ ...previous, ...patch }));
    },
    [setSettings],
  );

  const resetForkSettings = useCallback(() => {
    setSettings(DEFAULT_FORK_SETTINGS);
  }, [setSettings]);

  return {
    settings,
    defaults: DEFAULT_FORK_SETTINGS,
    updateForkSettings,
    resetForkSettings,
  } as const;
}
