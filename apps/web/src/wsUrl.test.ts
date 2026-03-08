import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { resolveHttpOriginFromWebSocketUrl, resolveWebSocketUrl } from "./wsUrl";

const originalWindow = globalThis.window;

function setWindowLocation(location: Partial<Location>) {
  const nextLocation = {
    protocol: "http:",
    host: "localhost:3020",
    origin: "http://localhost:3020",
    ...location,
  };

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      location: nextLocation,
    },
  });
}

beforeEach(() => {
  setWindowLocation({
    protocol: "http:",
    host: "localhost:3020",
    origin: "http://localhost:3020",
  });
});

afterEach(() => {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: originalWindow,
  });
});

describe("resolveWebSocketUrl", () => {
  it("defaults to wss on https pages", () => {
    setWindowLocation({
      protocol: "https:",
      host: "t3.claude.do",
      origin: "https://t3.claude.do",
    });

    expect(resolveWebSocketUrl()).toBe("wss://t3.claude.do");
  });

  it("defaults to ws on http pages", () => {
    expect(resolveWebSocketUrl()).toBe("ws://localhost:3020");
  });

  it("prefers the env override over the page origin", () => {
    expect(resolveWebSocketUrl({ envUrl: "ws://127.0.0.1:3773" })).toBe("ws://127.0.0.1:3773");
  });

  it("prefers the desktop bridge override over the env override", () => {
    expect(
      resolveWebSocketUrl({
        bridgeUrl: "ws://127.0.0.1:4444/?token=secret",
        envUrl: "ws://127.0.0.1:3773",
      }),
    ).toBe("ws://127.0.0.1:4444/?token=secret");
  });
});

describe("resolveHttpOriginFromWebSocketUrl", () => {
  it("maps wss websocket URLs back to https origins", () => {
    setWindowLocation({
      protocol: "https:",
      host: "t3.claude.do",
      origin: "https://t3.claude.do",
    });

    expect(resolveHttpOriginFromWebSocketUrl()).toBe("https://t3.claude.do");
  });

  it("drops query parameters from explicit websocket URLs", () => {
    expect(
      resolveHttpOriginFromWebSocketUrl({
        bridgeUrl: "wss://t3.claude.do/socket?token=secret",
      }),
    ).toBe("https://t3.claude.do");
  });

  it("falls back to the page origin when the websocket URL cannot be parsed", () => {
    expect(
      resolveHttpOriginFromWebSocketUrl({
        envUrl: "not a valid url",
      }),
    ).toBe("http://localhost:3020");
  });
});
