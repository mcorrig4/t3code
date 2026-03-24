import { describe, expect, it } from "vitest";

import {
  SERVICE_WORKER_SCOPE,
  isStandalonePwa,
  shouldHideHeaderOpenInPicker,
  shouldRegisterServiceWorker,
} from "./pwa";

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

describe("isStandalonePwa", () => {
  it("treats display-mode standalone as a PWA session", () => {
    expect(
      isStandalonePwa({
        matchesDisplayMode: true,
        isIosStandalone: false,
      }),
    ).toBe(true);
  });

  it("treats iOS standalone mode as a PWA session", () => {
    expect(
      isStandalonePwa({
        matchesDisplayMode: false,
        isIosStandalone: true,
      }),
    ).toBe(true);
  });

  it("does not treat regular browser tabs as a PWA session", () => {
    expect(
      isStandalonePwa({
        matchesDisplayMode: false,
        isIosStandalone: false,
      }),
    ).toBe(false);
  });
});

describe("shouldHideHeaderOpenInPicker", () => {
  it("hides the desktop open controls for compact standalone touch sessions", () => {
    expect(
      shouldHideHeaderOpenInPicker({
        isStandalonePwa: true,
        isCompactTouchViewport: true,
      }),
    ).toBe(true);
  });

  it("keeps the controls visible for desktop standalone sessions", () => {
    expect(
      shouldHideHeaderOpenInPicker({
        isStandalonePwa: true,
        isCompactTouchViewport: false,
      }),
    ).toBe(false);
  });

  it("keeps the controls visible for regular browser sessions", () => {
    expect(
      shouldHideHeaderOpenInPicker({
        isStandalonePwa: false,
        isCompactTouchViewport: true,
      }),
    ).toBe(false);
  });
});
