import { chromium } from "playwright";

const baseUrl = process.env.T3_SYNC_BASE_URL?.trim() || "https://t3-dev.claude.do";

const checks = [
  {
    name: "page responds",
    run: async (page) => page.goto(baseUrl, { waitUntil: "domcontentloaded" }),
  },
  {
    name: "body renders",
    run: async (page) => {
      await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
      await page.locator("body").waitFor({ state: "visible", timeout: 10_000 });
    },
  },
  {
    name: "no blocked-host error",
    run: async (page) => {
      const bodyText = await page.locator("body").innerText();
      if (bodyText.includes("Blocked request. This host")) {
        throw new Error("Vite blocked the dev hostname via server.allowedHosts.");
      }
    },
  },
  {
    name: "no obvious startup crash text",
    run: async (page) => {
      const bodyText = await page.locator("body").innerText();
      const crashNeedles = [
        "Application error",
        "Unexpected Application Error",
        "ReferenceError",
        "TypeError",
        "Cannot read properties of undefined",
      ];
      const hit = crashNeedles.find((needle) => bodyText.includes(needle));
      if (hit) {
        throw new Error(`Detected startup crash text: ${hit}`);
      }
    },
  },
];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const consoleErrors = [];
const pageErrors = [];
const requestFailures = [];

page.on("console", (message) => {
  if (message.type() === "error") {
    consoleErrors.push(message.text());
  }
});

page.on("pageerror", (error) => {
  pageErrors.push(error.message);
});

page.on("requestfailed", (request) => {
  requestFailures.push(
    `${request.method()} ${request.url()} => ${request.failure()?.errorText ?? "unknown"}`,
  );
});

try {
  for (const check of checks) {
    process.stdout.write(`[sync-phase-0] ${check.name}...\n`);
    await check.run(page);
  }

  if (pageErrors.length > 0) {
    throw new Error(`Page errors detected:\n${pageErrors.join("\n")}`);
  }

  const meaningfulConsoleErrors = consoleErrors.filter(
    (entry) =>
      !entry.includes("favicon") &&
      !entry.includes("404") &&
      !entry.includes("Loading the image 'data:image/svg+xml") &&
      !entry.includes("Content Security Policy directive"),
  );
  if (meaningfulConsoleErrors.length > 0) {
    throw new Error(`Console errors detected:\n${meaningfulConsoleErrors.join("\n")}`);
  }

  const meaningfulRequestFailures = requestFailures.filter((entry) => !entry.includes("favicon"));
  if (meaningfulRequestFailures.length > 0) {
    throw new Error(`Request failures detected:\n${meaningfulRequestFailures.join("\n")}`);
  }

  process.stdout.write(`[sync-phase-0] PASS ${baseUrl}\n`);
} finally {
  await browser.close();
}
