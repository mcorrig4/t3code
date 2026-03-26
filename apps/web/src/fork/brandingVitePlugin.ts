import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  applyBrandingToHtml,
  isBrandingManifestPath,
  renderBrandingManifest,
  resolveAppBranding,
  resolveBrandingAssetPath,
} from "@t3tools/shared/branding";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin, ViteDevServer } from "vite";

function resolveHeaderValue(value: string | string[] | undefined): string {
  if (typeof value === "string") {
    return value;
  }
  return value?.[0] ?? "";
}

function resolveRequestHostname(request: IncomingMessage): string {
  const forwardedHost = resolveHeaderValue(request.headers["x-forwarded-host"]);
  return forwardedHost || resolveHeaderValue(request.headers.host);
}

function respond(
  response: ServerResponse,
  statusCode: number,
  contentType: string,
  body: string | Buffer,
): void {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", contentType);
  response.end(body);
}

function guessAssetContentType(assetPath: string): string {
  switch (path.extname(assetPath).toLowerCase()) {
    case ".png":
      return "image/png";
    case ".ico":
      return "image/x-icon";
    default:
      return "application/octet-stream";
  }
}

function shouldServeHtml(request: IncomingMessage, pathname: string): boolean {
  if (request.method !== "GET") {
    return false;
  }

  const accept = resolveHeaderValue(request.headers.accept);
  if (!accept.includes("text/html")) {
    return false;
  }

  if (
    pathname.startsWith("/@") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/src/") ||
    pathname.startsWith("/node_modules/") ||
    pathname.startsWith("/__") ||
    pathname === "/sw.js" ||
    pathname === "/service-worker.js"
  ) {
    return false;
  }

  return path.extname(pathname) === "";
}

async function serveBrandedIndexHtml(
  server: ViteDevServer,
  request: IncomingMessage,
): Promise<string> {
  const indexPath = path.resolve(server.config.root, "index.html");
  const rawHtml = await readFile(indexPath, "utf8");
  const transformed = await server.transformIndexHtml(request.url ?? "/", rawHtml);
  return applyBrandingToHtml(transformed, resolveAppBranding(resolveRequestHostname(request)));
}

export function t3ForkBrandingVitePlugin(): Plugin {
  return {
    name: "t3-fork-branding-vite",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        void (async () => {
          if (!request.url || request.method !== "GET") {
            next();
            return;
          }

          const url = new URL(request.url, "http://vite.local");
          const branding = resolveAppBranding(resolveRequestHostname(request));

          if (isBrandingManifestPath(url.pathname)) {
            respond(
              response,
              200,
              "application/manifest+json; charset=utf-8",
              renderBrandingManifest(branding),
            );
            return;
          }

          const brandingAssetPath = resolveBrandingAssetPath(url.pathname, branding);
          if (brandingAssetPath) {
            const publicRoot =
              typeof server.config.publicDir === "string" ? server.config.publicDir : null;
            if (!publicRoot) {
              respond(response, 404, "text/plain; charset=utf-8", "Not Found");
              return;
            }

            const filePath = path.resolve(publicRoot, brandingAssetPath.slice(1));
            try {
              const data = await readFile(filePath);
              respond(response, 200, guessAssetContentType(filePath), data);
            } catch {
              respond(response, 404, "text/plain; charset=utf-8", "Not Found");
            }
            return;
          }

          if (shouldServeHtml(request, url.pathname)) {
            const html = await serveBrandedIndexHtml(server, request);
            respond(response, 200, "text/html; charset=utf-8", html);
            return;
          }

          next();
        })().catch((error) => {
          next(error instanceof Error ? error : new Error("Failed to serve branded dev asset"));
        });
      });
    },
  };
}
