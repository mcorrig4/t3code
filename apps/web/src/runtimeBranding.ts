export const T3_DEV_HOSTNAME = "t3-dev.claude.do";
export const T3_DEV_HOST_VARIANT = "t3-dev";

export interface RuntimeBranding {
  readonly hostVariant?: string;
  readonly manifestPath?: string;
  readonly appleTouchIconPath?: string;
  readonly faviconPath?: string;
}

export function resolveRuntimeBranding(hostname: string): RuntimeBranding {
  if (hostname.trim().toLowerCase() !== T3_DEV_HOSTNAME) {
    return {};
  }

  return {
    hostVariant: T3_DEV_HOST_VARIANT,
    manifestPath: "/manifest-t3-dev.webmanifest",
    appleTouchIconPath: "/apple-touch-icon-dev.png",
    faviconPath: "/favicon-dev.ico",
  };
}

export function applyRuntimeBranding(doc: Document, hostname: string): void {
  const branding = resolveRuntimeBranding(hostname);

  if (branding.hostVariant) {
    doc.documentElement.dataset.hostVariant = branding.hostVariant;
  } else {
    delete doc.documentElement.dataset.hostVariant;
  }

  if (branding.manifestPath) {
    setLinkHref(doc, 'link[rel="manifest"]', branding.manifestPath);
  }

  if (branding.appleTouchIconPath) {
    setLinkHref(doc, 'link[rel="apple-touch-icon"]', branding.appleTouchIconPath);
  }

  if (branding.faviconPath) {
    setLinkHref(doc, 'link[rel="icon"]', branding.faviconPath);
    setLinkHref(doc, 'link[rel="shortcut icon"]', branding.faviconPath);
  }
}

function setLinkHref(doc: Document, selector: string, href: string): void {
  for (const link of doc.querySelectorAll<HTMLLinkElement>(selector)) {
    link.setAttribute("href", href);
  }
}
