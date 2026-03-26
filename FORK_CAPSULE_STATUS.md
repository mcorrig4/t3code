# Fork Capsule Refactor Status

## Summary

The Fork Capsule Hardening And Syncability Plan V4 is mostly implemented.

The major capsule seams now exist in code, the highest-risk reliability and auth fixes are landed, and the repo is back to a clean verification state for formatter, lint, typecheck, and targeted capsule tests.

A post-fixes validation review is tracked separately in [FORK_CAPSULE_DEEP_REVIEW_FOLLOWUP.md](/home/claude/code/t3code/FORK_CAPSULE_DEEP_REVIEW_FOLLOWUP.md), which now serves as a historical record of issues that have since been fixed.

What remains is mostly follow-up tightening rather than missing core implementation:

- a few residual seam leaks in core files
- one large CSS hotspot that is still more global than ideal
- broader smoke stabilization/execution if we want a stronger end-to-end syncability bar

## Completed

### 1. Server HTTP capsule

Implemented:

- single fork HTTP seam in [apps/server/src/fork/http/index.ts](/home/claude/code/t3code/apps/server/src/fork/http/index.ts)
- branding routes in [apps/server/src/fork/http/brandingRoutes.ts](/home/claude/code/t3code/apps/server/src/fork/http/brandingRoutes.ts)
- web-push REST routes in [apps/server/src/fork/http/webPushRoutes.ts](/home/claude/code/t3code/apps/server/src/fork/http/webPushRoutes.ts)
- `wsServer.ts` now delegates fork HTTP behavior through the seam instead of carrying inline web-push route logic

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
- `useForkSettingsResetPlan(...)` to reduce route-level fork state composition

Behavior changes landed:

- `pushNotificationsEnabled`
- `suppressCodexAppServerNotifications`

now live in the fork-only store instead of the canonical app settings store.

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

## Verification Completed

These pass on the current tree:

- `bun fmt`
- `bun lint`
- `bun typecheck`
- `bun run --cwd apps/server test --run src/wsServer.test.ts src/notifications/http.test.ts src/notifications/policy.test.ts src/fork/notifications/intentResolver.test.ts`
- `bun run --cwd apps/web test --run src/appSettings.test.ts src/fork/settings/useForkSettings.test.ts src/pwa.test.ts src/runtimeBranding.test.ts src/fork/bootstrap/installForkWebShell.test.ts`
- `bun run --cwd apps/web sync:acceptance:check`

Current lint state:

- 2 warnings remain
- both are pre-existing/non-blocking

## What Still Remains

## 1. Residual server seam leak

[apps/server/src/wsServer.ts](/home/claude/code/t3code/apps/server/src/wsServer.ts) still decides when HTML gets branded, even though the branding transform itself now routes through the fork HTTP seam.

Why it matters:

- if upstream rewrites static serving or HTML response flow, we still have to touch both the seam and `wsServer.ts`

Recommended follow-up:

- move HTML branding decision-making behind a more explicit server-side branding/static document seam

## 2. Settings route still owns some upstream dirty-label composition

[apps/web/src/routes/\_chat.settings.tsx](/home/claude/code/t3code/apps/web/src/routes/_chat.settings.tsx) is improved, but it still builds the upstream dirty-label list inline and passes it into the fork reset-plan seam.

Why it matters:

- an upstream settings-page rewrite would still require direct route edits

Recommended follow-up:

- introduce a higher-level settings reset composition helper or registry that owns both fork and upstream reset labels/plans

## 3. `overrides.css` is still the biggest sync hotspot

[apps/web/src/overrides.css](/home/claude/code/t3code/apps/web/src/overrides.css) is better than before, but it still mixes multiple visual concerns and still depends on upstream-owned DOM hooks in several places. Current exposure: 10 upstream-owned `data-slot` selectors and 7 `.dark` class-chain selectors that depend on upstream's Tailwind dark-mode implementation.

Why it matters:

- if upstream reshapes sidebar/chat/header DOM, this file is still the most likely place to break

Recommended follow-up:

- split `overrides.css` into smaller capsule-oriented sections or files
- continue replacing upstream-owned selectors with fork-owned `data-slot="fork-*"` hooks or tiny wrapper components

## 4. Bootstrap/debug seam is not fully isolated

[apps/web/src/main.tsx](/home/claude/code/t3code/apps/web/src/main.tsx) is now thin, but fork debug behavior still depends on [apps/web/src/routes/\_\_root.tsx](/home/claude/code/t3code/apps/web/src/routes/__root.tsx) as a second mount surface.

Why it matters:

- the architecture docs describe a cleaner single-seam story than the current root/debug reality

Recommended follow-up:

- either move more of the debug mount behind a clearer sidecar seam
- or document `__root.tsx` explicitly as an additional required rebinding point

## 5. Full smoke suite still needs a stabilization pass

The infrastructure is now in place, but not every smoke script has been fully stabilized and rerun as part of a single trusted final pass.

What is already good:

- capsule mapping exists
- acceptance-matrix consistency check exists
- smoke wrapper commands remain stable

What remains:

- run and tune the full smoke suite against the intended environment(s)
- decide which failures are true regressions vs environment assumptions
- update smoke scripts/helpers so they are dependable sync gates

## Recommended Next Steps

### Highest-value next step

Do one dedicated follow-up pass on smoke stabilization and capsule coverage:

- run `bun run --cwd apps/web sync:smoke:all`
- fix environment assumptions and flaky expectations
- make each phase wrapper a dependable capsule-owned sync gate

This gives the refactor its intended payoff during the next upstream sync.

### Next architectural cleanup

After smoke stabilization, tackle the remaining seam leaks in this order:

1. reduce HTML-branding decision logic in `wsServer.ts`
2. reduce dirty/reset composition in `_chat.settings.tsx`
3. split and harden `overrides.css`
4. tighten/document the `__root.tsx` debug mount seam

## Suggested Definition Of “Done”

This refactor is “functionally done” now.

It becomes “fully hardened” when:

- the full smoke suite is stable and trusted
- the remaining seam leaks are either eliminated or explicitly documented as intentional rebinding points
- `overrides.css` is no longer the dominant DOM-sync hotspot

## Bottom Line

The hard part is done.

The capsule model now exists in the codebase, the highest-risk correctness/security issues are addressed, and the repo is back to a clean verified state.

What remains is refinement work to make the new architecture even easier to carry through future upstream syncs.
