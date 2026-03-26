import { useMemo } from "react";

import { buildForkSettingsResetPlan, type ForkSettingsResetPlan } from "./resetPlan";
import { useForkSettings } from "./useForkSettings";

export interface UseForkSettingsResetPlanResult {
  readonly resetPlan: ForkSettingsResetPlan;
  readonly resetForkSettings: () => void;
}

export function useForkSettingsResetPlan(
  upstreamDirtyLabels: ReadonlyArray<string>,
): UseForkSettingsResetPlanResult {
  const { settings, defaults, resetForkSettings } = useForkSettings();

  const resetPlan = useMemo(
    () =>
      buildForkSettingsResetPlan({
        upstreamDirtyLabels,
        forkSettings: settings,
        forkDefaults: defaults,
      }),
    [defaults, settings, upstreamDirtyLabels],
  );

  return {
    resetPlan,
    resetForkSettings,
  };
}
