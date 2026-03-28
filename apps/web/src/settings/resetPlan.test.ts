import { describe, expect, it, vi } from "vitest";

import { buildUpstreamSettingsDirtyLabels, buildUpstreamSettingsResetPlan } from "./resetPlan";

describe("buildUpstreamSettingsDirtyLabels", () => {
  it("collects user-facing labels for changed upstream settings", () => {
    expect(
      buildUpstreamSettingsDirtyLabels({
        theme: "dark",
        settings: {
          claudeBinaryPath: "/tmp/claude",
          codexBinaryPath: "",
          codexHomePath: "",
          confirmThreadDelete: false,
          customClaudeModels: [],
          customCodexModels: ["custom/codex-model"],
          defaultThreadEnvMode: "worktree",
          diffWordWrap: true,
          enableAssistantStreaming: true,
          textGenerationModel: "custom-model",
          timestampFormat: "24-hour",
        },
        defaults: {
          claudeBinaryPath: "",
          codexBinaryPath: "",
          codexHomePath: "",
          confirmThreadDelete: true,
          customClaudeModels: [],
          customCodexModels: [],
          defaultThreadEnvMode: "local",
          diffWordWrap: false,
          enableAssistantStreaming: false,
          textGenerationModel: undefined,
          timestampFormat: "locale",
        },
      }),
    ).toEqual([
      "Theme",
      "Time format",
      "Diff line wrapping",
      "Assistant output",
      "New thread mode",
      "Delete confirmation",
      "Git writing model",
      "Custom models",
      "Provider installs",
    ]);
  });
});

describe("buildUpstreamSettingsResetPlan", () => {
  it("resets the theme and canonical app settings together", () => {
    const setTheme = vi.fn();
    const resetSettings = vi.fn();

    const resetPlan = buildUpstreamSettingsResetPlan({
      theme: "dark",
      setTheme,
      resetSettings,
      settings: {
        claudeBinaryPath: "",
        codexBinaryPath: "",
        codexHomePath: "",
        confirmThreadDelete: true,
        customClaudeModels: [],
        customCodexModels: [],
        defaultThreadEnvMode: "local",
        diffWordWrap: false,
        enableAssistantStreaming: false,
        textGenerationModel: undefined,
        timestampFormat: "locale",
      },
      defaults: {
        claudeBinaryPath: "",
        codexBinaryPath: "",
        codexHomePath: "",
        confirmThreadDelete: true,
        customClaudeModels: [],
        customCodexModels: [],
        defaultThreadEnvMode: "local",
        diffWordWrap: false,
        enableAssistantStreaming: false,
        textGenerationModel: undefined,
        timestampFormat: "locale",
      },
    });

    expect(resetPlan.hasChanges).toBe(true);
    expect(resetPlan.upstreamDirtyLabels).toEqual(["Theme"]);

    resetPlan.resetUpstreamSettings();
    expect(setTheme).toHaveBeenCalledWith("system");
    expect(resetSettings).toHaveBeenCalledOnce();
  });
});
