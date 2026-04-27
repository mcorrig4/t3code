import { execFileSync } from "node:child_process";
import { homedir } from "node:os";
import { resolve } from "node:path";

function isLoopbackUrl(baseUrl) {
  try {
    const { hostname } = new URL(baseUrl);
    return hostname === "127.0.0.1" || hostname === "localhost" || hostname === "::1";
  } catch {
    return false;
  }
}

async function readAuthSession(page, baseUrl) {
  return page.evaluate(async (targetBaseUrl) => {
    const response = await fetch(new URL("/api/auth/session", targetBaseUrl), {
      credentials: "include",
      cache: "no-store",
    });
    return response.json();
  }, baseUrl);
}

function issuePairingUrl(baseUrl) {
  const repoRoot = resolve(import.meta.dirname, "..", "..", "..", "..");
  const authBaseDir = process.env.T3_SYNC_AUTH_BASE_DIR?.trim() || resolve(homedir(), ".t3");
  const output = execFileSync(
    "bun",
    [
      "run",
      "--cwd",
      "apps/server",
      "src/bin.ts",
      "auth",
      "pairing",
      "create",
      "--base-dir",
      authBaseDir,
      "--base-url",
      new URL(baseUrl).origin,
      "--json",
    ],
    {
      cwd: repoRoot,
      encoding: "utf8",
    },
  );

  const issued = JSON.parse(output);
  if (typeof issued?.pairUrl !== "string" || issued.pairUrl.length === 0) {
    throw new Error(`Failed to issue pairing URL: ${output}`);
  }
  return issued.pairUrl;
}

export async function ensureLoopbackAuthenticatedSession(page, baseUrl) {
  if (!isLoopbackUrl(baseUrl)) {
    return;
  }

  const pairingUrl = issuePairingUrl(baseUrl);
  process.stdout.write(`[sync-auth] pairing via ${pairingUrl}\n`);
  await page.goto(pairingUrl, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});

  const pairedSession = await readAuthSession(page, baseUrl);
  if (pairedSession?.authenticated !== true) {
    throw new Error("Loopback pairing did not authenticate the browser session.");
  }
}

export async function resetServiceWorkerRegisterRecorder(page) {
  await page.evaluate(() => {
    if (Array.isArray(window.__t3SwRegisterCalls)) {
      window.__t3SwRegisterCalls.length = 0;
      return;
    }

    Reflect.set(window, "__t3SwRegisterCalls", []);
  });
}
