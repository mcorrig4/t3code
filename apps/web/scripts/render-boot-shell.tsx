import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import T3Loader from "../src/components/loading/T3Loader";

const webRoot = path.resolve(import.meta.dir, "..");
const generatedDir = path.join(webRoot, "src", "generated");
const outputPath = path.join(generatedDir, "t3-boot-shell.html");

const markup = renderToStaticMarkup(
  <div
    id="app-boot-shell"
    aria-hidden="true"
    data-state="visible"
    style={{
      position: "fixed",
      inset: "0",
      zIndex: "2147483647",
      opacity: 1,
      transform: "scale(1)",
      transformOrigin: "center center",
      transition:
        "opacity 320ms cubic-bezier(0.16, 1, 0.3, 1), transform 320ms cubic-bezier(0.16, 1, 0.3, 1)",
    }}
  >
    <T3Loader decorative />
  </div>,
);

await mkdir(generatedDir, { recursive: true });
await writeFile(outputPath, `${markup}\n`);
