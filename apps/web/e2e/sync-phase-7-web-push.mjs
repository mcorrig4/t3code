import { expect, expectNoApplicationError, expectNoBlockedHost } from "./shared/assertions.mjs";
import { ensureLoopbackAuthenticatedSession } from "./shared/auth.mjs";
import { createDesktopSmokePage } from "./shared/browser.mjs";
import { runSmoke } from "./shared/smokeRunner.mjs";
import { resolveSmokeUrls } from "./shared/urls.mjs";

const { baseUrl } = resolveSmokeUrls();
const settingsUrl = new URL("/settings", baseUrl).toString();
const webPushConfigUrl = new URL("/api/web-push/config", baseUrl).toString();

const { browser, context, page } = await createDesktopSmokePage();

try {
  await runSmoke("sync-phase-7", async () => {
    await ensureLoopbackAuthenticatedSession(page, baseUrl);

    process.stdout.write("[sync-phase-7] loading settings page...\n");
    await page.goto(settingsUrl, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});

    const bodyText = await page.locator("body").innerText();
    expectNoBlockedHost(bodyText);
    expectNoApplicationError(bodyText);

    process.stdout.write("[sync-phase-7] checking notifications sidecar...\n");
    await page.getByRole("heading", { name: "Fork extensions" }).waitFor({
      state: "visible",
      timeout: 10_000,
    });

    process.stdout.write("[sync-phase-7] checking notifications controls render...\n");
    await page.getByLabel("Enable push notifications").waitFor({
      state: "visible",
      timeout: 10_000,
    });
    await page.getByLabel("Disable push notifications").waitFor({
      state: "visible",
      timeout: 10_000,
    });

    process.stdout.write("[sync-phase-7] checking notifications status card...\n");
    const body = await page.locator("body").innerText();
    expect(
      !body.includes("Invalid web push config response."),
      "Notifications status card surfaced an invalid config parse error.",
    );
    expect(
      !body.includes("Unexpected HTML response from the web push endpoint."),
      "Notifications status card surfaced an HTML response error.",
    );
    expect(
      !body.includes("Unexpected token"),
      "Notifications status card surfaced a JSON parse token error.",
    );
    expect(
      !body.includes("Unexpected end of JSON input"),
      "Notifications status card surfaced an incomplete JSON parse error.",
    );
    expect(
      !body.includes("SyntaxError:"),
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
  });
} finally {
  await context.close();
  await browser.close();
}
