import { Effect } from "effect";

import {
  buildWebPushConfigResponse,
  decodeDeleteSubscriptionBody,
  decodePutSubscriptionBody,
  hasJsonContentType,
  isAllowedOrigin,
  isWebPushConfigRequest,
  isWebPushSubscribeRequest,
  isWebPushUnsubscribeRequest,
  readJsonRequestBody,
  toBadJsonError,
} from "../../notifications/http.ts";
import type { ForkHttpContext } from "./index.ts";
import { ForkHttpRequestError, validateForkHttpAuth } from "./index.ts";

/**
 * Drain the unread request body to prevent keep-alive connection stalls.
 * Called on early-exit paths that respond before consuming the body.
 */
function drainRequestBody(context: ForkHttpContext): void {
  const req = context.request;
  if (!req.complete) {
    req.resume();
  }
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }
  return "Request failed";
}

function respondMethodNotAllowed(context: ForkHttpContext, allow: string): boolean {
  drainRequestBody(context);
  context.respond(405, { Allow: allow, "Content-Type": "text/plain" }, "Method Not Allowed");
  return true;
}

function ensureJsonRequest(context: ForkHttpContext): Effect.Effect<boolean> {
  if (hasJsonContentType(context.request)) {
    return Effect.succeed(true);
  }

  drainRequestBody(context);
  context.respond(415, { "Content-Type": "text/plain" }, "Expected application/json body");
  return Effect.succeed(false);
}

function ensureAllowedOrigin(context: ForkHttpContext): Effect.Effect<boolean> {
  if (isAllowedOrigin(context.request)) {
    return Effect.succeed(true);
  }

  drainRequestBody(context);
  context.respond(403, { "Content-Type": "text/plain" }, "Forbidden origin");
  return Effect.succeed(false);
}

function ensureAuthorized(context: ForkHttpContext): Effect.Effect<boolean> {
  return validateForkHttpAuth(context).pipe(
    Effect.match({
      onFailure: (error) => {
        drainRequestBody(context);
        context.respond(error.statusCode, { "Content-Type": "text/plain" }, error.message);
        return false;
      },
      onSuccess: () => true,
    }),
  );
}

function resolveRequestErrorStatus(error: unknown): number {
  if (typeof error === "object" && error !== null && "statusCode" in error) {
    const code = (error as { statusCode: unknown }).statusCode;
    if (typeof code === "number" && code >= 400 && code < 600) {
      return code;
    }
  }
  return 400;
}

function readJsonBody(context: ForkHttpContext): Effect.Effect<unknown | null> {
  return Effect.tryPromise({
    try: () => readJsonRequestBody(context.request),
    catch: (error) =>
      new ForkHttpRequestError({
        message: toBadJsonError(error).message,
        statusCode: resolveRequestErrorStatus(error),
      }),
  }).pipe(
    Effect.match({
      onFailure: (error) => {
        drainRequestBody(context);
        context.respond(error.statusCode, { "Content-Type": "text/plain" }, error.message);
        return null;
      },
      onSuccess: (body) => body,
    }),
  );
}

function subscribeRequest(context: ForkHttpContext): Effect.Effect<boolean> {
  return Effect.gen(function* () {
    if (!(yield* ensureAuthorized(context))) {
      return true;
    }
    if (!(yield* ensureJsonRequest(context))) {
      return true;
    }
    if (!(yield* ensureAllowedOrigin(context))) {
      return true;
    }

    const jsonBody = yield* readJsonBody(context);
    if (jsonBody === null) {
      return true;
    }

    const body = decodePutSubscriptionBody(jsonBody);
    if (body instanceof Error) {
      context.respond(400, { "Content-Type": "text/plain" }, body.message);
      return true;
    }

    const succeeded = yield* context.webPushNotifications
      .subscribe({
        subscription: body.subscription,
        userAgent: body.userAgent ?? null,
        appVersion: body.appVersion ?? null,
      })
      .pipe(
        Effect.match({
          onFailure: (error) => {
            const message = errorMessage(error);
            const statusCode = message.includes("not configured") ? 409 : 400;
            context.respond(statusCode, { "Content-Type": "text/plain" }, message);
            return false;
          },
          onSuccess: () => true,
        }),
      );

    if (!succeeded) {
      return true;
    }

    context.respond(204, { "Cache-Control": "no-store" });
    return true;
  });
}

function unsubscribeRequest(context: ForkHttpContext): Effect.Effect<boolean> {
  return Effect.gen(function* () {
    if (!(yield* ensureAuthorized(context))) {
      return true;
    }
    if (!(yield* ensureJsonRequest(context))) {
      return true;
    }
    if (!(yield* ensureAllowedOrigin(context))) {
      return true;
    }

    const jsonBody = yield* readJsonBody(context);
    if (jsonBody === null) {
      return true;
    }

    const body = decodeDeleteSubscriptionBody(jsonBody);
    if (body instanceof Error) {
      context.respond(400, { "Content-Type": "text/plain" }, body.message);
      return true;
    }

    const succeeded = yield* context.webPushNotifications
      .unsubscribe({
        subscription: body.subscription,
      })
      .pipe(
        Effect.match({
          onFailure: (error) => {
            const message = errorMessage(error);
            const statusCode = message.includes("not configured") ? 409 : 400;
            context.respond(statusCode, { "Content-Type": "text/plain" }, message);
            return false;
          },
          onSuccess: () => true,
        }),
      );

    if (!succeeded) {
      return true;
    }

    context.respond(204, { "Cache-Control": "no-store" });
    return true;
  });
}

export function tryHandleWebPushHttpRequest(context: ForkHttpContext): Effect.Effect<boolean> {
  if (isWebPushConfigRequest(context.request.method, context.url.pathname)) {
    return ensureAuthorized(context).pipe(
      Effect.map((authorized) => {
        if (!authorized) {
          return true;
        }

        const response = buildWebPushConfigResponse({
          enabled: context.webPushNotifications.config.enabled,
          publicKey: context.webPushNotifications.config.publicKey,
        });
        context.respond(
          200,
          {
            "Cache-Control": "no-store",
            "Content-Type": "application/json; charset=utf-8",
          },
          JSON.stringify(response),
        );
        return true;
      }),
    );
  }

  if (context.url.pathname === "/api/web-push/config") {
    return Effect.succeed(respondMethodNotAllowed(context, "GET"));
  }

  if (isWebPushSubscribeRequest(context.request.method, context.url.pathname)) {
    return subscribeRequest(context);
  }

  if (isWebPushUnsubscribeRequest(context.request.method, context.url.pathname)) {
    return unsubscribeRequest(context);
  }

  if (context.url.pathname === "/api/web-push/subscription") {
    return Effect.succeed(respondMethodNotAllowed(context, "PUT, DELETE"));
  }

  return Effect.succeed(false);
}
