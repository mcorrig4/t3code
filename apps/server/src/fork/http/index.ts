import crypto from "node:crypto";
import type http from "node:http";

import { Effect, Schema } from "effect";
import type { FileSystem, Path } from "effect";

import type { ServerConfigShape } from "../../config.ts";
import type { WebPushNotificationsShape } from "../../notifications/Services/WebPushNotifications.ts";
import { applyForkHttpBrandingToHtml, tryHandleForkBrandingRequest } from "./brandingRoutes.ts";
import { tryHandleWebPushHttpRequest } from "./webPushRoutes.ts";

export class HttpAuthError extends Schema.TaggedErrorClass<HttpAuthError>()("HttpAuthError", {
  message: Schema.String,
  statusCode: Schema.Number,
}) {}

export class ForkHttpRequestError extends Schema.TaggedErrorClass<ForkHttpRequestError>()(
  "ForkHttpRequestError",
  {
    message: Schema.String,
    statusCode: Schema.Number,
  },
) {}

export interface ForkHttpContext {
  readonly request: http.IncomingMessage;
  readonly response: http.ServerResponse<http.IncomingMessage>;
  readonly url: URL;
  readonly serverConfig: ServerConfigShape;
  readonly webPushNotifications: WebPushNotificationsShape;
  readonly fileSystem: FileSystem.FileSystem;
  readonly path: Path.Path;
  readonly staticRoot: string | null;
  readonly respond: (
    statusCode: number,
    headers: Record<string, string>,
    body?: string | Uint8Array,
  ) => void;
}

export interface ForkHttpModule {
  readonly name: string;
  readonly tryHandle: (context: ForkHttpContext) => Effect.Effect<boolean>;
}

const forkHttpModules: readonly ForkHttpModule[] = [
  {
    name: "web-push",
    tryHandle: tryHandleWebPushHttpRequest,
  },
  {
    name: "branding",
    tryHandle: tryHandleForkBrandingRequest,
  },
];

function resolveRequestToken(request: http.IncomingMessage): string | null {
  const authorization = request.headers.authorization;
  if (typeof authorization === "string") {
    const match = authorization.match(/^Bearer\s+(.+)$/i);
    if (match) {
      return match[1]?.trim() || null;
    }
  }
  return null;
}

export const validateForkHttpAuth = (
  context: ForkHttpContext,
): Effect.Effect<void, HttpAuthError> =>
  Effect.gen(function* () {
    if (context.serverConfig.authToken === undefined) {
      return;
    }

    if (context.serverConfig.authToken === "") {
      yield* Effect.logWarning(
        "Fork HTTP auth: authToken is configured but empty — rejecting request. " +
          "Set a non-empty token or remove the auth configuration.",
      );
      return yield* new HttpAuthError({
        message: "Server auth misconfigured",
        statusCode: 500,
      });
    }

    const providedToken = resolveRequestToken(context.request);
    if (!providedToken) {
      return yield* new HttpAuthError({
        message: "Unauthorized request",
        statusCode: 401,
      });
    }

    const a = Buffer.from(providedToken, "utf8");
    const b = Buffer.from(context.serverConfig.authToken, "utf8");
    if (a.byteLength === b.byteLength && crypto.timingSafeEqual(a, b)) {
      return;
    }

    return yield* new HttpAuthError({
      message: "Unauthorized request",
      statusCode: 401,
    });
  });

export const tryHandleForkHttpRequest = (context: ForkHttpContext): Effect.Effect<boolean> =>
  Effect.gen(function* () {
    for (const module of forkHttpModules) {
      const handled = yield* module.tryHandle(context);
      if (handled) {
        return true;
      }
    }

    return false;
  });

export const renderForkHtmlDocument = (html: string, request: http.IncomingMessage): string =>
  applyForkHttpBrandingToHtml(html, request);
