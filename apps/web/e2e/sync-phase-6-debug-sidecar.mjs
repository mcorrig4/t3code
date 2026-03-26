import { expect } from "./shared/assertions.mjs";
import { chromium } from "playwright";

const localWebUrl = process.env.T3_SYNC_LOCAL_WEB_URL?.trim() || "http://127.0.0.1:5734";
const baseUrl = process.env.T3_SYNC_BASE_URL?.trim() || localWebUrl;
const debugUrl = new URL("/?debugUserInput=1", baseUrl).toString();
const settingsUrl = new URL("/settings", baseUrl).toString();
const DEBUG_STORAGE_KEY = "t3code:debug-user-input";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

try {
  process.stdout.write("[sync-phase-6] loading settings page...\n");
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await page.evaluate((storageKey) => {
    window.localStorage.removeItem(storageKey);
  }, DEBUG_STORAGE_KEY);
  await page.goto(settingsUrl, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});

  const bodyText = await page.locator("body").innerText();
  expect(!bodyText.includes("Blocked request. This host"), "Vite blocked the current hostname.");
  expect(
    !bodyText.includes("Unexpected Application Error"),
    "Settings route rendered an application error.",
  );

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

  process.stdout.write(`[sync-phase-6] PASS ${settingsUrl}\n`);
} finally {
  await context.close();
  await browser.close();
}
