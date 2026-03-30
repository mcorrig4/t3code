# Upstream Impact Detection: Capsule Triage Process

How to determine which fork capsules are affected when new upstream changes
land, and what to do about each one. Run this process before creating or
continuing any sync branch.

Cross-reference: [docs/fork-architecture.md](/home/claude/code/t3code/docs/fork-architecture.md)
for the full capsule inventory,
[ENHANCEMENTS.md](/home/claude/code/t3code/ENHANCEMENTS.md) for removal triggers,
[UPSTREAM_SYNC_MIGRATION_LOG.md](/home/claude/code/t3code/UPSTREAM_SYNC_MIGRATION_LOG.md)
for recording findings.

---

## When to run this process

After fetching new changes from `upstream/main`, before creating or continuing
a sync branch. The goal is to know which capsules need attention before any
merge or rebase work begins.

---

## Step 1: Identify changed upstream files

```bash
git fetch upstream
git diff upstream/main...HEAD --stat
```

This shows every file that differs between our fork's `HEAD` and the new
upstream snapshot. Both upstream-added and fork-added files appear here, so
focus on files that upstream changed (not files that only exist in our fork).

For a narrower view of just what upstream changed since our last sync:

```bash
git diff <last-sync-tag>..upstream/main --stat
```

Replace `<last-sync-tag>` with the most recent `v*-YYYYMMDD.*` fork release
tag that corresponds to the previous upstream sync point.

---

## Step 2: Cross-reference with seam inventory

For each capsule defined in `docs/fork-architecture.md`, check whether any of
its mount seam files appear in the upstream diff. Use this lookup table:

| If upstream changed...                                          | Check capsule...                                         |
| --------------------------------------------------------------- | -------------------------------------------------------- |
| `apps/server/src/wsServer.ts`                                   | 1. Server HTTP                                           |
| `apps/server/src/notifications/Layers/WebPushNotifications.ts`  | 2. Notification delivery                                 |
| `apps/web/src/routes/_chat.settings.tsx` or settings components | 3. Fork settings                                         |
| `apps/web/src/components/ChatView.tsx`                          | 3. Fork settings (suppression consumption) + 5. UI hooks |
| `apps/web/src/main.tsx` or boot/startup files                   | 4. Web bootstrap/branding/PWA                            |
| `apps/web/src/routes/__root.tsx`                                | 5. UI hooks and debug (root sidecar mount)               |
| `apps/web/src/components/Sidebar.tsx`                           | 5. UI hooks and debug (context menu mount)               |
| Any component with `data-slot` attribute changes                | 5. UI hooks and debug (CSS selectors)                    |
| `apps/web/package.json` (script changes)                        | 6. Sync and test infrastructure                          |

If a changed file does not appear in this table, it likely does not touch any
capsule seam. Verify by checking whether any `fork/` import references the
changed file before skipping it.

---

## Step 3: Check CSS dependencies

Cross-reference the upstream-owned selectors in `overrides.css` against
upstream DOM and attribute changes. The dependency inventory lives in
`docs/fork-architecture.md` under "Known upstream-owned CSS dependencies."

Current upstream-owned `data-slot` targets (check if any were renamed,
removed, or restructured):

- `sidebar`, `sheet-backdrop`, `sidebar-footer`, `sidebar-menu`,
  `sidebar-menu-button`, `chat-title-group`, `badge`,
  `user-message-actions`, `thread-terminal-close-action`,
  `custom-model-remove-action`

Also check `.dark` class-chain selectors -- these depend on upstream's dark
mode implementation. If upstream changes its theme toggling mechanism (e.g.,
switching from a `.dark` class to a `data-theme` attribute), all `.dark`
selectors in `overrides.css` will break.

---

## Step 4: Check contract surface

For each affected capsule, check whether the upstream change altered any of
these surfaces:

- **Function signatures** the fork seam depends on (e.g., the HTTP request
  handler's parameter list in `wsServer.ts` that populates `ForkHttpContext`)
- **Component props or render structure** the fork mounts into (e.g., the
  settings page layout where `<ForkSettingsSection />` is rendered)
- **Module exports** the fork imports (e.g., if upstream renames or removes
  an export that a fork file imports)
- **DOM attributes** the fork CSS targets (e.g., `data-slot` values, element
  nesting structure, media query breakpoints)

For each case, note the specific change and whether it is a signature change
(seam broken) or just a path/name change (rebindable).

---

## Step 5: Triage per capsule

For each affected capsule, classify it into one of three categories:

### (a) Seam still valid

The mount seam file changed, but the specific call site, component mount
point, or DOM attribute our fork depends on is intact. Action:

1. Update imports/paths if any moved.
2. Rerun that capsule's smoke test.
3. Confirm the acceptance matrix row still passes.

### (b) Seam broken

Upstream changed the call site, component structure, function signature, or
DOM layout that our seam depends on. The fork capsule will not compile or
will behave incorrectly. Action:

1. Understand the new upstream structure at the seam point.
2. Redesign the fork seam to match the new upstream.
3. Update `ForkHttpContext`, `ForkWebBootstrapPlugin`, component mounts,
   or CSS selectors as needed.
4. Update `docs/fork-architecture.md` with the new seam details.
5. Rerun smoke tests.

### (c) Upstream covers the behavior

Upstream now provides equivalent functionality to what the fork capsule
implements. Check `ENHANCEMENTS.md` for the "Upstream replacement trigger"
field on each affected enhancement entry. Action:

1. Compare upstream's implementation against our fork behavior.
2. If upstream fully covers it, remove the fork capsule and update
   `ENHANCEMENTS.md` status to "rolled back" or "deprecated."
3. If upstream partially covers it, evaluate whether the remaining fork
   delta is worth maintaining. If yes, shrink the capsule. If no, remove it.

---

## Step 6: Update the sync log

Record all findings in `UPSTREAM_SYNC_MIGRATION_LOG.md`:

- Which capsules are affected
- What the triage category is for each ((a), (b), or (c))
- What specific upstream changes triggered the finding
- What work is needed (rebind, redesign, or remove)
- Any open questions or risks

This log is the single source of truth for sync progress. Other agents
resuming the sync work should be able to read this log and pick up where
work left off.

---

## Step 7: Plan the phase order

Prioritize work based on triage results:

1. **Broken seams first** -- these block compilation or basic functionality.
   No other capsule work can be reliably tested until broken seams are fixed.
2. **Upstream-covers-behavior removals second** -- removing dead fork code
   simplifies the remaining work.
3. **Valid seam rebinds last** -- these are low-risk and can often be batched.

Within each priority tier, order by dependency: if capsule A's smoke test
exercises capsule B's seam, fix B before A.

Record the planned phase order in the sync log so work can be parallelized
across agents or sessions.
