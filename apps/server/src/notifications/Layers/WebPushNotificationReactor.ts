import { Cause, Effect, Layer, Stream } from "effect";

import { OrchestrationEngineService } from "../../orchestration/Services/OrchestrationEngine.ts";
import { WebPushNotificationReactor } from "../Services/WebPushNotificationReactor.ts";
import { WebPushNotifications } from "../Services/WebPushNotifications.ts";

const makeWebPushNotificationReactor = Effect.gen(function* () {
  const orchestrationEngine = yield* OrchestrationEngineService;
  const webPushNotifications = yield* WebPushNotifications;

  const start = () =>
    Effect.forkScoped(
      Stream.runForEach(orchestrationEngine.streamDomainEvents, (event) =>
        webPushNotifications.notifyEvent(event).pipe(
          Effect.catchCause((cause) => {
            if (Cause.hasInterruptsOnly(cause)) {
              return Effect.failCause(cause);
            }
            return Effect.logWarning("web push notification reactor failed to process event", {
              eventType: event.type,
              eventId: event.eventId,
              cause: Cause.pretty(cause),
            });
          }),
        ),
      ),
    ).pipe(Effect.asVoid);

  return {
    start,
  };
});

export const WebPushNotificationReactorLive = Layer.effect(
  WebPushNotificationReactor,
  makeWebPushNotificationReactor,
);
