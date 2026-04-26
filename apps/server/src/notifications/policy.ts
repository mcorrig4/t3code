import type {
  OrchestrationMessage,
  OrchestrationReadModel,
  OrchestrationThread,
} from "@t3tools/contracts";

import type { NotificationIntentInput, WebPushPayload } from "./types.ts";

const MAX_NOTIFICATION_BODY_LENGTH = 160;
const NOTIFICATION_THREAD_QUERY_PARAM = "notificationThreadId";

function normalizeExcerpt(value: string): string {
  const collapsed = value.replace(/\s+/g, " ").trim();
  if (collapsed.length <= MAX_NOTIFICATION_BODY_LENGTH) {
    return collapsed;
  }
  return `${collapsed.slice(0, MAX_NOTIFICATION_BODY_LENGTH - 1).trimEnd()}…`;
}

function findThread(
  snapshot: OrchestrationReadModel,
  threadId: string,
): OrchestrationThread | undefined {
  return snapshot.threads.find((thread) => thread.id === threadId && thread.deletedAt === null);
}

function findMessage(
  thread: OrchestrationThread,
  messageId: string | null,
): OrchestrationMessage | undefined {
  if (!messageId) {
    return undefined;
  }
  return thread.messages.find((message) => message.id === messageId);
}

function titleForThread(thread: OrchestrationThread): string {
  return thread.title.length > 0 ? thread.title : "Thread";
}

function buildNotificationThreadUrl(threadId: string): string {
  return `/?${NOTIFICATION_THREAD_QUERY_PARAM}=${encodeURIComponent(threadId)}`;
}

export function notificationIntentFromEvent(input: NotificationIntentInput): WebPushPayload | null {
  const { event, snapshot } = input;

  switch (event.type) {
    case "thread.turn-diff-completed": {
      const thread = findThread(snapshot, event.payload.threadId);
      if (!thread) {
        return null;
      }

      const message = findMessage(thread, event.payload.assistantMessageId);
      const body =
        message && message.text.trim().length > 0
          ? normalizeExcerpt(message.text)
          : `New response in ${titleForThread(thread)}`;

      return {
        version: 1,
        kind: "thread.turn.completed",
        eventSequence: event.sequence,
        threadId: thread.id,
        projectId: thread.projectId,
        turnId: event.payload.turnId,
        requestId: null,
        title: titleForThread(thread),
        body,
        url: buildNotificationThreadUrl(thread.id),
        tag: `thread-complete:${thread.id}:${event.payload.turnId}`,
        createdAt: event.occurredAt,
        requireInteraction: false,
      };
    }

    case "thread.activity-appended": {
      const thread = findThread(snapshot, event.payload.threadId);
      if (!thread) {
        return null;
      }

      const activity = event.payload.activity;
      const requestId =
        event.metadata.requestId ??
        (activity.payload &&
        typeof activity.payload === "object" &&
        "requestId" in activity.payload &&
        typeof (activity.payload as { requestId?: unknown }).requestId === "string"
          ? (activity.payload as { requestId: string }).requestId
          : null);

      if (activity.kind === "approval.requested") {
        return {
          version: 1,
          kind: "thread.approval.requested",
          eventSequence: event.sequence,
          threadId: thread.id,
          projectId: thread.projectId,
          turnId: activity.turnId,
          requestId,
          title: titleForThread(thread),
          body:
            activity.summary.trim().length > 0
              ? normalizeExcerpt(activity.summary)
              : `Action requires approval in ${titleForThread(thread)}`,
          url: buildNotificationThreadUrl(thread.id),
          tag: `thread-approval:${thread.id}:${requestId ?? event.eventId}`,
          createdAt: event.occurredAt,
          requireInteraction: true,
        };
      }

      if (activity.kind === "user-input.requested") {
        return {
          version: 1,
          kind: "thread.user-input.requested",
          eventSequence: event.sequence,
          threadId: thread.id,
          projectId: thread.projectId,
          turnId: activity.turnId,
          requestId,
          title: titleForThread(thread),
          body:
            activity.summary.trim().length > 0
              ? normalizeExcerpt(activity.summary)
              : `Input requested in ${titleForThread(thread)}`,
          url: buildNotificationThreadUrl(thread.id),
          tag: `thread-input:${thread.id}:${requestId ?? event.eventId}`,
          createdAt: event.occurredAt,
          requireInteraction: true,
        };
      }

      return null;
    }

    default:
      return null;
  }
}
