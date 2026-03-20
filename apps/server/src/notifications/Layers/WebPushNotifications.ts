import { createRequire } from "node:module";

import { Effect, Layer, Schema } from "effect";

import { ServerConfig } from "../../config.ts";
import { ProjectionSnapshotQuery } from "../../orchestration/Services/ProjectionSnapshotQuery.ts";
import {
  WebPushNotifications,
  type WebPushNotificationsShape,
} from "../Services/WebPushNotifications.ts";
import { WebPushSubscriptionRepository } from "../Services/WebPushSubscriptionRepository.ts";
import { notificationIntentFromEvent } from "../policy.ts";
import { type WebPushConfigShape, WebPushRequestError } from "../types.ts";
import type { PushSubscription, SendResult } from "web-push";

const require = createRequire(import.meta.url);
const webPush = require("web-push") as typeof import("web-push");
const TRANSIENT_DELIVERY_ERROR_MAX_LENGTH = 512;

class WebPushDeliveryError extends Schema.TaggedErrorClass<WebPushDeliveryError>()(
  "WebPushDeliveryError",
  {
    message: Schema.String,
  },
) {}

class StoredSubscriptionDecodeError extends Schema.TaggedErrorClass<StoredSubscriptionDecodeError>()(
  "StoredSubscriptionDecodeError",
  {
    message: Schema.String,
  },
) {}

function summarizeDeliveryError(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message.slice(0, TRANSIENT_DELIVERY_ERROR_MAX_LENGTH);
  }
  return "Unknown web push delivery error";
}

function isPermanentDeliveryError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    ((error as { statusCode?: unknown }).statusCode === 404 ||
      (error as { statusCode?: unknown }).statusCode === 410)
  );
}

function decodeStoredSubscription(
  input: string,
): Effect.Effect<PushSubscription, StoredSubscriptionDecodeError> {
  return Effect.try({
    try: () => JSON.parse(input) as PushSubscription,
    catch: (error) =>
      new StoredSubscriptionDecodeError({
        message:
          error instanceof Error
            ? error.message
            : "Stored web push subscription JSON could not be parsed.",
      }),
  });
}

const makeWebPushNotifications = Effect.gen(function* () {
  const serverConfig = yield* ServerConfig;
  const projectionSnapshotQuery = yield* ProjectionSnapshotQuery;
  const repository = yield* WebPushSubscriptionRepository;

  const hasFullConfig =
    typeof serverConfig.webPushVapidPublicKey === "string" &&
    serverConfig.webPushVapidPublicKey.length > 0 &&
    typeof serverConfig.webPushVapidPrivateKey === "string" &&
    serverConfig.webPushVapidPrivateKey.length > 0 &&
    typeof serverConfig.webPushSubject === "string" &&
    serverConfig.webPushSubject.length > 0;

  const config: WebPushConfigShape = hasFullConfig
    ? {
        enabled: true,
        publicKey: serverConfig.webPushVapidPublicKey ?? null,
        subject: serverConfig.webPushSubject ?? null,
      }
    : {
        enabled: false,
        publicKey: null,
        subject: null,
      };

  if (config.enabled) {
    webPush.setVapidDetails(
      serverConfig.webPushSubject!,
      serverConfig.webPushVapidPublicKey!,
      serverConfig.webPushVapidPrivateKey!,
    );
  }

  const ensureEnabled = () =>
    config.enabled
      ? Effect.void
      : Effect.fail(
          new WebPushRequestError({
            message: "Web push notifications are not configured on this server.",
          }),
        );

  const subscribe: WebPushNotificationsShape["subscribe"] = (input) =>
    Effect.gen(function* () {
      yield* ensureEnabled();
      const nowIso = new Date().toISOString();
      yield* repository
        .upsert({
          endpoint: input.subscription.endpoint,
          subscriptionJson: JSON.stringify(input.subscription),
          userAgent: input.userAgent,
          appVersion: input.appVersion,
          nowIso,
        })
        .pipe(
          Effect.mapError(
            () =>
              new WebPushRequestError({
                message: "Failed to store the push subscription.",
              }),
          ),
        );
    });

  const unsubscribe: WebPushNotificationsShape["unsubscribe"] = (input) =>
    Effect.gen(function* () {
      yield* ensureEnabled();
      yield* repository
        .deleteByEndpoint({
          endpoint: input.subscription.endpoint,
        })
        .pipe(
          Effect.mapError(
            () =>
              new WebPushRequestError({
                message: "Failed to remove the push subscription.",
              }),
          ),
        );
    });

  const notifySubscription = (input: {
    readonly subscription: PushSubscription;
    readonly payload: string;
  }) =>
    Effect.tryPromise<SendResult, WebPushDeliveryError>({
      try: () => webPush.sendNotification(input.subscription, input.payload),
      catch: (error) =>
        new WebPushDeliveryError({
          message: error instanceof Error ? error.message : String(error),
        }),
    });

  const notifyEvent: WebPushNotificationsShape["notifyEvent"] = (event) =>
    Effect.gen(function* () {
      if (!config.enabled) {
        return;
      }

      const snapshot = yield* projectionSnapshotQuery
        .getSnapshot()
        .pipe(Effect.catch(() => Effect.succeed(null)));
      if (snapshot === null) {
        return;
      }

      const intent = notificationIntentFromEvent({ event, snapshot });
      if (intent === null) {
        return;
      }

      const subscriptions = yield* repository
        .listEnabled()
        .pipe(Effect.catch(() => Effect.succeed([])));
      if (subscriptions.length === 0) {
        return;
      }

      const payload = JSON.stringify(intent);
      yield* Effect.forEach(
        subscriptions,
        (subscriptionRecord) =>
          Effect.gen(function* () {
            const nowIso = new Date().toISOString();
            const subscription = yield* decodeStoredSubscription(
              subscriptionRecord.subscriptionJson,
            ).pipe(
              Effect.map((value) => value as PushSubscription | null),
              Effect.catch((error) =>
                Effect.gen(function* () {
                  yield* repository
                    .deleteByEndpoint({ endpoint: subscriptionRecord.endpoint })
                    .pipe(Effect.catch(() => Effect.void));
                  yield* Effect.logWarning("deleted malformed stored web push subscription", {
                    endpoint: subscriptionRecord.endpoint,
                    error: error.message,
                  });
                  return null;
                }),
              ),
            );
            if (subscription === null) {
              return;
            }
            const delivered = yield* notifySubscription({
              subscription,
              payload,
            }).pipe(
              Effect.as(true as const),
              Effect.catch((error) =>
                isPermanentDeliveryError(error)
                  ? repository.deleteByEndpoint({ endpoint: subscription.endpoint }).pipe(
                      Effect.catch(() => Effect.void),
                      Effect.as(false as const),
                    )
                  : repository
                      .markFailure({
                        endpoint: subscription.endpoint,
                        nowIso,
                        error: summarizeDeliveryError(error),
                      })
                      .pipe(
                        Effect.catch(() => Effect.void),
                        Effect.as(false as const),
                      ),
              ),
            );
            if (!delivered) {
              return;
            }
            yield* repository
              .markDelivered({
                endpoint: subscription.endpoint,
                nowIso,
              })
              .pipe(Effect.catch(() => Effect.void));
          }),
        { concurrency: 4, discard: true },
      );
    }).pipe(
      Effect.catchCause((cause) =>
        Effect.logWarning("failed to process web push notification event", { cause }),
      ),
    );

  return {
    config,
    subscribe,
    unsubscribe,
    notifyEvent,
  } satisfies WebPushNotificationsShape;
});

export const WebPushNotificationsLive = Layer.effect(
  WebPushNotifications,
  makeWebPushNotifications,
);
