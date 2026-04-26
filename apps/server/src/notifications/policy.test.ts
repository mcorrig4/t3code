import {
  ApprovalRequestId,
  CommandId,
  DEFAULT_PROVIDER_INTERACTION_MODE,
  EventId,
  MessageId,
  ProjectId,
  ThreadId,
  TurnId,
  type OrchestrationEvent,
  type OrchestrationReadModel,
} from "@t3tools/contracts";
import { describe, expect, it } from "vitest";

import { notificationIntentFromEvent } from "./policy.ts";

const asApprovalRequestId = (value: string): ApprovalRequestId => ApprovalRequestId.make(value);
const asCommandId = (value: string): CommandId => CommandId.make(value);
const asEventId = (value: string): EventId => EventId.make(value);
const asMessageId = (value: string): MessageId => MessageId.make(value);
const asProjectId = (value: string): ProjectId => ProjectId.make(value);
const asThreadId = (value: string): ThreadId => ThreadId.make(value);
const asTurnId = (value: string): TurnId => TurnId.make(value);

function makeSnapshot(): OrchestrationReadModel {
  return {
    snapshotSequence: 7,
    updatedAt: "2026-03-16T10:00:00.000Z",
    projects: [
      {
        id: asProjectId("project-1"),
        title: "Project",
        workspaceRoot: "/tmp/project",
        defaultModelSelection: {
          provider: "codex",
          model: "gpt-5.4",
        },
        scripts: [],
        createdAt: "2026-03-16T09:00:00.000Z",
        updatedAt: "2026-03-16T10:00:00.000Z",
        deletedAt: null,
      },
    ],
    threads: [
      {
        id: asThreadId("thread-1"),
        projectId: asProjectId("project-1"),
        title: "Important thread",
        modelSelection: {
          provider: "codex",
          model: "gpt-5.4",
        },
        runtimeMode: "full-access",
        interactionMode: DEFAULT_PROVIDER_INTERACTION_MODE,
        branch: null,
        worktreePath: null,
        latestTurn: {
          turnId: asTurnId("turn-1"),
          state: "completed",
          requestedAt: "2026-03-16T09:59:00.000Z",
          startedAt: "2026-03-16T09:59:01.000Z",
          completedAt: "2026-03-16T10:00:00.000Z",
          assistantMessageId: asMessageId("assistant-message-1"),
        },
        createdAt: "2026-03-16T09:00:00.000Z",
        updatedAt: "2026-03-16T10:00:00.000Z",
        deletedAt: null,
        messages: [
          {
            id: asMessageId("assistant-message-1"),
            role: "assistant",
            text: "This is the latest response from the assistant with enough detail to trim.",
            attachments: [],
            turnId: asTurnId("turn-1"),
            streaming: false,
            createdAt: "2026-03-16T10:00:00.000Z",
            updatedAt: "2026-03-16T10:00:00.000Z",
          },
        ],
        activities: [],
        proposedPlans: [],
        checkpoints: [],
        session: null,
      },
    ],
  };
}

function makeEvent(input: {
  readonly sequence: number;
  readonly type: OrchestrationEvent["type"];
  readonly payload: unknown;
  readonly metadata?: OrchestrationEvent["metadata"];
}): OrchestrationEvent {
  return {
    sequence: input.sequence,
    eventId: asEventId(`event-${input.sequence}`),
    type: input.type,
    aggregateKind: "thread",
    aggregateId: asThreadId("thread-1"),
    occurredAt: "2026-03-16T10:00:00.000Z",
    commandId: asCommandId(`command-${input.sequence}`),
    causationEventId: null,
    correlationId: null,
    metadata: input.metadata ?? {},
    payload: input.payload as never,
  } as OrchestrationEvent;
}

describe("notificationIntentFromEvent", () => {
  it("builds completion notifications from thread.turn-diff-completed", () => {
    const payload = notificationIntentFromEvent({
      snapshot: makeSnapshot(),
      event: makeEvent({
        sequence: 11,
        type: "thread.turn-diff-completed",
        payload: {
          threadId: "thread-1",
          turnId: "turn-1",
          checkpointTurnCount: 1,
          checkpointRef: "refs/t3/checkpoints/thread-1/turn/1",
          status: "ready",
          files: [],
          assistantMessageId: "assistant-message-1",
          completedAt: "2026-03-16T10:00:00.000Z",
        },
      }),
    });

    expect(payload).toEqual(
      expect.objectContaining({
        kind: "thread.turn.completed",
        threadId: "thread-1",
        url: "/?notificationThreadId=thread-1",
        tag: "thread-complete:thread-1:turn-1",
        requireInteraction: false,
      }),
    );
    expect(payload?.body.length).toBeLessThanOrEqual(160);
  });

  it("uses request ids for approval notification tags", () => {
    const payload = notificationIntentFromEvent({
      snapshot: makeSnapshot(),
      event: makeEvent({
        sequence: 12,
        type: "thread.activity-appended",
        metadata: {
          requestId: asApprovalRequestId("approval-123"),
        },
        payload: {
          threadId: "thread-1",
          activity: {
            id: "activity-approval-1",
            tone: "approval",
            kind: "approval.requested",
            summary: "Deploy to production?",
            payload: {},
            turnId: "turn-1",
            createdAt: "2026-03-16T10:00:00.000Z",
          },
        },
      }),
    });

    expect(payload).toEqual(
      expect.objectContaining({
        kind: "thread.approval.requested",
        requestId: "approval-123",
        tag: "thread-approval:thread-1:approval-123",
        requireInteraction: true,
      }),
    );
  });

  it("marks user input requests as requireInteraction", () => {
    const payload = notificationIntentFromEvent({
      snapshot: makeSnapshot(),
      event: makeEvent({
        sequence: 13,
        type: "thread.activity-appended",
        payload: {
          threadId: "thread-1",
          activity: {
            id: "activity-input-1",
            tone: "info",
            kind: "user-input.requested",
            summary: "Which branch should I use?",
            payload: {
              requestId: "input-123",
            },
            turnId: "turn-1",
            createdAt: "2026-03-16T10:00:00.000Z",
          },
        },
      }),
    });

    expect(payload).toEqual(
      expect.objectContaining({
        kind: "thread.user-input.requested",
        requestId: "input-123",
        tag: "thread-input:thread-1:input-123",
        requireInteraction: true,
      }),
    );
  });

  it("returns null for unrelated events", () => {
    const payload = notificationIntentFromEvent({
      snapshot: makeSnapshot(),
      event: makeEvent({
        sequence: 14,
        type: "thread.created",
        payload: {
          threadId: "thread-1",
          projectId: "project-1",
          title: "Important thread",
          modelSelection: {
            provider: "codex",
            model: "gpt-5.4",
          },
          runtimeMode: "full-access",
          interactionMode: DEFAULT_PROVIDER_INTERACTION_MODE,
          branch: null,
          worktreePath: null,
          createdAt: "2026-03-16T09:00:00.000Z",
        },
      }),
    });

    expect(payload).toBeNull();
  });
});
