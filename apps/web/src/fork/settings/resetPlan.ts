import { getForkDirtyLabels } from "./registry";
import type { ForkSettings } from "./schema";

export interface ForkSettingsResetPlan {
  readonly forkDirtyLabels: ReadonlyArray<string>;
  readonly allDirtyLabels: ReadonlyArray<string>;
  readonly hasChanges: boolean;
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
