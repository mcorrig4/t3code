import { chromium } from "playwright";

const localWebUrl = process.env.T3_SYNC_LOCAL_WEB_URL?.trim() || "http://127.0.0.1:5734";
const baseUrl = process.env.T3_SYNC_BASE_URL?.trim() || localWebUrl;
const settingsUrl = new URL("/settings", baseUrl).toString();
const webPushConfigUrl = new URL("/api/web-push/config", baseUrl).toString();

function expect(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

try {
  process.stdout.write("[sync-phase-7] loading settings page...\n");
  await page.goto(settingsUrl, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});

  const bodyText = await page.locator("body").innerText();
  expect(!bodyText.includes("Blocked request. This host"), "Vite blocked the current hostname.");
  expect(
    !bodyText.includes("Unexpected Application Error"),
    "Settings route rendered an application error.",
  );

  process.stdout.write("[sync-phase-7] checking notifications sidecar...\n");
  await page.getByText("Fork Extensions", { exact: true }).waitFor({
    state: "visible",
    timeout: 10_000,
  });
  await page.getByText("Notifications", { exact: true }).waitFor({
    state: "visible",
    timeout: 10_000,
  });

  process.stdout.write("[sync-phase-7] checking notifications controls render...\n");
  await page.getByRole("button", { name: "Enable notifications" }).waitFor({
    state: "visible",
    timeout: 10_000,
  });
  await page.getByRole("button", { name: "Disable notifications" }).waitFor({
    state: "visible",
    timeout: 10_000,
  });

  process.stdout.write("[sync-phase-7] checking notifications status card...\n");
  const notificationsSection = page
    .getByText("Notifications", { exact: true })
    .locator("xpath=ancestor::div[contains(@class, 'border-t')][1]");
  const statusCard = notificationsSection.locator("div.rounded-lg").first();
  await statusCard.waitFor({ state: "visible", timeout: 10_000 });
  const statusCardText = await statusCard.innerText();
  expect(statusCardText.includes("Status"), "Notifications status card did not render cleanly.");
  expect(
    !statusCardText.includes("Invalid web push config response."),
    "Notifications status card surfaced an invalid config parse error.",
  );
  expect(
    !statusCardText.includes("Unexpected HTML response from the web push endpoint."),
    "Notifications status card surfaced an HTML response error.",
  );
  expect(
    !statusCardText.includes("Unexpected token"),
    "Notifications status card surfaced a JSON parse token error.",
  );
  expect(
    !statusCardText.includes("Unexpected end of JSON input"),
    "Notifications status card surfaced an incomplete JSON parse error.",
  );
  expect(
    !statusCardText.includes("SyntaxError:"),
    "Notifications status card surfaced a visible syntax error.",
  );

  process.stdout.write("[sync-phase-7] verifying web-push config endpoint returns JSON...\n");
  const webPushConfig = await page.evaluate(async (configUrl) => {
    const response = await fetch(configUrl, { cache: "no-store" });
    const text = await response.text();
    let parsed = null;
    let parseError = null;

    try {
      parsed = text.length > 0 ? JSON.parse(text) : null;
    } catch (error) {
      parseError = error instanceof Error ? error.message : String(error);
    }

    return {
      ok: response.ok,
      status: response.status,
      contentType: response.headers.get("content-type"),
      text,
      parsed,
      parseError,
    };
  }, webPushConfigUrl);

  expect(webPushConfig.ok, `web-push config request failed with status ${webPushConfig.status}.`);
  expect(
    (webPushConfig.contentType ?? "").toLowerCase().includes("application/json"),
    `web-push config response was not JSON: ${webPushConfig.contentType ?? "missing content-type"}.`,
  );
  expect(
    webPushConfig.parseError === null,
    `web-push config response could not be parsed as JSON: ${webPushConfig.parseError ?? "unknown error"}.`,
  );
  expect(
    webPushConfig.parsed !== null &&
      typeof webPushConfig.parsed === "object" &&
      "enabled" in webPushConfig.parsed,
    "web-push config response did not contain the expected JSON shape.",
  );

  process.stdout.write(`[sync-phase-7] PASS ${settingsUrl}\n`);
} finally {
  await context.close();
  await browser.close();
}
