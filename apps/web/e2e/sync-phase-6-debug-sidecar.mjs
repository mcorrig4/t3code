import { expect, expectNoApplicationError, expectNoBlockedHost } from "./shared/assertions.mjs";
import { clearLocalStorageKeys, createDesktopSmokePage } from "./shared/browser.mjs";
import { runSmoke } from "./shared/smokeRunner.mjs";
import { resolveSmokeUrls } from "./shared/urls.mjs";

const { baseUrl } = resolveSmokeUrls();
const debugUrl = new URL("/?debugUserInput=1", baseUrl).toString();
const settingsUrl = new URL("/settings", baseUrl).toString();
const DEBUG_STORAGE_KEY = "t3code:debug-user-input";

const { browser, context, page } = await createDesktopSmokePage();

try {
  await runSmoke("sync-phase-6", async () => {
    process.stdout.write("[sync-phase-6] loading settings page...\n");
    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    await clearLocalStorageKeys(page, [DEBUG_STORAGE_KEY]);
    await page.goto(settingsUrl, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});

    const bodyText = await page.locator("body").innerText();
    expectNoBlockedHost(bodyText);
    expectNoApplicationError(bodyText);

    process.stdout.write("[sync-phase-6] opening debug panel from settings...\n");
    await page.getByRole("button", { name: "Open panel" }).click();
    await page.getByText("User Input Debug", { exact: true }).waitFor({
      state: "visible",
      timeout: 10_000,
    });

    process.stdout.write("[sync-phase-6] checking persisted enablement...\n");
    const persisted = await page.evaluate((storageKey) => {
      const raw = window.localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : null;
    }, DEBUG_STORAGE_KEY);
    expect(
      persisted?.enabled === true,
      `Debug enablement did not persist: ${JSON.stringify(persisted)}`,
    );

    process.stdout.write("[sync-phase-6] checking query-param compatibility...\n");
    await page.goto(debugUrl, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await page.getByText("User Input Debug", { exact: true }).waitFor({
      state: "visible",
      timeout: 10_000,
    });

    process.stdout.write("[sync-phase-6] checking global error breadcrumb capture...\n");
    await page.evaluate(() => {
      window.dispatchEvent(
        new ErrorEvent("error", {
          message: "phase6 synthetic window error",
          error: new Error("phase6 synthetic window error"),
        }),
      );
    });
    await page.getByText("phase6 synthetic window error").first().waitFor({
      state: "visible",
      timeout: 10_000,
    });

    process.stdout.write("[sync-phase-6] checking unhandled rejection breadcrumb capture...\n");
    await page.evaluate(() => {
      window.dispatchEvent(
        new PromiseRejectionEvent("unhandledrejection", {
          promise: Promise.resolve(),
          reason: new Error("phase6 synthetic rejection"),
        }),
      );
    });
    await page.getByText("phase6 synthetic rejection").first().waitFor({
      state: "visible",
      timeout: 10_000,
    });
  });
} finally {
  await context.close();
  await browser.close();
}
