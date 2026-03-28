# Upstream Sync Workflow

Prescriptive step-by-step procedure for syncing the t3code fork with `upstream/main`.
This is the repeatable runbook; for historical records of past syncs, see `UPSTREAM_SYNC_MIGRATION_LOG.md`.

---

## Pre-Sync Preparation

1. **Fetch the latest upstream:**

   ```bash
   git fetch upstream
   ```

2. **Run impact detection** (see `references/upstream-impact-detection.md`) to identify which
   capsules are affected by the incoming upstream changes. This determines the order and scope
   of reapplication work.

3. **Review `ENHANCEMENTS.md`** as the retained-feature inventory. Every fork enhancement entry
   with status `active` is a decision point during the sync. Print or keep it open throughout.

4. **Check `docs/fork-acceptance-matrix.md`** for the verification commands you will need at
   each phase gate. Confirm the listed commands still work on the current `main` before starting.

5. **Confirm the upstream version** from `upstream/main` (check `package.json` or release tags).
   You will need this for the fork release tag at the end.

---

## Phase 0: Fresh Upstream Baseline

The goal of Phase 0 is to prove that the raw upstream snapshot runs in our dev environment
before any fork code is layered on.

1. **Create the sync branch** from the exact upstream snapshot:

   ```bash
   git checkout -b sync/upstream-YYYYMMDD upstream/main
   ```

2. **Make only operational-compatibility fixes** needed to run the dev environment. These are
   not fork features -- they are environment plumbing:
   - Systemd unit adjustments for the host
   - Vite config for dev hostname (`t3-dev.claude.do`)
   - Any missing `.env` scaffolding for the host's provider keys

   Keep these changes minimal and clearly commented as operational-only.

3. **Prove the untouched upstream runs:**

   ```bash
   bun run --cwd apps/web sync:phase0:smoke
   ```

   If this script does not exist yet in the new upstream, run the equivalent manually:
   `bun install && bun typecheck && bun lint` at minimum.

4. **Record any operational issues** in the sync log (`UPSTREAM_SYNC_MIGRATION_LOG.md`).
   Note upstream breaking changes, removed APIs, renamed modules, or new dependencies.

---

## Phase 1: Low-Risk Shell and Guardrails

Phase 1 restores fork identity and safety infrastructure without touching runtime behavior.

1. **Restore fork identity files:**
   - `AGENTS.md` (canonical instruction file)
   - `BRANCHES.md` (branch inventory)
   - `ENHANCEMENTS.md` (fork feature ledger)
   - `.gh-guard.conf` (GitHub action guardrails)

2. **Restore guardrail scripts:**
   - `scripts/safe-delete-branch.sh`
   - `scripts/sync-phase-1-guardrails.mjs`
   - Any other fork-only scripts in `scripts/` that do not affect runtime behavior

3. **Verify Phase 1:**
   ```bash
   bun run --cwd apps/web sync:phase1:smoke
   ```
   This should pass all quality gates (`bun fmt`, `bun lint`, `bun typecheck`) with only
   identity/guardrail files added.

---

## Capsule Reapplication (Phases 2+)

Apply capsules one at a time, following the priority order from impact detection. Each capsule
is a self-contained fork feature with a mount seam, an owned subtree, and verification criteria.

For each capsule:

### Step 1: Check the seam

Does the mount seam file still exist in the new upstream? Has its structure changed?

- If the seam file is **unchanged or trivially changed**: proceed to rebind.
- If the seam file is **significantly restructured**: you need to redesign the seam first.
- If the seam file is **removed entirely**: the capsule may need a new mount point or may no
  longer be applicable.

### Step 2: Rebind or redesign

**If the seam is intact:** Update imports, adjust paths, fix any renamed types or APIs to
match the new upstream. The seam edit should be small -- a few lines of import/hook changes.

**If the seam is broken:** Redesign the seam to match the new upstream architecture. The goal
is to keep the fork-owned subtree as intact as possible. A well-designed seam absorbs upstream
churn so the owned subtree does not have to.

### Step 3: Copy the owned subtree

Bring the fork-owned files from the old `main` branch:

```bash
git checkout main -- path/to/fork/owned/subtree/
```

These files should need minimal changes if the seam is properly designed. If they need
significant changes, reconsider whether the seam design is absorbing enough upstream churn.

### Step 4: Run capsule smoke

Execute the verification command from the acceptance matrix for this specific capsule.
Fix any issues before moving to the next capsule.

### Step 5: Update the acceptance matrix

If verification commands changed, if new assertions are needed, or if expectations shifted,
update `docs/fork-acceptance-matrix.md` immediately. Do not defer this.

---

## Feature-by-Feature Decisions

For each `ENHANCEMENTS.md` entry with status `active`, make one of four decisions:

| Decision  | When to use                                              | Action                                                                                                                                   |
| --------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Keep**  | Upstream does not cover this behavior                    | Reapply as-is via capsule reapplication                                                                                                  |
| **Drop**  | Upstream now provides equivalent functionality           | Mark as `deprecated` in ENHANCEMENTS.md with a note citing the upstream equivalent                                                       |
| **Merge** | Upstream partially covers it                             | Adapt the fork enhancement to complement rather than duplicate upstream; update the ENHANCEMENTS.md entry to describe the narrower scope |
| **Defer** | Enhancement depends on another capsule not yet reapplied | Note the dependency; reapply after the blocking capsule lands                                                                            |

Never silently drop a feature. Every `active` entry must get an explicit decision recorded
in the sync log.

---

## Verification Gates

After all capsules are reapplied, run the full verification sequence. Do not skip gates.

1. **Quality gates:**

   ```bash
   bun fmt
   bun lint
   bun typecheck
   ```

2. **Quick smoke:**

   ```bash
   bun run --cwd apps/web sync:smoke:quick
   ```

3. **Hosted smoke** (requires running dev server on `t3-dev.claude.do`):

   ```bash
   bun run --cwd apps/web sync:smoke:hosted
   ```

4. **Full acceptance check:**

   ```bash
   bun run --cwd apps/web sync:acceptance:check
   ```

5. **Manual smoke:** Open `t3-dev.claude.do` in a browser and verify user-visible behavior:
   - Session creation and message flow
   - Sidebar navigation and project switching
   - Fork-specific UI (stage badge, PWA mode, settings sidecar)
   - Mobile viewport and touch interactions

---

## Doc Updates Required

Before the sync branch merges to `main`, all of these must be current:

- **`ENHANCEMENTS.md`**: Update status of each entry (kept / dropped / merged / deferred).
  Every `active` entry must have a recorded decision.
- **`docs/fork-architecture.md`**: Update if any seam location, owned subtree boundary, or
  mount point changed during the sync.
- **`docs/fork-acceptance-matrix.md`**: Update if verification commands, expected outputs,
  or capsule definitions changed.
- **`UPSTREAM_SYNC_MIGRATION_LOG.md`**: Record the sync with:
  - Upstream base commit hash
  - Sync date
  - Issues discovered
  - Feature decisions (kept/dropped/merged)
  - Lessons learned and recommendations for next sync

---

## Post-Sync

1. **Merge the sync branch to `main`:**

   ```bash
   git checkout main
   git merge sync/upstream-YYYYMMDD
   ```

2. **Tag the fork release** using the fork versioning format:

   ```
   v<upstream-semver>-<sync-date>.<n>[-pre]
   ```

   Example: if upstream is `0.0.14` and the sync date is today:

   ```bash
   git tag v0.0.14-20260326.1
   ```

3. **Promote to `production`** following the procedure in `/home/claude/T3CODE_OPERATIONS.md`.

---

## Cross-References

- `UPSTREAM_SYNC_MIGRATION_LOG.md` -- historical sync records
- `ENHANCEMENTS.md` -- fork feature inventory and decision ledger
- `docs/fork-acceptance-matrix.md` -- per-capsule verification commands
- `docs/fork-architecture.md` -- seam locations and owned subtree boundaries
- `references/upstream-impact-detection.md` -- pre-sync impact analysis procedure
- `/home/claude/T3CODE_OPERATIONS.md` -- production promotion procedure
