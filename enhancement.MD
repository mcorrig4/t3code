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
