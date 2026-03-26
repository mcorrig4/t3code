export const T3_DEV_HOSTNAME = "t3-dev.claude.do";
export const T3_DEV_HOST_VARIANT = "t3-dev";

export type AppHostVariant = typeof T3_DEV_HOST_VARIANT;
export type LoaderVariant = "default" | "dev";

export interface AppManifestIcon {
  readonly src: string;
  readonly sizes: string;
  readonly type: string;
  readonly purpose: "any";
}

export interface AppBranding {
  readonly hostVariant?: AppHostVariant;
  readonly applicationName: string;
  readonly appleMobileWebAppTitle: string;
  readonly manifestShortName: string;
  readonly themeColor: string;
  readonly bootBackgroundColor: string;
  readonly bootGradientStart: string;
  readonly bootGradientMid: string;
  readonly bootGradientEnd: string;
  readonly darkAppBackground: string;
  readonly loaderVariant: LoaderVariant;
  readonly loaderAmbientCore: string;
  readonly loaderAmbientEdge: string;
  readonly loaderOutline: string;
  readonly loaderPrimaryStrong: string;
  readonly loaderPrimaryMedium: string;
  readonly loaderPrimarySoft: string;
  readonly loaderPrimaryGlow: string;
  readonly loaderCoreSoft: string;
  readonly loaderCoreStrong: string;
  readonly faviconIcoAssetPath: string;
  readonly favicon16AssetPath: string;
  readonly favicon32AssetPath: string;
  readonly appleTouchIconAssetPath: string;
}

const MANIFEST_ICONS = [
  {
    src: "/apple-touch-icon.png",
    sizes: "180x180",
    type: "image/png",
    purpose: "any",
  },
  {
    src: "/favicon-32x32.png",
    sizes: "32x32",
    type: "image/png",
    purpose: "any",
  },
  {
    src: "/favicon-16x16.png",
    sizes: "16x16",
    type: "image/png",
    purpose: "any",
  },
] as const satisfies readonly AppManifestIcon[];

const DEFAULT_BRANDING: AppBranding = {
  applicationName: "T3 Code",
  appleMobileWebAppTitle: "T3 Code",
  manifestShortName: "T3 Code",
  themeColor: "#07101f",
  bootBackgroundColor: "#07101f",
  bootGradientStart: "#0c1a35",
  bootGradientMid: "#07101f",
  bootGradientEnd: "#030810",
  darkAppBackground: "#07101f",
  loaderVariant: "default",
  loaderAmbientCore: "rgba(37,99,235,0.10)",
  loaderAmbientEdge: "rgba(30,64,175,0.03)",
  loaderOutline: "#2563eb",
  loaderPrimaryStrong: "#1e40af",
  loaderPrimaryMedium: "#2563eb",
  loaderPrimarySoft: "#3b82f6",
  loaderPrimaryGlow: "#60a5fa",
  loaderCoreSoft: "#93c5fd",
  loaderCoreStrong: "#dbeafe",
  faviconIcoAssetPath: "/favicon.ico",
  favicon16AssetPath: "/favicon-16x16.png",
  favicon32AssetPath: "/favicon-32x32.png",
  appleTouchIconAssetPath: "/apple-touch-icon.png",
};

const DEV_BRANDING: AppBranding = {
  hostVariant: T3_DEV_HOST_VARIANT,
  applicationName: "T3 Code (Dev)",
  appleMobileWebAppTitle: "T3 Code (Dev)",
  manifestShortName: "T3 Dev",
  themeColor: "#170308",
  bootBackgroundColor: "#170308",
  bootGradientStart: "#341016",
  bootGradientMid: "#170308",
  bootGradientEnd: "#070102",
  darkAppBackground: "#170308",
  loaderVariant: "dev",
  loaderAmbientCore: "rgba(244,63,94,0.12)",
  loaderAmbientEdge: "rgba(153,27,27,0.05)",
  loaderOutline: "#ef4444",
  loaderPrimaryStrong: "#991b1b",
  loaderPrimaryMedium: "#dc2626",
  loaderPrimarySoft: "#f43f5e",
  loaderPrimaryGlow: "#fda4af",
  loaderCoreSoft: "#fecdd3",
  loaderCoreStrong: "#fff1f2",
  faviconIcoAssetPath: "/favicon-dev.ico",
  favicon16AssetPath: "/favicon-dev-16x16.png",
  favicon32AssetPath: "/favicon-dev-32x32.png",
  appleTouchIconAssetPath: "/apple-touch-icon-dev.png",
};

export interface WebManifest {
  readonly id: "/";
  readonly name: string;
  readonly short_name: string;
  readonly description: "A minimal web GUI for using code agents like Codex.";
  readonly start_url: "/";
  readonly scope: "/";
  readonly display: "standalone";
  readonly background_color: string;
  readonly theme_color: string;
  readonly icons: readonly AppManifestIcon[];
}

export const BRANDING_HTML_MARKER = "<!-- app-branding-vars -->";

export function normalizeHostname(hostname: string): string {
  const value = hostname.trim().toLowerCase();
  if (value.length === 0) {
    return "";
  }

  if (value.startsWith("[")) {
    const closingIndex = value.indexOf("]");
    return closingIndex >= 0 ? value.slice(1, closingIndex) : value;
  }

  const colonIndex = value.indexOf(":");
  return colonIndex >= 0 ? value.slice(0, colonIndex) : value;
}

export function resolveAppBranding(hostname: string): AppBranding {
  return normalizeHostname(hostname) === T3_DEV_HOSTNAME ? DEV_BRANDING : DEFAULT_BRANDING;
}

export function buildBrandingCssVariables(branding: AppBranding): Readonly<Record<string, string>> {
  return {
    "--t3-app-dark-background": branding.darkAppBackground,
    "--t3-boot-background": branding.bootBackgroundColor,
    "--t3-boot-start": branding.bootGradientStart,
    "--t3-boot-mid": branding.bootGradientMid,
    "--t3-boot-end": branding.bootGradientEnd,
    "--t3-loader-ambient-core": branding.loaderAmbientCore,
    "--t3-loader-ambient-edge": branding.loaderAmbientEdge,
    "--t3-loader-outline": branding.loaderOutline,
    "--t3-loader-primary-strong": branding.loaderPrimaryStrong,
    "--t3-loader-primary-medium": branding.loaderPrimaryMedium,
    "--t3-loader-primary-soft": branding.loaderPrimarySoft,
    "--t3-loader-primary-glow": branding.loaderPrimaryGlow,
    "--t3-loader-core-soft": branding.loaderCoreSoft,
    "--t3-loader-core-strong": branding.loaderCoreStrong,
  };
}

export function buildWebManifest(branding: AppBranding): WebManifest {
  return {
    id: "/",
    name: branding.applicationName,
    short_name: branding.manifestShortName,
    description: "A minimal web GUI for using code agents like Codex.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: branding.bootBackgroundColor,
    theme_color: branding.themeColor,
    icons: MANIFEST_ICONS,
  };
}

export function isBrandingManifestPath(pathname: string): boolean {
  return pathname === "/manifest.webmanifest";
}

export function resolveBrandingAssetPath(pathname: string, branding: AppBranding): string | null {
  switch (pathname) {
    case "/favicon.ico":
      return branding.faviconIcoAssetPath;
    case "/favicon-16x16.png":
      return branding.favicon16AssetPath;
    case "/favicon-32x32.png":
      return branding.favicon32AssetPath;
    case "/apple-touch-icon.png":
      return branding.appleTouchIconAssetPath;
    default:
      return null;
  }
}

export function renderBrandingManifest(branding: AppBranding): string {
  return `${JSON.stringify(buildWebManifest(branding), null, 2)}\n`;
}

export function renderBrandingStyleTag(branding: AppBranding): string {
  const body = Object.entries(buildBrandingCssVariables(branding))
    .map(([name, value]) => `${name}:${value};`)
    .join("");
  return `<style id="t3-branding-vars">:root{${body}}</style>`;
}

export function applyBrandingToHtml(html: string, branding: AppBranding): string {
  const hostVariantAttribute = branding.hostVariant
    ? ` data-host-variant="${branding.hostVariant}"`
    : "";

  let output = html.replace(
    /<html([^>]*?)>/,
    (_match, attributes: string) => `<html${attributes}${hostVariantAttribute}>`,
  );

  output = output.replace(
    /<meta name="theme-color"([^>]*?)content="[^"]*"([^>]*?)\/>/g,
    `<meta name="theme-color"$1content="${branding.themeColor}"$2/>`,
  );

  output = output.replace(
    /<meta name="application-name"([^>]*?)content="[^"]*"([^>]*?)\/>/,
    `<meta name="application-name"$1content="${branding.applicationName}"$2/>`,
  );

  output = output.replace(
    /<meta name="apple-mobile-web-app-title"([^>]*?)content="[^"]*"([^>]*?)\/>/,
    `<meta name="apple-mobile-web-app-title"$1content="${branding.appleMobileWebAppTitle}"$2/>`,
  );

  return output.replace(BRANDING_HTML_MARKER, renderBrandingStyleTag(branding));
}
