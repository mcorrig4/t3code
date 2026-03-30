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

const mockedPushNotificationsModule = vi.hoisted(() => ({
  enableNotifications: vi.fn(),
  disableNotifications: vi.fn(),
  pushNotificationsState: {
    supported: true,
    serverEnabled: true,
    permission: "default",
    subscribed: false,
    locallyEnabled: false,
    canRequestPermission: true,
    busy: false,
    error: null as string | null,
    enable: undefined as unknown,
    disable: undefined as unknown,
  },
}));
mockedPushNotificationsModule.pushNotificationsState.enable =
  mockedPushNotificationsModule.enableNotifications;
mockedPushNotificationsModule.pushNotificationsState.disable =
  mockedPushNotificationsModule.disableNotifications;

const mockedDebugModule = vi.hoisted(() => ({
  clearUserInputDebugEntries: vi.fn(),
  setUserInputDebugCollapsed: vi.fn(),
  setUserInputDebugEnabled: vi.fn(),
  debugState: {
    enabled: false,
    entries: [] as Array<unknown>,
  },
}));

vi.mock("../fork/settings", () => ({
  useForkSettings: () => ({
    ...mockedForkSettingsModule.forkSettingsState,
    updateForkSettings: mockedForkSettingsModule.updateForkSettings,
  }),
}));

vi.mock("../notifications/usePushNotifications", () => ({
  usePushNotifications: () => mockedPushNotificationsModule.pushNotificationsState,
}));

vi.mock("../debug/userInputDebug", () => ({
  clearUserInputDebugEntries: mockedDebugModule.clearUserInputDebugEntries,
  setUserInputDebugCollapsed: mockedDebugModule.setUserInputDebugCollapsed,
  setUserInputDebugEnabled: mockedDebugModule.setUserInputDebugEnabled,
  useUserInputDebugStore: (selector: (state: typeof mockedDebugModule.debugState) => unknown) =>
    selector(mockedDebugModule.debugState),
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
    mockedPushNotificationsModule.pushNotificationsState.error = null;
    mockedPushNotificationsModule.pushNotificationsState.permission = "default";
    mockedPushNotificationsModule.pushNotificationsState.subscribed = false;
    mockedPushNotificationsModule.pushNotificationsState.locallyEnabled = false;
    mockedPushNotificationsModule.pushNotificationsState.canRequestPermission = true;
    mockedDebugModule.debugState.enabled = false;
    mockedDebugModule.debugState.entries = [];
  });

  it("renders the fork settings sections and controls", async () => {
    const mounted = await mountSection();

    try {
      await expect.element(page.getByRole("heading", { name: "Fork Extensions" })).toBeVisible();
      await expect.element(page.getByRole("heading", { name: "Notifications" })).toBeVisible();
      await expect
        .element(page.getByRole("heading", { name: "Codex session overrides" }))
        .toBeVisible();
      await expect.element(page.getByRole("heading", { name: "Diagnostics" })).toBeVisible();
      await expect
        .element(page.getByRole("button", { name: "Enable notifications" }))
        .toBeInTheDocument();
      await expect
        .element(page.getByRole("button", { name: "Disable notifications" }))
        .toBeInTheDocument();
      await expect.element(page.getByRole("button", { name: "Open panel" })).toBeInTheDocument();
    } finally {
      await mounted.cleanup();
    }
  });

  it("updates the fork settings store when the Codex override toggle changes", async () => {
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
