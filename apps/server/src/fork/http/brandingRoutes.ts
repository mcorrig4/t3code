import Mime from "@effect/platform-node/Mime";
import { Effect, FileSystem, Path } from "effect";
import type { HttpServerRequest } from "effect/unstable/http";
import { HttpServerResponse } from "effect/unstable/http";

import {
  applyForkBrandingToHtml,
  getBrandingAssetRelativePath,
  isForkBrandingManifestPath,
  renderForkBrandingManifest,
} from "../branding.ts";

export function tryBuildForkHtmlDocumentResponse(input: {
  readonly html: string;
  readonly request: HttpServerRequest;
  readonly contentType: string;
  readonly statusCode?: number;
}): HttpServerResponse.HttpServerResponse | null {
  if (!input.contentType.includes("text/html")) {
    return null;
  }

  return HttpServerResponse.text(applyForkBrandingToHtml(input.html, input.request), {
    status: input.statusCode ?? 200,
    contentType: input.contentType,
  });
}

export function tryHandleForkBrandingRequest(input: {
  readonly pathname: string;
  readonly request: HttpServerRequest;
  readonly staticRoot: string | undefined;
}): Effect.Effect<
  HttpServerResponse.HttpServerResponse | null,
  never,
  FileSystem.FileSystem | Path.Path
> {
  if (isForkBrandingManifestPath(input.pathname)) {
    return Effect.succeed(
      HttpServerResponse.text(renderForkBrandingManifest(input.request), {
        status: 200,
        contentType: "application/manifest+json; charset=utf-8",
      }),
    );
  }

  const brandingAssetRelativePath = getBrandingAssetRelativePath(input.pathname, input.request);
  if (!brandingAssetRelativePath) {
    return Effect.succeed(null);
  }

  return Effect.gen(function* () {
    if (!input.staticRoot) {
      return HttpServerResponse.text("Not Found", { status: 404 });
    }

    const path = yield* Path.Path;
    const fileSystem = yield* FileSystem.FileSystem;
    const brandingAssetPath = path.resolve(input.staticRoot, brandingAssetRelativePath);
    const brandingAssetInfo = yield* fileSystem
      .stat(brandingAssetPath)
      .pipe(Effect.catch(() => Effect.succeed(null)));
    if (!brandingAssetInfo || brandingAssetInfo.type !== "File") {
      return HttpServerResponse.text("Not Found", { status: 404 });
    }

    const contentType = Mime.getType(brandingAssetPath) ?? "application/octet-stream";
    const data = yield* fileSystem
      .readFile(brandingAssetPath)
      .pipe(Effect.catch(() => Effect.succeed(null)));
    if (!data) {
      return HttpServerResponse.text("Internal Server Error", { status: 500 });
    }

    return HttpServerResponse.uint8Array(data, {
      status: 200,
      contentType,
    });
  });
}
