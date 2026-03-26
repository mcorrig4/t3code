import { Effect, Layer, ServiceMap } from "effect";
import type { OrchestrationEvent, OrchestrationReadModel } from "@t3tools/contracts";

import { notificationIntentFromEvent } from "../../notifications/policy.ts";
import type { WebPushPayload } from "../../notifications/types.ts";

const NOTIFIABLE_EVENT_TYPES = new Set<OrchestrationEvent["type"]>([
  "thread.turn-diff-completed",
  "thread.activity-appended",
]);

export interface ForkNotificationIntentResolverShape {
  readonly isPotentiallyNotifiableEvent: (event: OrchestrationEvent) => boolean;
  readonly resolveNotificationIntent: (input: {
    readonly event: OrchestrationEvent;
    readonly snapshot: OrchestrationReadModel;
  }) => Effect.Effect<WebPushPayload | null>;
}

export class ForkNotificationIntentResolver extends ServiceMap.Service<
  ForkNotificationIntentResolver,
  ForkNotificationIntentResolverShape
>()("t3/fork/notifications/intentResolver/ForkNotificationIntentResolver") {}

const makeForkNotificationIntentResolver = Effect.succeed<ForkNotificationIntentResolverShape>({
  isPotentiallyNotifiableEvent: (event) => NOTIFIABLE_EVENT_TYPES.has(event.type),
  resolveNotificationIntent: ({ event, snapshot }) =>
    NOTIFIABLE_EVENT_TYPES.has(event.type)
      ? Effect.sync(() => notificationIntentFromEvent({ event, snapshot }))
      : Effect.succeed(null),
});

export const ForkNotificationIntentResolverLive = Layer.effect(
  ForkNotificationIntentResolver,
  makeForkNotificationIntentResolver,
);
