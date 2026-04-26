import { Equal } from "effect";
import { DEFAULT_UNIFIED_SETTINGS, type UnifiedSettings } from "@t3tools/contracts/settings";

type ThemePreference = "light" | "dark" | "system";

type ResettableUnifiedSettings = Pick<
  UnifiedSettings,
  | "addProjectBaseDirectory"
  | "autoOpenPlanSidebar"
  | "confirmThreadArchive"
  | "confirmThreadDelete"
  | "defaultThreadEnvMode"
  | "diffWordWrap"
  | "enableAssistantStreaming"
  | "providers"
  | "textGenerationModelSelection"
  | "timestampFormat"
>;

export interface UpstreamSettingsResetPlan {
  readonly upstreamDirtyLabels: ReadonlyArray<string>;
  readonly hasChanges: boolean;
  readonly resetUpstreamSettings: () => void;
}

export function buildUpstreamSettingsDirtyLabels(input: {
  readonly theme: ThemePreference;
  readonly settings: ResettableUnifiedSettings;
  readonly defaults: ResettableUnifiedSettings;
}): ReadonlyArray<string> {
  const isGitWritingModelDirty = !Equal.equals(
    input.settings.textGenerationModelSelection ?? null,
    input.defaults.textGenerationModelSelection ?? null,
  );
  const areProviderSettingsDirty = !Equal.equals(
    input.settings.providers,
    input.defaults.providers,
  );

  return [
    ...(input.theme !== "system" ? ["Theme"] : []),
    ...(input.settings.timestampFormat !== input.defaults.timestampFormat ? ["Time format"] : []),
    ...(input.settings.diffWordWrap !== input.defaults.diffWordWrap ? ["Diff line wrapping"] : []),
    ...(input.settings.autoOpenPlanSidebar !== input.defaults.autoOpenPlanSidebar
      ? ["Task sidebar"]
      : []),
    ...(input.settings.enableAssistantStreaming !== input.defaults.enableAssistantStreaming
      ? ["Assistant output"]
      : []),
    ...(input.settings.defaultThreadEnvMode !== input.defaults.defaultThreadEnvMode
      ? ["New thread mode"]
      : []),
    ...(input.settings.addProjectBaseDirectory !== input.defaults.addProjectBaseDirectory
      ? ["Add project base directory"]
      : []),
    ...(input.settings.confirmThreadArchive !== input.defaults.confirmThreadArchive
      ? ["Archive confirmation"]
      : []),
    ...(input.settings.confirmThreadDelete !== input.defaults.confirmThreadDelete
      ? ["Delete confirmation"]
      : []),
    ...(isGitWritingModelDirty ? ["Git writing model"] : []),
    ...(areProviderSettingsDirty ? ["Providers"] : []),
  ];
}

export function buildUpstreamSettingsResetPlan(input: {
  readonly theme: ThemePreference;
  readonly setTheme: (theme: ThemePreference) => void;
  readonly settings: ResettableUnifiedSettings;
  readonly defaults: ResettableUnifiedSettings;
  readonly resetSettings: () => void;
}): UpstreamSettingsResetPlan {
  const upstreamDirtyLabels = buildUpstreamSettingsDirtyLabels({
    theme: input.theme,
    settings: input.settings,
    defaults: input.defaults,
  });

  return {
    upstreamDirtyLabels,
    hasChanges:
      upstreamDirtyLabels.length > 0 || !Equal.equals(input.defaults, DEFAULT_UNIFIED_SETTINGS),
    resetUpstreamSettings: () => {
      input.setTheme("system");
      input.resetSettings();
    },
  };
}
