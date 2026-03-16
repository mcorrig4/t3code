import { type OrchestrationReadModel, type OrchestrationEvent } from "@t3tools/contracts";
import { Schema } from "effect";

export interface WebPushConfigShape {
  readonly enabled: boolean;
  readonly publicKey: string | null;
  readonly subject: string | null;
}

export interface WebPushSubscriptionRecord {
  readonly subscriptionId: string;
  readonly endpoint: string;
  readonly subscriptionJson: string;
  readonly userAgent: string | null;
  readonly appVersion: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly lastSeenAt: string;
  readonly lastDeliveredAt: string | null;
  readonly lastFailureAt: string | null;
  readonly lastError: string | null;
  readonly failureCount: number;
  readonly enabled: boolean;
}

export interface WebPushPayload {
  readonly version: 1;
  readonly kind:
    | "thread.turn.completed"
    | "thread.approval.requested"
    | "thread.user-input.requested";
  readonly eventSequence: number;
  readonly threadId: string;
  readonly projectId: string;
  readonly turnId: string | null;
  readonly requestId: string | null;
  readonly title: string;
  readonly body: string;
  readonly url: string;
  readonly tag: string;
  readonly createdAt: string;
  readonly requireInteraction: boolean;
}

export const WebPushSubscriptionKeysSchema = Schema.Struct({
  p256dh: Schema.String.check(Schema.isNonEmpty()),
  auth: Schema.String.check(Schema.isNonEmpty()),
});
export type WebPushSubscriptionKeys = typeof WebPushSubscriptionKeysSchema.Type;

export const WebPushSubscriptionJsonSchema = Schema.Struct({
  endpoint: Schema.String.check(Schema.isNonEmpty()),
  expirationTime: Schema.NullOr(Schema.Number),
  keys: WebPushSubscriptionKeysSchema,
});
export type WebPushSubscriptionJson = typeof WebPushSubscriptionJsonSchema.Type;

export const PutWebPushSubscriptionRequest = Schema.Struct({
  subscription: WebPushSubscriptionJsonSchema,
  userAgent: Schema.optional(Schema.NullOr(Schema.String)),
  appVersion: Schema.optional(Schema.NullOr(Schema.String)),
});
export type PutWebPushSubscriptionRequest = typeof PutWebPushSubscriptionRequest.Type;

export const DeleteWebPushSubscriptionRequest = Schema.Struct({
  subscription: Schema.Struct({
    endpoint: Schema.String.check(Schema.isNonEmpty()),
  }),
});
export type DeleteWebPushSubscriptionRequest = typeof DeleteWebPushSubscriptionRequest.Type;

export const WebPushConfigResponseSchema = Schema.Union([
  Schema.Struct({
    enabled: Schema.Literal(false),
  }),
  Schema.Struct({
    enabled: Schema.Literal(true),
    publicKey: Schema.String.check(Schema.isNonEmpty()),
    serviceWorkerPath: Schema.String.check(Schema.isNonEmpty()),
    manifestPath: Schema.String.check(Schema.isNonEmpty()),
  }),
]);
export type WebPushConfigResponse = typeof WebPushConfigResponseSchema.Type;

export class WebPushRequestError extends Schema.TaggedErrorClass<WebPushRequestError>()(
  "WebPushRequestError",
  {
    message: Schema.String,
  },
) {}

export interface NotificationIntentInput {
  readonly event: OrchestrationEvent;
  readonly snapshot: OrchestrationReadModel;
}
