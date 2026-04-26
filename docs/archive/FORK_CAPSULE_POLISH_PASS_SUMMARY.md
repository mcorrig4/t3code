# Fork Capsule Polish Pass Summary

## Summary

This pass focused on the last architectural cleanup items after the main fork-capsule refactor:

- move the remaining HTML-branding response logic behind the server HTTP seam
- remove upstream dirty-label composition from the settings route
- tighten the root/debug seam
- improve smoke and browser test coverage without splitting `overrides.css`
- align the architecture, acceptance, and status docs with the code that now exists

The result is a narrower set of rebinding points for future upstream syncs, better direct coverage for the new seams, and clearer sync/smoke documentation.

## What Changed

### 1. Server HTML-branding seam

The server now routes branded HTML document handling through the fork HTTP capsule for both:

- direct HTML asset responses
- SPA fallback `index.html` responses

Key files:

- [apps/server/src/fork/http/brandingRoutes.ts](/home/claude/code/t3code/apps/server/src/fork/http/brandingRoutes.ts)
- [apps/server/src/fork/http/index.ts](/home/claude/code/t3code/apps/server/src/fork/http/index.ts)
- [apps/server/src/wsServer.ts](/home/claude/code/t3code/apps/server/src/wsServer.ts)

Important follow-up fix from code review:

- the first version decoded every static asset to UTF-8 before checking content type
- this was fixed so only `text/html` responses are decoded and branded

### 2. Settings reset-plan extraction

The settings route no longer owns the full upstream dirty-label list.

New structure:

- upstream reset semantics live in [apps/web/src/settings/resetPlan.ts](/home/claude/code/t3code/apps/web/src/settings/resetPlan.ts)
- fork reset semantics still live in [apps/web/src/fork/settings/resetPlan.ts](/home/claude/code/t3code/apps/web/src/fork/settings/resetPlan.ts)
- composed reset behavior is wired through [apps/web/src/fork/settings/useForkSettingsResetPlan.ts](/home/claude/code/t3code/apps/web/src/fork/settings/useForkSettingsResetPlan.ts)
- the route now consumes the composed plan in [apps/web/src/routes/\_chat.settings.tsx](/home/claude/code/t3code/apps/web/src/routes/_chat.settings.tsx)

This keeps route-local UI cleanup in the route, while moving settings semantics into reusable helpers.

### 3. Root debug seam cleanup

Fork-only root sidecars and debug formatting helpers were pulled behind clearer seams:

- [apps/web/src/fork/bootstrap/ForkRootSidecars.tsx](/home/claude/code/t3code/apps/web/src/fork/bootstrap/ForkRootSidecars.tsx)
- [apps/web/src/fork/bootstrap/rootDebug.ts](/home/claude/code/t3code/apps/web/src/fork/bootstrap/rootDebug.ts)
- [apps/web/src/routes/\_\_root.tsx](/home/claude/code/t3code/apps/web/src/routes/__root.tsx)

This leaves `__root.tsx` with one obvious fork sidecar mount and moves fork-only debug event formatting out of the route body.

### 4. Smoke and browser coverage improvements

The smoke/test layer was tightened around the new seams:

- smoke manifest metadata was expanded in [apps/web/src/fork/testing/forkSmokeManifest.ts](/home/claude/code/t3code/apps/web/src/fork/testing/forkSmokeManifest.ts)
- shared helpers were improved under [apps/web/e2e/shared/](/home/claude/code/t3code/apps/web/e2e/shared)
- layered smoke commands were added in [apps/web/package.json](/home/claude/code/t3code/apps/web/package.json):
  - `sync:smoke:quick`
  - `sync:smoke:hosted`
  - `sync:smoke:all`
- a new browser spec was added in [apps/web/src/settings/ForkSettingsSection.browser.tsx](/home/claude/code/t3code/apps/web/src/settings/ForkSettingsSection.browser.tsx)

Important follow-up hardening from review:

- [apps/web/e2e/sync-phase-9-settings-sidecar.mjs](/home/claude/code/t3code/apps/web/e2e/sync-phase-9-settings-sidecar.mjs) now checks the real route-level `Restore defaults` flow, including combined upstream+fork confirmation copy and reset behavior
- [apps/web/src/fork/bootstrap/rootDebug.test.ts](/home/claude/code/t3code/apps/web/src/fork/bootstrap/rootDebug.test.ts) now covers the extracted root debug helpers directly

### 5. Docs and ledger alignment

These docs were updated to match the current architecture:

- [FORK_CAPSULE_STATUS.md](/home/claude/code/t3code/docs/archive/FORK_CAPSULE_STATUS.md)
- [docs/fork-architecture.md](/home/claude/code/t3code/docs/fork-architecture.md)
- [docs/fork-acceptance-matrix.md](/home/claude/code/t3code/docs/fork-acceptance-matrix.md)
- [UPSTREAM_SYNC_MIGRATION_LOG.md](/home/claude/code/t3code/UPSTREAM_SYNC_MIGRATION_LOG.md)
- [ENHANCEMENTS.md](/home/claude/code/t3code/ENHANCEMENTS.md)

The docs now reflect:

- the server HTML-document seam
- the upstream+fork settings reset-plan split
- the `ForkRootSidecars` root seam
- the layered smoke commands and fork browser spec

### 6. Fork release-tag guardrail update

The repo instructions and the phase-1 guardrail smoke were updated to recognize prerelease fork tags:

- [AGENTS.md](/home/claude/code/t3code/AGENTS.md)
- [scripts/sync-phase-1-guardrails.mjs](/home/claude/code/t3code/scripts/sync-phase-1-guardrails.mjs)

This allows tags like `v0.0.14-20260324.7-beta` to remain consistent with the fork versioning rules and the guardrail checks.

## Code Review And Fixes

A subagent code review found three worthwhile issues in the first draft of this pass:

1. static asset responses were being decoded unnecessarily before HTML branding checks
2. the new settings reset-plan seam was not yet exercised through the real route-level `Restore defaults` flow
3. the new root debug seam was documented more strongly than it was directly tested

All three were fixed in this pass.

## Verification

These checks passed on the final tree:

- `bun fmt`
- `bun lint`
- `bun typecheck`
- `bun run --cwd apps/server test --run src/wsServer.test.ts src/notifications/http.test.ts src/notifications/policy.test.ts src/fork/notifications/intentResolver.test.ts`
- `bun run --cwd apps/web test --run src/appSettings.test.ts src/settings/resetPlan.test.ts src/fork/settings/useForkSettings.test.ts src/fork/bootstrap/rootDebug.test.ts src/pwa.test.ts src/runtimeBranding.test.ts src/fork/bootstrap/installForkWebShell.test.ts`
- `bun run --cwd apps/web test:browser:fork`
- `bun run --cwd apps/web sync:acceptance:check`

Current lint state remains:

- 2 pre-existing non-blocking warnings
- no lint errors

## Remaining Follow-Ups

### 1. `overrides.css` is still the biggest sync hotspot

Per the chosen direction for this repo, the CSS stays in one file for clarity:

- [apps/web/src/overrides.css](/home/claude/code/t3code/apps/web/src/overrides.css)

The next improvement path is to keep that single-file approach, but continue replacing upstream-owned selectors with fork-owned hooks where touched.

### 2. Hosted/local smoke still depends on environment preconditions

The smoke architecture is better, but some scripts still require an actual running local or hosted target.

In this session:

- `sync:acceptance:check` passed
- an attempted `sync:phase9:smoke` run failed because no local web server was listening on `127.0.0.1:5734`

That is an environment precondition issue, not a code failure in the new seams, but it is still worth improving in future smoke-runner ergonomics.

## Bottom Line

This polishing pass closed the main remaining seam leaks without broadening the fork diff again.

The biggest improvements were:

- the server HTML response path is now properly capsule-owned
- the settings route no longer owns upstream reset semantics
- the root debug seam is cleaner and directly tested
- the smoke/browser/docs story is more honest and more useful for future upstream syncs
