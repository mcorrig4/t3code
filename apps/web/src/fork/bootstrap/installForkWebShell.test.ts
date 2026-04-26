import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const registerServiceWorker = vi.fn(() => Promise.resolve());

vi.mock("../../pwa", () => ({
  registerServiceWorker,
}));

class FakeElement {
  id = "";
  dataset: Record<string, string> = {};
  removed = false;

  remove() {
    this.removed = true;
  }
}

class FakeHtmlLinkElement extends FakeElement {
  href = "";
}

class FakeHtmlStyleElement extends FakeElement {
  textContent = "";
}

class FakeHtmlMetaElement extends FakeElement {
  readonly attributes = new Map<string, string>();

  setAttribute(name: string, value: string) {
    this.attributes.set(name, value);
  }

  getAttribute(name: string) {
    return this.attributes.get(name) ?? null;
  }
}

class FakeHeadElement extends FakeElement {
  constructor(private readonly registerById: (id: string, element: FakeElement) => void) {
    super();
  }

  append(element: FakeElement) {
    if (element.id) {
      this.registerById(element.id, element);
    }
  }
}

class FakeDocument {
  readonly documentElement = { dataset: {} as Record<string, string> };
  readonly themeMetas = [
    new FakeHtmlMetaElement(),
    new FakeHtmlMetaElement(),
    new FakeHtmlMetaElement(),
  ];
  readonly head = new FakeHeadElement((id, element) => {
    this.elements.set(id, element);
  });

  private readonly elements = new Map<string, FakeElement>();

  constructor() {
    this.registerElement("app-apple-touch-icon", new FakeHtmlLinkElement());
    this.registerElement("app-favicon-16", new FakeHtmlLinkElement());
    this.registerElement("app-favicon-32", new FakeHtmlLinkElement());
    this.registerElement("app-favicon-ico", new FakeHtmlLinkElement());
    this.registerElement("boot-shell", new FakeElement());
  }

  private registerElement(id: string, element: FakeElement) {
    element.id = id;
    this.elements.set(id, element);
  }

  getElementById(id: string) {
    return this.elements.get(id) ?? null;
  }

  createElement(tagName: string) {
    if (tagName === "style") {
      return new FakeHtmlStyleElement();
    }
    return new FakeElement();
  }

  querySelectorAll(selector: string) {
    if (selector === 'meta[name="theme-color"]') {
      return this.themeMetas;
    }
    return [];
  }
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("HTMLLinkElement", FakeHtmlLinkElement as unknown as typeof HTMLLinkElement);
  vi.stubGlobal("HTMLStyleElement", FakeHtmlStyleElement as unknown as typeof HTMLStyleElement);
  vi.stubGlobal("HTMLElement", FakeElement as unknown as typeof HTMLElement);
  vi.stubGlobal("window", {
    setTimeout,
    requestAnimationFrame: (callback: FrameRequestCallback) => {
      callback(0);
      return 0;
    },
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  registerServiceWorker.mockClear();
});

describe("installForkWebShell", () => {
  it("applies dev-host branding and dismisses the boot shell", async () => {
    const { installForkWebShell } = await import("./installForkWebShell");
    const doc = new FakeDocument();
    const appleTouchIcon = doc.getElementById("app-apple-touch-icon") as FakeHtmlLinkElement;
    const favicon16 = doc.getElementById("app-favicon-16") as FakeHtmlLinkElement;
    const favicon32 = doc.getElementById("app-favicon-32") as FakeHtmlLinkElement;
    const faviconIco = doc.getElementById("app-favicon-ico") as FakeHtmlLinkElement;
    const bootShell = doc.getElementById("boot-shell") as FakeElement;

    const handle = installForkWebShell({
      doc: doc as unknown as Document,
      hostname: "t3-dev.claude.do",
    });

    expect(registerServiceWorker).toHaveBeenCalledOnce();
    expect(doc.documentElement.dataset.hostVariant).toBe("t3-dev");
    expect(appleTouchIcon.href).toBe("/apple-touch-icon-dev.png");
    expect(favicon16.href).toBe("/favicon-dev-16x16.png");
    expect(favicon32.href).toBe("/favicon-dev-32x32.png");
    expect(faviconIco.href).toBe("/favicon-dev.ico");
    expect(doc.themeMetas.every((meta) => meta.getAttribute("content") === "#170308")).toBe(true);

    await vi.runAllTimersAsync();
    await handle.bootReady;

    expect(bootShell.dataset.state).toBe("dismissed");
    expect(bootShell.removed).toBe(true);
  });
});
