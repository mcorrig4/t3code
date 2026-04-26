import { describe, expect, it } from "vitest";

import {
  decodeDeleteSubscriptionBody,
  decodePutSubscriptionBody,
  isAllowedOrigin,
  resolveRequestOrigin,
} from "./http.ts";

describe("web push request decoding", () => {
  it("accepts parsed subscription payloads from the browser", () => {
    const decoded = decodePutSubscriptionBody({
      subscription: {
        endpoint:
          "https://web.push.apple.com/QGSJDYvD0Z7eVXKuysUSiRZ_ayrU_xSk1TIzuedx0P-3zDx8bhieJa-uqv8ZBhEM86gV_FnKFr0NMR0ZswWZNMawLeW-Wtjtx3bJw4ZtG1y1x2_oyMo5UiCGaCq43GB_AVhwyUXH3dFAKeoWRHMPSeix4wnCxOyJGwR5J6sLARA",
        keys: {
          p256dh:
            "BCwE8uCo5bRFcPrI5di1ZTf0oYUCM-f6xBcu2tKe5IZl2koYmOxEalrKP8eudqmMOdoWzw_ncgVajpJySDcbm8c",
          auth: "K9i0eYvPxWbww_gHxSQU_A",
        },
      },
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.3 Mobile/15E148 Safari/604.1",
      appVersion: "0.0.13",
    });

    expect(decoded).not.toBeInstanceOf(Error);
    expect(decoded).toMatchObject({
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.3 Mobile/15E148 Safari/604.1",
      appVersion: "0.0.13",
    });
  });

  it("accepts parsed unsubscribe payloads from the browser", () => {
    const decoded = decodeDeleteSubscriptionBody({
      subscription: {
        endpoint: "https://web.push.apple.com/example-endpoint",
      },
    });

    expect(decoded).not.toBeInstanceOf(Error);
    expect(decoded).toEqual({
      subscription: {
        endpoint: "https://web.push.apple.com/example-endpoint",
      },
    });
  });
});

describe("web push origin validation", () => {
  it("accepts same-origin forwarded requests", () => {
    const request = {
      headers: {
        origin: "https://t3-dev.claude.do",
        "x-forwarded-host": "t3-dev.claude.do",
        "x-forwarded-proto": "https",
      },
    } as never;

    expect(resolveRequestOrigin(request)).toBe("https://t3-dev.claude.do");
    expect(isAllowedOrigin(request)).toBe(true);
  });

  it("rejects other claude.do subdomains when they are not the active request origin", () => {
    const request = {
      headers: {
        origin: "https://other-dev.claude.do",
        "x-forwarded-host": "t3-dev.claude.do",
        "x-forwarded-proto": "https",
      },
    } as never;

    expect(resolveRequestOrigin(request)).toBe("https://t3-dev.claude.do");
    expect(isAllowedOrigin(request)).toBe(false);
  });
});
