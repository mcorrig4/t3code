import { describe, expect, it } from "vitest";

import {
  BRANDING_HTML_MARKER,
  T3_DEV_HOSTNAME,
  T3_DEV_HOST_VARIANT,
  applyBrandingToHtml,
  buildBrandingCssVariables,
  buildWebManifest,
  normalizeHostname,
  resolveBrandingAssetPath,
  resolveAppBranding,
} from "./branding.ts";

describe("resolveAppBranding", () => {
  it("returns the dev branding for the dev host", () => {
    const branding = resolveAppBranding(T3_DEV_HOSTNAME);
    expect(branding.hostVariant).toBe(T3_DEV_HOST_VARIANT);
    expect(branding.loaderVariant).toBe("dev");
    expect(branding.themeColor).toBe("#170308");
    expect(branding.applicationName).toBe("T3 Code (Dev)");
    expect(branding.manifestShortName).toBe("T3 Dev");
  });

  it("normalizes hosts before resolving branding", () => {
    expect(normalizeHostname("T3-DEV.CLAUDE.DO:443")).toBe(T3_DEV_HOSTNAME);
    expect(resolveAppBranding("T3-DEV.CLAUDE.DO:443").hostVariant).toBe(T3_DEV_HOST_VARIANT);
  });

  it("builds canonical manifest metadata with stable asset urls", () => {
    const manifest = buildWebManifest(resolveAppBranding(T3_DEV_HOSTNAME));
    expect(manifest.background_color).toBe("#170308");
    expect(manifest.name).toBe("T3 Code (Dev)");
    expect(manifest.short_name).toBe("T3 Dev");
    expect(manifest.icons).toEqual([
      expect.objectContaining({ src: "/apple-touch-icon.png", sizes: "180x180" }),
      expect.objectContaining({ src: "/favicon-32x32.png", sizes: "32x32" }),
      expect.objectContaining({ src: "/favicon-16x16.png", sizes: "16x16" }),
    ]);
  });

  it("exposes css variables for the active branding palette", () => {
    const variables = buildBrandingCssVariables(resolveAppBranding(T3_DEV_HOSTNAME));
    expect(variables["--t3-boot-mid"]).toBe("#170308");
    expect(variables["--t3-loader-primary-medium"]).toBe("#dc2626");
  });

  it("maps canonical asset routes to the active branding assets", () => {
    const branding = resolveAppBranding(T3_DEV_HOSTNAME);
    expect(resolveBrandingAssetPath("/favicon.ico", branding)).toBe("/favicon-dev.ico");
    expect(resolveBrandingAssetPath("/apple-touch-icon.png", branding)).toBe(
      "/apple-touch-icon-dev.png",
    );
  });

  it("applies branding to html shells with an existing marker", () => {
    const branded = applyBrandingToHtml(
      [
        '<html lang="en">',
        '<meta name="theme-color" media="(prefers-color-scheme: light)" content="#07101f" />',
        '<meta name="application-name" content="T3 Code" />',
        '<meta name="apple-mobile-web-app-title" content="T3 Code" />',
        BRANDING_HTML_MARKER,
        "</html>",
      ].join("\n"),
      resolveAppBranding(T3_DEV_HOSTNAME),
    );
    expect(branded).toContain('data-host-variant="t3-dev"');
    expect(branded).toContain('content="#170308"');
    expect(branded).toContain('meta name="application-name" content="T3 Code (Dev)"');
    expect(branded).toContain('meta name="apple-mobile-web-app-title" content="T3 Code (Dev)"');
    expect(branded).toContain("--t3-boot-mid:#170308;");
  });

  it("injects missing manifest and branding tags into the upstream html shell", () => {
    const branded = applyBrandingToHtml(
      [
        "<!doctype html>",
        '<html lang="en">',
        "  <head>",
        '    <meta name="theme-color" content="#161616" />',
        "  </head>",
        "</html>",
      ].join("\n"),
      resolveAppBranding(T3_DEV_HOSTNAME),
    );

    expect(branded).toContain('rel="manifest" href="/manifest.webmanifest"');
    expect(branded).toContain('meta name="application-name" content="T3 Code (Dev)"');
    expect(branded).toContain('meta name="apple-mobile-web-app-title" content="T3 Code (Dev)"');
    expect(branded).toContain('<style id="t3-branding-vars">');
  });

  it("updates the document title for host-specific branding variants", () => {
    const branded = applyBrandingToHtml(
      [
        "<!doctype html>",
        '<html lang="en">',
        "  <head>",
        "    <title>T3 Code (Alpha)</title>",
        "  </head>",
        "</html>",
      ].join("\n"),
      resolveAppBranding(T3_DEV_HOSTNAME),
    );

    expect(branded).toContain("<title>T3 Code (Dev)</title>");
  });
});
