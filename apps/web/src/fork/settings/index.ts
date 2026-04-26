import type { CodexSessionOverrides } from "@t3tools/contracts";
import { readForkSettingsSnapshot } from "./persistence";

export {
  DEFAULT_FORK_SETTINGS,
  FORK_SETTINGS_STORAGE_KEY,
  LEGACY_APP_SETTINGS_STORAGE_KEY,
  LEGACY_CLIENT_SETTINGS_STORAGE_KEY,
  ForkSettingsSchema,
  type ForkSettings,
} from "./schema";
export { useForkSettings } from "./useForkSettings";
export {
  useForkSettingsResetPlan,
  type UseForkSettingsResetPlanResult,
} from "./useForkSettingsResetPlan";
export {
  buildCombinedSettingsResetPlan,
  buildForkSettingsResetPlan,
  type CombinedSettingsResetPlan,
  type ForkSettingsResetPlan,
} from "./resetPlan";
export {
  FORK_SETTINGS_REGISTRY,
  getForkDirtyLabels,
  type ForkSettingsRegistryEntry,
} from "./registry";
export { migrateLegacyForkSettings, readForkSettingsSnapshot } from "./persistence";

export function readCodexSessionOverrides(): CodexSessionOverrides | undefined {
  const settings = readForkSettingsSnapshot();
  return settings.suppressCodexAppServerNotifications
    ? { suppressNativeNotifications: true }
    : undefined;
}
