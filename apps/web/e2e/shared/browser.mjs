import { chromium } from "playwright";

export async function createMobileSmokePage() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: {
      width: 390,
      height: 844,
    },
    isMobile: true,
    hasTouch: true,
  });

  return { browser, page };
}
