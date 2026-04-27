---
name: t3code-fork-engineering
description: >-
  Guide for all fork-specific engineering in the t3code repository.
  Use this skill whenever working on upstream syncs, new fork features,
  capsule or sidecar design, CSS overrides, testing/smoke coverage,
  branching, releases, or GitHub contributions. Essential for maintaining
  the fork capsule architecture and minimizing upstream merge friction.
  Invoke this skill proactively for ANY t3code fork work, even if the
  user doesn't explicitly mention fork engineering — including bug fixes,
  refactors, or any change that touches fork-owned code.
---

# T3 Code Fork Engineering

This skill guides all fork-specific engineering work in `mcorrig4/t3code`.
Use it for feature work, bug fixes, UI changes, reviews, and upstream sync reapplication.
The goal is always the same: keep fork behavior behind narrow seams so future syncs are mostly rebind seam, rerun capsule smoke, verify acceptance row.

## Overview

Start with the repo rules and the main playbook:

- [AGENTS.md](/home/claude/code/t3code/AGENTS.md) — repo rules, fork patterns, versioning, repository boundaries
- [docs/fork-engineering-playbook.md](/home/claude/code/t3code/docs/fork-engineering-playbook.md) — decision order, required shape, preferred patterns, obsolescence workflow, change and sync checklists

Then load only the reference file(s) relevant to the task instead of reading everything.

## Core Rules

1. Prefer an existing capsule before inventing a new fork surface.
2. Create or strengthen a seam before broadening diffs in upstream-owned files.
3. Put fork implementation logic in fork-owned modules under `apps/*/src/fork/` wherever practical.
4. Update [ENHANCEMENTS.md](/home/claude/code/t3code/ENHANCEMENTS.md) for every fork change.
5. Use [docs/fork-acceptance-matrix.md](/home/claude/code/t3code/docs/fork-acceptance-matrix.md) and smoke coverage as the verification contract.
6. Keep fork CSS in [apps/web/src/overrides.css](/home/claude/code/t3code/apps/web/src/overrides.css) and prefer `data-slot="fork-*"` hooks for fork-only styling targets.

## Decision Tree

Identify what kind of work you are doing, then follow the steps for that work type.

### Net new fork feature

1. Read [references/decision-tree.md](references/decision-tree.md)
2. Read [references/sidecar-and-capsule-patterns.md](references/sidecar-and-capsule-patterns.md)
3. Read [references/repo-surface-map.md](references/repo-surface-map.md)
4. Then update: `ENHANCEMENTS.md`, `docs/fork-architecture.md`, `docs/fork-acceptance-matrix.md`

### Fix or regression

1. Read [references/decision-tree.md](references/decision-tree.md)
2. Read [references/upstream-vs-fork-triage.md](references/upstream-vs-fork-triage.md)
3. Read [references/repo-surface-map.md](references/repo-surface-map.md)
4. Keep the final fix seam-first even if the bug originated in upstream-owned code

### UI look, feel, or behavior change

1. Read [references/css-overrides.md](references/css-overrides.md)
2. Read [references/decision-tree.md](references/decision-tree.md)
3. Read [references/testing-and-acceptance.md](references/testing-and-acceptance.md)

### Review or refactor

1. Read [references/sidecar-and-capsule-patterns.md](references/sidecar-and-capsule-patterns.md)
2. Read [references/testing-and-acceptance.md](references/testing-and-acceptance.md)
3. Read [references/source-of-truth.md](references/source-of-truth.md)

### Upstream sync or reapply

1. Read [references/sync-and-obsolescence.md](references/sync-and-obsolescence.md)
2. Read [references/source-of-truth.md](references/source-of-truth.md)
3. Read [references/testing-and-acceptance.md](references/testing-and-acceptance.md)
4. Use fresh-upstream reapplication, not broad cherry-picking from an already drifted fork

## Golden Rules

These constraints apply to ALL work types. They are non-negotiable.

1. **Every fork change needs the full shape.** One seam, one fork-owned subtree, one ENHANCEMENTS entry, one acceptance-matrix row, rollback notes, and at least one automated verification path. If it doesn't have all of these, it is not yet capsule-aligned.

2. **Prefer fork-owned files.** Put implementation logic under `apps/*/src/fork/` wherever practical. Keep upstream file modifications narrow — ideally a single import and a single call site.

3. **Design for future upstream rewrites.** The adaptation path should be: update the seam, keep the fork-owned subtree mostly intact, rerun the capsule smoke. If an upstream rewrite would force edits across many unrelated files, the fork change is too coupled.

4. **Consult ENHANCEMENTS.md during sync.** For each retained feature: keep it, drop it (upstream covers it), or merge it (upstream partially covers it). Do not preserve fork behavior automatically.

5. **The unit of decision-making is the individual feature.** Not the commit, not the branch, not the PR. Every feature, bug fix, and customization is evaluated independently during sync.

## Source Of Truth Routing

- [AGENTS.md](/home/claude/code/t3code/AGENTS.md) — repo policy, versioning, branching, GitHub boundaries
- [docs/fork-architecture.md](/home/claude/code/t3code/docs/fork-architecture.md) — where fork behavior belongs
- [docs/fork-acceptance-matrix.md](/home/claude/code/t3code/docs/fork-acceptance-matrix.md) — how to prove a capsule still works
- [ENHANCEMENTS.md](/home/claude/code/t3code/ENHANCEMENTS.md) — capsule-grouped ledger: why a fork change exists and when to remove it
- [UPSTREAM_SYNC_MIGRATION_LOG.md](/home/claude/code/t3code/UPSTREAM_SYNC_MIGRATION_LOG.md) — how sync and reapplication currently work
- [BRANCHES.md](/home/claude/code/t3code/BRANCHES.md) and [/home/claude/T3CODE_OPERATIONS.md](/home/claude/T3CODE_OPERATIONS.md) — branch safety, promotion, and runtime operations

## Working Rule

Do not spread fork behavior into core files when an existing seam can host it.
Before adding a new fork enhancement, determine whether it belongs to an existing capsule.
If the behavior may already be ours, check `ENHANCEMENTS.md` and the current capsule surface before designing a fix.

## Quick Reference: Capsule Map

| #   | Capsule                        | Mount seam                                                      | Owned subtree                                                             |
| --- | ------------------------------ | --------------------------------------------------------------- | ------------------------------------------------------------------------- |
| 1   | Server HTTP                    | `wsServer.ts`                                                   | `apps/server/src/fork/http/`                                              |
| 2   | Notification delivery          | `WebPushNotifications.ts`                                       | `apps/server/src/fork/notifications/`                                     |
| 3   | Fork settings                  | `ForkSettingsSection.tsx`, `_chat.settings.tsx`, `ChatView.tsx` | `apps/web/src/fork/settings/`                                             |
| 4   | Web bootstrap / branding / PWA | `main.tsx`                                                      | `apps/web/src/fork/bootstrap/`                                            |
| 5   | UI hooks and debug             | `overrides.css`, `__root.tsx`, `Sidebar.tsx`, `ChatView.tsx`    | `apps/web/src/fork/bootstrap/ForkRootSidecars.tsx`, `apps/web/src/debug/` |
| 6   | Sync and test infrastructure   | `package.json` scripts, sync log                                | `apps/web/src/fork/testing/`, `apps/web/e2e/shared/`                      |

Full details: [docs/fork-architecture.md](/home/claude/code/t3code/docs/fork-architecture.md)

## Quick Reference: Verification Commands

```bash
# Quality gates (must pass before any task is complete)
bun fmt
bun lint
bun typecheck

# Smoke layers
bun run sync:smoke:integrated               # preferred: build + headless server + same-origin local smoke
bun run --cwd apps/web sync:smoke:quick     # deterministic layer for a prepared local target
bun run --cwd apps/web sync:smoke:hosted    # hosted baseline: reachability on t3-dev.claude.do
bun run --cwd apps/web sync:smoke:all       # both: quick then hosted

# Per-capsule smoke (run the one matching your change)
bun run --cwd apps/web sync:phase0:smoke    # baseline
bun run --cwd apps/web sync:phase2:smoke    # PWA/branding
bun run --cwd apps/web sync:phase4:smoke    # settings
bun run --cwd apps/web sync:phase6:smoke    # debug sidecar
bun run --cwd apps/web sync:phase7:smoke    # web push
bun run --cwd apps/web sync:phase9:smoke    # settings sidecar

# Acceptance matrix check
bun run --cwd apps/web sync:acceptance:check

# Fork browser specs
bun run --cwd apps/web test:browser:fork
```

Full verification matrix: [docs/fork-acceptance-matrix.md](/home/claude/code/t3code/docs/fork-acceptance-matrix.md)

## Reference Map

- [references/decision-tree.md](references/decision-tree.md) — first-pass triage for features, fixes, UI work, reviews, and syncs
- [references/source-of-truth.md](references/source-of-truth.md) — where truth lives in this repo
- [references/sidecar-and-capsule-patterns.md](references/sidecar-and-capsule-patterns.md) — seam-first implementation patterns and anti-patterns
- [references/css-overrides.md](references/css-overrides.md) — fork CSS rules for `overrides.css` and `data-slot` hooks
- [references/upstream-vs-fork-triage.md](references/upstream-vs-fork-triage.md) — decide whether a behavior is fork-owned or upstream-owned
- [references/testing-and-acceptance.md](references/testing-and-acceptance.md) — required verification layers and smoke strategy
- [references/sync-and-obsolescence.md](references/sync-and-obsolescence.md) — reapply, compare, deprecate, and remove fork changes safely
- [references/repo-surface-map.md](references/repo-surface-map.md) — likely code surfaces to inspect first

## Required Doc Updates

Before any fork change is considered complete, update the relevant docs:

1. [ENHANCEMENTS.md](/home/claude/code/t3code/ENHANCEMENTS.md) — always
2. [docs/fork-architecture.md](/home/claude/code/t3code/docs/fork-architecture.md) — if seam or subtree changed
3. [docs/fork-acceptance-matrix.md](/home/claude/code/t3code/docs/fork-acceptance-matrix.md) — if verification changed
4. [UPSTREAM_SYNC_MIGRATION_LOG.md](/home/claude/code/t3code/UPSTREAM_SYNC_MIGRATION_LOG.md) — if sync or smoke procedure changed

Full checklist: [docs/fork-engineering-playbook.md](/home/claude/code/t3code/docs/fork-engineering-playbook.md) "Change Checklist" section
