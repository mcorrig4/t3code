const CODE_BLOCK_SUFFIX = "Code Block - Open the chat to view the code.";

const CODE_LANGUAGE_LABELS: Record<string, string> = {
  bash: "Shell",
  c: "C",
  "c#": "C Sharp",
  "c++": "C Plus Plus",
  cpp: "C Plus Plus",
  cs: "C Sharp",
  css: "CSS",
  go: "Go",
  html: "HTML",
  java: "Java",
  javascript: "JavaScript",
  js: "JavaScript",
  json: "JSON",
  jsx: "JavaScript",
  markdown: "Markdown",
  md: "Markdown",
  php: "PHP",
  py: "Python",
  python: "Python",
  rb: "Ruby",
  ruby: "Ruby",
  rust: "Rust",
  sh: "Shell",
  shell: "Shell",
  sql: "SQL",
  swift: "Swift",
  ts: "TypeScript",
  tsx: "TypeScript",
  typescript: "TypeScript",
  xml: "XML",
  yaml: "YAML",
  yml: "YAML",
  zsh: "Shell",
};

function normalizeLanguageLabel(infoString: string): string | null {
  const languageToken = infoString.trim().split(/\s+/)[0]?.trim().toLowerCase();
  if (!languageToken) {
    return null;
  }

  const knownLabel = CODE_LANGUAGE_LABELS[languageToken];
  if (knownLabel) {
    return knownLabel;
  }

  const cleaned = languageToken.replace(/[^a-z0-9#+.-]/gi, "");
  if (!cleaned || !/[a-z]/i.test(cleaned)) {
    return null;
  }

  return cleaned
    .split(/[-_.]+/)
    .filter((segment) => segment.length > 0)
    .map((segment) => `${segment.slice(0, 1).toUpperCase()}${segment.slice(1)}`)
    .join(" ");
}

function buildCodeBlockPlaceholder(infoString: string): string {
  const languageLabel = normalizeLanguageLabel(infoString);
  if (!languageLabel) {
    return CODE_BLOCK_SUFFIX;
  }

  return `${languageLabel} ${CODE_BLOCK_SUFFIX}`;
}

function hasSpeakableText(value: string): boolean {
  return value.replace(/[^\p{L}\p{N}]+/gu, "").length > 0;
}

export function sanitizeAssistantMessageForTts(text: string): string {
  let sanitized = text.trim();
  if (sanitized.length === 0) {
    return "";
  }

  sanitized = sanitized.replace(
    /(^|\n)(```|~~~)([^\n]*)\n[\s\S]*?\n\2(?=\n|$)/g,
    (_match, leadingBoundary: string, _fence: string, infoString: string) =>
      `${leadingBoundary}${buildCodeBlockPlaceholder(infoString)}\n`,
  );

  sanitized = sanitized.replace(/!\[([^\]]*)\]\((?:[^()\\]|\\.)+\)/g, "$1");
  sanitized = sanitized.replace(/\[([^\]]+)\]\((?:[^()\\]|\\.)+\)/g, "$1");
  sanitized = sanitized.replace(/<https?:\/\/[^>\s]+>/g, "");
  sanitized = sanitized.replace(/https?:\/\/\S+/g, "");
  sanitized = sanitized.replace(/`([^`]+)`/g, "$1");
  sanitized = sanitized.replace(/^#{1,6}\s+/gm, "");
  sanitized = sanitized.replace(/^>\s?/gm, "");
  sanitized = sanitized.replace(/^[-*+]\s+/gm, "");
  sanitized = sanitized.replace(/^\d+\.\s+/gm, "");
  sanitized = sanitized.replace(/^[-*_]{3,}$/gm, "");
  sanitized = sanitized.replace(/[*_~]/g, "");
  sanitized = sanitized.replace(/<\/?[^>]+>/g, "");
  sanitized = sanitized.replace(/[ \t]*\|[ \t]*/g, " ");
  sanitized = sanitized.replace(/[ \t]+\n/g, "\n");
  sanitized = sanitized.replace(/\n{3,}/g, "\n\n");
  sanitized = sanitized.replace(/[ \t]{2,}/g, " ");
  sanitized = sanitized.trim();

  return hasSpeakableText(sanitized) ? sanitized : "";
}
