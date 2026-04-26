import type { HttpServerRequest } from "effect/unstable/http";

import {
  applyBrandingToHtml,
  isBrandingManifestPath,
  renderBrandingManifest,
  resolveAppBranding,
  resolveBrandingAssetPath,
} from "@t3tools/shared/branding";

function resolveHostHeaderValue(value: string | ReadonlyArray<string> | undefined): string {
  if (typeof value === "string") {
    return value;
  }
  return value?.[0] ?? "";
}

export function resolveBrandingForRequest(
  request: HttpServerRequest,
): ReturnType<typeof resolveAppBranding> {
  const forwardedHost = resolveHostHeaderValue(request.headers["x-forwarded-host"]);
  const host = forwardedHost || resolveHostHeaderValue(request.headers.host);
  return resolveAppBranding(host);
}

export function getBrandingAssetRelativePath(
  pathname: string,
  request: HttpServerRequest,
): string | null {
  const branding = resolveBrandingForRequest(request);
  return resolveBrandingAssetPath(pathname, branding)?.slice(1) ?? null;
}

export function isForkBrandingManifestPath(pathname: string): boolean {
  return isBrandingManifestPath(pathname);
}

export function renderForkBrandingManifest(request: HttpServerRequest): string {
  return renderBrandingManifest(resolveBrandingForRequest(request));
}

export function applyForkBrandingToHtml(html: string, request: HttpServerRequest): string {
  return applyBrandingToHtml(html, resolveBrandingForRequest(request));
}
