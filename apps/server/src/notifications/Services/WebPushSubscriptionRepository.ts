import { Context } from "effect";
import type { Effect } from "effect";

import type { ProjectionRepositoryError } from "../../persistence/Errors.ts";
import type { WebPushSubscriptionRecord } from "../types.ts";

export interface WebPushSubscriptionRepositoryShape {
  readonly upsert: (input: {
    readonly endpoint: string;
    readonly subscriptionJson: string;
    readonly userAgent: string | null;
    readonly appVersion: string | null;
    readonly nowIso: string;
  }) => Effect.Effect<void, ProjectionRepositoryError>;
  readonly deleteByEndpoint: (input: {
    readonly endpoint: string;
  }) => Effect.Effect<void, ProjectionRepositoryError>;
  readonly listEnabled: () => Effect.Effect<
    ReadonlyArray<WebPushSubscriptionRecord>,
    ProjectionRepositoryError
  >;
  readonly markDelivered: (input: {
    readonly endpoint: string;
    readonly nowIso: string;
  }) => Effect.Effect<void, ProjectionRepositoryError>;
  readonly markFailure: (input: {
    readonly endpoint: string;
    readonly nowIso: string;
    readonly error: string;
  }) => Effect.Effect<void, ProjectionRepositoryError>;
}

export class WebPushSubscriptionRepository extends Context.Service<
  WebPushSubscriptionRepository,
  WebPushSubscriptionRepositoryShape
>()("t3/notifications/Services/WebPushSubscriptionRepository") {}
