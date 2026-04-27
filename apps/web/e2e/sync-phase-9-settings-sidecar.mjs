import { expect, expectNoApplicationError, expectNoBlockedHost } from "./shared/assertions.mjs";
import { ensureLoopbackAuthenticatedSession } from "./shared/auth.mjs";
import { clearLocalStorageKeys, createDesktopSmokePage } from "./shared/browser.mjs";
import { runSmoke } from "./shared/smokeRunner.mjs";
import { resolveSmokeUrls } from "./shared/urls.mjs";

const { baseUrl } = resolveSmokeUrls();
const settingsUrl = new URL("/settings", baseUrl).toString();
const FORK_SETTINGS_STORAGE_KEY = "t3code:fork-settings:v1";
const THEME_STORAGE_KEY = "vite-ui-theme";

const { browser, context, page } = await createDesktopSmokePage();

try {
  await runSmoke("sync-phase-9", async () => {
    await ensureLoopbackAuthenticatedSession(page, baseUrl);

    process.stdout.write("[sync-phase-9] loading settings page...\n");
    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    await clearLocalStorageKeys(page, [FORK_SETTINGS_STORAGE_KEY]);
    await page.goto(settingsUrl, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});

    const bodyText = await page.locator("body").innerText();
    expectNoBlockedHost(bodyText);
    expectNoApplicationError(bodyText);

    process.stdout.write("[sync-phase-9] checking sidecar sections...\n");
    for (const title of [
      "Fork extensions",
      "Push notifications",
      "Suppress Codex native notifications",
      "Diagnostics",
    ]) {
      await page.getByText(title, { exact: true }).first().waitFor({
        state: "visible",
        timeout: 10_000,
      });
    }

    process.stdout.write("[sync-phase-9] checking Codex override persistence...\n");
    await page.getByLabel("Suppress Codex native notifications").click();
    const persistedAfterToggle = await page.evaluate((storageKey) => {
      const raw = window.localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : null;
    }, FORK_SETTINGS_STORAGE_KEY);
    expect(
      persistedAfterToggle?.suppressCodexAppServerNotifications === true,
      "Codex notification suppression did not persist from the sidecar section.",
    );

    process.stdout.write("[sync-phase-9] checking combined restore-defaults flow...\n");
    await page.getByRole("combobox", { name: "Theme preference" }).click();
    await page.getByRole("option", { name: "Dark" }).click();

    let confirmMessage = null;
    page.once("dialog", async (dialog) => {
      confirmMessage = dialog.message();
      await dialog.accept();
    });
    await page.getByRole("button", { name: "Restore defaults" }).click();

    expect(
      confirmMessage?.includes("Theme") && confirmMessage.includes("Codex session overrides"),
      `Restore defaults confirmation did not include both upstream and fork changes: ${confirmMessage}`,
    );
    await page.getByRole("combobox", { name: "Theme preference" }).waitFor({
      state: "visible",
      timeout: 10_000,
    });
    await page.waitForFunction(
      () => {
        const trigger = document.querySelector('[aria-label="Theme preference"]');
        return trigger?.textContent?.includes("System") ?? false;
      },
      { timeout: 10_000 },
    );

    const persistedAfterRestore = await page.evaluate(
      ([forkStorageKey, themeStorageKey]) => ({
        fork: (() => {
          const raw = window.localStorage.getItem(forkStorageKey);
          return raw ? JSON.parse(raw) : null;
        })(),
        theme: window.localStorage.getItem(themeStorageKey),
      }),
      [FORK_SETTINGS_STORAGE_KEY, THEME_STORAGE_KEY],
    );
    expect(
      persistedAfterRestore.fork === null ||
        (persistedAfterRestore.fork.pushNotificationsEnabled === false &&
          persistedAfterRestore.fork.suppressCodexAppServerNotifications === false),
      `Fork settings store was not reset to defaults by Restore defaults: ${JSON.stringify(
        persistedAfterRestore.fork,
      )}`,
    );
    expect(
      persistedAfterRestore.theme === null || persistedAfterRestore.theme === "system",
      `Theme preference was not reset by Restore defaults: ${persistedAfterRestore.theme}`,
    );

    process.stdout.write("[sync-phase-9] checking diagnostics opener...\n");
    await page.getByLabel("Open diagnostics panel").click();
    await page.getByText("User Input Debug", { exact: true }).waitFor({
      state: "visible",
      timeout: 10_000,
    });

    process.stdout.write("[sync-phase-9] checking notifications status card...\n");
    const notificationsStatus = await page.locator("body").innerText();
    expect(
      !notificationsStatus.includes("Unexpected token"),
      "Notifications sidecar surfaced a JSON parse token error.",
    );
  });
} finally {
  await context.close();
  await browser.close();
}
