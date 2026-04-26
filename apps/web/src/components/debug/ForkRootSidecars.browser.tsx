import "../../index.css";

import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

vi.mock("./UserInputDebugPanel", () => ({
  UserInputDebugPanel: () => <div>Debug panel</div>,
}));

import { loadCrashBreadcrumbSessions } from "../../debug/crashDebug";
import { ForkRootSidecars } from "../../fork/bootstrap";

const CRASH_DEBUG_STORAGE_KEY = "t3code:debug-crash-breadcrumbs";

describe("ForkRootSidecars", () => {
  afterEach(() => {
    vi.clearAllMocks();
    window.localStorage.removeItem(CRASH_DEBUG_STORAGE_KEY);
    document.body.innerHTML = "";
  });

  it("initializes crash diagnostics when the sidecar mounts", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    const screen = await render(<ForkRootSidecars />, { container: host });

    let sessions = loadCrashBreadcrumbSessions();
    for (let attempt = 0; attempt < 5 && sessions.length === 0; attempt += 1) {
      await new Promise((resolve) => {
        window.setTimeout(resolve, 10);
      });
      sessions = loadCrashBreadcrumbSessions();
    }

    expect(sessions.length).toBeGreaterThan(0);
    expect(sessions[0]?.breadcrumbs.some((entry) => entry.stage === "debug-panel-mounted")).toBe(
      true,
    );

    await screen.unmount();
    host.remove();
  });
});
