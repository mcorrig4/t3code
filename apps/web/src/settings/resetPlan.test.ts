import { describe, expect, it, vi } from "vitest";
import { DEFAULT_UNIFIED_SETTINGS } from "@t3tools/contracts/settings";

import { buildUpstreamSettingsDirtyLabels, buildUpstreamSettingsResetPlan } from "./resetPlan";

describe("buildUpstreamSettingsDirtyLabels", () => {
  it("collects user-facing labels for changed upstream settings", () => {
    expect(
      buildUpstreamSettingsDirtyLabels({
        theme: "dark",
        settings: {
          ...DEFAULT_UNIFIED_SETTINGS,
          confirmThreadDelete: false,
          defaultThreadEnvMode: "worktree",
          diffWordWrap: true,
          enableAssistantStreaming: true,
          timestampFormat: "24-hour",
          textGenerationModelSelection: {
            provider: "codex",
            model: "gpt-5.4",
          },
          providers: {
            ...DEFAULT_UNIFIED_SETTINGS.providers,
            claudeAgent: {
              ...DEFAULT_UNIFIED_SETTINGS.providers.claudeAgent,
              binaryPath: "/tmp/claude",
            },
          },
        },
        defaults: DEFAULT_UNIFIED_SETTINGS,
      }),
    ).toEqual([
      "Theme",
      "Time format",
      "Diff line wrapping",
      "Assistant output",
      "New thread mode",
      "Delete confirmation",
      "Git writing model",
      "Providers",
    ]);
  });
});

describe("buildUpstreamSettingsResetPlan", () => {
  it("resets the theme and canonical unified settings together", () => {
    const setTheme = vi.fn();
    const resetSettings = vi.fn();

    const resetPlan = buildUpstreamSettingsResetPlan({
      theme: "dark",
      setTheme,
      resetSettings,
      settings: DEFAULT_UNIFIED_SETTINGS,
      defaults: DEFAULT_UNIFIED_SETTINGS,
    });

    expect(resetPlan.hasChanges).toBe(true);
    expect(resetPlan.upstreamDirtyLabels).toEqual(["Theme"]);

    resetPlan.resetUpstreamSettings();
    expect(setTheme).toHaveBeenCalledWith("system");
    expect(resetSettings).toHaveBeenCalledOnce();
  });
});
