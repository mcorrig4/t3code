import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const repoRoot = process.cwd();

const requiredFiles = [
  ".gh-guard.conf",
  ".github/workflows/production-source-guard.yml",
  "AGENTS.md",
  "BRANCHES.md",
  "ENHANCEMENTS.md",
  "scripts/safe-delete-branch.sh",
  "UPSTREAM_SYNC_MIGRATION_LOG.md",
];

for (const relativePath of requiredFiles) {
  const fullPath = join(repoRoot, relativePath);
  if (!existsSync(fullPath)) {
    throw new Error(`Missing required Phase 1 file: ${relativePath}`);
  }
}

const agents = readFileSync(join(repoRoot, "AGENTS.md"), "utf8");
for (const needle of [
  "mcorrig4/t3code",
  "pingdotgg/t3code",
  "v<upstream-semver>-<upstream-sync-date>.<n>[-<pre>]",
  "production` is a protected runtime branch",
  "reapply and adapt our fork-specific behavior on top of it feature-by-feature",
]) {
  if (!agents.includes(needle)) {
    throw new Error(`AGENTS.md missing expected Phase 1 guidance: ${needle}`);
  }
}

const ghGuard = readFileSync(join(repoRoot, ".gh-guard.conf"), "utf8");
for (const needle of [
  "ALLOW_MUTATION_REPOS=mcorrig4/t3code",
  "DENY_MUTATION_REPOS=pingdotgg/t3code",
  "DEFAULT_MUTATION_REPO=mcorrig4/t3code",
]) {
  if (!ghGuard.includes(needle)) {
    throw new Error(`.gh-guard.conf missing expected value: ${needle}`);
  }
}

const workflow = readFileSync(
  join(repoRoot, ".github/workflows/production-source-guard.yml"),
  "utf8",
);
if (!workflow.includes("Production promotions must come from main")) {
  throw new Error("production-source-guard workflow missing expected branch check");
}

let refusedProductionDelete = false;
try {
  execFileSync(join(repoRoot, "scripts/safe-delete-branch.sh"), ["production"], {
    cwd: repoRoot,
    stdio: "pipe",
  });
} catch (error) {
  const stderr = String(error.stderr ?? "");
  refusedProductionDelete = stderr.includes("refusing to delete protected branch: production");
}

if (!refusedProductionDelete) {
  throw new Error("safe-delete-branch.sh did not refuse deleting production");
}

execFileSync("bun", ["run", "sync:phase0:smoke"], {
  cwd: repoRoot,
  stdio: "inherit",
});

process.stdout.write("[sync-phase-1] PASS guardrails and baseline smoke\n");
