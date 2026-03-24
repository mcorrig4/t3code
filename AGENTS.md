# AGENTS.md

## Task Completion Requirements

- All of `bun fmt`, `bun lint`, and `bun typecheck` must pass before considering tasks completed.
- NEVER run `bun test`. Always use `bun run test` (runs Vitest).

## Bun Gotcha

- `bun` should now be available on `PATH` in normal interactive and non-interactive shell sessions on this host.
- If a tool runs in an unusual environment that bypasses shell init and `bun` is still missing, fall back to `/home/claude/.bun/bin/bun`.

## Project Snapshot

T3 Code is a minimal web GUI for using coding agents like Codex and Claude.

This repository is a VERY EARLY WIP. Proposing sweeping changes that improve long-term maintainability is encouraged.

## Core Priorities

1. Performance first.
2. Reliability first.
3. Keep behavior predictable under load and during failures (session restarts, reconnects, partial streams).

If a tradeoff is required, choose correctness and robustness over short-term convenience.

## Maintainability

Long term maintainability is a core priority. If you add new functionality, first check if there is shared logic that can be extracted to a separate module. Duplicate logic across multiple files is a code smell and should be avoided. Don't be afraid to change existing code. Don't take shortcuts by just adding local logic to solve a problem.

- When adding a fork-specific feature, prefer modular patterns that minimize churn in the core codebase, such as sidecar modules, isolated adapters, thin integration seams, CSS overrides, feature-specific routes, or other self-contained layers that are easy to carry during upstream syncs.
- Before changing core behavior broadly, first consider whether the same outcome can be achieved with a smaller, more modular extension point that keeps the upstream diff narrow and easier to reason about.
- Every fork-specific enhancement, bug fix, behavior change, deployment customization, or operational deviation from upstream must be recorded in `ENHANCEMENTS.md`.
- Keep `ENHANCEMENTS.md` detailed enough that we could theoretically recreate our fork-specific behavior from scratch, and use it as both a historical changelog and a sync-review ledger when comparing incoming upstream changes against our local modifications.
- During upstream sync planning or conflict review, consult `ENHANCEMENTS.md` to decide whether a local change should stay, be dropped in favor of upstream, or be merged with an upstream alternative implementation.

## Repository Boundaries

- Default all GitHub collaboration actions to the user's fork: `mcorrig4/t3code`.
- When the user says "open a PR", "create a PR", "open an issue", "create an issue", or similar without naming a repo, interpret that as an action within `mcorrig4/t3code`.
- For pull requests, the default target is `mcorrig4/t3code` with the current branch merging into `main` on `mcorrig4/t3code`, unless the user explicitly asks for a different base branch.
- Treat `pingdotgg/t3code` as strictly upstream-only. Never open PRs, issues, discussions, or other GitHub artifacts there from this environment. If the user wants something opened against `pingdotgg/t3code`, explain that this is not allowed here and they should open it themselves in the GitHub website.
- If a request could affect a remote repository and the target is ambiguous, pause only long enough to confirm the owner/repo before publishing.

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
