# Fork Capsule Hardening, Review Gates, And Syncability Plan V3

## Summary

Refactor the fork into a set of explicit **fork capsules** so future upstream syncs are mostly a matter of rebinding seams and rerunning capsule-owned smoke checks, not rediscovering behavior. This plan makes the work clearer and more resilient by standardizing:

- one mount seam per fork subsystem,
- one fork-owned module tree per subsystem,
- one test bundle per subsystem,
- one smoke/acceptance entry per subsystem,
- one review gate sequence per subsystem.

The program prioritizes:

- closing the web-push auth gap,
- restoring a true sidecar settings model,
- reducing fork logic embedded in core startup/server paths,
- making PWA/service-worker behavior more reliable,
- replacing brittle CSS/runtime coupling with explicit fork-owned hooks,
- restructuring sync docs and smoke tests so they map to the architecture we are building.

## Chosen Architecture Model: Fork Capsules

Each retained fork subsystem becomes a **capsule**. A capsule must have all of the following:

- one upstream-owned mount seam,
- one fork-owned implementation subtree,
- one contract/interface entry,
- one unit/integration/smoke test bundle,
- one acceptance-matrix row,
- one `ENHANCEMENTS.md` entry naming its seam and rollback/removal path.

The capsules for this refactor are:

1. Server HTTP capsule
2. Notification delivery capsule
3. Fork settings capsule
4. Web bootstrap and branding/PWA capsule
5. UI hooks and debug capsule
6. Sync/test infrastructure capsule

## Files And Docs To Add Or Standardize

Add these repo-level docs:

- `FORK_SIDECAR_REVIEW.md` remains the audit record
- `docs/fork-architecture.md` becomes the source of truth for capsule seams and mount points
- `docs/fork-acceptance-matrix.md` maps each capsule to tests, smoke checks, and manual checks
- `UPSTREAM_SYNC_MIGRATION_LOG.md` is updated so its phases match capsules, not historical feature order

Add these code organization roots:

- `apps/server/src/fork/http/`
- `apps/server/src/fork/notifications/`
- `apps/server/src/fork/codex/`
- `apps/web/src/fork/bootstrap/`
- `apps/web/src/fork/settings/`
- `apps/web/src/fork/testing/`
- `apps/web/e2e/shared/`
- `apps/web/e2e/playwright/fork/`

## Important Internal APIs / Interfaces / Types

These are the key interfaces this plan intentionally introduces or standardizes.

### Server

- `ForkHttpContext`
- `ForkHttpModule`
- `tryHandleForkHttpRequest(ctx): Effect<boolean, ...>`
- `validateForkHttpAuth(ctx): Effect<void, HttpAuthError, ...>`
- `isPotentiallyNotifiableEvent(event): boolean`
- `resolveNotificationIntent(input): WebPushPayload | null`
- `resolveCodexLaunchOverrides(input): readonly string[]`

### Web

- `installForkWebShell(input): ForkWebShellHandle`
- `ForkWebBootstrapPlugin`
- `ForkSettingsRegistryEntry`
- `useForkSettings()`
- `updateForkSettings(patch)`
- `resetForkSettings()`
- `buildForkSettingsResetPlan(input)`
- `logUserInputDebugLazy(factory)`

### Testing / Sync

- `ForkAcceptanceEntry`
- `ForkSmokeTarget`
- `runForkSmoke(entry, target)`
- `forkSmokeManifest`

No external user-facing route names change by default. The one intentional external behavior change is:

- web-push HTTP endpoints require authenticated access whenever server auth is enabled

## Workstream 0: Architecture Scaffolding First

### Goal

Create the seam framework before changing feature behavior, so later work lands into stable extension points rather than deepening drift.

### Implementation

- Add `apps/server/src/fork/http/index.ts` as the single HTTP sidecar entry.
- Add `apps/web/src/fork/bootstrap/index.ts` as the single web bootstrap entry.
- Add `apps/web/src/fork/settings/index.ts` as the single fork settings entry.
- Update `docs/fork-architecture.md` to declare each capsule’s mount seam, owned subtree, and replacement/removal strategy.
- Update `docs/fork-acceptance-matrix.md` with one row per capsule before behavior refactors begin.
- Update `UPSTREAM_SYNC_MIGRATION_LOG.md` so sync phases are capsule-aligned.

### Acceptance criteria

- `wsServer.ts` has one fork HTTP entry seam
- `main.tsx` has one fork bootstrap entry seam
- settings UI and persistence have one fork settings entry seam
- future fork features must register through one of these seams rather than expanding core files directly

## Workstream 1: Server HTTP Capsule

### Goal

Move branding routes and web-push REST handling behind a single fork HTTP sidecar and secure the routes.

### Implementation

- Move host-aware branding manifest/icon/html logic into `apps/server/src/fork/http/brandingRoutes.ts`
- Move web-push REST handling into `apps/server/src/fork/http/webPushRoutes.ts`
- Keep `apps/server/src/wsServer.ts` responsible only for calling `tryHandleForkHttpRequest(...)`
- Add `validateForkHttpAuth(...)` and apply it to web-push config/subscribe/unsubscribe routes when server auth is enabled
- Keep auth-disabled local/dev behavior unchanged

### Chosen default

- same-origin is not treated as sufficient protection for subscription routes
- when auth is enabled, the app’s existing auth model is required for web-push HTTP access

### Tests

- server route auth contract tests
- branding route contract tests
- authenticated success / unauthenticated failure
- auth-disabled fallback behavior

### Review gate

- one subagent security review on the auth model
- one subagent architecture review on seam isolation
- main thread verifies `wsServer.ts` knows only the seam, not the feature internals

## Workstream 2: Notification Delivery Capsule

### Goal

Fix push subscription pruning and remove unnecessary snapshot work from the hot event path.

### Implementation

- Refactor delivery error typing so permanent failures retain `statusCode`
- Ensure 404/410 push failures actually delete stored subscriptions
- Split notification flow into:
  - `isPotentiallyNotifiableEvent(event)`
  - `resolveNotificationIntent({ event, snapshot })`
- Apply the cheap event filter before any snapshot read
- Keep snapshot reads only for events that actually need them
- If practical, move orchestration-to-push mapping behind `apps/server/src/fork/notifications/intentResolver.ts`

### Chosen default

- preserve current user-visible payload content
- reduce overhead without changing what notifications mean

### Tests

- 404 subscription deletion
- 410 subscription deletion
- transient failure does not delete
- irrelevant events skip snapshot reads
- relevant events still produce correct payloads

### Review gate

- one subagent correctness review on lifecycle handling
- one subagent performance review on hot-path cost
- main thread verifies no extra snapshot read remains on obviously irrelevant events

## Workstream 3: Fork Settings Capsule

### Goal

Restore a real sidecar settings model and stop using the fork store as the app’s universal canonical settings source.

### Implementation

- Add `apps/web/src/fork/settings/useForkSettings.ts`
- Add `apps/web/src/fork/settings/forkSettingsPersistence.ts`
- Add `apps/web/src/fork/settings/forkSettingsRegistry.ts`
- Move fork-only settings ownership behind this adapter
- Reduce broad runtime dependency on `useAppSettings()` for fork-only keys
- Keep `ForkSettingsSection` as the visual seam, but move dirty/reset metadata into the registry
- Replace ad hoc page logic in `_chat.settings.tsx` with `buildForkSettingsResetPlan(...)`

### Chosen default

- fork-only settings should not become the app’s universal canonical settings model
- upstream-owned settings stay on the upstream path
- fork-owned settings are surfaced through a narrow adapter and explicit registry

### Tests

- fork-only dirty state
- fork-only reset
- combined upstream+fork reset labeling
- no hidden fork reset when UI did not disclose it
- runtime consumers of fork settings only use the fork adapter where applicable

### Review gate

- one subagent syncability review answering “if upstream rewrites settings again, how many files change?”
- one subagent UX review of restore-defaults semantics
- main thread verifies the fork settings seam is once again narrow and obvious

## Workstream 4: Web Bootstrap And Branding/PWA Capsule

### Goal

Collapse fork startup behavior behind one bootstrap seam and keep branding/PWA behavior single-sourced and reliable.

### Implementation

- Add `apps/web/src/fork/bootstrap/installForkWebShell.ts`
- Coordinate runtime branding, boot shell, PWA registration, and optional diagnostics from there
- Convert current startup behavior into small `ForkWebBootstrapPlugin`s:
  - branding bootstrap
  - boot shell bootstrap
  - PWA bootstrap
  - optional debug bootstrap
- Keep `main.tsx` responsible only for router/app startup plus one fork bootstrap call
- Extract shared request-host branding resolution so server and Vite adapters do not duplicate header parsing
- Keep `packages/shared/src/branding.ts` as the single live source of truth for branding data

### Chosen default

- do not expand document-title behavior further in this hardening pass unless product requirements change
- preserve current user-visible branding behavior unless fixing an explicit bug

### Tests

- bootstrap contract tests
- runtime branding tests
- branded host manifest/icon/html tests
- dev-host parity tests between Vite and server adapters

### Review gate

- one subagent review focused on survival under a major `main.tsx` or router rewrite
- one subagent review focused on server/Vite branding parity
- main thread verifies startup logic is coordinated from one seam rather than scattered

## Workstream 5: UI Hooks And Debug Capsule

### Goal

Replace brittle CSS and eager debug work with explicit, fork-owned hooks.

### Implementation

- Replace utility-class-chain selectors with explicit `data-*` hooks or tiny wrapper components
- Target the current dev badge styling first
- Replace the broad touch UX override with explicit hooks on intended controls only
- Add `logUserInputDebugLazy(factory)` and migrate hot callsites to lazy or pre-guarded logging
- Keep `apps/web/src/overrides.css` as the fork-only aggregation file, but require explicit fork-owned hooks whenever touched

### Chosen default

- no new class-chain selectors tied to upstream utility classes
- any new fork CSS must target `data-slot="fork-*"` or a wrapper component unless there is a documented temporary exception

### Tests

- DOM/render assertions for hook presence
- touch-visible controls regression checks
- debug off-state avoids eager payload construction

### Review gate

- one subagent review focused on DOM/CSS resilience under upstream markup churn
- one subagent review focused on dormant-debug overhead
- main thread verifies touched selectors now target owned hooks rather than incidental class structure

## Workstream 6: Sync And Test Infrastructure Capsule

### Goal

Make the sync plan and smoke suite mirror the capsule architecture, and keep tests organized for maintainability.

### Implementation

Keep the current phase-script entrypoints for compatibility, but make them thin wrappers over shared helpers and capsule descriptors.

### Test taxonomy

Use four layers:

- unit tests for local logic
- contract tests for seam behavior
- integration tests across module boundaries
- smoke/acceptance tests for real host/runtime behavior

### Test organization

- Keep existing `apps/web/e2e/sync-phase-*.mjs` names as wrapper entrypoints
- Add `apps/web/e2e/shared/` for shared helpers
- Add `apps/web/e2e/playwright/fork/` for stable user-flow E2E coverage
- Add a `forkSmokeManifest` describing which capsule each smoke test covers
- Add `docs/fork-acceptance-matrix.md` mapping each capsule to:
  - unit tests
  - contract tests
  - Playwright specs
  - smoke scripts
  - manual checks
  - sync sensitivity
  - removal/replacement strategy

### Playwright scope

Use Playwright for deterministic browser flows:

- branded manifest route on the dev host
- settings page renders `ForkSettingsSection`
- fork UI hooks are present and scoped correctly
- disabled/enabled push settings card behavior
- debug sidecar open/close flow
- service worker navigation-shell behavior where practical

Keep environment-specific host/service assertions in smoke scripts:

- branded host path and metadata
- local dev endpoint health
- service wiring and route availability
- sync-phase environment checks

### Sync plan changes

Update `UPSTREAM_SYNC_MIGRATION_LOG.md` so phases map to capsules:

1. architecture seams
2. server HTTP capsule
3. notification delivery capsule
4. fork settings capsule
5. web bootstrap and branding/PWA capsule
6. UI hooks and debug capsule
7. final acceptance and promotion readiness

Keep old `sync:phaseN:smoke` script names as aliases during the transition, but make the capsule mapping the real source of truth in docs.

### Review gate

- one subagent review focused on test maintainability
- one subagent review focused on sync-smoke coverage gaps
- main thread verifies every capsule has a complete acceptance row before calling the program structurally complete

## Mandatory Review Gates For Every Workstream

Each workstream must pass all four gates before merge.

### Gate 1: Architecture gate

- main thread confirms the seam is narrow
- one explorer subagent reviews sync-friendliness before implementation is finalized

### Gate 2: Code review gate

- one subagent reviews correctness/security/performance for the changed capsule
- for risky capsules, use a second subagent focused on architecture drift

### Gate 3: Verification gate

Delegate routine verification:

- `bun fmt`
- `bun lint`
- `bun typecheck`
- targeted test bundle
- relevant Playwright/specs
- relevant smoke scripts

### Gate 4: Syncability gate

A subagent must explicitly answer:

- if upstream rewrote this subsystem, which files would need rebinding?
- did this change reduce that set?
- are tests attached to the seam rather than incidental implementation details?

No workstream is complete until its syncability answer is recorded in either the PR summary or the working notes.

## Delegation Plan

Main thread responsibilities:

- architecture choices
- seam design decisions
- final synthesis of findings
- integration/conflict resolution
- signoff on syncability

Subagent responsibilities:

- focused code reviews
- targeted exploration of specific capsules
- routine verification and smoke execution
- “what breaks if upstream rewrites this?” audits
- optional isolated implementation work only when write scopes are clearly disjoint

Recommended recurring roles:

- architecture reviewer
- security/correctness reviewer
- performance reviewer
- verification runner
- syncability reviewer

## Upstream Rewrite Adaptation Strategy

This is the core future-sync resilience model.

If upstream rewrites server routing:

- adapt only `apps/server/src/fork/http/index.ts` and its route registration, not each feature implementation

If upstream rewrites settings:

- adapt only the fork settings mount/registry and persistence adapter, not every runtime consumer

If upstream rewrites startup/bootstrap:

- adapt only `installForkWebShell(...)` and plugin registration

If upstream rewrites DOM/class structure:

- explicit `data-*` hooks and wrapper components keep fork CSS changes localized to small hook-bearing components

If upstream ships first-class push/PWA/settings support:

- remove the capsule registration
- delete its acceptance-matrix row
- update `ENHANCEMENTS.md`
- keep the other capsules intact

## Concrete Test Scenarios

- unauthenticated web-push route access fails when server auth is enabled
- authenticated web-push route access succeeds
- 404/410 delivery errors prune subscriptions
- transient delivery errors do not prune subscriptions
- irrelevant orchestration events do not trigger snapshot reads
- service worker does not cache transient server-error HTML as app shell
- dev host branded manifest is fetched from the actual branded host path under smoke
- Vite and server branding adapters return equivalent host-aware branding results
- fork-only settings can be changed and reset independently of upstream-owned settings
- restore-defaults confirmation accurately lists both upstream and fork changes
- debug panel off-state avoids eager payload construction
- touch-visible button behavior applies only to intended controls
- dev badge styling relies on explicit hook(s), not class-chain selectors
- an upstream rewrite thought experiment still leaves only seam files needing rebinding per capsule

## Public / Interface Changes

User-visible behavior changes:

- web-push HTTP endpoints require authenticated access when server auth is enabled
- no other intended user-visible behavior change unless needed to fix a documented bug

Internal interfaces added:

- `ForkHttpModule`
- `ForkHttpContext`
- `tryHandleForkHttpRequest(...)`
- `validateForkHttpAuth(...)`
- `isPotentiallyNotifiableEvent(...)`
- `resolveNotificationIntent(...)`
- `installForkWebShell(...)`
- `ForkWebBootstrapPlugin`
- `ForkSettingsRegistryEntry`
- `useForkSettings(...)`
- `buildForkSettingsResetPlan(...)`
- `logUserInputDebugLazy(...)`
- `ForkAcceptanceEntry`
- `forkSmokeManifest`

## Assumptions And Defaults

- Keep existing fork features unless they are explicitly identified as bugs, security issues, or reliability regressions.
- Keep current visible branding/product behavior unless a separate product decision changes it.
- Keep existing `sync:phaseN:smoke` entrypoints for compatibility, but make them wrappers around the new capsule-aligned smoke architecture.
- Prefer descriptors, registries, and explicit hooks over scattered conditionals or class-chain selectors.
- Prefer rebinding-friendly seams over large file moves when both approaches solve the same problem.
- Use subagents aggressively for review and verification, with main thread ownership of architecture and final synthesis.
- Keep iPhone-installed-PWA manual checks where automation would be brittle or misleading.

## Definition Of Done

The program is complete when:

- every fork capsule has one explicit seam, one owned subtree, one acceptance-matrix row, and one ledger entry
- the highest-risk findings from `FORK_SIDECAR_REVIEW.md` are resolved
- sync phases and smoke tests align to the capsule architecture
- each workstream has passed architecture, code review, verification, and syncability gates
- future upstream sync work can be described primarily as “rebind seam, rerun capsule smoke,” not “rediscover feature behavior”
