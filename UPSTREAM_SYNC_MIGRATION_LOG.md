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
- Planned automation:
  - add a phase-specific browser smoke script after the phase passes manual review

### Phase 3: Chat UX and runtime branding details

- Goal:
  - restore user-facing shell polish and dev/runtime presentation details
- Planned automation:
  - add a phase-specific browser smoke script after the phase passes manual review

### Phase 4: Settings cluster

- Goal:
  - adapt fork settings behavior to the upstream settings architecture
- Planned automation:
  - add a phase-specific browser smoke script after the phase passes manual review

### Phase 5: Native TTS

- Goal:
  - reintroduce assistant TTS on the upstream message architecture
- Planned automation:
  - add a phase-specific browser smoke script after the phase passes manual review

### Phase 6: Stale pending user-input recovery and debug tooling

- Goal:
  - restore stale-input cleanup and debug surfaces
- Planned automation:
  - add a phase-specific browser smoke script after the phase passes manual review

### Phase 7: Web push notifications

- Goal:
  - restore the web push sidecar on the new upstream base
- Planned automation:
  - add a phase-specific browser smoke script after the phase passes manual review

### Phase 8: Server/provider/runtime overrides

- Goal:
  - port only the minimal retained fork runtime/server behavior
- Planned automation:
  - add a phase-specific browser smoke script after the phase passes manual review

### Phase 9: Final audit and promotion readiness

- Goal:
  - verify the full sync candidate before opening `sync/upstream-20260324 -> main`
- Planned automation:
  - aggregate the phase smoke scripts into a full sync verification run

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
