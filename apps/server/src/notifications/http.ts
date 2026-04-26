import { Exit, Schema } from "effect";
import { formatSchemaError } from "@t3tools/shared/schemaJson";

import {
  DeleteWebPushSubscriptionRequest,
  PutWebPushSubscriptionRequest,
  type DeleteWebPushSubscriptionRequest as DeleteWebPushSubscriptionRequestBody,
  type PutWebPushSubscriptionRequest as PutWebPushSubscriptionRequestBody,
  type WebPushConfigResponse,
} from "./types.ts";

export const WEB_PUSH_CONFIG_PATH = "/api/web-push/config";
export const WEB_PUSH_SUBSCRIPTION_PATH = "/api/web-push/subscription";
export const WEB_PUSH_SERVICE_WORKER_PATH = "/sw.js";
export const WEB_PUSH_MANIFEST_PATH = "/manifest.webmanifest";

const decodePutSubscriptionRequest = Schema.decodeUnknownExit(PutWebPushSubscriptionRequest);
const decodeDeleteSubscriptionRequest = Schema.decodeUnknownExit(DeleteWebPushSubscriptionRequest);

type HeaderCarrier = {
  readonly headers: Record<string, string | string[] | undefined>;
};

export function decodePutSubscriptionBody(
  input: unknown,
): PutWebPushSubscriptionRequestBody | Error {
  const decoded = decodePutSubscriptionRequest(input);
  return Exit.isFailure(decoded)
    ? new Error(String(formatSchemaError(decoded.cause as never)))
    : decoded.value;
}

export function decodeDeleteSubscriptionBody(
  input: unknown,
): DeleteWebPushSubscriptionRequestBody | Error {
  const decoded = decodeDeleteSubscriptionRequest(input);
  return Exit.isFailure(decoded)
    ? new Error(String(formatSchemaError(decoded.cause as never)))
    : decoded.value;
}

export function resolveRequestOrigin(request: HeaderCarrier): string | null {
  const forwardedHost = request.headers["x-forwarded-host"];
  const host =
    typeof forwardedHost === "string"
      ? forwardedHost
      : Array.isArray(forwardedHost)
        ? (forwardedHost[0] ?? request.headers.host)
        : request.headers.host;
  if (typeof host !== "string" || host.length === 0) {
    return null;
  }

  const protoHeader = request.headers["x-forwarded-proto"];
  const proto =
    typeof protoHeader === "string" ? protoHeader.split(",")[0]?.trim() || "http" : "http";
  return `${proto}://${host}`;
}

export function isAllowedOrigin(request: HeaderCarrier): boolean {
  const originHeader = request.headers.origin;
  if (typeof originHeader !== "string" || originHeader.length === 0) {
    return false;
  }
  const requestOrigin = resolveRequestOrigin(request);
  return requestOrigin !== null && requestOrigin === originHeader;
}

export function buildWebPushConfigResponse(input: {
  readonly enabled: boolean;
  readonly publicKey: string | null;
}): WebPushConfigResponse {
  if (!input.enabled || input.publicKey === null) {
    return { enabled: false };
  }
  return {
    enabled: true,
    publicKey: input.publicKey,
    serviceWorkerPath: WEB_PUSH_SERVICE_WORKER_PATH,
    manifestPath: WEB_PUSH_MANIFEST_PATH,
  };
}

export function toBadJsonError(error: unknown): Error {
  return error instanceof SyntaxError
    ? new Error("Malformed JSON body")
    : error instanceof Error
      ? error
      : new Error("Malformed JSON body");
}
