import { expectJsonResponse, expectNoBlockedHost } from "./shared/assertions.mjs";
import { createMobileSmokePage } from "./shared/browser.mjs";
import { runSmoke } from "./shared/smokeRunner.mjs";
import { resolveSmokeUrls } from "./shared/urls.mjs";

const { baseUrl } = resolveSmokeUrls();
const { browser, page } = await createMobileSmokePage();

try {
  await runSmoke("sync-phase-2", async () => {
    process.stdout.write("[sync-phase-2] loading dev app...\n");
    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});

    const bodyText = await page.locator("body").innerText();
    expectNoBlockedHost(bodyText);

    process.stdout.write("[sync-phase-2] checking manifest metadata...\n");
    const manifestHref = await page.evaluate(() =>
      document.querySelector('link[rel="manifest"]')?.getAttribute("href"),
    );
    if (manifestHref !== "/manifest.webmanifest") {
      throw new Error(`Unexpected manifest href: ${manifestHref}`);
    }

    process.stdout.write("[sync-phase-2] fetching manifest from branded host...\n");
    const manifestResponse = await fetch(new URL("/manifest.webmanifest", baseUrl), {
      signal: AbortSignal.timeout(5_000),
      cache: "no-store",
    });
    const manifest = await expectJsonResponse(manifestResponse, "manifest.webmanifest");
    if (manifest.scope !== "/" || manifest.start_url !== "/") {
      throw new Error(`Unexpected manifest scope/start_url: ${JSON.stringify(manifest)}`);
    }

    const viewportMeta = await page.locator('meta[name="viewport"]').getAttribute("content");
    if (!viewportMeta?.includes("viewport-fit=cover")) {
      throw new Error(`Viewport meta is missing viewport-fit=cover: ${viewportMeta}`);
    }

    process.stdout.write("[sync-phase-2] checking service worker registration...\n");
    await page.waitForTimeout(1_000);
    const serviceWorkerInfo = await page.evaluate(async () => {
      const registration = await Promise.race([
        navigator.serviceWorker.getRegistration("/"),
        new Promise((_, reject) => {
          window.setTimeout(() => {
            reject(new Error("Timed out waiting for service worker registration"));
          }, 5_000);
        }),
      ]);
      return {
        hasRegistration: registration !== undefined,
        scope: registration?.scope ?? null,
      };
    });

    if (!serviceWorkerInfo.hasRegistration || !serviceWorkerInfo.scope?.endsWith("/")) {
      throw new Error(
        `Service worker did not register at root scope: ${JSON.stringify(serviceWorkerInfo)}`,
      );
    }
  });
} finally {
  await browser.close();
}
