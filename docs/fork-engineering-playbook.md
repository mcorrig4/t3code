# Fork Engineering Playbook

This is the normative "how to build fork changes" guide for future agents and contributors.

Use this together with:

- [AGENTS.md](/home/claude/code/t3code/AGENTS.md) for repo rules
- [docs/fork-architecture.md](/home/claude/code/t3code/docs/fork-architecture.md) for the current capsule/seam map
- [docs/fork-acceptance-matrix.md](/home/claude/code/t3code/docs/fork-acceptance-matrix.md) for required coverage
- [UPSTREAM_SYNC_MIGRATION_LOG.md](/home/claude/code/t3code/UPSTREAM_SYNC_MIGRATION_LOG.md) for reapplication workflow
- [ENHANCEMENTS.md](/home/claude/code/t3code/ENHANCEMENTS.md) for the historical ledger and removal triggers

## Core Rule

Future fork work should primarily be:

1. rebind seam
2. rerun capsule smoke
3. verify acceptance row

It should not require rediscovering behavior from scratch or replaying large core-file patches into a changed upstream architecture.

## Decision Order Before You Change Code

For any new fork enhancement, fix, or behavior change:

1. Check whether the behavior fits an existing capsule in [docs/fork-architecture.md](/home/claude/code/t3code/docs/fork-architecture.md).
2. If it fits, use the existing seam.
3. If it does not fit, create or formalize a seam before spreading feature logic through core files.
4. Prefer fork-owned modules, wrappers, routes, sidecars, and explicit hooks over branching directly inside upstream-owned code.
5. Before broadening a core diff, ask whether a smaller adapter or mount point can produce the same outcome.

## Required Shape For Every Fork Change

Every retained fork feature should have all of the following:

- one upstream-owned mount seam
- one fork-owned implementation subtree
- one explicit contract or entry surface
- one acceptance-matrix row
- one `ENHANCEMENTS.md` entry
- rollback or replacement notes
- at least one automated verification path

If a change does not have these, it is not yet fully capsule-aligned.

## Preferred Implementation Patterns

### Server behavior

Prefer:

- `apps/server/src/fork/*` modules
- narrow seam functions called from `wsServer.ts`
- one place where core server code asks the fork layer what to do

Avoid:

- scattering route branches throughout `wsServer.ts`
- duplicating auth or response logic in multiple places

### Web startup behavior

Prefer:

- one bootstrap seam such as `installForkWebShell(...)`
- fork-owned helpers under `apps/web/src/fork/bootstrap/`

Avoid:

- mounting unrelated fork startup logic directly in multiple core entry files

### Settings behavior

Prefer:

- one sidecar UI entry point such as `ForkSettingsSection`
- fork-only persistence and reset logic under `apps/web/src/fork/settings/`
- upstream reset semantics in upstream-ish helpers
- composition at the seam instead of route-local business logic

Avoid:

- scattering fork settings controls throughout the upstream settings route
- making fork-only persistence the implicit canonical model for upstream-owned settings

### CSS and UI polish

Prefer:

- `data-slot="fork-*"` hooks
- tiny wrapper components when needed
- keeping fork CSS in [apps/web/src/overrides.css](/home/claude/code/t3code/apps/web/src/overrides.css) per repo convention

Avoid:

- brittle class-chain selectors tied to incidental upstream DOM structure
- editing upstream utility classes just to land fork styling

### Tests and smoke

Prefer layered coverage:

- unit tests for local logic
- contract tests for seam behavior
- browser tests for deterministic UI behavior
- smoke scripts for local/hosted environment checks

Avoid:

- relying only on manual verification for a retained fork capsule
- claiming a seam is hardened without any direct coverage of that seam

## Design For Future Upstream Rewrites

Assume upstream may rewrite:

- routing
- settings composition
- startup/bootstrap
- DOM structure
- notification/event plumbing

Design fork code so the adaptation path is:

- update the seam
- keep the fork-owned subtree mostly intact
- rerun the capsule smoke/tests

If an upstream rewrite would force edits across many unrelated files, the fork change is probably too coupled.

## Required Doc Updates For Every Fork Change

Before a fork change is considered complete, update:

1. [ENHANCEMENTS.md](/home/claude/code/t3code/ENHANCEMENTS.md)
2. [docs/fork-architecture.md](/home/claude/code/t3code/docs/fork-architecture.md) if the seam or owned subtree changed
3. [docs/fork-acceptance-matrix.md](/home/claude/code/t3code/docs/fork-acceptance-matrix.md) if verification or rebinding expectations changed
4. [UPSTREAM_SYNC_MIGRATION_LOG.md](/home/claude/code/t3code/UPSTREAM_SYNC_MIGRATION_LOG.md) if sync or smoke procedure changed

For larger refactors, also update a status or summary doc if it helps future sync work.

## Required Test And Verification Updates

Every fork change should answer:

- what unit test proves the local logic?
- what seam-level or browser test proves the integration?
- what smoke command proves the capsule still works after rebinding?
- what manual check still remains, if any?

At minimum, add or update the acceptance-matrix row so future sync work has an explicit verification target.

## Obsolescence And Removal Workflow

When upstream adds an equivalent fix or feature:

1. do not preserve the fork automatically
2. compare the upstream behavior against the local enhancement entry
3. prefer replacing the fork with upstream behavior when it fully covers the need
4. remove the fork seam, tests, and docs when the fork-only code is no longer justified
5. mark the `ENHANCEMENTS.md` entry as `deprecated` or `rolled back` when appropriate

Every enhancement entry should record:

- what upstream change would make this obsolete
- what signal tells us it is safe to remove

## Change Checklist

Before merge, confirm all of these:

- the change uses an existing seam or introduces a new one cleanly
- fork logic lives in fork-owned files wherever practical
- `ENHANCEMENTS.md` is updated
- the architecture/acceptance/sync docs are updated if needed
- tests and smoke expectations are updated
- rollback and upstream-replacement notes are documented
- the change is easier to reapply after a major upstream rewrite than the previous version

## Sync Checklist

During future upstream syncs:

1. start from fresh `upstream/main`
2. use [ENHANCEMENTS.md](/home/claude/code/t3code/ENHANCEMENTS.md) as the retained-feature inventory
3. rebind the seam for each retained capsule
4. rerun the capsule smoke/tests from [docs/fork-acceptance-matrix.md](/home/claude/code/t3code/docs/fork-acceptance-matrix.md)
5. remove or deprecate fork code that upstream now covers

## Bottom Line

The goal of fork engineering in this repo is not just to make local behavior work today.

The goal is to make future sync work:

- low-drift
- low-risk
- easy to reapply
- easy to validate
- easy to remove when upstream makes the fork unnecessary
