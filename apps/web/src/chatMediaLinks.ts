import { resolveMarkdownFileLinkTarget } from "./markdown-links";
import { basenameOfPath } from "./vscode-icons";

export type ChatMediaKind = "image" | "video";

export interface PreviewableChatMediaLink {
  kind: ChatMediaKind;
  url: string;
  name: string;
  sourcePath?: string;
}

const IMAGE_EXTENSIONS = new Set([
  ".avif",
  ".bmp",
  ".gif",
  ".heic",
  ".heif",
  ".ico",
  ".jpeg",
  ".jpg",
  ".png",
  ".svg",
  ".tiff",
  ".webp",
]);
const VIDEO_EXTENSIONS = new Set([".m4v", ".mov", ".mp4", ".ogv", ".webm"]);
const ATTACHMENTS_ROUTE_PREFIX = "/attachments/";
const WORKSPACE_MEDIA_ROUTE = "/api/workspace-media";
const POSITION_SUFFIX_PATTERN = /:\d+(?::\d+)?$/;
const WINDOWS_DRIVE_PATTERN = /^[A-Za-z]:[\\/]/;

function normalizePathSeparators(value: string): string {
  return value.replaceAll("\\", "/");
}

function normalizeComparablePath(value: string): string {
  const normalized = normalizePathSeparators(value).replace(/\/+$/, "");
  return WINDOWS_DRIVE_PATTERN.test(normalized) ? normalized.toLowerCase() : normalized;
}

function stripSearchAndHash(value: string): string {
  const hashIndex = value.indexOf("#");
  const withoutHash = hashIndex >= 0 ? value.slice(0, hashIndex) : value;
  const queryIndex = withoutHash.indexOf("?");
  return queryIndex >= 0 ? withoutHash.slice(0, queryIndex) : withoutHash;
}

function stripPositionSuffix(targetPath: string): string {
  if (!POSITION_SUFFIX_PATTERN.test(targetPath)) {
    return targetPath;
  }
  const withoutSuffix = targetPath.replace(POSITION_SUFFIX_PATTERN, "");
  if (withoutSuffix.length === 0) {
    return targetPath;
  }
  if (WINDOWS_DRIVE_PATTERN.test(targetPath) && /^[A-Za-z]:$/.test(withoutSuffix)) {
    return targetPath;
  }
  return withoutSuffix;
}

function extensionOfPath(pathValue: string): string {
  const cleanPath = stripSearchAndHash(pathValue).toLowerCase();
  const slashIndex = Math.max(cleanPath.lastIndexOf("/"), cleanPath.lastIndexOf("\\"));
  const base = slashIndex >= 0 ? cleanPath.slice(slashIndex + 1) : cleanPath;
  const dotIndex = base.lastIndexOf(".");
  if (dotIndex <= 0) return "";
  return base.slice(dotIndex);
}

function mediaKindFromPath(pathValue: string): ChatMediaKind | null {
  const extension = extensionOfPath(pathValue);
  if (IMAGE_EXTENSIONS.has(extension)) return "image";
  if (VIDEO_EXTENSIONS.has(extension)) return "video";
  return null;
}

function pathWithinRoot(targetPath: string, rootPath: string): boolean {
  const comparableTarget = normalizeComparablePath(targetPath);
  const comparableRoot = normalizeComparablePath(rootPath);
  return (
    comparableTarget === comparableRoot ||
    comparableTarget.startsWith(
      comparableRoot.endsWith("/") ? comparableRoot : `${comparableRoot}/`,
    )
  );
}

function buildWorkspaceMediaUrl(
  serverHttpOrigin: string,
  workspaceRoot: string,
  targetPath: string,
): string {
  return `${serverHttpOrigin}${WORKSPACE_MEDIA_ROUTE}?cwd=${encodeURIComponent(
    workspaceRoot,
  )}&path=${encodeURIComponent(targetPath)}`;
}

function deriveMediaName(input: { path?: string; href?: string }): string {
  if (input.path) {
    return basenameOfPath(normalizePathSeparators(input.path));
  }
  if (!input.href) {
    return "media";
  }
  const cleanHref = stripSearchAndHash(input.href);
  if (cleanHref.length === 0) {
    return "media";
  }
  try {
    const parsed = new URL(input.href, "http://localhost");
    return basenameOfPath(parsed.pathname) || "media";
  } catch {
    return basenameOfPath(cleanHref) || "media";
  }
}

function resolveAppHostedMediaLink(
  href: string,
  serverHttpOrigin: string,
): PreviewableChatMediaLink | null {
  try {
    const parsed = new URL(href, serverHttpOrigin);
    if (parsed.origin !== serverHttpOrigin) {
      return null;
    }

    if (parsed.pathname.startsWith(ATTACHMENTS_ROUTE_PREFIX)) {
      const kind = mediaKindFromPath(parsed.pathname);
      if (!kind) return null;
      return {
        kind,
        url: parsed.toString(),
        name: deriveMediaName({ href: parsed.pathname }),
      };
    }

    if (parsed.pathname !== WORKSPACE_MEDIA_ROUTE) {
      return null;
    }

    const targetPath = parsed.searchParams.get("path");
    const kind = targetPath ? mediaKindFromPath(targetPath) : null;
    if (!kind || !targetPath) return null;
    return {
      kind,
      url: parsed.toString(),
      name: deriveMediaName({ path: targetPath }),
      sourcePath: targetPath,
    };
  } catch {
    return null;
  }
}

export function resolvePreviewableChatMediaLink(input: {
  href: string | undefined;
  cwd?: string;
  workspaceRoot?: string;
  serverHttpOrigin: string;
}): PreviewableChatMediaLink | null {
  const href = input.href?.trim();
  if (!href) return null;

  const appHostedMedia = resolveAppHostedMediaLink(href, input.serverHttpOrigin);
  if (appHostedMedia) {
    return appHostedMedia;
  }

  if (!input.cwd || !input.workspaceRoot) {
    return null;
  }

  const resolvedTarget = resolveMarkdownFileLinkTarget(href, input.cwd);
  if (!resolvedTarget) {
    return null;
  }

  const normalizedTargetPath = stripPositionSuffix(resolvedTarget);
  const kind = mediaKindFromPath(normalizedTargetPath);
  if (!kind) {
    return null;
  }
  if (!pathWithinRoot(normalizedTargetPath, input.workspaceRoot)) {
    return null;
  }

  return {
    kind,
    url: buildWorkspaceMediaUrl(input.serverHttpOrigin, input.workspaceRoot, normalizedTargetPath),
    name: deriveMediaName({ path: normalizedTargetPath }),
    sourcePath: normalizedTargetPath,
  };
}
