import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import net from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const requestedPort = process.env.T3_SYNC_INTEGRATED_PORT?.trim();

function prefixStream(stream, prefix) {
  stream.setEncoding("utf8");
  stream.on("data", (chunk) => {
    for (const line of chunk.split(/\r?\n/)) {
      if (line.length === 0) {
        continue;
      }
      process.stdout.write(`${prefix}${line}\n`);
    }
  });
}

function runCommand(command, args, options = {}) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      stdio: "inherit",
      env: process.env,
      ...options,
    });

    child.on("error", rejectPromise);
    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolvePromise();
        return;
      }
      rejectPromise(
        new Error(
          `${command} ${args.join(" ")} exited with ${code ?? "null"}${
            signal ? ` (signal ${signal})` : ""
          }`,
        ),
      );
    });
  });
}

function findAvailablePort() {
  return new Promise((resolvePromise, rejectPromise) => {
    const server = net.createServer();
    server.unref();
    server.on("error", rejectPromise);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close(() =>
          rejectPromise(new Error("Could not determine an integrated smoke port.")),
        );
        return;
      }
      server.close((error) => {
        if (error) {
          rejectPromise(error);
          return;
        }
        resolvePromise(address.port);
      });
    });
  });
}

async function waitForHealthyServer(baseUrl) {
  const deadline = Date.now() + 30_000;

  while (Date.now() < deadline) {
    try {
      const environmentResponse = await fetch(new URL("/.well-known/t3/environment", baseUrl), {
        cache: "no-store",
      });
      const appResponse = await fetch(new URL("/", baseUrl), { cache: "no-store" });
      const appHtml = await appResponse.text();
      if (environmentResponse.ok && appResponse.ok && appHtml.includes('<div id="root"></div>')) {
        return;
      }
    } catch {
      // Keep polling until the deadline.
    }

    await new Promise((resolvePromise) => setTimeout(resolvePromise, 500));
  }

  throw new Error(`Timed out waiting for integrated local runtime at ${baseUrl}.`);
}

async function main() {
  const port =
    requestedPort && requestedPort.length > 0
      ? Number.parseInt(requestedPort, 10)
      : await findAvailablePort();
  if (!Number.isInteger(port) || port < 1) {
    throw new Error(`Invalid T3_SYNC_INTEGRATED_PORT: ${requestedPort}`);
  }

  const baseDir = await mkdtemp(join(tmpdir(), "t3-sync-smoke-"));
  const baseUrl = `http://127.0.0.1:${port}`;

  let serverProcess = null;
  let shuttingDown = false;
  let serverExitPromise = Promise.resolve();
  const cleanup = async () => {
    shuttingDown = true;
    if (serverProcess && serverProcess.exitCode === null && serverProcess.signalCode === null) {
      serverProcess.kill("SIGTERM");
      setTimeout(() => {
        if (serverProcess && serverProcess.exitCode === null && serverProcess.signalCode === null) {
          serverProcess.kill("SIGKILL");
        }
      }, 5_000).unref();

      await serverExitPromise;
    }
    await rm(baseDir, { recursive: true, force: true });
  };

  process.on("SIGINT", () => {
    void cleanup().finally(() => process.exit(130));
  });
  process.on("SIGTERM", () => {
    void cleanup().finally(() => process.exit(143));
  });

  try {
    process.stdout.write(`[sync-smoke-integrated] building web dist...\n`);
    await runCommand("bun", ["run", "--cwd", "apps/web", "build"]);

    process.stdout.write(
      `[sync-smoke-integrated] starting integrated server on ${baseUrl} with temp state ${baseDir}\n`,
    );
    serverProcess = spawn(
      "bun",
      [
        "run",
        "--cwd",
        "apps/server",
        "src/bin.ts",
        "serve",
        "--port",
        String(port),
        "--base-dir",
        baseDir,
        repoRoot,
      ],
      {
        cwd: repoRoot,
        env: process.env,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    prefixStream(serverProcess.stdout, "[sync-server] ");
    prefixStream(serverProcess.stderr, "[sync-server] ");
    serverExitPromise = new Promise((resolvePromise) => {
      serverProcess.once("exit", () => resolvePromise());
    });

    serverProcess.on("exit", (code, signal) => {
      if (!shuttingDown && code !== 0 && signal === null) {
        process.stderr.write(
          `[sync-smoke-integrated] integrated server exited early with code ${code}\n`,
        );
      }
    });

    await waitForHealthyServer(baseUrl);

    process.stdout.write(`[sync-smoke-integrated] running sync:smoke:quick against ${baseUrl}\n`);
    await runCommand("bun", ["run", "--cwd", "apps/web", "sync:smoke:quick"], {
      env: {
        ...process.env,
        T3_SYNC_BASE_URL: baseUrl,
        T3_SYNC_LOCAL_WEB_URL: baseUrl,
        T3_SYNC_AUTH_BASE_DIR: baseDir,
      },
    });

    process.stdout.write("[sync-smoke-integrated] PASS\n");
  } finally {
    await cleanup();
  }
}

await main();
