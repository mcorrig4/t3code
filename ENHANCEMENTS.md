# Enhancement Ledger

This file tracks every project-specific change we carry on top of `upstream`.

Goal: if something breaks after an upstream sync, deploy, or refactor, we should be able to scan this file and quickly answer:

- what we changed
- why we changed it
- which files and runtime surfaces are involved
- what symptoms to look for if it regresses
- how to roll it back or verify it

## How To Use This File

Add one entry for every fork-specific enhancement, behavior change, deployment customization, or operational deviation from `upstream`.

Update the matching entry when:

- the enhancement changes shape
- more files become involved
- the deploy or rollback process changes
- we discover new failure symptoms or verification steps

Prefer one entry per user-visible change or operational customization. If a later change extends an earlier one, update the existing entry and add a short dated note.

## Entry Template

Copy this block for new entries:

```md
## <Short enhancement name>

- Status: active | deprecated | rolled back
- First added: YYYY-MM-DD
- Last updated: YYYY-MM-DD
- Owners: <team/person>
- Upstream impact: none | low | medium | high
- Areas: <app/runtime/deploy surfaces>
- Why this exists: <plain English reason>
- Files:
  - `path/to/file`
  - `path/to/another-file`
- Runtime touchpoints:
  - <hostname / route / service / job / command>
- If this breaks, look for:
  - <symptom 1>
  - <symptom 2>
- Verify with:
  - <command or manual check>
  - <manual check>
- Rollback notes:
  - <how to disable or revert quickly>
- Notes:
  - YYYY-MM-DD: <important follow-up or nuance>
```

## Active Enhancements

## Standardized Enhancement Ledger Filename

- Status: active
- First added: 2026-03-20
- Last updated: 2026-03-20
- Owners: T3 Code fork
- Upstream impact: none
- Areas: repository documentation, contributor workflow, fork change tracking
- Why this exists: the enhancement ledger was previously named `enhancement.MD`, which was easy to miss because it did not match common markdown naming conventions or obvious filename searches.
- Files:
  - `ENHANCEMENTS.md`
- Runtime touchpoints:
  - contributor searches for enhancement tracking docs
  - repo-root documentation workflows
- If this breaks, look for:
  - contributors assume no enhancement ledger exists
  - tooling or humans searching for `ENHANCEMENTS.md` miss the ledger
- Verify with:
  - confirm the repo root contains `ENHANCEMENTS.md`
  - run `rg --files -g 'ENHANCEMENTS.md' .`
- Rollback notes:
  - rename `ENHANCEMENTS.md` back to `enhancement.MD`
  - update any documentation or scripts that begin depending on the standardized filename
- Notes:
  - 2026-03-20: Renamed the ledger from `enhancement.MD` to `ENHANCEMENTS.md` for discoverability and consistency.

## Required Enhancement Ledger Maintenance

- Status: active
- First added: 2026-03-20
- Last updated: 2026-03-20
- Owners: T3 Code fork
- Upstream impact: none
- Areas: contributor workflow, upstream sync hygiene, fork maintenance
- Why this exists: we need a reliable record of local fixes and enhancements so upstream merges are easier to reconcile and so obsolete fork-specific patches can be deprecated cleanly when upstream covers them.
- Files:
  - `AGENTS.md`
  - `ENHANCEMENTS.md`
- Runtime touchpoints:
  - day-to-day coding workflow
  - upstream sync and conflict resolution
  - fork cleanup after upstream fixes land
- If this breaks, look for:
  - fork-specific changes ship without corresponding ledger entries
  - upstream syncs are harder to reason about because local deviations are undocumented
  - stale fixes remain active after upstream makes them unnecessary
- Verify with:
  - confirm `AGENTS.md` instructs contributors to document fork-specific changes and deprecations in `ENHANCEMENTS.md`
  - confirm new fork-only changes update or add a matching ledger entry
- Rollback notes:
  - remove the enhancement-tracking reminder from `AGENTS.md`
  - accept higher manual effort during upstream reconciliation
- Notes:
  - 2026-03-20: Added explicit repo instructions to keep `ENHANCEMENTS.md` current as local changes are added, updated, or deprecated after upstream syncs.

## Root-Scoped PWA Install Behavior

- Status: active
- First added: 2026-03-16
- Last updated: 2026-03-16
- Owners: T3 Code fork
- Upstream impact: medium
- Areas: web app install metadata, iPhone Home Screen behavior, offline/app-shell navigation
- Why this exists: iPhone-installed web app sessions were opening chat routes as external web views instead of keeping navigation inside the installed app.
- Files:
  - `apps/web/index.html`
  - `apps/web/public/manifest.webmanifest`
  - `apps/web/public/sw.js`
  - `apps/web/src/main.tsx`
  - `apps/web/src/pwa.ts`
  - `apps/web/src/pwa.test.ts`
- Runtime touchpoints:
  - `t3.claude.do`
  - Home Screen installs on iPhone/iPad
  - app routes under `/` including `/$threadId`
- If this breaks, look for:
  - tapping a thread from the installed iPhone app opens Safari or an external web view
  - deep links to chat/session routes stop feeling like in-app navigation
  - install behavior changes after manifest or service-worker edits
- Verify with:
  - `bun fmt`
  - `bun lint`
  - `bun typecheck`
  - install the app from Safari on iPhone and open multiple thread routes
  - confirm `manifest.webmanifest` reports `scope: "/"` and `start_url: "/"`
- Rollback notes:
  - revert the files listed above
  - redeploy production
  - remove and re-add the Home Screen install on iPhone so Safari drops cached install metadata
- Notes:
  - 2026-03-16: Added root-scoped manifest metadata, iOS standalone meta tags, and a minimal service worker registration path.

## Backfill Needed

Older fork-specific changes that predate this ledger should be added here over time as we touch them. Until then, use `git log upstream/main..main` as the catch-all diff against upstream.
