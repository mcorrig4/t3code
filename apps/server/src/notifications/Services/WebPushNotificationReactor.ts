import { Context } from "effect";
import type { Effect, Scope } from "effect";

export interface WebPushNotificationReactorShape {
  readonly start: () => Effect.Effect<void, never, Scope.Scope>;
}

export class WebPushNotificationReactor extends Context.Service<
  WebPushNotificationReactor,
  WebPushNotificationReactorShape
>()("t3/notifications/Services/WebPushNotificationReactor") {}
