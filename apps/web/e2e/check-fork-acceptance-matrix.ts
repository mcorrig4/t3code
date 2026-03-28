import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { forkSmokeManifest } from "../src/fork/testing/forkSmokeManifest";

const repoRoot = resolve(import.meta.dir, "..", "..", "..");
const acceptanceMatrixPath = resolve(repoRoot, "docs", "fork-acceptance-matrix.md");
const acceptanceMatrix = readFileSync(acceptanceMatrixPath, "utf8");

const requiredAcceptanceCapsules = [
  ...new Set(forkSmokeManifest.flatMap((entry) => entry.acceptanceCapsules)),
];

const missingCapsules = requiredAcceptanceCapsules.filter(
  (capsule) => !acceptanceMatrix.includes(`| ${capsule} `),
);

const missingCommands = forkSmokeManifest
  .map((entry) => entry.phaseCommand)
  .filter((command) => !acceptanceMatrix.includes(command));

if (missingCapsules.length > 0 || missingCommands.length > 0) {
  const parts: string[] = [];
  if (missingCapsules.length > 0) {
    parts.push(`missing capsules: ${missingCapsules.join(", ")}`);
  }
  if (missingCommands.length > 0) {
    parts.push(`missing phase commands: ${missingCommands.join(", ")}`);
  }
  throw new Error(`Fork acceptance matrix is incomplete: ${parts.join("; ")}`);
}

process.stdout.write(
  `[fork-acceptance-matrix] PASS ${forkSmokeManifest.length} capsule entries verified\n`,
);
