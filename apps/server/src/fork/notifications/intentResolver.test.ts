import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import {
  EventId,
  MessageId,
  ProjectId,
  ThreadId,
  TurnId,
  type OrchestrationEvent,
  type OrchestrationReadModel,
} from "@t3tools/contracts";
import { ForkNotificationIntentResolverLive } from "./intentResolver.ts";
import { ForkNotificationIntentResolver } from "./intentResolver.ts";

const asEventId = (value: string): EventId => EventId.makeUnsafe(value);
const asMessageId = (value: string): MessageId => MessageId.makeUnsafe(value);
const asProjectId = (value: string): ProjectId => ProjectId.makeUnsafe(value);
const asThreadId = (value: string): ThreadId => ThreadId.makeUnsafe(value);
const asTurnId = (value: string): TurnId => TurnId.makeUnsafe(value);

const snapshot = {
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
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      deletedAt: null,
    },
  ],
  threads: [
    {
      id: asThreadId("thread-1"),
      projectId: asProjectId("project-1"),
      title: "Thread",
      modelSelection: {
        provider: "codex",
        model: "gpt-5.4",
      },
      interactionMode: "default",
      runtimeMode: "full-access",
      branch: null,
      worktreePath: null,
      latestTurn: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      deletedAt: null,
      messages: [
        {
          id: asMessageId("assistant-1"),
          role: "assistant",
          text: "Finished the task.",
          attachments: [],
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          turnId: asTurnId("turn-1"),
          streaming: false,
        },
      ],
      proposedPlans: [],
      activities: [],
      checkpoints: [],
      session: null,
    },
  ],
} as unknown as OrchestrationReadModel;

const completionEvent = {
  type: "thread.turn-diff-completed",
  eventId: asEventId("event-1"),
  sequence: 1,
  occurredAt: "2026-01-01T00:00:00.000Z",
  metadata: {},
  payload: {
    threadId: asThreadId("thread-1"),
    turnId: asTurnId("turn-1"),
    assistantMessageId: asMessageId("assistant-1"),
    completedAt: "2026-01-01T00:00:00.000Z",
    files: [],
    checkpointTurnCount: 0,
    checkpointRef: "checkpoint-ref",
    status: "completed",
  },
} as unknown as OrchestrationEvent;

describe("ForkNotificationIntentResolver", () => {
  it("allowlists only the supported event types", async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const resolver = yield* ForkNotificationIntentResolver;
        expect(resolver.isPotentiallyNotifiableEvent(completionEvent)).toBe(true);
        expect(
          resolver.isPotentiallyNotifiableEvent({
            type: "project.created",
            eventId: asEventId("event-2"),
            sequence: 2,
            occurredAt: "2026-01-01T00:00:00.000Z",
            metadata: {},
            payload: {
              projectId: asProjectId("project-1"),
            },
          } as never),
        ).toBe(false);
      }).pipe(Effect.provide(ForkNotificationIntentResolverLive)),
    );
  });

  it("builds payloads for allowlisted events", async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const resolver = yield* ForkNotificationIntentResolver;
        const payload = yield* resolver.resolveNotificationIntent({
          event: completionEvent,
          snapshot,
        });

        expect(payload).toEqual(
          expect.objectContaining({
            kind: "thread.turn.completed",
            threadId: "thread-1",
            title: "Thread",
          }),
        );
      }).pipe(Effect.provide(ForkNotificationIntentResolverLive)),
    );
  });
});
