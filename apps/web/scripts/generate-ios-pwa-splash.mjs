import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { chromium, devices } from "playwright";

const require = createRequire(import.meta.url);

const webRoot = path.resolve(import.meta.dirname, "..");
const generatedDir = path.join(webRoot, "src", "generated");
const outputPath = path.join(generatedDir, "ios-pwa-splash-head.html");
const publicOutputDir = path.join(webRoot, "public", "ios-splash");
const iosPwaSplashSourcePath = require.resolve("ios-pwa-splash");
const devHostname = "t3-dev.claude.do";

const variants = [
  {
    key: "prod",
    iconPath: path.join(webRoot, "public", "apple-touch-icon.png"),
    backgroundColor: "#07101f",
  },
  {
    key: "dev",
    iconPath: path.join(webRoot, "public", "apple-touch-icon-dev.png"),
    backgroundColor: "#1c080c",
  },
];

function slugify(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function readStartupImageLinks() {
  return [...document.querySelectorAll('link[rel="apple-touch-startup-image"]')].map((link) => ({
    media: link.media,
    href: link.href,
  }));
}

function dedupeIosDeviceEntries() {
  const deduped = new Map();

  for (const [deviceName, descriptor] of Object.entries(devices)) {
    if (!/^(iPhone|iPad)/.test(deviceName) || deviceName.includes("landscape")) {
      continue;
    }

    const viewport = descriptor.viewport;
    const pixelRatio = descriptor.deviceScaleFactor ?? 1;
    const key = `${viewport.width}x${viewport.height}@${pixelRatio}`;

    if (deduped.has(key)) {
      continue;
    }

    deduped.set(key, {
      label: deviceName,
      slug: slugify(deviceName),
      viewportWidth: viewport.width,
      viewportHeight: viewport.height,
      deviceScaleFactor: pixelRatio,
    });
  }

  return [...deduped.values()].toSorted((left, right) => {
    if (left.viewportWidth !== right.viewportWidth) {
      return left.viewportWidth - right.viewportWidth;
    }

    if (left.viewportHeight !== right.viewportHeight) {
      return left.viewportHeight - right.viewportHeight;
    }

    return left.deviceScaleFactor - right.deviceScaleFactor;
  });
}

function dataUrlToBuffer(dataUrl) {
  const parts = dataUrl.split(",", 2);
  const payload = parts[1];
  if (!payload) {
    throw new Error("Unexpected splash data URL format.");
  }
  return Buffer.from(payload, "base64");
}

function createSplashScript(entriesByVariant) {
  return [
    "<script>",
    "(function () {",
    `  var isDevHost = window.location.hostname.trim().toLowerCase() === ${JSON.stringify(devHostname)};`,
    `  var splashSets = ${JSON.stringify(entriesByVariant)};`,
    "  var selected = isDevHost ? splashSets.dev : splashSets.prod;",
    "  for (var i = 0; i < selected.length; i += 1) {",
    "    var entry = selected[i];",
    "    var link = document.createElement('link');",
    "    link.setAttribute('rel', 'apple-touch-startup-image');",
    "    link.setAttribute('media', entry.media);",
    "    link.setAttribute('href', entry.href);",
    "    document.head.appendChild(link);",
    "  }",
    "})();",
    "</script>",
  ].join("\n");
}

async function waitForSplashLinks(page, iconDataUrl, backgroundColor) {
  return page.evaluate(
    ({ icon, background, readLinksSource }) =>
      new Promise((resolve, reject) => {
        // eslint-disable-next-line no-eval
        const readLinks = eval(`(${readLinksSource})`);

        const finish = (observer, links) => {
          observer?.disconnect();
          clearTimeout(timeoutId);
          resolve(links);
        };

        const maybeResolve = (observer) => {
          const links = readLinks();
          if (links.length >= 2) {
            finish(observer, links);
            return true;
          }
          return false;
        };

        const observer = new MutationObserver(() => {
          maybeResolve(observer);
        });

        const timeoutId = setTimeout(() => {
          observer.disconnect();
          const links = readLinks();
          if (links.length >= 2) {
            resolve(links);
            return;
          }
          reject(new Error(`Timed out waiting for splash links. Found ${links.length}.`));
        }, 3000);

        observer.observe(document.head, { childList: true });

        try {
          iosPWASplash(icon, background);
          maybeResolve(observer);
        } catch (error) {
          observer.disconnect();
          clearTimeout(timeoutId);
          reject(error);
        }
      }),
    {
      icon: iconDataUrl,
      background: backgroundColor,
      readLinksSource: readStartupImageLinks.toString(),
    },
  );
}

async function generateSplashAssetsForVariant(variant, deviceEntries, iosPwaSplashSource) {
  const iconBase64 = await readFile(variant.iconPath, "base64");
  const iconDataUrl = `data:image/png;base64,${iconBase64}`;
  const outputDirectory = path.join(publicOutputDir, variant.key);
  await rm(outputDirectory, { recursive: true, force: true });
  await mkdir(outputDirectory, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const outputEntries = [];

  try {
    for (const deviceEntry of deviceEntries) {
      const context = await browser.newContext({
        viewport: {
          width: deviceEntry.viewportWidth,
          height: deviceEntry.viewportHeight,
        },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: deviceEntry.deviceScaleFactor,
      });

      const page = await context.newPage();
      await page.setContent("<!doctype html><html><head></head><body></body></html>");
      await page.addScriptTag({ content: iosPwaSplashSource });

      const splashLinks = await waitForSplashLinks(page, iconDataUrl, variant.backgroundColor);

      const portrait = splashLinks.find((entry) => entry.media.includes("portrait"));
      const landscape = splashLinks.find((entry) => entry.media.includes("landscape"));

      if (!portrait || !landscape) {
        throw new Error(
          `ios-pwa-splash did not generate both orientations for ${deviceEntry.label}.`,
        );
      }

      const portraitWidth = deviceEntry.viewportWidth * deviceEntry.deviceScaleFactor;
      const portraitHeight = deviceEntry.viewportHeight * deviceEntry.deviceScaleFactor;
      const landscapeWidth = portraitHeight;
      const landscapeHeight = portraitWidth;
      const baseFileName = `${deviceEntry.slug}-${deviceEntry.viewportWidth}x${deviceEntry.viewportHeight}@${deviceEntry.deviceScaleFactor}`;

      const portraitFileName = `${baseFileName}-portrait-${portraitWidth}x${portraitHeight}.png`;
      const landscapeFileName = `${baseFileName}-landscape-${landscapeWidth}x${landscapeHeight}.png`;

      await writeFile(path.join(outputDirectory, portraitFileName), dataUrlToBuffer(portrait.href));
      await writeFile(
        path.join(outputDirectory, landscapeFileName),
        dataUrlToBuffer(landscape.href),
      );

      outputEntries.push({
        media:
          `screen and (device-width: ${deviceEntry.viewportWidth}px) and ` +
          `(device-height: ${deviceEntry.viewportHeight}px) and ` +
          `(-webkit-device-pixel-ratio: ${deviceEntry.deviceScaleFactor}) and (orientation: portrait)`,
        href: `/ios-splash/${variant.key}/${portraitFileName}`,
      });

      outputEntries.push({
        media:
          `screen and (device-width: ${deviceEntry.viewportWidth}px) and ` +
          `(device-height: ${deviceEntry.viewportHeight}px) and ` +
          `(-webkit-device-pixel-ratio: ${deviceEntry.deviceScaleFactor}) and (orientation: landscape)`,
        href: `/ios-splash/${variant.key}/${landscapeFileName}`,
      });

      await page.close();
      await context.close();
    }
  } finally {
    await browser.close();
  }

  return outputEntries;
}

const deviceEntries = dedupeIosDeviceEntries();
const iosPwaSplashSource = await readFile(iosPwaSplashSourcePath, "utf8");

await mkdir(generatedDir, { recursive: true });

const entriesByVariant = {
  prod: await generateSplashAssetsForVariant(variants[0], deviceEntries, iosPwaSplashSource),
  dev: await generateSplashAssetsForVariant(variants[1], deviceEntries, iosPwaSplashSource),
};

await writeFile(outputPath, `${createSplashScript(entriesByVariant)}\n`);
