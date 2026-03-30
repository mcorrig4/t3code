import { ServiceMap } from "effect";
import type { Effect } from "effect";
import type { OrchestrationEvent } from "@t3tools/contracts";

import type { WebPushConfigShape, WebPushRequestError, WebPushSubscriptionJson } from "../types.ts";

export interface WebPushNotificationsShape {
  readonly config: WebPushConfigShape;
  readonly subscribe: (input: {
    readonly subscription: WebPushSubscriptionJson;
    readonly userAgent: string | null;
    readonly appVersion: string | null;
  }) => Effect.Effect<void, WebPushRequestError>;
  readonly unsubscribe: (input: {
    readonly subscription: Pick<WebPushSubscriptionJson, "endpoint">;
  }) => Effect.Effect<void, WebPushRequestError>;
  readonly notifyEvent: (event: OrchestrationEvent) => Effect.Effect<void>;
}

export class WebPushNotifications extends ServiceMap.Service<
  WebPushNotifications,
  WebPushNotificationsShape
>()("t3/notifications/Services/WebPushNotifications") {}
