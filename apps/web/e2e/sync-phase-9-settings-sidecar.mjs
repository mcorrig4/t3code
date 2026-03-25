import { chromium } from "playwright";

const localWebUrl = process.env.T3_SYNC_LOCAL_WEB_URL?.trim() || "http://127.0.0.1:5734";
const baseUrl = process.env.T3_SYNC_BASE_URL?.trim() || localWebUrl;
const settingsUrl = new URL("/settings", baseUrl).toString();
const APP_SETTINGS_STORAGE_KEY = "t3code:app-settings:v1";

function expect(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

try {
  process.stdout.write("[sync-phase-9] loading settings page...\n");
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await page.evaluate((storageKey) => {
    window.localStorage.removeItem(storageKey);
  }, APP_SETTINGS_STORAGE_KEY);
  await page.goto(settingsUrl, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});

  const bodyText = await page.locator("body").innerText();
  expect(!bodyText.includes("Blocked request. This host"), "Vite blocked the current hostname.");
  expect(
    !bodyText.includes("Unexpected Application Error"),
    "Settings route rendered an application error.",
  );

  process.stdout.write("[sync-phase-9] checking sidecar sections...\n");
  for (const title of [
    "Fork Extensions",
    "Notifications",
    "Codex session overrides",
    "Diagnostics",
  ]) {
    await page.getByText(title, { exact: true }).waitFor({ state: "visible", timeout: 10_000 });
  }

  process.stdout.write("[sync-phase-9] checking Codex override persistence...\n");
  await page.getByLabel("Suppress Codex native notifications").click();
  const persistedAfterToggle = await page.evaluate((storageKey) => {
    const raw = window.localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : null;
  }, APP_SETTINGS_STORAGE_KEY);
  expect(
    persistedAfterToggle?.suppressCodexAppServerNotifications === true,
    "Codex notification suppression did not persist from the sidecar section.",
  );

  process.stdout.write("[sync-phase-9] checking diagnostics opener...\n");
  await page.getByRole("button", { name: "Open panel" }).click();
  await page.getByText("User Input Debug", { exact: true }).waitFor({
    state: "visible",
    timeout: 10_000,
  });

  process.stdout.write("[sync-phase-9] checking notifications status card...\n");
  const notificationsStatus = await page
    .getByText("Notifications", { exact: true })
    .locator("xpath=ancestor::div[contains(@class, 'border-t')][1]")
    .innerText();
  expect(
    !notificationsStatus.includes("Unexpected token"),
    "Notifications sidecar surfaced a JSON parse token error.",
  );

  process.stdout.write(`[sync-phase-9] PASS ${settingsUrl}\n`);
} finally {
  await context.close();
  await browser.close();
}
