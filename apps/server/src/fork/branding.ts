import type http from "node:http";

import {
  applyBrandingToHtml,
  isBrandingManifestPath,
  renderBrandingManifest,
  resolveAppBranding,
  resolveBrandingAssetPath,
} from "@t3tools/shared/branding";

function resolveHostHeaderValue(value: string | string[] | undefined): string {
  if (typeof value === "string") {
    return value;
  }
  return value?.[0] ?? "";
}

export function resolveBrandingForRequest(request: http.IncomingMessage) {
  const forwardedHost = resolveHostHeaderValue(request.headers["x-forwarded-host"]);
  const host = forwardedHost || resolveHostHeaderValue(request.headers.host);
  return resolveAppBranding(host);
}

export function getBrandingAssetRelativePath(
  pathname: string,
  request: http.IncomingMessage,
): string | null {
  const branding = resolveBrandingForRequest(request);
  return resolveBrandingAssetPath(pathname, branding)?.slice(1) ?? null;
}

export function isForkBrandingManifestPath(pathname: string): boolean {
  return isBrandingManifestPath(pathname);
}

export function renderForkBrandingManifest(request: http.IncomingMessage): string {
  return renderBrandingManifest(resolveBrandingForRequest(request));
}

export function applyForkBrandingToHtml(html: string, request: http.IncomingMessage): string {
  return applyBrandingToHtml(html, resolveBrandingForRequest(request));
}
