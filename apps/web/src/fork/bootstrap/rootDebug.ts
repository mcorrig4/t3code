import { type OrchestrationEvent, type OrchestrationThreadActivity } from "@t3tools/contracts";

import { logUserInputDebugLazy } from "../../debug/userInputDebug";

export function logForkDebugEvent(event: OrchestrationEvent): void {
  if (event.type === "thread.user-input-response-requested") {
    logUserInputDebugLazy(() => ({
      level: "info",
      stage: "domain-event",
      message: "Observed thread.user-input-response-requested",
      threadId: event.payload.threadId,
      requestId: event.payload.requestId,
      ...withDebugDetail(stringifyDebugDetail(event.payload.answers)),
    }));
    return;
  }

  if (event.type !== "thread.activity-appended") {
    return;
  }

  const activity = event.payload.activity;
  if (!isInterestingUserInputActivity(activity)) {
    return;
  }

  logUserInputDebugLazy(() => ({
    level: activity.kind === "provider.user-input.respond.failed" ? "error" : "success",
    stage: "domain-activity",
    message: `Observed ${activity.kind}`,
    threadId: event.payload.threadId,
    requestId: requestIdFromActivity(activity),
    ...withDebugDetail(
      stringifyDebugDetail({
        summary: activity.summary,
        payload: activity.payload,
      }),
    ),
  }));
}

export function describePendingUserInputFailure(activity: OrchestrationThreadActivity): string {
  const payload =
    activity.payload && typeof activity.payload === "object"
      ? (activity.payload as Record<string, unknown>)
      : null;
  const detail = payload && typeof payload.detail === "string" ? payload.detail.trim() : "";
  if (detail.length > 0) {
    return detail;
  }
  return "The pending question expired or no longer exists. Please ask the agent again if you still need to respond.";
}

function isInterestingUserInputActivity(activity: OrchestrationThreadActivity): boolean {
  return (
    activity.kind === "user-input.requested" ||
    activity.kind === "user-input.resolved" ||
    activity.kind === "provider.user-input.respond.failed"
  );
}

function requestIdFromActivity(activity: OrchestrationThreadActivity): string | null {
  const payload = activity.payload;
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const requestId = (payload as Record<string, unknown>).requestId;
  return typeof requestId === "string" ? requestId : null;
}

function stringifyDebugDetail(value: unknown): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function withDebugDetail(detail: string | undefined): { detail: string } | undefined {
  return typeof detail === "string" ? { detail } : undefined;
}
