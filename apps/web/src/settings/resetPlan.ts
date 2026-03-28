import { DEFAULT_GIT_TEXT_GENERATION_MODEL } from "@t3tools/contracts";
import type { AppSettings } from "../appSettings";

type ThemePreference = "light" | "dark" | "system";

type ResettableAppSettings = Pick<
  AppSettings,
  | "claudeBinaryPath"
  | "codexBinaryPath"
  | "codexHomePath"
  | "confirmThreadDelete"
  | "customClaudeModels"
  | "customCodexModels"
  | "defaultThreadEnvMode"
  | "diffWordWrap"
  | "enableAssistantStreaming"
  | "textGenerationModel"
  | "timestampFormat"
>;

export interface UpstreamSettingsResetPlan {
  readonly upstreamDirtyLabels: ReadonlyArray<string>;
  readonly hasChanges: boolean;
  readonly resetUpstreamSettings: () => void;
}

export function buildUpstreamSettingsDirtyLabels(input: {
  readonly theme: ThemePreference;
  readonly settings: ResettableAppSettings;
  readonly defaults: ResettableAppSettings;
}): ReadonlyArray<string> {
  const currentGitTextGenerationModel =
    input.settings.textGenerationModel ?? DEFAULT_GIT_TEXT_GENERATION_MODEL;
  const defaultGitTextGenerationModel =
    input.defaults.textGenerationModel ?? DEFAULT_GIT_TEXT_GENERATION_MODEL;
  const isGitTextGenerationModelDirty =
    currentGitTextGenerationModel !== defaultGitTextGenerationModel;
  const isInstallSettingsDirty =
    input.settings.claudeBinaryPath !== input.defaults.claudeBinaryPath ||
    input.settings.codexBinaryPath !== input.defaults.codexBinaryPath ||
    input.settings.codexHomePath !== input.defaults.codexHomePath;

  return [
    ...(input.theme !== "system" ? ["Theme"] : []),
    ...(input.settings.timestampFormat !== input.defaults.timestampFormat ? ["Time format"] : []),
    ...(input.settings.diffWordWrap !== input.defaults.diffWordWrap ? ["Diff line wrapping"] : []),
    ...(input.settings.enableAssistantStreaming !== input.defaults.enableAssistantStreaming
      ? ["Assistant output"]
      : []),
    ...(input.settings.defaultThreadEnvMode !== input.defaults.defaultThreadEnvMode
      ? ["New thread mode"]
      : []),
    ...(input.settings.confirmThreadDelete !== input.defaults.confirmThreadDelete
      ? ["Delete confirmation"]
      : []),
    ...(isGitTextGenerationModelDirty ? ["Git writing model"] : []),
    ...(input.settings.customCodexModels.length > 0 || input.settings.customClaudeModels.length > 0
      ? ["Custom models"]
      : []),
    ...(isInstallSettingsDirty ? ["Provider installs"] : []),
  ];
}

export function buildUpstreamSettingsResetPlan(input: {
  readonly theme: ThemePreference;
  readonly setTheme: (theme: ThemePreference) => void;
  readonly settings: ResettableAppSettings;
  readonly defaults: ResettableAppSettings;
  readonly resetSettings: () => void;
}): UpstreamSettingsResetPlan {
  const upstreamDirtyLabels = buildUpstreamSettingsDirtyLabels({
    theme: input.theme,
    settings: input.settings,
    defaults: input.defaults,
  });

  return {
    upstreamDirtyLabels,
    hasChanges: upstreamDirtyLabels.length > 0,
    resetUpstreamSettings: () => {
      input.setTheme("system");
      input.resetSettings();
    },
  };
}
