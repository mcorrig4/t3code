import { beforeEach, describe, expect, it, vi } from "vitest";

const { logUserInputDebugLazy } = vi.hoisted(() => ({
  logUserInputDebugLazy: vi.fn(),
}));

vi.mock("../../debug/userInputDebug", () => ({
  logUserInputDebugLazy,
}));

import { describePendingUserInputFailure, logForkDebugEvent } from "./rootDebug";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("describePendingUserInputFailure", () => {
  it("prefers a trimmed payload detail when present", () => {
    expect(
      describePendingUserInputFailure({
        kind: "provider.user-input.respond.failed",
        summary: "failed",
        payload: {
          detail: "  Server said no  ",
        },
      } as never),
    ).toBe("Server said no");
  });

  it("falls back to the default recovery message", () => {
    expect(
      describePendingUserInputFailure({
        kind: "provider.user-input.respond.failed",
        summary: "failed",
        payload: {},
      } as never),
    ).toContain("Please ask the agent again");
  });
});

describe("logForkDebugEvent", () => {
  it("records user-input response requests", () => {
    logForkDebugEvent({
      type: "thread.user-input-response-requested",
      payload: {
        threadId: "thread-1",
        requestId: "req-1",
        answers: [{ text: "hello" }],
      },
    } as never);

    expect(logUserInputDebugLazy).toHaveBeenCalledOnce();
  });

  it("records interesting thread activities", () => {
    logForkDebugEvent({
      type: "thread.activity-appended",
      payload: {
        threadId: "thread-1",
        activity: {
          kind: "provider.user-input.respond.failed",
          summary: "failed",
          payload: {
            requestId: "req-2",
            detail: "boom",
          },
        },
      },
    } as never);

    expect(logUserInputDebugLazy).toHaveBeenCalledOnce();
  });

  it("ignores unrelated domain events", () => {
    logForkDebugEvent({
      type: "thread.completed",
      payload: {
        threadId: "thread-1",
      },
    } as never);

    expect(logUserInputDebugLazy).not.toHaveBeenCalled();
  });
});
