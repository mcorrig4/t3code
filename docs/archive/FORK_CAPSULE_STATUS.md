# Fork Capsule Refactor Status

## Summary

The Fork Capsule Hardening And Syncability Plan V4 is mostly implemented.

The major capsule seams now exist in code, the highest-risk reliability and auth fixes are landed, and the repo is back to a clean verification state for formatter, lint, typecheck, and targeted capsule tests.

A post-fixes validation review is tracked separately in [FORK_CAPSULE_DEEP_REVIEW_FOLLOWUP.md](/home/claude/code/t3code/docs/archive/FORK_CAPSULE_DEEP_REVIEW_FOLLOWUP.md), which now serves as a historical record of issues that have since been fixed.

What remains is mostly follow-up tightening rather than missing core implementation:

- one large CSS hotspot that is still more global than ideal
- broader hosted smoke stabilization/execution if we want a stronger end-to-end syncability bar

## Completed

### 1. Server HTTP capsule

Implemented:

- single fork HTTP seam in [apps/server/src/fork/http/index.ts](/home/claude/code/t3code/apps/server/src/fork/http/index.ts)
- branding routes in [apps/server/src/fork/http/brandingRoutes.ts](/home/claude/code/t3code/apps/server/src/fork/http/brandingRoutes.ts)
- web-push REST routes in [apps/server/src/fork/http/webPushRoutes.ts](/home/claude/code/t3code/apps/server/src/fork/http/webPushRoutes.ts)
- `wsServer.ts` now delegates fork HTTP behavior through the seam instead of carrying inline web-push route logic
- branded direct-HTML and SPA-fallback responses now go through `maybeBuildForkHtmlDocumentResponse(...)` instead of inline HTML-branding branches in `wsServer.ts`

Behavior changes landed:

- `/api/web-push/config` and `/api/web-push/subscription` require bearer auth when server auth is enabled
- auth-disabled local/dev behavior stays open
- fork REST auth no longer accepts query-string tokens

### 2. Notification delivery capsule

Implemented:

- notification resolver in [apps/server/src/fork/notifications/intentResolver.ts](/home/claude/code/t3code/apps/server/src/fork/notifications/intentResolver.ts)
- explicit event-type allowlist before snapshot reads
- permanent 404/410 subscription pruning restored
- development-only warning on unexpected events that reach notification handling

Behavior changes landed:

- irrelevant orchestration events no longer trigger snapshot reads
- delivery cleanup now works again for dead subscriptions

### 3. Fork settings capsule

Implemented:

- dedicated fork settings schema/store under [apps/web/src/fork/settings/](/home/claude/code/t3code/apps/web/src/fork/settings)
- storage key: `t3code:fork-settings:v1`
- migration out of legacy `t3code:app-settings:v1`
- fork reset/dirty helpers
- upstream reset-plan helper in [apps/web/src/settings/resetPlan.ts](/home/claude/code/t3code/apps/web/src/settings/resetPlan.ts)
- combined upstream+fork reset composition through [apps/web/src/fork/settings/useForkSettingsResetPlan.ts](/home/claude/code/t3code/apps/web/src/fork/settings/useForkSettingsResetPlan.ts)

Behavior changes landed:

- `pushNotificationsEnabled`
- `suppressCodexAppServerNotifications`

now live in the fork-only store instead of the canonical app settings store.

Additional architecture cleanup landed:

- [apps/web/src/routes/\_chat.settings.tsx](/home/claude/code/t3code/apps/web/src/routes/_chat.settings.tsx) no longer assembles the full upstream dirty-label list inline
- the route now consumes a composed reset plan and keeps only route-local UI cleanup logic

### 4. Web bootstrap and branding/PWA capsule

Implemented:

- single startup seam in [apps/web/src/fork/bootstrap/installForkWebShell.ts](/home/claude/code/t3code/apps/web/src/fork/bootstrap/installForkWebShell.ts)
- branding bootstrap
- boot shell bootstrap
- PWA bootstrap
- debug bootstrap seam placeholder

Behavior changes landed:

- `main.tsx` now coordinates fork startup through one seam
- startup seam has direct test coverage
- root-level debug sidecars now mount through [ForkRootSidecars.tsx](/home/claude/code/t3code/apps/web/src/fork/bootstrap/ForkRootSidecars.tsx), keeping [\_\_root.tsx](/home/claude/code/t3code/apps/web/src/routes/__root.tsx) to a single fork sidecar mount plus routing behavior

### 5. UI hooks and debug capsule

Implemented:

- `logUserInputDebugLazy(...)` in [apps/web/src/debug/userInputDebug.ts](/home/claude/code/t3code/apps/web/src/debug/userInputDebug.ts)
- migrated heavier debug callsites to lazy logging
- explicit `data-slot` hooks added for several fork-owned styling/visibility behaviors
- brittle class-chain selectors reduced in [apps/web/src/overrides.css](/home/claude/code/t3code/apps/web/src/overrides.css)

### 6. Service-worker shell cache hardening

Implemented:

- navigation shell cache now only updates for successful same-origin HTML responses in [apps/web/public/service-worker.js](/home/claude/code/t3code/apps/web/public/service-worker.js)

Behavior changes landed:

- transient 500/503 HTML no longer poisons the cached shell

### 7. Sync and test infrastructure capsule

Implemented:

- architecture doc: [docs/fork-architecture.md](/home/claude/code/t3code/docs/fork-architecture.md)
- acceptance matrix: [docs/fork-acceptance-matrix.md](/home/claude/code/t3code/docs/fork-acceptance-matrix.md)
- smoke manifest: [apps/web/src/fork/testing/forkSmokeManifest.ts](/home/claude/code/t3code/apps/web/src/fork/testing/forkSmokeManifest.ts)
- acceptance consistency check: [apps/web/e2e/check-fork-acceptance-matrix.ts](/home/claude/code/t3code/apps/web/e2e/check-fork-acceptance-matrix.ts)
- stable smoke wrapper commands preserved in [apps/web/package.json](/home/claude/code/t3code/apps/web/package.json)
- quick/hosted smoke aggregators:
  - `sync:smoke:quick`
  - `sync:smoke:hosted`
  - `sync:smoke:all`
- shared browser/smoke helpers under [apps/web/e2e/shared/](/home/claude/code/t3code/apps/web/e2e/shared)
- fork browser coverage via [ForkSettingsSection.browser.tsx](/home/claude/code/t3code/apps/web/src/settings/ForkSettingsSection.browser.tsx)

## Verification Completed

These pass on the current tree:

- `bun fmt`
- `bun lint`
- `bun typecheck`
- `bun run --cwd apps/server test --run src/wsServer.test.ts src/notifications/http.test.ts src/notifications/policy.test.ts src/fork/notifications/intentResolver.test.ts`
- `bun run --cwd apps/web test --run src/appSettings.test.ts src/settings/resetPlan.test.ts src/fork/settings/useForkSettings.test.ts src/pwa.test.ts src/runtimeBranding.test.ts src/fork/bootstrap/installForkWebShell.test.ts`
- `bun run --cwd apps/web test:browser:fork`
- `bun run --cwd apps/web sync:acceptance:check`

Current lint state:

- 2 warnings remain
- both are pre-existing/non-blocking

## What Still Remains

## 1. `overrides.css` is still the biggest sync hotspot

[apps/web/src/overrides.css](/home/claude/code/t3code/apps/web/src/overrides.css) is better than before, but it still mixes multiple visual concerns and still depends on upstream-owned DOM hooks in several places. Current exposure: 10 upstream-owned `data-slot` selectors and 7 `.dark` class-chain selectors that depend on upstream's Tailwind dark-mode implementation.

Why it matters:

- if upstream reshapes sidebar/chat/header DOM, this file is still the most likely place to break

Recommended follow-up:

- keep the single-file override strategy for clarity, but continue replacing upstream-owned selectors with fork-owned `data-slot="fork-*"` hooks or tiny wrapper components
- use comments and grouping inside `overrides.css` to keep the file easy to audit during syncs

## 2. Full hosted smoke coverage still needs a stabilization pass

The infrastructure is now in place, and quick/local coverage is much better than before, but the full hosted smoke layer still needs a deliberate end-to-end stabilization pass.

What is already good:

- capsule mapping exists
- acceptance-matrix consistency check exists
- smoke wrapper commands remain stable
- `sync:smoke:quick` exists and now includes the fork browser spec plus the stable local/either phase scripts

What remains:

- run and tune `sync:smoke:hosted` against the intended environment(s)
- decide which hosted failures are true regressions vs environment assumptions
- update smoke scripts/helpers so `sync:smoke:all` is dependable as a final sync gate

## Recommended Next Steps

### Highest-value next step

Do one dedicated follow-up pass on hosted smoke stabilization and the remaining CSS sync hotspot:

- run `bun run --cwd apps/web sync:smoke:hosted`
- fix environment assumptions and flaky hosted expectations
- continue migrating touched UI surfaces to fork-owned hooks inside `overrides.css`

This gives the refactor its intended payoff during the next upstream sync.

## Suggested Definition Of “Done”

This refactor is “functionally done” now.

It becomes “fully hardened” when:

- the hosted smoke layer is stable and trusted
- `overrides.css` is reduced to mostly fork-owned hooks
- the remaining intentional rebinding points are documented and easy to audit

## Bottom Line

The hard part is done.

The capsule model now exists in the codebase, the highest-risk correctness/security issues are addressed, and the repo is back to a clean verified state.

What remains is refinement work to make the new architecture even easier to carry through future upstream syncs.
