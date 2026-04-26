import { Effect } from "effect";
import { HttpRouter, HttpServerRequest, HttpServerResponse } from "effect/unstable/http";

import { respondToAuthError } from "../../auth/http.ts";
import { ServerAuth } from "../../auth/Services/ServerAuth.ts";
import {
  buildWebPushConfigResponse,
  decodeDeleteSubscriptionBody,
  decodePutSubscriptionBody,
  isAllowedOrigin,
  toBadJsonError,
  WEB_PUSH_CONFIG_PATH,
  WEB_PUSH_SUBSCRIPTION_PATH,
} from "../../notifications/http.ts";
import { WebPushRequestError } from "../../notifications/types.ts";
import { WebPushNotifications } from "../../notifications/Services/WebPushNotifications.ts";

const authenticateRequest = Effect.gen(function* () {
  const request = yield* HttpServerRequest.HttpServerRequest;
  const serverAuth = yield* ServerAuth;
  yield* serverAuth.authenticateHttpRequest(request);
});

const respondToWebPushRequestError = (error: WebPushRequestError) =>
  Effect.succeed(
    HttpServerResponse.text(error.message, {
      status: error.message.includes("not configured") ? 409 : 400,
    }),
  );

const parseJsonBody = Effect.gen(function* () {
  const request = yield* HttpServerRequest.HttpServerRequest;
  return yield* request.json.pipe(
    Effect.mapError(
      (error) =>
        new WebPushRequestError({
          message: toBadJsonError(error).message,
        }),
    ),
  );
});

const ensureAllowedOrigin = Effect.gen(function* () {
  const request = yield* HttpServerRequest.HttpServerRequest;
  if (isAllowedOrigin(request as never)) {
    return;
  }
  return yield* new WebPushRequestError({
    message: "Forbidden origin",
  });
});

export const webPushConfigRouteLayer = HttpRouter.add(
  "GET",
  WEB_PUSH_CONFIG_PATH,
  Effect.gen(function* () {
    yield* authenticateRequest;
    const webPushNotifications = yield* WebPushNotifications;
    const response = buildWebPushConfigResponse({
      enabled: webPushNotifications.config.enabled,
      publicKey: webPushNotifications.config.publicKey,
    });

    return HttpServerResponse.jsonUnsafe(response, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  }).pipe(Effect.catchTag("AuthError", respondToAuthError)),
);

export const webPushSubscriptionGetMethodNotAllowedRouteLayer = HttpRouter.add(
  "GET",
  WEB_PUSH_SUBSCRIPTION_PATH,
  Effect.succeed(
    HttpServerResponse.text("Method Not Allowed", {
      status: 405,
      headers: { Allow: "PUT, DELETE" },
    }),
  ),
);

export const webPushSubscribeRouteLayer = HttpRouter.add(
  "PUT",
  WEB_PUSH_SUBSCRIPTION_PATH,
  Effect.gen(function* () {
    yield* authenticateRequest;
    yield* ensureAllowedOrigin;
    const bodyJson = yield* parseJsonBody;
    const body = decodePutSubscriptionBody(bodyJson);
    if (body instanceof Error) {
      return HttpServerResponse.text(body.message, { status: 400 });
    }

    const webPushNotifications = yield* WebPushNotifications;
    yield* webPushNotifications.subscribe({
      subscription: body.subscription,
      userAgent: body.userAgent ?? null,
      appVersion: body.appVersion ?? null,
    });

    return HttpServerResponse.empty({
      status: 204,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  }).pipe(
    Effect.catchTag("AuthError", respondToAuthError),
    Effect.catchTag("WebPushRequestError", respondToWebPushRequestError),
  ),
);

export const webPushUnsubscribeRouteLayer = HttpRouter.add(
  "DELETE",
  WEB_PUSH_SUBSCRIPTION_PATH,
  Effect.gen(function* () {
    yield* authenticateRequest;
    yield* ensureAllowedOrigin;
    const bodyJson = yield* parseJsonBody;
    const body = decodeDeleteSubscriptionBody(bodyJson);
    if (body instanceof Error) {
      return HttpServerResponse.text(body.message, { status: 400 });
    }

    const webPushNotifications = yield* WebPushNotifications;
    yield* webPushNotifications.unsubscribe({
      subscription: body.subscription,
    });

    return HttpServerResponse.empty({
      status: 204,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  }).pipe(
    Effect.catchTag("AuthError", respondToAuthError),
    Effect.catchTag("WebPushRequestError", respondToWebPushRequestError),
  ),
);
