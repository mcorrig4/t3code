import { getForkDirtyLabels } from "./registry";
import type { ForkSettings } from "./schema";
import type { UpstreamSettingsResetPlan } from "../../settings/resetPlan";

export interface ForkSettingsResetPlan {
  readonly forkDirtyLabels: ReadonlyArray<string>;
  readonly allDirtyLabels: ReadonlyArray<string>;
  readonly hasChanges: boolean;
}

export interface CombinedSettingsResetPlan extends ForkSettingsResetPlan {
  readonly upstreamDirtyLabels: ReadonlyArray<string>;
  readonly resetPersistentSettings: () => void;
}

export function buildForkSettingsResetPlan(input: {
  readonly upstreamDirtyLabels: ReadonlyArray<string>;
  readonly forkSettings: ForkSettings;
  readonly forkDefaults: ForkSettings;
}): ForkSettingsResetPlan {
  const forkDirtyLabels = getForkDirtyLabels(input.forkSettings, input.forkDefaults);
  return {
    forkDirtyLabels,
    allDirtyLabels: [...input.upstreamDirtyLabels, ...forkDirtyLabels],
    hasChanges: input.upstreamDirtyLabels.length > 0 || forkDirtyLabels.length > 0,
  };
}

export function buildCombinedSettingsResetPlan(input: {
  readonly upstreamResetPlan: UpstreamSettingsResetPlan;
  readonly forkSettings: ForkSettings;
  readonly forkDefaults: ForkSettings;
  readonly resetForkSettings: () => void;
}): CombinedSettingsResetPlan {
  const forkResetPlan = buildForkSettingsResetPlan({
    upstreamDirtyLabels: input.upstreamResetPlan.upstreamDirtyLabels,
    forkSettings: input.forkSettings,
    forkDefaults: input.forkDefaults,
  });

  return {
    ...forkResetPlan,
    upstreamDirtyLabels: input.upstreamResetPlan.upstreamDirtyLabels,
    resetPersistentSettings: () => {
      input.upstreamResetPlan.resetUpstreamSettings();
      input.resetForkSettings();
    },
  };
}
