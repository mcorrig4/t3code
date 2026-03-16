import { describe, expect, it } from "vitest";

import { SERVICE_WORKER_SCOPE, shouldRegisterServiceWorker } from "./pwa";

describe("shouldRegisterServiceWorker", () => {
  it("registers for regular browser builds over http", () => {
    expect(
      shouldRegisterServiceWorker({
        isElectron: false,
        hasServiceWorkerApi: true,
        protocol: "http:",
      }),
    ).toBe(true);
  });

  it("skips registration for Electron builds", () => {
    expect(
      shouldRegisterServiceWorker({
        isElectron: true,
        hasServiceWorkerApi: true,
        protocol: "https:",
      }),
    ).toBe(false);
  });

  it("skips registration when the browser has no service worker support", () => {
    expect(
      shouldRegisterServiceWorker({
        isElectron: false,
        hasServiceWorkerApi: false,
        protocol: "https:",
      }),
    ).toBe(false);
  });

  it("keeps the installed app scoped to the site root", () => {
    expect(SERVICE_WORKER_SCOPE).toBe("/");
  });
});
