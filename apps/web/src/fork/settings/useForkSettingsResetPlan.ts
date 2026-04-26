import { buildCombinedSettingsResetPlan, type CombinedSettingsResetPlan } from "./resetPlan";
import type { UpstreamSettingsResetPlan } from "../../settings/resetPlan";
import { useForkSettings } from "./useForkSettings";

export interface UseForkSettingsResetPlanResult {
  readonly resetPlan: CombinedSettingsResetPlan;
}

export function useForkSettingsResetPlan(
  upstreamResetPlan: UpstreamSettingsResetPlan,
): UseForkSettingsResetPlanResult {
  const { settings, defaults, resetForkSettings } = useForkSettings();

  const resetPlan = buildCombinedSettingsResetPlan({
    upstreamResetPlan,
    forkSettings: settings,
    forkDefaults: defaults,
    resetForkSettings,
  });

  return {
    resetPlan,
  };
}
