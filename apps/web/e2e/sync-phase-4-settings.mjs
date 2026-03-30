import { expect, expectNoApplicationError, expectNoBlockedHost } from "./shared/assertions.mjs";
import { createDesktopSmokePage, clearLocalStorageKeys } from "./shared/browser.mjs";
import { runSmoke } from "./shared/smokeRunner.mjs";
import { resolveSmokeUrls } from "./shared/urls.mjs";

const { baseUrl } = resolveSmokeUrls();
const settingsUrl = new URL("/settings", baseUrl).toString();
const CLIENT_SETTINGS_STORAGE_KEY = "t3code:client-settings:v1";
const LEGACY_APP_SETTINGS_STORAGE_KEY = "t3code:app-settings:v1";
const FORK_SETTINGS_STORAGE_KEY = "t3code:fork-settings:v1";

const { browser, context, page } = await createDesktopSmokePage();
page.setDefaultNavigationTimeout(60_000);

try {
  await runSmoke("sync-phase-4", async () => {
    process.stdout.write("[sync-phase-4] loading settings page...\n");
    await page.goto(settingsUrl, { waitUntil: "domcontentloaded" });
    await clearLocalStorageKeys(page, [
      CLIENT_SETTINGS_STORAGE_KEY,
      LEGACY_APP_SETTINGS_STORAGE_KEY,
      FORK_SETTINGS_STORAGE_KEY,
    ]);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await page.getByText("Settings").first().waitFor({ state: "visible", timeout: 10_000 });

    const bodyText = await page.locator("body").innerText();
    expectNoBlockedHost(bodyText);
    expectNoApplicationError(bodyText);

    process.stdout.write("[sync-phase-4] checking section headings...\n");
    for (const heading of ["General", "Providers", "Advanced"]) {
      await page.getByText(heading, { exact: true }).waitFor({
        state: "visible",
        timeout: 10_000,
      });
    }

    process.stdout.write("[sync-phase-4] checking general settings persistence...\n");
    await page.getByLabel("Timestamp format").click();
    await page.getByText("24-hour", { exact: true }).click();
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await page.getByText("General", { exact: true }).waitFor({
      state: "visible",
      timeout: 10_000,
    });
    const persistedAfterReload = await page.evaluate((storageKey) => {
      const raw = window.localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : null;
    }, CLIENT_SETTINGS_STORAGE_KEY);
    expect(
      persistedAfterReload?.timestampFormat === "24-hour",
      `Timestamp format did not persist: ${JSON.stringify(persistedAfterReload)}`,
    );

    process.stdout.write("[sync-phase-4] checking codex advanced settings...\n");
    await page.getByLabel("Toggle Codex details").click();
    await page.locator("#provider-install-codex-binary-path").waitFor({
      state: "visible",
      timeout: 10_000,
    });
    await page.getByLabel("Suppress Codex native notifications").click();
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await page.getByLabel("Toggle Codex details").click();

    const persistedClientSettings = await page.evaluate((storageKey) => {
      const raw = window.localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : null;
    }, CLIENT_SETTINGS_STORAGE_KEY);

    const persistedForkSettings = await page.evaluate((storageKey) => {
      const raw = window.localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : null;
    }, FORK_SETTINGS_STORAGE_KEY);

    expect(
      persistedForkSettings?.suppressCodexAppServerNotifications === true,
      "Codex notification suppression did not persist.",
    );
    expect(
      persistedClientSettings?.timestampFormat === "24-hour",
      "Client settings did not persist in the unified settings migration.",
    );
  });
} finally {
  await context.close();
  await browser.close();
}
