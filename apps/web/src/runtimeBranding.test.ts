import { describe, expect, it } from "vitest";

import { T3_DEV_HOST_VARIANT, resolveRuntimeBranding } from "./runtimeBranding";

describe("resolveRuntimeBranding", () => {
  it("uses the red PWA assets on t3-dev", () => {
    expect(resolveRuntimeBranding("t3-dev.claude.do")).toEqual({
      hostVariant: T3_DEV_HOST_VARIANT,
      manifestPath: "/manifest-t3-dev.webmanifest",
      appleTouchIconPath: "/apple-touch-icon-dev.png",
      faviconPath: "/favicon-dev.ico",
    });
  });

  it("matches the dev host case-insensitively", () => {
    expect(resolveRuntimeBranding("T3-DEV.CLAUDE.DO").hostVariant).toBe(T3_DEV_HOST_VARIANT);
  });

  it("leaves other hosts unchanged", () => {
    expect(resolveRuntimeBranding("t3.claude.do")).toEqual({});
    expect(resolveRuntimeBranding("localhost")).toEqual({});
  });
});
