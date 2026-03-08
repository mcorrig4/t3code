function resolvePageWebSocketUrl(location: Location): string {
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${location.host}`;
}

export function resolveWebSocketUrl(input?: {
  readonly bridgeUrl?: string | null | undefined;
  readonly envUrl?: string | null | undefined;
  readonly location?: Location;
}): string {
  const bridgeUrl = input?.bridgeUrl;
  if (typeof bridgeUrl === "string" && bridgeUrl.length > 0) {
    return bridgeUrl;
  }

  const envUrl = input?.envUrl;
  if (typeof envUrl === "string" && envUrl.length > 0) {
    return envUrl;
  }

  const location = input?.location ?? window.location;
  return resolvePageWebSocketUrl(location);
}

export function resolveHttpOriginFromWebSocketUrl(input?: {
  readonly bridgeUrl?: string | null | undefined;
  readonly envUrl?: string | null | undefined;
  readonly location?: Location;
}): string {
  const wsUrl = resolveWebSocketUrl(input);
  const httpUrl = wsUrl.replace(/^wss:/, "https:").replace(/^ws:/, "http:");

  try {
    return new URL(httpUrl).origin;
  } catch {
    const location = input?.location ?? window.location;
    return location.origin;
  }
}
