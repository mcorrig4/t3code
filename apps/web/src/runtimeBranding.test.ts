import { describe, expect, it } from "vitest";

import { T3_DEV_HOST_VARIANT, resolveRuntimeBranding } from "./runtimeBranding";

describe("resolveRuntimeBranding", () => {
  it("uses the dev branding on the dev host", () => {
    expect(resolveRuntimeBranding("t3-dev.claude.do")).toEqual({
      hostVariant: T3_DEV_HOST_VARIANT,
      themeColor: "#170308",
    });
  });

  it("matches the dev host case-insensitively", () => {
    expect(resolveRuntimeBranding("T3-DEV.CLAUDE.DO").hostVariant).toBe(T3_DEV_HOST_VARIANT);
  });

  it("leaves other hosts on the default palette", () => {
    expect(resolveRuntimeBranding("t3.claude.do")).toEqual({ themeColor: "#07101f" });
    expect(resolveRuntimeBranding("localhost")).toEqual({ themeColor: "#07101f" });
  });
});
