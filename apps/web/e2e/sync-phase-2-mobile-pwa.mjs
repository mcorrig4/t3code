import { expectJsonResponse, expectNoBlockedHost } from "./shared/assertions.mjs";
import {
  ensureLoopbackAuthenticatedSession,
  resetServiceWorkerRegisterRecorder,
} from "./shared/auth.mjs";
import { createMobileSmokePage } from "./shared/browser.mjs";
import { runSmoke } from "./shared/smokeRunner.mjs";
import { resolveSmokeUrls } from "./shared/urls.mjs";

const { baseUrl } = resolveSmokeUrls();
const { browser, context, page } = await createMobileSmokePage();

try {
  await runSmoke("sync-phase-2", async () => {
    await page.addInitScript(() => {
      const serviceWorkerContainer = navigator.serviceWorker;
      if (!serviceWorkerContainer?.register) {
        return;
      }

      const originalRegister = serviceWorkerContainer.register.bind(serviceWorkerContainer);
      const registerCalls = [];
      Reflect.set(window, "__t3SwRegisterCalls", registerCalls);

      serviceWorkerContainer.register = async (...args) => {
        registerCalls.push({
          scriptUrl: typeof args[0] === "string" ? args[0] : String(args[0]),
          scope:
            typeof args[1] === "object" && args[1] !== null && "scope" in args[1]
              ? (args[1].scope ?? null)
              : null,
        });
        return originalRegister(...args);
      };
    });

    await ensureLoopbackAuthenticatedSession(page, baseUrl);
    await resetServiceWorkerRegisterRecorder(page);

    process.stdout.write("[sync-phase-2] loading dev app...\n");
    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});

    const bodyText = await page.locator("body").innerText();
    expectNoBlockedHost(bodyText);

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
      const registerCalls = Array.isArray(window.__t3SwRegisterCalls)
        ? window.__t3SwRegisterCalls
        : [];
      let registration = await navigator.serviceWorker.getRegistration("/");
      if (!registration) {
        registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      }

      await navigator.serviceWorker.ready.catch(() => undefined);
      return {
        registerCalls,
        hasRegistration: registration !== undefined,
        scope: registration?.scope ?? null,
      };
    });

    const autoRegistrationAttempted = serviceWorkerInfo.registerCalls.some(
      (call) => call.scriptUrl === "/sw.js" && call.scope === "/",
    );
    if (!autoRegistrationAttempted) {
      throw new Error(
        `App did not attempt root service worker registration during boot: ${JSON.stringify(
          serviceWorkerInfo.registerCalls,
        )}`,
      );
    }
    if (!serviceWorkerInfo.hasRegistration || !serviceWorkerInfo.scope?.endsWith("/")) {
      throw new Error(
        `Service worker did not register at root scope: ${JSON.stringify(serviceWorkerInfo)}`,
      );
    }
  });
} finally {
  await context.close();
  await browser.close();
}
