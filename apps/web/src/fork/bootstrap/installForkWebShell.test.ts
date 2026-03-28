import { describe, expect, it, vi } from "vitest";

const installBrandingBootstrap = vi.fn();
const installBootShellBootstrap = vi.fn(() => ({ whenReady: Promise.resolve() }));
const installPwaBootstrap = vi.fn();
const installDebugBootstrap = vi.fn();

vi.mock("./brandingBootstrap", () => ({
  installBrandingBootstrap,
}));

vi.mock("./bootShellBootstrap", () => ({
  installBootShellBootstrap,
}));

vi.mock("./pwaBootstrap", () => ({
  installPwaBootstrap,
}));

vi.mock("./debugBootstrap", () => ({
  installDebugBootstrap,
}));

describe("installForkWebShell", () => {
  it("installs each bootstrap plugin through the single fork seam", async () => {
    const { installForkWebShell } = await import("./installForkWebShell");
    const doc = {} as Document;

    const handle = installForkWebShell({
      doc,
      hostname: "t3-dev.claude.do",
    });

    expect(installBrandingBootstrap).toHaveBeenCalledWith({
      doc,
      hostname: "t3-dev.claude.do",
    });
    expect(installBootShellBootstrap).toHaveBeenCalledOnce();
    expect(installPwaBootstrap).toHaveBeenCalledWith({
      doc,
      hostname: "t3-dev.claude.do",
    });
    expect(installDebugBootstrap).toHaveBeenCalledWith({
      doc,
      hostname: "t3-dev.claude.do",
    });

    await expect(handle.bootReady).resolves.toBeUndefined();
  });
});
