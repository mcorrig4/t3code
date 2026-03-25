# Upstream Sync Migration Log

## Purpose

This file is the working runbook for rebuilding the fork on top of a fresh `upstream/main` snapshot.

Use it to:

- track the current sync branch and upstream base
- record the feature-cluster migration order
- capture issues discovered during each phase
- save automated verification commands and scripts so future upstream syncs are repeatable

## Core Sync Rule

Treat `upstream/main` as the authoritative source snapshot.

Do not preserve fork behavior by cherry-picking old fork commits onto a drifted branch.

Instead:

1. create a fresh sync branch from `upstream/main`
2. use `ENHANCEMENTS.md` as the fork feature inventory
3. reapply fork features on top of the fresh upstream base one cluster at a time
4. validate each phase with both:
   - automated checks
   - manual smoke tests in `t3-dev.claude.do`

## Current Sync

- Sync branch: `sync/upstream-20260324`
- Upstream base commit: `be1abc88`
- Local fork reference branch: `main`

## Phase Structure

### Phase 0: Fresh upstream baseline

- Goal:
  - prove the untouched upstream snapshot can run in the dev environment
- Scope:
  - no fork features reapplied
  - operational compatibility fixes only when required to make the dev environment work
- Known issues discovered:
  - upstream server CLI replaced `--state-dir` with `--home-dir`, so the VPS dev systemd unit needed a one-line operational fix outside the repo
  - upstream Vite config needed explicit `server.allowedHosts` coverage for `t3-dev.claude.do`
- Automated verification:
  - `bun run sync:phase0:smoke`
- Script:
  - [sync-phase-0-baseline.mjs](/home/claude/code/t3code/apps/web/e2e/sync-phase-0-baseline.mjs)

### Phase 1: Low-risk shell/docs/guardrails

- Goal:
  - restore low-risk fork identity and operational guardrails
- Automated verification:
  - `bun run sync:phase1:smoke`
- Script:
  - [sync-phase-1-guardrails.mjs](/home/claude/code/t3code/scripts/sync-phase-1-guardrails.mjs)

### Phase 2: Mobile/PWA/shell UX

- Goal:
  - restore mobile and shell customizations on top of the upstream UI shell
- Automated verification:
  - `bun run sync:phase2:smoke`
- Script:
  - [sync-phase-2-mobile-pwa.mjs](/home/claude/code/t3code/apps/web/e2e/sync-phase-2-mobile-pwa.mjs)
- Notes:
  - the Playwright phase smoke uses the local dev web endpoint by default because `t3-dev.claude.do` is behind Cloudflare Access and not reliably reachable from headless automation on the VPS
  - Phase 2 automation currently verifies PWA shell metadata, root-scoped service worker registration, and the standalone PWA helper logic
  - mobile composer focus-zoom behavior still needs manual validation in the authenticated dev app until we build a more reliable browser/component harness for this sync flow

### Phase 3: Chat UX and runtime branding details

- Goal:
  - restore user-facing shell polish and dev/runtime presentation details
- Automated verification:
  - `bun run sync:phase3:smoke`
- Notes:
  - Phase 3 currently verifies runtime-branding resolution via unit tests
  - the visible dev badge and dev-host icon/manifest swap still require manual validation on `t3-dev.claude.do` because they depend on the authenticated hostname surface

### Phase 4: Settings cluster

- Goal:
  - adapt fork settings behavior to the upstream settings architecture
- Automated verification:
  - `bun run sync:phase4:smoke`
- Script:
  - [sync-phase-4-settings.mjs](/home/claude/code/t3code/apps/web/e2e/sync-phase-4-settings.mjs)
- Notes:
  - keep the upstream settings framework intact and layer fork-only Codex session overrides into the existing advanced install controls instead of reviving the older fork settings page wholesale
  - web push settings stay coupled to the later push sidecar phase so the sync branch does not grow a half-wired settings surface before the server and client notification layers return
  - future fork-only settings should move toward a single injected sidecar section/component while still sharing the canonical app settings store by default
  - see [FORK_SETTINGS_SIDECAR_PLAN.md](/home/claude/code/t3code/FORK_SETTINGS_SIDECAR_PLAN.md)

### Phase 5: Native TTS

- Goal:
  - reintroduce assistant TTS on the upstream message architecture
- Automated verification:
  - `bun run sync:phase5:smoke`
- Notes:
  - keep TTS as a self-contained sidecar under `apps/web/src/features/tts`
  - prefer a single integration seam in the assistant message metadata row rather than threading TTS through broader chat/provider architecture

### Phase 6: Fork debug and runtime sidecars

- Goal:
  - port only the remaining fork-only debug tooling and minimal runtime/server sidecars that are still justified after the upstream sync
- Automated verification:
  - `bun run sync:phase6:smoke`
- Script:
  - [sync-phase-6-debug-sidecar.mjs](/home/claude/code/t3code/apps/web/e2e/sync-phase-6-debug-sidecar.mjs)
- Notes:
  - treat stale pending approval/user-input cleanup as already-upstream unless comparison proves a remaining missing behavior
  - focus this phase on optional fork-only debugging surfaces such as the user-input debug panel and any truly necessary runtime overrides
  - prefer sidecar seams over broad runtime divergence
  - the current phase smoke validates the Settings diagnostics opener, debug query param compatibility, sidecar mount, and global error/rejection breadcrumb capture on the local dev web endpoint

### Phase 7: Web push notifications

- Goal:
  - restore the web push sidecar on the new upstream base
- Automated verification:
  - `bun run sync:phase7:smoke`
- Script:
  - [sync-phase-7-web-push.mjs](/home/claude/code/t3code/apps/web/e2e/sync-phase-7-web-push.mjs)
- Notes:
  - keep this separate from the runtime/debug phase because it is its own full-stack sidecar spanning settings, service worker, client registration, server layers, persistence, and runtime config
  - the current phase smoke validates the fork settings-sidecar mount, the notifications status card, `/api/web-push/config`, rejection of visible JSON/HTML parse failures, and safe disabled-server behavior on the local dev web endpoint

### Phase 8: Final audit and promotion readiness

- Goal:
  - verify the full sync candidate before opening `sync/upstream-20260324 -> main`
- Planned automation:
  - aggregate the phase smoke scripts into a full sync verification run

### Phase 9: Fork settings sidecar refactor

- Goal:
  - refactor retained fork-only settings UI to conform to the dedicated sidecar-section pattern after the main sync is otherwise stable
- Planned automation:
  - extend the settings smoke to validate the extracted sidecar entry point
- Notes:
  - keep the canonical app settings store unless a future setting is truly sidecar-only
  - use [FORK_SETTINGS_SIDECAR_PLAN.md](/home/claude/code/t3code/FORK_SETTINGS_SIDECAR_PLAN.md) as the target architecture

## Automation Conventions

- Prefer one small browser smoke script per completed phase.
- Each script should check only the behaviors touched by that phase, plus one or two nearby sanity checks.
- Keep the scripts runnable against the dev host with a simple command.
- Use a delegated agent/sub-agent to run the browser verification and summarize only the important findings in the main thread.

## Standard Commands

- Install browser dependencies if needed:
  - `bun run --cwd apps/web test:browser:install`
- Run existing component browser tests:
  - `bun run --cwd apps/web test:browser`
- Run the current phase baseline smoke:
  - `bun run sync:phase0:smoke`
