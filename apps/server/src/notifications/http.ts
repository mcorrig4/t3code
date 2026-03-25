import type http from "node:http";

import { Exit, Schema } from "effect";
import { formatSchemaError } from "@t3tools/shared/schemaJson";

import {
  DeleteWebPushSubscriptionRequest,
  PutWebPushSubscriptionRequest,
  type DeleteWebPushSubscriptionRequest as DeleteWebPushSubscriptionRequestBody,
  type WebPushConfigResponse,
  type PutWebPushSubscriptionRequest as PutWebPushSubscriptionRequestBody,
} from "./types.ts";

export const WEB_PUSH_CONFIG_PATH = "/api/web-push/config";
export const WEB_PUSH_SUBSCRIPTION_PATH = "/api/web-push/subscription";
export const WEB_PUSH_SERVICE_WORKER_PATH = "/sw.js";
export const WEB_PUSH_MANIFEST_PATH = "/manifest.webmanifest";

const decodePutSubscriptionRequest = Schema.decodeUnknownExit(PutWebPushSubscriptionRequest);
const decodeDeleteSubscriptionRequest = Schema.decodeUnknownExit(DeleteWebPushSubscriptionRequest);

export function isWebPushConfigRequest(method: string | undefined, pathname: string): boolean {
  return method === "GET" && pathname === WEB_PUSH_CONFIG_PATH;
}

export function isWebPushSubscribeRequest(method: string | undefined, pathname: string): boolean {
  return method === "PUT" && pathname === WEB_PUSH_SUBSCRIPTION_PATH;
}

export function isWebPushUnsubscribeRequest(method: string | undefined, pathname: string): boolean {
  return method === "DELETE" && pathname === WEB_PUSH_SUBSCRIPTION_PATH;
}

export async function readJsonRequestBody(request: http.IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const body = Buffer.concat(chunks).toString("utf8");
  return body.length === 0 ? null : JSON.parse(body);
}

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

export function hasJsonContentType(request: http.IncomingMessage): boolean {
  const contentType = request.headers["content-type"];
  if (typeof contentType !== "string") {
    return false;
  }
  return contentType.toLowerCase().includes("application/json");
}

export function resolveRequestOrigin(request: http.IncomingMessage): string | null {
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

function isTrustedWebPushOrigin(originHeader: string): boolean {
  try {
    const origin = new URL(originHeader);
    return (
      origin.protocol === "https:" &&
      (origin.hostname === "claude.do" || origin.hostname.endsWith(".claude.do"))
    );
  } catch {
    return false;
  }
}

export function isAllowedOrigin(request: http.IncomingMessage): boolean {
  const originHeader = request.headers.origin;
  if (typeof originHeader !== "string" || originHeader.length === 0) {
    return false;
  }
  const requestOrigin = resolveRequestOrigin(request);
  return (
    (requestOrigin !== null && requestOrigin === originHeader) ||
    isTrustedWebPushOrigin(originHeader)
  );
}

export function validateWebPushOrigin(input: {
  request: http.IncomingMessage;
  origin: string | null;
}): string | null {
  const originHeader = input.request.headers.origin;
  if (typeof originHeader !== "string" || originHeader.length === 0) {
    return "Forbidden origin";
  }
  if (
    (input.origin !== null && input.origin === originHeader) ||
    isTrustedWebPushOrigin(originHeader)
  ) {
    return null;
  }
  if (input.origin === null || input.origin !== originHeader) {
    return "Forbidden origin";
  }
  return "Forbidden origin";
}

export function buildWebPushConfigResponse(input: {
  enabled: boolean;
  publicKey: string | null;
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
