import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const webRoot = path.resolve(import.meta.dirname, "..");
const indexHtmlPath = path.join(webRoot, "index.html");
const generatedDir = path.join(webRoot, "src", "generated");
const bootShellPath = path.join(generatedDir, "t3-boot-shell.html");
const iosSplashPath = path.join(generatedDir, "ios-pwa-splash-head.html");

const iosSplashStartMarker = "<!-- generated:ios-splash:start -->";
const iosSplashEndMarker = "<!-- generated:ios-splash:end -->";
const bootShellStartMarker = "<!-- generated:boot-shell:start -->";
const bootShellEndMarker = "<!-- generated:boot-shell:end -->";

function replaceSection(input, startMarker, endMarker, content) {
  const startIndex = input.indexOf(startMarker);
  const endIndex = input.indexOf(endMarker);

  if (startIndex < 0 || endIndex < 0 || endIndex < startIndex) {
    throw new Error(`Could not find markers ${startMarker} / ${endMarker} in index.html.`);
  }

  const sectionStart = startIndex + startMarker.length;
  return `${input.slice(0, sectionStart)}\n${content}\n${input.slice(endIndex)}`;
}

const [indexHtml, bootShellMarkup, iosSplashScript] = await Promise.all([
  readFile(indexHtmlPath, "utf8"),
  readFile(bootShellPath, "utf8"),
  readFile(iosSplashPath, "utf8"),
]);

const withSplashScript = replaceSection(
  indexHtml,
  iosSplashStartMarker,
  iosSplashEndMarker,
  iosSplashScript.trim(),
);
const withBootShell = replaceSection(
  withSplashScript,
  bootShellStartMarker,
  bootShellEndMarker,
  bootShellMarkup.trim(),
);

await writeFile(indexHtmlPath, withBootShell);
