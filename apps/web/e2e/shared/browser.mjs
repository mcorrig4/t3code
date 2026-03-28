import { chromium } from "playwright";

export async function createDesktopSmokePage() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  return { browser, context, page };
}

export async function createMobileSmokePage() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: {
      width: 390,
      height: 844,
    },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();

  return { browser, context, page };
}

export async function clearLocalStorageKeys(page, storageKeys) {
  await page.evaluate((keys) => {
    for (const key of keys) {
      window.localStorage.removeItem(key);
    }
  }, storageKeys);
}
