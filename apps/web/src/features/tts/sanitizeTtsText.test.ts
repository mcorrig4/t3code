import { describe, expect, it } from "vitest";
import { sanitizeAssistantMessageForTts } from "./sanitizeTtsText";

describe("sanitizeAssistantMessageForTts", () => {
  it("preserves plain prose while normalizing whitespace", () => {
    expect(sanitizeAssistantMessageForTts("Hello   world.\n\n")).toBe("Hello world.");
  });

  it("keeps markdown link labels and drops URLs", () => {
    expect(
      sanitizeAssistantMessageForTts("Read [the docs](https://example.com/docs) for more details."),
    ).toBe("Read the docs for more details.");
  });

  it("flattens inline code into readable prose", () => {
    expect(sanitizeAssistantMessageForTts("Run `bun lint` before shipping.")).toBe(
      "Run bun lint before shipping.",
    );
  });

  it("replaces labeled code fences with a language-specific placeholder", () => {
    expect(sanitizeAssistantMessageForTts("```ts\nconst value = 1;\n```")).toBe(
      "TypeScript Code Block - Open the chat to view the code.",
    );
  });

  it("replaces unlabeled code fences with a generic placeholder", () => {
    expect(sanitizeAssistantMessageForTts("```\nconst value = 1;\n```")).toBe(
      "Code Block - Open the chat to view the code.",
    );
  });

  it("replaces multiple code fences independently", () => {
    expect(
      sanitizeAssistantMessageForTts(
        ["```python", "print('hi')", "```", "", "```sh", "echo hi", "```"].join("\n"),
      ),
    ).toBe(
      [
        "Python Code Block - Open the chat to view the code.",
        "",
        "Shell Code Block - Open the chat to view the code.",
      ].join("\n"),
    );
  });

  it("returns empty string for markdown-only filler without speakable text", () => {
    expect(sanitizeAssistantMessageForTts("###\n\n---\n\n>")).toBe("");
  });
});
