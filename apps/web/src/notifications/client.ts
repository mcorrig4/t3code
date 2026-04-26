import { type WebPushConfigResponse } from "./types";

const WEB_PUSH_CONFIG_PATH = "/api/web-push/config";
const WEB_PUSH_SUBSCRIPTION_PATH = "/api/web-push/subscription";

function resolveServerAuthToken(): string | null {
  const bridgeUrl = window.desktopBridge?.getWsUrl?.();
  const envUrl = import.meta.env.VITE_WS_URL as string | undefined;
  const wsUrl =
    bridgeUrl && bridgeUrl.length > 0 ? bridgeUrl : envUrl && envUrl.length > 0 ? envUrl : null;
  if (!wsUrl) {
    return null;
  }

  try {
    return new URL(wsUrl).searchParams.get("token");
  } catch {
    return null;
  }
}

function buildAuthHeaders(headers: HeadersInit = {}): HeadersInit {
  const token = resolveServerAuthToken();
  if (!token) {
    return headers;
  }

  return {
    ...headers,
    Authorization: `Bearer ${token}`,
  };
}

function assertWebPushConfigResponse(value: unknown): WebPushConfigResponse {
  if (typeof value !== "object" || value === null || !("enabled" in value)) {
    throw new Error("Invalid web push config response.");
  }

  const candidate = value as {
    readonly enabled: unknown;
    readonly publicKey?: unknown;
    readonly serviceWorkerPath?: unknown;
    readonly manifestPath?: unknown;
  };

  if (candidate.enabled === false) {
    return { enabled: false };
  }

  if (
    candidate.enabled === true &&
    typeof candidate.publicKey === "string" &&
    typeof candidate.serviceWorkerPath === "string" &&
    typeof candidate.manifestPath === "string"
  ) {
    return {
      enabled: true,
      publicKey: candidate.publicKey,
      serviceWorkerPath: candidate.serviceWorkerPath,
      manifestPath: candidate.manifestPath,
    };
  }

  throw new Error("Invalid web push config response.");
}

async function readJsonResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text.length === 0) {
    return null;
  }
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("application/json")) {
    const trimmed = text.trimStart();
    if (trimmed.startsWith("<!doctype") || trimmed.startsWith("<html")) {
      throw new Error("Unexpected HTML response from the web push endpoint.");
    }
  }
  return JSON.parse(text);
}

async function assertOk(response: Response): Promise<void> {
  if (response.ok) {
    return;
  }

  const message = await response.text();
  throw new Error(message || `Request failed with status ${response.status}`);
}

export async function fetchWebPushConfig(): Promise<WebPushConfigResponse> {
  const response = await fetch(WEB_PUSH_CONFIG_PATH, {
    cache: "no-store",
    headers: buildAuthHeaders(),
  });
  await assertOk(response);
  return assertWebPushConfigResponse(await readJsonResponse(response));
}

export async function putSubscription(input: {
  readonly subscription: PushSubscriptionJSON;
  readonly appVersion: string;
}): Promise<void> {
  const response = await fetch(WEB_PUSH_SUBSCRIPTION_PATH, {
    method: "PUT",
    headers: buildAuthHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({
      subscription: input.subscription,
      userAgent: navigator.userAgent,
      appVersion: input.appVersion,
    }),
  });
  await assertOk(response);
}

export async function deleteSubscription(input: { readonly endpoint: string }): Promise<void> {
  const response = await fetch(WEB_PUSH_SUBSCRIPTION_PATH, {
    method: "DELETE",
    headers: buildAuthHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({
      subscription: {
        endpoint: input.endpoint,
      },
    }),
  });
  await assertOk(response);
}

export function decodeBase64UrlPublicKey(input: string): Uint8Array {
  const padded = `${input}${"=".repeat((4 - (input.length % 4 || 4)) % 4)}`;
  const base64 = padded.replaceAll("-", "+").replaceAll("_", "/");
  const decoded = atob(base64);
  const bytes = new Uint8Array(decoded.length);

  for (let index = 0; index < decoded.length; index += 1) {
    bytes[index] = decoded.charCodeAt(index);
  }

  return bytes;
}
