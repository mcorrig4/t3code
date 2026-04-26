import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  clear(): void {
    this.values.clear();
  }
}

const localStorage = new MemoryStorage();

function installWindowStub() {
  vi.stubGlobal("window", {
    localStorage,
    location: {
      pathname: "/thread/test",
      search: "?foo=bar",
      hash: "#frag",
    },
  });
}

async function loadCrashDebugModule() {
  vi.resetModules();
  return import("./crashDebug");
}

beforeEach(() => {
  localStorage.clear();
  installWindowStub();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("crashDebug", () => {
  it("starts a new session and infers the previous active session crashed on next bootstrap", async () => {
    const first = await loadCrashDebugModule();
    const firstSessionId = first.initializeCrashDebugSession();
    first.logCrashBreadcrumb({
      level: "info",
      stage: "snapshot-sync-start",
      message: "Fetching snapshot",
    });

    const second = await loadCrashDebugModule();
    const secondSessionId = second.initializeCrashDebugSession();

    expect(firstSessionId).not.toBeNull();
    expect(secondSessionId).not.toBeNull();

    const sessions = second.loadCrashBreadcrumbSessions();
    expect(sessions).toHaveLength(2);
    expect(sessions[0]?.id).toBe(secondSessionId);
    expect(sessions[1]?.id).toBe(firstSessionId);
    expect(sessions[1]?.disposition).toBe("possible-renderer-crash");
    expect(sessions[1]?.breadcrumbs.some((entry) => entry.stage === "session-inferred-crash")).toBe(
      true,
    );
  });

  it("formats a compact crash report with snapshot and domain event summaries", async () => {
    const crashDebug = await loadCrashDebugModule();
    crashDebug.initializeCrashDebugSession();
    crashDebug.logCrashBreadcrumb({
      level: "info",
      stage: "domain-event",
      message: "Observed thread.turn-diff-completed.",
      detail: JSON.stringify({ sequence: 42 }),
    });
    crashDebug.logCrashBreadcrumb({
      level: "info",
      stage: "snapshot-sync-complete",
      message: "Applied orchestration snapshot 9.",
      detail: crashDebug.formatCrashSnapshotSummary({
        snapshotSequence: 9,
        projectCount: 1,
        threadCount: 2,
        totalMessageCount: 11,
        totalCheckpointCount: 4,
        totalActivityCount: 6,
        currentRoute: "/thread/test",
      }),
    });

    const report = crashDebug.buildCrashBreadcrumbReport();

    expect(report).toContain("Selected session disposition: active");
    expect(report).toContain("Latest snapshot summary:");
    expect(report).toContain('"snapshotSequence": 9');
    expect(report).toContain("Latest domain event:");
    expect(report).toContain("Observed thread.turn-diff-completed.");
  });

  it("clears breadcrumbs without dropping the active session", async () => {
    const crashDebug = await loadCrashDebugModule();
    const sessionId = crashDebug.initializeCrashDebugSession();
    crashDebug.logCrashBreadcrumb({
      level: "error",
      stage: "window-error",
      message: "Boom",
    });

    crashDebug.clearCrashBreadcrumbs();
    crashDebug.logCrashBreadcrumb({
      level: "info",
      stage: "page-show",
      message: "Page shown.",
    });

    const sessions = crashDebug.loadCrashBreadcrumbSessions();
    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.id).toBe(sessionId);
    expect(sessions[0]?.breadcrumbs).toHaveLength(1);
    expect(sessions[0]?.breadcrumbs[0]?.stage).toBe("page-show");
  });
});
