import {
  T3_DEV_HOSTNAME,
  T3_DEV_HOST_VARIANT,
  buildBrandingCssVariables,
  resolveAppBranding,
} from "@t3tools/shared/branding";

export { T3_DEV_HOSTNAME, T3_DEV_HOST_VARIANT };

export const APP_BOOT_THEME_COLOR = "#07101f";
const BRANDING_STYLE_ELEMENT_ID = "t3-branding-vars";

export interface RuntimeBranding {
  readonly hostVariant?: string;
  readonly themeColor: string;
}

export function resolveRuntimeBranding(hostname: string): RuntimeBranding {
  const branding = resolveAppBranding(hostname);
  return branding.hostVariant
    ? {
        hostVariant: branding.hostVariant,
        themeColor: branding.themeColor,
      }
    : {
        themeColor: branding.themeColor,
      };
}

export function applyRuntimeBranding(doc: Document, hostname: string): void {
  const branding = resolveRuntimeBranding(hostname);

  if (branding.hostVariant) {
    doc.documentElement.dataset.hostVariant = branding.hostVariant;
  } else {
    delete doc.documentElement.dataset.hostVariant;
  }

  setMetaContent(doc, 'meta[name="theme-color"]', branding.themeColor);
  setBrandingCssVariables(doc, hostname);
}

function setMetaContent(doc: Document, selector: string, content: string): void {
  for (const meta of doc.querySelectorAll<HTMLMetaElement>(selector)) {
    meta.setAttribute("content", content);
  }
}

function setBrandingCssVariables(doc: Document, hostname: string): void {
  const branding = resolveAppBranding(hostname);
  const styleTag = getOrCreateBrandingStyleTag(doc);
  styleTag.textContent = `:root{${Object.entries(buildBrandingCssVariables(branding))
    .map(([name, value]) => `${name}:${value};`)
    .join("")}}`;
}

function getOrCreateBrandingStyleTag(doc: Document): HTMLStyleElement {
  const existing = doc.getElementById(BRANDING_STYLE_ELEMENT_ID);
  if (existing instanceof HTMLStyleElement) {
    return existing;
  }

  const styleTag = doc.createElement("style");
  styleTag.id = BRANDING_STYLE_ELEMENT_ID;
  doc.head.append(styleTag);
  return styleTag;
}
