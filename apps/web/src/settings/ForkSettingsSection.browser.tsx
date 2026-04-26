import "../index.css";

import { page } from "vitest/browser";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

const mockedForkSettingsModule = vi.hoisted(() => ({
  updateForkSettings: vi.fn(),
  forkSettingsState: {
    settings: {
      pushNotificationsEnabled: false,
      suppressCodexAppServerNotifications: false,
    },
    defaults: {
      pushNotificationsEnabled: false,
      suppressCodexAppServerNotifications: false,
    },
  },
}));

vi.mock("../fork/settings", () => ({
  useForkSettings: () => ({
    ...mockedForkSettingsModule.forkSettingsState,
    updateForkSettings: mockedForkSettingsModule.updateForkSettings,
  }),
}));

import { ForkSettingsSection } from "./ForkSettingsSection";

async function mountSection() {
  const host = document.createElement("div");
  document.body.append(host);
  const screen = await render(<ForkSettingsSection />, { container: host });

  return {
    cleanup: async () => {
      await screen.unmount();
      host.remove();
    },
  };
}

describe("ForkSettingsSection", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    vi.clearAllMocks();
    mockedForkSettingsModule.forkSettingsState.settings.pushNotificationsEnabled = false;
    mockedForkSettingsModule.forkSettingsState.settings.suppressCodexAppServerNotifications = false;
    mockedForkSettingsModule.forkSettingsState.defaults.pushNotificationsEnabled = false;
    mockedForkSettingsModule.forkSettingsState.defaults.suppressCodexAppServerNotifications = false;
  });

  it("renders the Codex session override control", async () => {
    const mounted = await mountSection();

    try {
      await expect.element(page.getByRole("heading", { name: "Fork extensions" })).toBeVisible();
      await expect.element(page.getByText("Suppress Codex native notifications")).toBeVisible();
      await expect
        .element(page.getByLabelText("Suppress Codex native notifications"))
        .toBeInTheDocument();
    } finally {
      await mounted.cleanup();
    }
  });

  it("updates the fork settings store when the toggle changes", async () => {
    const mounted = await mountSection();

    try {
      await page.getByLabelText("Suppress Codex native notifications").click();
      expect(mockedForkSettingsModule.updateForkSettings).toHaveBeenCalledWith({
        suppressCodexAppServerNotifications: true,
      });
    } finally {
      await mounted.cleanup();
    }
  });
});
