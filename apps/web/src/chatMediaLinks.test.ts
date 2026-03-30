import { describe, expect, it } from "vitest";

import { resolvePreviewableChatMediaLink } from "./chatMediaLinks";

const SERVER_HTTP_ORIGIN = "http://127.0.0.1:4317";
const WORKSPACE_ROOT = "/repo/project";

describe("resolvePreviewableChatMediaLink", () => {
  it("previews relative workspace image links", () => {
    expect(
      resolvePreviewableChatMediaLink({
        href: "test-results/foo.png",
        cwd: WORKSPACE_ROOT,
        workspaceRoot: WORKSPACE_ROOT,
        serverHttpOrigin: SERVER_HTTP_ORIGIN,
      }),
    ).toEqual({
      kind: "image",
      url: `${SERVER_HTTP_ORIGIN}/api/workspace-media?cwd=%2Frepo%2Fproject&path=%2Frepo%2Fproject%2Ftest-results%2Ffoo.png`,
      name: "foo.png",
      sourcePath: "/repo/project/test-results/foo.png",
    });
  });

  it("previews absolute in-workspace video links", () => {
    expect(
      resolvePreviewableChatMediaLink({
        href: "/repo/project/test-results/foo.webm",
        cwd: WORKSPACE_ROOT,
        workspaceRoot: WORKSPACE_ROOT,
        serverHttpOrigin: SERVER_HTTP_ORIGIN,
      }),
    ).toEqual({
      kind: "video",
      url: `${SERVER_HTTP_ORIGIN}/api/workspace-media?cwd=%2Frepo%2Fproject&path=%2Frepo%2Fproject%2Ftest-results%2Ffoo.webm`,
      name: "foo.webm",
      sourcePath: "/repo/project/test-results/foo.webm",
    });
  });

  it("does not preview files outside the workspace root", () => {
    expect(
      resolvePreviewableChatMediaLink({
        href: "/tmp/outside.png",
        cwd: WORKSPACE_ROOT,
        workspaceRoot: WORKSPACE_ROOT,
        serverHttpOrigin: SERVER_HTTP_ORIGIN,
      }),
    ).toBeNull();
  });

  it("previews attachment routes directly", () => {
    expect(
      resolvePreviewableChatMediaLink({
        href: "/attachments/thread-a/message-a/0.png",
        cwd: WORKSPACE_ROOT,
        workspaceRoot: WORKSPACE_ROOT,
        serverHttpOrigin: SERVER_HTTP_ORIGIN,
      }),
    ).toEqual({
      kind: "image",
      url: `${SERVER_HTTP_ORIGIN}/attachments/thread-a/message-a/0.png`,
      name: "0.png",
    });
  });

  it("does not preview unsupported extensions", () => {
    expect(
      resolvePreviewableChatMediaLink({
        href: "test-results/output.txt",
        cwd: WORKSPACE_ROOT,
        workspaceRoot: WORKSPACE_ROOT,
        serverHttpOrigin: SERVER_HTTP_ORIGIN,
      }),
    ).toBeNull();
  });
});
