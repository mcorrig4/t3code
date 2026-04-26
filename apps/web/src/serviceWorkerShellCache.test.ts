import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const SERVICE_WORKER_PATH = resolve(import.meta.dirname, "../public/service-worker.js");

describe("service-worker shell cache", () => {
  it("does not pre-cache the service worker scripts themselves", async () => {
    const source = await readFile(SERVICE_WORKER_PATH, "utf8");

    expect(source).not.toMatch(/["']\/sw\.js["']/);
    expect(source).not.toMatch(/["']\/service-worker\.js["']/);
  });
});
