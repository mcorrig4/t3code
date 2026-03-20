# AGENTS.md

## Task Completion Requirements

- All of `bun fmt`, `bun lint`, and `bun typecheck` must pass before considering tasks completed.
- NEVER run `bun test`. Always use `bun run test` (runs Vitest).

## Bun Gotcha

- In this environment, `bun` may not be on `PATH` even though Bun is installed at `/home/claude/.bun/bin/bun`.
- If plain `bun ...` fails with `bun: command not found`, use the absolute binary path instead.
- For `bun typecheck`, also prepend Bun to `PATH` so Turbo can find the package manager binary:
  `env PATH="/home/claude/.bun/bin:$PATH" /home/claude/.bun/bin/bun typecheck`
- `bun fmt` and `bun lint` can be run directly with `/home/claude/.bun/bin/bun fmt` and `/home/claude/.bun/bin/bun lint`.

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

## Repository Boundaries

- Default all GitHub collaboration actions to the user's fork: `mcorrig4/t3code`.
- When the user says "open a PR", "create a PR", "open an issue", "create an issue", or similar without naming a repo, interpret that as an action within `mcorrig4/t3code`.
- For pull requests, the default target is `mcorrig4/t3code` with the current branch merging into `main` on `mcorrig4/t3code`, unless the user explicitly asks for a different base branch.
- Treat `pingdotgg/t3code` as strictly upstream-only. Never open PRs, issues, discussions, or other GitHub artifacts there from this environment. If the user wants something opened against `pingdotgg/t3code`, explain that this is not allowed here and they should open it themselves in the GitHub website.
- If a request could affect a remote repository and the target is ambiguous, pause only long enough to confirm the owner/repo before publishing.

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
