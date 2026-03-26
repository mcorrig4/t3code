import { expect } from "./shared/assertions.mjs";
import { chromium } from "playwright";

const localWebUrl = process.env.T3_SYNC_LOCAL_WEB_URL?.trim() || "http://127.0.0.1:5734";
const baseUrl = process.env.T3_SYNC_BASE_URL?.trim() || localWebUrl;
const settingsUrl = new URL("/settings", baseUrl).toString();
const APP_SETTINGS_STORAGE_KEY = "t3code:app-settings:v1";
const FORK_SETTINGS_STORAGE_KEY = "t3code:fork-settings:v1";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();
page.setDefaultNavigationTimeout(60_000);

try {
  process.stdout.write("[sync-phase-4] loading settings page...\n");
  await page.goto(settingsUrl, { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ([appKey, forkKey]) => {
      window.localStorage.removeItem(appKey);
      window.localStorage.removeItem(forkKey);
    },
    [APP_SETTINGS_STORAGE_KEY, FORK_SETTINGS_STORAGE_KEY],
  );
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
  await page.getByText("Settings").first().waitFor({ state: "visible", timeout: 10_000 });

  const bodyText = await page.locator("body").innerText();
  expect(!bodyText.includes("Blocked request. This host"), "Vite blocked the current hostname.");
  expect(
    !bodyText.includes("Unexpected Application Error"),
    "Settings route rendered an application error.",
  );

  process.stdout.write("[sync-phase-4] checking section headings...\n");
  for (const heading of ["General", "Models", "Advanced"]) {
    await page.getByText(heading, { exact: true }).waitFor({ state: "visible", timeout: 10_000 });
  }

  process.stdout.write("[sync-phase-4] checking general settings persistence...\n");
  await page.getByLabel("Timestamp format").click();
  await page.getByText("24-hour", { exact: true }).click();
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
  await page.getByText("General", { exact: true }).waitFor({ state: "visible", timeout: 10_000 });
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

  process.stdout.write(`[sync-phase-4] PASS ${settingsUrl}\n`);
} finally {
  await context.close();
  await browser.close();
}
