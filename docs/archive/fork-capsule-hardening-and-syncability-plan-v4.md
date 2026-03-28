# Fork Capsule Hardening And Syncability Plan V4

## Summary

Adopt the capsule model from V3, but tighten it with five explicit decisions from the feedback review:

1. Split execution into **Phase A** and **Phase B**
2. Treat the notification prefilter as an explicit **event-type allowlist**
3. Move **fork-only settings** into their own lightweight store with a one-time migration
4. Pull the **service-worker shell-cache fix** forward into Phase A
5. Make sync/smoke infrastructure a first-class deliverable that mirrors the capsule architecture

This plan is optimized for future upstream syncs. The core rule is:

- future sync work should primarily be **rebind seam, rerun capsule smoke, verify acceptance row**
- not **rediscover feature behavior and re-patch core files**

## Final Architectural Decisions

These choices are now explicit and should not be revisited during implementation unless a discovered repo constraint makes them impossible.

### Decision 1: Keep the capsule model

Each fork subsystem is a **capsule** with:

- one upstream-owned mount seam
- one fork-owned implementation subtree
- one contract/interface surface
- one test bundle
- one smoke/acceptance entry
- one `ENHANCEMENTS.md` entry with rollback/removal notes

### Decision 2: Split delivery into two phases

**Phase A: critical path**

- Workstream 0: architecture scaffolding
- Workstream 1: server HTTP capsule
- Workstream 2: notification delivery capsule
- plus the service-worker shell-cache fix

**Phase B: quality and sync resilience**

- Workstream 3: fork settings capsule
- Workstream 4: web bootstrap and branding/PWA capsule
- Workstream 5: UI hooks and debug capsule
- Workstream 6: sync and test infrastructure capsule

### Decision 3: Fork-only settings get their own store

Fork-only settings will live in a separate lightweight store:

- key: `t3code:fork-settings:v1`
- schema: `ForkSettingsSchema`
- hook: `useForkSettings()`

This applies to current fork-only keys:

- `pushNotificationsEnabled`
- `suppressCodexAppServerNotifications`

Upstream-equivalent settings remain outside this fork-only store.

### Decision 4: Keep named seam interfaces

Keep the seam interfaces introduced in V3 unless implementation proves a specific one is unnecessary. The cost of a few explicit types is lower than the future cost of implicit contracts during syncs.

### Decision 5: Sync scripts stay stable, but become wrappers

Keep existing `sync:phaseN:smoke` entrypoints for continuity, but make them wrappers over capsule-aware smoke helpers and manifests. The scripts stay familiar; the architecture underneath becomes cleaner.

## Capsule Inventory

The retained fork is organized into these capsules:

1. **Server HTTP capsule**
   - branding routes
   - web-push HTTP routes
   - auth handling for fork HTTP behavior

2. **Notification delivery capsule**
   - orchestration-event filtering
   - notification intent resolution
   - subscription lifecycle and pruning

3. **Fork settings capsule**
   - fork-only settings schema/store
   - fork reset/dirty-state composition
   - settings-section registration

4. **Web bootstrap and branding/PWA capsule**
   - runtime branding fallback
   - boot shell startup wiring
   - PWA/service-worker registration
   - dev/prod branding seams

5. **UI hooks and debug capsule**
   - explicit `data-*` hooks
   - dev badge styling seam
   - touch-visible action seam
   - lazy debug logging

6. **Sync and test infrastructure capsule**
   - acceptance matrix
   - shared smoke helpers
   - Playwright/browser coverage
   - sync-phase wrapper scripts

## Important Internal APIs / Interfaces / Types

These are the planned internal seam contracts.

### Server

- `ForkHttpContext`
- `ForkHttpModule`
- `tryHandleForkHttpRequest(ctx): Effect<boolean, ...>`
- `validateForkHttpAuth(ctx): Effect<void, HttpAuthError, ...>`
- `ForkNotificationIntentResolver`
- `isPotentiallyNotifiableEvent(event): boolean`
- `resolveNotificationIntent(input): WebPushPayload | null`
- `resolveCodexLaunchOverrides(input): readonly string[]`

### Web

- `installForkWebShell(input): ForkWebShellHandle`
- `ForkWebBootstrapPlugin`
- `ForkSettingsSchema`
- `useForkSettings()`
- `updateForkSettings(patch)`
- `resetForkSettings()`
- `buildForkSettingsResetPlan(input)`
- `ForkSettingsRegistryEntry`
- `logUserInputDebugLazy(factory)`

### Testing / Sync

- `ForkAcceptanceEntry`
- `ForkSmokeTarget`
- `forkSmokeManifest`
- `runForkSmoke(entry, target)`

No public route path changes are planned. The intentional externally observable behavior changes are:

- web-push HTTP endpoints require authentication when server auth is enabled
- service worker stops caching bad navigation HTML as the app shell

## Workstream 0: Architecture Scaffolding

### Goal

Create the seam framework and docs before feature refactors deepen drift.

### Implementation

- Add `apps/server/src/fork/http/index.ts` as the single server HTTP seam
- Add `apps/web/src/fork/bootstrap/index.ts` as the single web bootstrap seam
- Add `apps/web/src/fork/settings/index.ts` as the single fork settings seam
- Add `docs/fork-architecture.md`
- Add `docs/fork-acceptance-matrix.md`
- Update `UPSTREAM_SYNC_MIGRATION_LOG.md` so phases map to capsules
- Update `ENHANCEMENTS.md` entries to note seam locations and rollback paths

### Acceptance criteria

- `wsServer.ts` has one fork HTTP entry point
- `main.tsx` has one fork bootstrap entry point
- settings page has one fork settings entry point
- each capsule has an acceptance-matrix row before feature work continues

## Workstream 1: Server HTTP Capsule

### Goal

Move branding and web-push route behavior behind a single fork HTTP sidecar and close the auth gap.

### Implementation

- Move branding logic into `apps/server/src/fork/http/brandingRoutes.ts`
- Move web-push REST logic into `apps/server/src/fork/http/webPushRoutes.ts`
- Keep `apps/server/src/wsServer.ts` responsible only for calling `tryHandleForkHttpRequest(...)`
- Add `validateForkHttpAuth(...)`
- When auth is enabled, require authenticated access for:
  - `/api/web-push/config`
  - `/api/web-push/subscription`
- When auth is disabled, preserve current local/dev openness

### Required tests

- authenticated config request succeeds
- unauthenticated config request fails when auth enabled
- authenticated subscribe/unsubscribe succeeds
- unauthenticated subscribe/unsubscribe fails when auth enabled
- auth-disabled config/subscribe/unsubscribe still work
- branding manifest/icon/html routes still work

### Review gate

- one subagent security review
- one subagent architecture review
- main thread verifies `wsServer.ts` does not regain feature-specific branching

## Workstream 2: Notification Delivery Capsule

### Goal

Fix subscription pruning and remove unnecessary hot-path snapshot reads.

### Implementation

- Preserve `statusCode` on delivery errors so 404/410 subscriptions are deleted
- Add an explicit notification event allowlist in `isPotentiallyNotifiableEvent(event)`
- The allowlist should enumerate the exact event types that can produce notifications today
- Add a development warning path for events that reach notification handling unexpectedly
- Only load snapshots after the allowlist says the event is potentially notifiable
- Move intent resolution into `apps/server/src/fork/notifications/intentResolver.ts`

### Chosen allowlist strategy

Use a simple explicit allowlist, not pattern matching or broad heuristics. This minimizes false negatives and makes the contract easy to audit during syncs.

### Required tests

- 404 subscription is deleted
- 410 subscription is deleted
- transient failure is marked but not deleted
- irrelevant event types do not trigger snapshot work
- allowlisted event types still produce identical payloads
- unexpected event kinds log a warning path in development

### Review gate

- one subagent correctness review
- one subagent performance review
- main thread confirms the allowlist is explicit and documented

## Phase A Add-On: Service Worker Shell Cache Fix

### Goal

Land the reliability fix early instead of waiting for the broader PWA capsule.

### Implementation

In `apps/web/public/service-worker.js`, only cache navigation responses when:

- `response.ok` is true
- response is same-origin
- response content type is HTML

### Required tests

- successful HTML navigation updates shell cache
- 500/503 HTML does not replace shell cache
- offline fallback still works after a transient failure

### Review gate

- one subagent reliability review focused only on navigation cache behavior

## Workstream 3: Fork Settings Capsule

### Goal

Move fork-only settings into a dedicated store and make reset/dirty behavior explicit and correct.

### Implementation

Add:

- `apps/web/src/fork/settings/schema.ts`
- `apps/web/src/fork/settings/useForkSettings.ts`
- `apps/web/src/fork/settings/persistence.ts`
- `apps/web/src/fork/settings/resetPlan.ts`
- `apps/web/src/fork/settings/registry.ts`

### Store design

- storage key: `t3code:fork-settings:v1`
- values: only fork-only settings
- current keys:
  - `pushNotificationsEnabled`
  - `suppressCodexAppServerNotifications`

### One-time migration

On first load of the fork settings store:

- read the old `t3code:app-settings:v1`
- extract fork-only keys if present
- write them into `t3code:fork-settings:v1`
- remove those fork-only keys from the old app settings payload if safe to do so
- mark migration as complete implicitly by the presence of the new fork settings key

### Reset behavior

The settings page must compose:

- upstream-equivalent reset
- fork-only reset

The confirmation copy must list changes from both stores truthfully.

### Required related doc update

Update `AGENTS.md` guidance to reflect the new default:

- fork-only settings belong in the fork settings store
- upstream-equivalent settings belong in the upstream/canonical settings path

### Required tests

- migration from old unified storage into fork-only storage
- fork-only dirty-state detection
- fork-only reset
- combined reset copy is complete and accurate
- no hidden reset of fork settings without UI disclosure

### Review gate

- one subagent architecture review on sync friendliness
- one subagent UX review on reset/dirty behavior
- main thread verifies runtime consumers no longer depend broadly on a fork-owned universal store

## Workstream 4: Web Bootstrap And Branding/PWA Capsule

### Goal

Collapse startup behavior behind a single bootstrap seam and keep branding/PWA behavior single-sourced.

### Implementation

Add:

- `apps/web/src/fork/bootstrap/installForkWebShell.ts`
- optional plugin modules:
  - `brandingBootstrap.ts`
  - `bootShellBootstrap.ts`
  - `pwaBootstrap.ts`
  - `debugBootstrap.ts`

### Responsibilities

- runtime branding fallback
- boot shell lifecycle
- PWA registration
- optional diagnostics wiring
- future fork startup behaviors

### Branding cleanup

- extract shared host/header resolution used by both server and Vite branding adapters
- keep `packages/shared/src/branding.ts` as the single source of truth
- keep current document-title behavior unless explicitly revisited later

### Required tests

- bootstrap contract tests
- runtime branding tests
- branded host manifest/icon/html tests
- Vite/server parity tests
- actual branded-host manifest smoke, not just local endpoint smoke

### Review gate

- one subagent review focused on survival under upstream startup/router rewrites
- one subagent review focused on branding parity and contract coverage
- main thread verifies startup logic is coordinated from one seam

## Workstream 5: UI Hooks And Debug Capsule

### Goal

Replace brittle class-chain selectors and eager debug overhead with explicit hooks.

### Implementation

- Replace current class-chain CSS selectors with `data-slot="fork-*"` or tiny wrapper components
- Move dev badge targeting to an explicit hook
- Replace broad touch-visible CSS with explicit intended-control hooks
- Add `logUserInputDebugLazy(factory)` and migrate hot callsites

### Required tests

- hook presence tests
- touch-visible control regression tests
- debug off-state avoids eager payload construction

### Review gate

- one subagent DOM/CSS resilience review
- one subagent performance review of debug-off behavior
- main thread verifies no new brittle selectors were introduced

## Workstream 6: Sync And Test Infrastructure Capsule

### Goal

Make the sync plan and smoke suite mirror the capsule architecture and stay maintainable through upstream change.

### Implementation

Keep current `sync:phaseN:smoke` scripts as stable wrappers, but move real logic into:

- `apps/web/e2e/shared/`
- `apps/web/e2e/playwright/fork/`
- `apps/web/src/fork/testing/` or equivalent shared smoke manifest module

### Test taxonomy

- unit: local helpers and pure logic
- contract: seam behavior
- integration: capsule interaction across boundaries
- smoke: environment/runtime behavior
- Playwright E2E: stable user flows and fork UI contracts

### Smoke organization

Each capsule gets:

- one smoke manifest entry
- one sync-phase wrapper mapping
- one acceptance-matrix row

### Playwright scope

Use Playwright for deterministic flows:

- branded manifest route on dev host
- fork settings section rendering
- touch-visible control behavior
- debug sidecar flow
- push settings card behavior
- PWA/service-worker behavior where stable in browser automation

Use smoke scripts for environment-specific checks:

- local dev endpoint behavior
- branded host route behavior
- server/Vite parity
- sync-phase environment assertions

### Required tests

- `sync:smoke:all` aggregator
- capsule-level smoke entries
- updated phase wrappers
- acceptance-matrix completeness check

### Review gate

- one subagent test maintainability review
- one subagent smoke-coverage review
- main thread verifies every capsule has unit, contract, smoke, and acceptance coverage

## Review Gates For Every Workstream

Each workstream must pass these four gates.

### Gate 1: Architecture gate

- main thread validates seam shape
- one explorer subagent reviews sync-friendliness before implementation is locked

### Gate 2: Code review gate

- one subagent reviews correctness/security/performance
- high-risk workstreams get a second subagent focused on architecture drift

### Gate 3: Verification gate

Delegate:

- `bun fmt`
- `bun lint`
- `bun typecheck`
- targeted tests
- capsule smoke
- Playwright coverage where applicable

### Gate 4: Syncability gate

A subagent must answer:

- if upstream rewrites this subsystem, which files do we rebind?
- did this work reduce that set?
- are the tests attached to the seam rather than incidental internals?

The syncability answer must be recorded in:

- `docs/fork-acceptance-matrix.md`
  or
- the workstream notes that feed it

## Delegation Model

Main thread owns:

- architecture
- seam decisions
- final integration
- final syncability judgment

Subagents own:

- focused architecture review
- security/correctness review
- performance review
- routine verification
- smoke execution
- “what breaks if upstream rewrites X?” analysis

Recommended subagent roles by phase:

- Phase A: architecture reviewer, security reviewer, reliability reviewer, verification runner
- Phase B: settings-architecture reviewer, bootstrap reviewer, DOM/CSS resilience reviewer, smoke/test reviewer

## Upstream Rewrite Adaptation Strategy

If upstream rewrites server routing:

- adapt only the server HTTP seam and route module registration

If upstream rewrites settings:

- adapt only the fork settings mount, migration, and registry; do not refit every runtime consumer

If upstream rewrites startup/bootstrap:

- adapt only `installForkWebShell(...)` and plugin binding

If upstream rewrites DOM/classes:

- explicit `data-*` hooks keep CSS changes localized to small hook-bearing components

If upstream ships first-class push, PWA, or settings support:

- remove the capsule registration
- delete its acceptance row
- update `ENHANCEMENTS.md`
- leave the rest of the fork intact

## Docs Strategy During And After Refactor

During refactor, keep all of these active:

- `FORK_SIDECAR_REVIEW.md`
- `docs/fork-architecture.md`
- `docs/fork-acceptance-matrix.md`
- `ENHANCEMENTS.md`
- `UPSTREAM_SYNC_MIGRATION_LOG.md`

After stabilization:

- freeze `FORK_SIDECAR_REVIEW.md` as the original audit
- optionally merge architecture and acceptance docs if they become too interdependent
- keep syncability answers in the acceptance matrix rather than ephemeral PR text

## Test Cases And Scenarios

- unauthenticated web-push route access fails when auth is enabled
- authenticated web-push route access succeeds
- auth-disabled web-push route access still works in dev/local mode
- 404/410 push failures prune subscriptions
- transient push failures do not prune subscriptions
- only allowlisted event types trigger notification snapshot work
- unexpected event types reaching notification handling surface a development warning
- service worker does not cache transient error HTML as shell
- branded manifest is fetched from the real branded host under smoke
- Vite and server branding adapters behave consistently
- fork-only settings migrate correctly from old unified storage
- restore-defaults accurately lists and resets both upstream-equivalent and fork-only changes
- debug off-state avoids eager payload work
- touch-visible controls apply only to intended elements
- dev badge styling survives upstream class changes because it uses explicit hooks
- for each capsule, an upstream rewrite thought experiment still leaves only seam files requiring rebinding

## Assumptions And Defaults

- Existing fork features stay unless explicitly identified as a bug, security issue, or reliability regression
- Fork-only settings are now intentionally separated from upstream-equivalent settings
- Existing `sync:phaseN:smoke` commands remain as compatibility entrypoints
- Named seam interfaces stay unless implementation proves a specific one unnecessary
- Current document-title behavior stays unchanged in this refactor unless a separate product decision changes it
- Manual iPhone-installed-PWA checks remain where automation would be brittle
- The success measure is not just correctness today; it is lower reapplication cost on the next major upstream sync

## Definition Of Done

The program is complete when:

- every capsule has one seam, one owned subtree, one acceptance row, and one ledger entry
- Phase A security and reliability issues are fixed and reviewed
- Phase B refactors are complete without widening core drift
- sync phases and smoke coverage map cleanly to capsules
- each workstream has passed architecture, code review, verification, and syncability gates
- future upstream sync work can be described as “rebind seam, rerun capsule smoke, verify acceptance row”
