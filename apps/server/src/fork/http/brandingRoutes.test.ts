import { describe, expect, it } from "vitest";

import { getBrandingAssetRelativePath, renderForkBrandingManifest } from "../branding.ts";
import { tryBuildForkHtmlDocumentResponse } from "./brandingRoutes.ts";

function makeRequest(headers: Record<string, string>) {
  return { headers } as const;
}

describe("fork branding routes", () => {
  it("uses forwarded host branding when resolving canonical asset paths", () => {
    expect(
      getBrandingAssetRelativePath(
        "/apple-touch-icon.png",
        makeRequest({ "x-forwarded-host": "t3-dev.claude.do" }),
      ),
    ).toBe("apple-touch-icon-dev.png");
  });

  it("renders a root-scoped branded manifest", () => {
    const manifest = renderForkBrandingManifest(makeRequest({ host: "t3-dev.claude.do" }));

    expect(manifest).toContain('"scope": "/"');
    expect(manifest).toContain('"short_name": "T3 Dev"');
    expect(manifest).toContain('"theme_color": "#170308"');
  });

  it("brands upstream html documents before returning them", async () => {
    const response = tryBuildForkHtmlDocumentResponse({
      html: [
        "<!doctype html>",
        '<html lang="en">',
        "  <head>",
        '    <meta name="theme-color" content="#161616" />',
        "  </head>",
        "</html>",
      ].join("\n"),
      request: makeRequest({ host: "t3-dev.claude.do" }),
      contentType: "text/html; charset=utf-8",
    });

    expect(response).not.toBeNull();
    expect(response!.body._tag).toBe("Uint8Array");
    const html = new TextDecoder().decode(response!.body.body);
    expect(html).toContain('data-host-variant="t3-dev"');
    expect(html).toContain('rel="manifest" href="/manifest.webmanifest"');
  });
});
