import { Effect } from "effect";
import Mime from "@effect/platform-node/Mime";

import {
  applyForkBrandingToHtml,
  getBrandingAssetRelativePath,
  isForkBrandingManifestPath,
  renderForkBrandingManifest,
} from "../branding.ts";
import type { ForkHttpContext } from "./index.ts";

export interface ForkHtmlDocumentResponse {
  readonly statusCode: number;
  readonly headers: Record<string, string>;
  readonly body: string;
}

export function applyForkHttpBrandingToHtml(
  html: string,
  request: ForkHttpContext["request"],
): string {
  return applyForkBrandingToHtml(html, request);
}

export function tryBuildForkHtmlDocumentResponse(input: {
  readonly html: string;
  readonly request: ForkHttpContext["request"];
  readonly contentType: string;
  readonly statusCode?: number;
}): ForkHtmlDocumentResponse | null {
  if (!input.contentType.includes("text/html")) {
    return null;
  }

  return {
    statusCode: input.statusCode ?? 200,
    headers: { "Content-Type": input.contentType },
    body: applyForkHttpBrandingToHtml(input.html, input.request),
  };
}

export function tryHandleForkBrandingRequest(context: ForkHttpContext): Effect.Effect<boolean> {
  if (isForkBrandingManifestPath(context.url.pathname)) {
    context.respond(
      200,
      { "Content-Type": "application/manifest+json; charset=utf-8" },
      renderForkBrandingManifest(context.request),
    );
    return Effect.succeed(true);
  }

  const brandingAssetRelativePath = getBrandingAssetRelativePath(
    context.url.pathname,
    context.request,
  );
  if (!brandingAssetRelativePath) {
    return Effect.succeed(false);
  }

  return Effect.gen(function* () {
    if (!context.staticRoot) {
      return false;
    }

    const brandingAssetPath = context.path.resolve(context.staticRoot, brandingAssetRelativePath);
    const brandingAssetInfo = yield* context.fileSystem
      .stat(brandingAssetPath)
      .pipe(Effect.catch(() => Effect.succeed(null)));
    if (!brandingAssetInfo || brandingAssetInfo.type !== "File") {
      context.respond(404, { "Content-Type": "text/plain" }, "Not Found");
      return true;
    }

    const contentType = Mime.getType(brandingAssetPath) ?? "application/octet-stream";
    const data = yield* context.fileSystem
      .readFile(brandingAssetPath)
      .pipe(Effect.catch(() => Effect.succeed(null)));
    if (!data) {
      context.respond(500, { "Content-Type": "text/plain" }, "Internal Server Error");
      return true;
    }

    context.respond(200, { "Content-Type": contentType }, data);
    return true;
  });
}
