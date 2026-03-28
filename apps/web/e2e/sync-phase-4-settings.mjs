import { expect, expectNoApplicationError, expectNoBlockedHost } from "./shared/assertions.mjs";
import { createDesktopSmokePage, clearLocalStorageKeys } from "./shared/browser.mjs";
import { runSmoke } from "./shared/smokeRunner.mjs";
import { resolveSmokeUrls } from "./shared/urls.mjs";

const { baseUrl } = resolveSmokeUrls();
const settingsUrl = new URL("/settings", baseUrl).toString();
const APP_SETTINGS_STORAGE_KEY = "t3code:app-settings:v1";
const FORK_SETTINGS_STORAGE_KEY = "t3code:fork-settings:v1";

const { browser, context, page } = await createDesktopSmokePage();
page.setDefaultNavigationTimeout(60_000);

try {
  await runSmoke("sync-phase-4", async () => {
    process.stdout.write("[sync-phase-4] loading settings page...\n");
    await page.goto(settingsUrl, { waitUntil: "domcontentloaded" });
    await clearLocalStorageKeys(page, [APP_SETTINGS_STORAGE_KEY, FORK_SETTINGS_STORAGE_KEY]);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await page.getByText("Settings").first().waitFor({ state: "visible", timeout: 10_000 });

    const bodyText = await page.locator("body").innerText();
    expectNoBlockedHost(bodyText);
    expectNoApplicationError(bodyText);

    process.stdout.write("[sync-phase-4] checking section headings...\n");
    for (const heading of ["General", "Models", "Advanced"]) {
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
    }, APP_SETTINGS_STORAGE_KEY);
    expect(
      persistedAfterReload?.timestampFormat === "24-hour",
      `Timestamp format did not persist: ${JSON.stringify(persistedAfterReload)}`,
    );

    process.stdout.write("[sync-phase-4] checking custom model add/remove flow...\n");
    await page.locator("#custom-model-slug").fill("custom/phase4-codex");
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await page.getByText("custom/phase4-codex", { exact: true }).waitFor({
      state: "visible",
      timeout: 10_000,
    });
    await page.getByRole("button", { name: "Remove custom/phase4-codex" }).click();
    await page.getByText("custom/phase4-codex", { exact: true }).waitFor({
      state: "hidden",
      timeout: 10_000,
    });

    process.stdout.write("[sync-phase-4] checking codex advanced settings...\n");
    await page.getByRole("button", { name: "Codex" }).click();
    const codexBinaryInput = page.locator("#provider-install-codexBinaryPath");
    await codexBinaryInput.waitFor({ state: "visible", timeout: 10_000 });
    await codexBinaryInput.fill("/tmp/codex-phase4");
    await page.getByLabel("Suppress Codex native notifications").click();

    const persistedAppSettings = await page.evaluate((storageKey) => {
      const raw = window.localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : null;
    }, APP_SETTINGS_STORAGE_KEY);

    const persistedForkSettings = await page.evaluate((storageKey) => {
      const raw = window.localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : null;
    }, FORK_SETTINGS_STORAGE_KEY);

    expect(
      persistedAppSettings?.codexBinaryPath === "/tmp/codex-phase4",
      "Codex binary path did not persist.",
    );
    expect(
      persistedForkSettings?.suppressCodexAppServerNotifications === true,
      "Codex notification suppression did not persist.",
    );
  });
} finally {
  await context.close();
  await browser.close();
}
