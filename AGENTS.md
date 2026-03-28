# AGENTS.md

## Task Completion Requirements

- All of `bun fmt`, `bun lint`, and `bun typecheck` must pass before considering tasks completed.
- NEVER run `bun test`. Always use `bun run test` (runs Vitest).
- During multi-phase sync, merge, migration, or verification work, delegate routine verification to subagents by default:
  - Playwright/browser smoke runs
  - `bun fmt`
  - `bun lint`
  - `bun typecheck`
  - phase script execution and result summaries
- Keep the main thread focused on implementation decisions, merge reasoning, real findings, and user-facing manual checklists.
- Only pull routine verification back into the main thread when a delegated run finds a real failure, needs direct debugging, or hits an environment/tooling blocker.

## Project Snapshot

T3 Code is a minimal web GUI for using coding agents like Codex and Claude.

This repository is a maintained fork of `pingdotgg/t3code` with a capsule-aligned architecture, 21 active enhancements, and structured sync infrastructure. Proposing changes that improve long-term maintainability is encouraged.

## Core Priorities

1. Performance first.
2. Reliability first.
3. Keep behavior predictable under load and during failures (session restarts, reconnects, partial streams).

If a tradeoff is required, choose correctness and robustness over short-term convenience.

## Fork Engineering Skill

For any fork-specific work — new features, upstream syncs, capsule design, CSS overrides, testing, branching, or GitHub contributions — invoke the `t3code-fork-engineering` skill first. It routes you to the right docs, procedures, and design principles.

This is the primary entry point for fork engineering guidance in this repo. The repo-local skill lives at [.agents/skills/t3code/SKILL.md](/home/claude/code/t3code/.agents/skills/t3code/SKILL.md) and its `references/` directory contains 14 specialized guides covering decision trees, capsule patterns, CSS overrides, sync workflows, testing, upstream impact detection, and source-of-truth routing.

## Maintainability

Long term maintainability is a core priority. If you add new functionality, first check if there is shared logic that can be extracted to a separate module. Duplicate logic across multiple files is a code smell and should be avoided. Don't be afraid to change existing code. Don't take shortcuts by just adding local logic to solve a problem.

- When adding a fork-specific feature, prefer modular patterns that minimize churn in the core codebase, such as sidecar modules, isolated adapters, thin integration seams, CSS overrides, feature-specific routes, or other self-contained layers that are easy to carry during upstream syncs.
- Before changing core behavior broadly, first consider whether the same outcome can be achieved with a smaller, more modular extension point that keeps the upstream diff narrow and easier to reason about.
- Follow [docs/fork-engineering-playbook.md](/home/claude/code/t3code/docs/fork-engineering-playbook.md) when designing new fork enhancements, fixes, or sync reapplications.
- Every fork-specific enhancement, bug fix, behavior change, deployment customization, or operational deviation from upstream must be recorded in `ENHANCEMENTS.md`.
- `ENHANCEMENTS.md` entries are grouped by capsule and use a compact format. Keep each entry detailed enough to recreate the fork behavior from scratch. The detailed historical format from the initial buildout is archived at [docs/archive/ENHANCEMENTS-v1-detailed.md](docs/archive/ENHANCEMENTS-v1-detailed.md).
- During upstream sync planning or conflict review, consult `ENHANCEMENTS.md` capsule-by-capsule to decide whether a local change should stay, be dropped in favor of upstream, or be merged with an upstream alternative implementation.
- Upstream syncs must treat `pingdotgg/t3code` as the source snapshot. Do not preserve fork behavior by cherry-picking old fork commits directly onto an already-drifted branch.
- The correct upstream sync model is:
  - start from the exact new `upstream/main` snapshot
  - treat that snapshot as the new base
  - reapply and adapt our fork-specific behavior on top of it feature-by-feature
  - verify each retained fork feature against the new upstream architecture before merging it back into `main`
- During upstream sync work, branches and old commit hashes are evidence only. The unit of decision-making is the individual feature, bug fix, customization, or operational deviation.
- Avoid commit-cherry-picking as the default sync strategy. Prefer manual reapplication, targeted patch extraction, or small feature branches built from the fresh upstream snapshot so our retained changes match the new upstream structure cleanly.
- For fork-only settings UI, prefer a single injected sidecar section/component over scattering fork controls throughout the upstream settings page.
- Upstream-equivalent settings should keep using the canonical app settings store in `apps/web/src/appSettings.ts`.
- Truly fork-only settings should live in the dedicated fork settings store under `apps/web/src/fork/settings`, with migration/reset behavior composed through the fork settings sidecar seam instead of widening the canonical upstream settings model.
- Preferred pattern:
  - keep upstream-owned settings in the canonical schema/store
  - render fork-owned settings through a dedicated sidecar entry point such as `ForkSettingsSection`
  - keep fork-only persistence, migration, and reset logic under `apps/web/src/fork/settings`
  - keep upstream-owned settings layout intact wherever practical
  - colocate fork-only runtime wiring behind small helpers/adapters instead of expanding upstream settings codepaths broadly
- For fork-specific CSS overrides, tag the target element with a `data-slot` attribute and put the rule in `apps/web/src/overrides.css`. Never modify inline Tailwind classes in upstream components for fork-only styling.
- Required checklist for every new fork change:
  - define or reuse a clear seam
  - keep the implementation in fork-owned files wherever practical
  - update `ENHANCEMENTS.md`
  - update [docs/fork-architecture.md](/home/claude/code/t3code/docs/fork-architecture.md) if the seam changed
  - update [docs/fork-acceptance-matrix.md](/home/claude/code/t3code/docs/fork-acceptance-matrix.md) if verification changed
  - add or update automated verification
  - document rollback and upstream-replacement/removal triggers

## Repository Boundaries

- Default all GitHub collaboration actions to the user's fork: `mcorrig4/t3code`.
- When the user says "open a PR", "create a PR", "open an issue", "create an issue", or similar without naming a repo, interpret that as an action within `mcorrig4/t3code`.
- For pull requests, the default target is `mcorrig4/t3code` with the current branch merging into `main` on `mcorrig4/t3code`, unless the user explicitly asks for a different base branch.
- Treat `pingdotgg/t3code` as strictly upstream-only. Never open PRs, issues, discussions, or other GitHub artifacts there from this environment. If the user wants something opened against `pingdotgg/t3code`, explain that this is not allowed here and they should open it themselves in the GitHub website.
- If a request could affect a remote repository and the target is ambiguous, pause only long enough to confirm the owner/repo before publishing.

## Fork Versioning

- Keep the core semver in our fork aligned with the current upstream release version from `pingdotgg/t3code` so it is easy to see what upstream release line we are building on.
- For fork releases, use the tag format `v<upstream-semver>-<upstream-sync-date>.<n>[-<pre>]`.
- The optional `[-<pre>]` suffix marks pre-release maturity: `-alpha`, `-beta`, `-rc1`, `-rc2`, etc. Omitting it means a stable fork release.
- The `upstream-sync-date` must be the `YYYYMMDD` date when `main` last absorbed changes from `upstream/main`, not the date we happen to cut a release tag later.
- Example: if upstream is `0.0.13` and our last upstream sync landed on March 20, 2026, our fork release sequence should be `v0.0.13-20260320.1`, `v0.0.13-20260320.2-alpha`, `v0.0.13-20260320.3-rc1`, `v0.0.13-20260320.4`, and so on.
- Reset the fork counter whenever either the upstream semver base changes or a newer upstream sync date becomes the new baseline. Example: after syncing to upstream `0.0.14` on April 10, 2026, the next fork release becomes `v0.0.14-20260410.1`.
- Before creating a new fork release tag, confirm both:
  - the current upstream version from `upstream/main`
  - the correct last-upstream-sync date for the `main` branch lineage being released
- Do not create new plain semver tags like `v0.0.14` for fork releases. Use the dated fork-release format consistently.

## Branch Safety

- `production` is a protected runtime branch. NEVER delete it, rename it, or repurpose it.
- The local `production` worktree at `/srv/t3code/prod` backs the live `t3.claude.do` deployment.
- Treat `production` as operational infrastructure, not cleanup inventory.
- Before deleting any local branch, check [BRANCHES.md](/home/claude/code/t3code/BRANCHES.md) and prefer `scripts/safe-delete-branch.sh` over raw `git branch -d`.
- Before doing dev/prod deployment work, promotion work, or branch-merge flow changes, read `/home/claude/T3CODE_OPERATIONS.md` and follow it as the operational source of truth.

## Package Roles

- `apps/server`: Node.js WebSocket server. Wraps Codex app-server (JSON-RPC over stdio), serves the React web app, and manages provider sessions.
- `apps/web`: React/Vite UI. Owns session UX, conversation/event rendering, and client-side state. Connects to the server via WebSocket.
- `packages/contracts`: Shared effect/Schema schemas and TypeScript contracts for provider events, WebSocket protocol, and model/session types. Keep this package schema-only — no runtime logic.
- `packages/shared`: Shared runtime utilities consumed by both server and web. Uses explicit subpath exports (e.g. `@t3tools/shared/git`) — no barrel index.

## Codex App Server (Important)

T3 Code is currently Codex-first. The server starts `codex app-server` (JSON-RPC over stdio) per provider session, then streams structured events to the browser through WebSocket push messages.

How we use it in this codebase:

- Session startup/resume and turn lifecycle are brokered in `apps/server/src/codexAppServerManager.ts`.
- Provider dispatch and thread event logging are coordinated in `apps/server/src/providerManager.ts`.
- WebSocket server routes NativeApi methods in `apps/server/src/wsServer.ts`.
- Web app consumes orchestration domain events via WebSocket push on channel `orchestration.domainEvent` (provider runtime activity is projected into orchestration events server-side).

Docs:

- Codex App Server docs: https://developers.openai.com/codex/sdk/#app-server

## Reference Repos

- Open-source Codex repo: https://github.com/openai/codex
- Codex-Monitor (Tauri, feature-complete, strong reference implementation): https://github.com/Dimillian/CodexMonitor

Use these as implementation references when designing protocol handling, UX flows, and operational safeguards.
