# Fork Capsule Plan V3 — Review Feedback

Date: 2026-03-26

This document reviews `FORK_SIDECAR_REVIEW.md` and `fork-capsule-hardening-review-gates-and-syncability-plan-v3.md`, and provides feedback to incorporate before execution begins.

## Overall Assessment

The review is well-sourced and the severity tiers are defensible. The capsule plan is the right architecture for a fork that needs to survive upstream rewrites. The "upstream rewrite adaptation strategy" section is the most valuable part — it turns abstract architecture into a concrete "what do I touch when X happens" playbook.

All six capsules and all seven workstreams are necessary. The interface surface is justified by the fork's core maintenance goals: minimal seams, merge-friendly changes, easy re-application after upstream architecture changes, and trivial removal of temporary bug fixes when upstream catches up.

## Phasing Recommendation

Split execution into two phases:

**Phase A (critical path): Workstreams 0, 1, 2**

- Architecture scaffolding
- Server HTTP capsule (includes the web-push auth security fix)
- Notification delivery capsule (includes subscription pruning fix)

These have security and reliability implications and should ship as a coherent unit.

**Phase B (quality and resilience): Workstreams 3, 4, 5, 6**

- Fork settings capsule
- Web bootstrap and branding/PWA capsule
- UI hooks and debug capsule
- Sync and test infrastructure capsule

These are internal quality improvements that reduce upstream-sync friction and improve maintainability. They should follow Phase A without blocking on it.

## Specific Feedback By Topic

### Notification Prefilter Needs A Concrete Allowlist

The plan says "add a cheap prefilter" and "split notification flow into `isPotentiallyNotifiableEvent` and `resolveNotificationIntent`" but doesn't sketch what the filter criteria actually are.

This matters because the correctness bar is high — a false negative in the prefilter means a missed notification.

**Recommendation:** Before implementing Workstream 2, enumerate the actual orchestration event types that can produce notifications today and write the filter as a simple allowlist of those event types. Name them explicitly in the implementation notes. That's the cheapest correct prefilter and it makes the intent obvious to future readers.

### Settings Store Architecture Requires A Design Decision

This is the most consequential architectural choice in the plan and the current `AGENTS.md` guidance is in tension with the plan's direction. The analysis below resolves that tension.

#### Current State

`appSettings.ts` is **100% fork-created** (292 lines). It does not exist in upstream at all. The upstream uses a fundamentally different architecture: server-authoritative `ServerSettings` + optional `ClientSettings`, with a settings router that splits patches between server and client APIs. The fork replaced all of that with a flat, client-only, localStorage-backed store.

The fork store currently contains two categories of keys:

**Upstream-equivalent keys** (correspond to upstream concepts, reimplemented client-side):

- `claudeBinaryPath`, `codexBinaryPath`, `codexHomePath`
- `customCodexModels`, `customClaudeModels`, `textGenerationModel`
- `timestampFormat`, `sidebarProjectSortOrder`, `sidebarThreadSortOrder`
- `defaultThreadEnvMode`, `confirmThreadDelete`, `diffWordWrap`
- `enableAssistantStreaming`

**Fork-only keys** (no upstream equivalent):

- `pushNotificationsEnabled`
- `suppressCodexAppServerNotifications`

Both categories live in a single `AppSettingsSchema`, a single localStorage key, a single `useAppSettings()` hook, and a single `resetSettings()` call.

#### The Question

Should fork-only keys be separated into their own store (`useForkSettings()` with its own schema and localStorage key), or remain in the unified store?

#### Arguments For Keeping Unified (Current `AGENTS.md` Position)

1. **One store, one mental model.** Developers only need to understand one settings pattern.
2. **Atomic reset.** `resetSettings()` resets everything in one call with no coordination.
3. **No import complexity.** Components don't need to decide which hook to use.
4. **Low key count.** Only 2 fork-only keys today — the overhead of a separate store system is proportionally large.
5. **Industry standard.** Single canonical store per app is the normal pattern for a single product.

#### Arguments For Separating (Plan's Direction)

1. **Sync resilience.** When upstream ships a new settings architecture (which they will — the current fork divergence is total), fork-only keys in their own store means one fewer thing to reconcile. Upstream-equivalent keys get migrated to the new upstream architecture; fork-only keys stay untouched.
2. **Clean feature removal.** When upstream ships native push notification support, removing the fork's push notification capsule means deleting the fork settings module. Zero changes to upstream-equivalent settings files.
3. **Dirty-state correctness.** Finding #6 in the review shows that restore-defaults is already broken: the main page's dirty-label list omits fork keys, but `resetSettings()` resets them anyway. Separation makes this bug structurally impossible because each store owns its own dirty/reset logic.
4. **Reduced future migration surface.** If fork-only keys are mixed into the current `appSettings.ts` and upstream rewrites settings, the fork faces a two-front migration: adopt upstream's new architecture AND extract fork keys. Separating now means the future migration is single-front.
5. **Explicit ownership boundary.** Any future fork feature that needs a setting knows exactly where to put it. No ambiguity about which keys are "ours" vs which are upstream-equivalent.
6. **Aligns with the capsule model.** The entire point of capsules is that each fork subsystem has an owned subtree. Fork settings in a separate store is the natural expression of that principle.

#### The Deciding Factor

The "industry best practice" of one canonical store assumes you own the entire product. This fork does not own the product — it maintains sync with an upstream that has a completely different settings architecture. The maintenance model is fundamentally different from single-product development.

The question isn't "what's the best settings architecture for a product?" — it's "what makes the next upstream sync easiest?" And the answer is: fork-only keys in their own store means one fewer migration front when upstream changes settings.

#### Recommendation

**Separate fork-only settings into their own lightweight store.** The implementation should be:

- A thin `ForkSettingsSchema` with its own localStorage key (e.g. `t3code:fork-settings:v1`)
- A `useForkSettings()` hook that follows the same pattern as `useAppSettings()`
- Fork-only dirty-state and reset logic owned by the fork settings module
- Composed reset: the settings page's restore-defaults explicitly calls both `resetSettings()` and `resetForkSettings()`, and the confirmation dialog lists changes from both stores
- `ForkSettingsSection` continues to be the visual seam, now backed by the fork's own store

This is not a heavyweight registry — it's the same simple pattern used by `useAppSettings()`, applied to a separate key namespace.

#### Required `AGENTS.md` Update

The current guidance says:

> By default, fork-only settings should still persist through the canonical app settings store in `apps/web/src/appSettings.ts` so reset logic, migrations, tests, and runtime consumers stay unified.
> Only introduce a separate local-storage key for fork settings when the data is truly sidecar-only and should not participate in normal app settings semantics, defaults, restores, or cross-feature coordination.

This should be updated to reflect the plan's direction:

> Fork-only settings persist through their own dedicated store (`useForkSettings()`) with a separate localStorage key, schema, dirty-state, and reset logic.
> Upstream-equivalent settings stay in `appSettings.ts` (or whatever upstream's settings architecture becomes after a sync).
> The settings page composes both stores' reset flows explicitly so restore-defaults is accurate and complete.
> New fork features that need settings should add keys to the fork settings schema, not to `appSettings.ts`.

### Interface Surface

The ~15 named interfaces are justified by the fork's need for strictly defined insertion points. Two minor simplification suggestions, only if they hold up during implementation:

- `ForkHttpContext` and `ForkHttpModule`: If these end up as single-method types wrapping `tryHandleForkHttpRequest`, consider whether the function signature alone is sufficient. Keep them if they carry meaningful state or if the type names improve readability at the mount seam.
- `ForkAcceptanceEntry`, `ForkSmokeTarget`, `runForkSmoke`, `forkSmokeManifest`: These are test infrastructure types. If during Workstream 6 implementation it turns out that the manifest is small and static, a typed constant array may serve better than a full registry pattern. Evaluate during implementation, not upfront.

All other interfaces should be kept as designed. The cost of having a named type at each seam is much lower than the cost of discovering implicit contracts during a future upstream sync.

### Documentation Surface

The expanded doc surface (`FORK_SIDECAR_REVIEW.md`, `ENHANCEMENTS.md`, `docs/fork-architecture.md`, `docs/fork-acceptance-matrix.md`, `UPSTREAM_SYNC_MIGRATION_LOG.md`) is appropriate during the refactor to keep multi-agent context aligned across sessions. After the refactor stabilizes, consider:

- Freezing `FORK_SIDECAR_REVIEW.md` with a header noting which findings have been resolved, rather than keeping it as a living document.
- Merging `docs/fork-architecture.md` and `docs/fork-acceptance-matrix.md` into a single `docs/fork-architecture.md` with the acceptance matrix as a section, if the two docs end up referencing each other heavily.
- Moving syncability answers into the acceptance matrix rather than leaving them in ephemeral PR summaries.

These are post-refactor consolidation suggestions, not blockers.

## Concrete Risks To Watch During Execution

1. **Service worker caching bug (finding #3) is a one-line fix.** Don't let it wait for the full PWA capsule in Workstream 4. Consider landing `response.ok` check as a standalone fix in Phase A alongside the security fixes.

2. **Auth boundary implementation (Workstream 1) needs to handle the auth-disabled case carefully.** The plan says "keep auth-disabled local/dev behavior unchanged." Make sure the contract tests explicitly cover the case where auth is disabled and web-push routes remain open, so future changes don't accidentally lock out local dev.

3. **Notification prefilter false negatives.** An allowlist that's too narrow silently drops notifications. The allowlist should be accompanied by a catch-all log warning for event types that reach the notification path but aren't in the allowlist, so missing types are discoverable during development.

4. **Settings migration from unified to split store.** Existing users have fork settings stored under `t3code:app-settings:v1`. Workstream 3 needs a one-time migration that reads fork-only keys from the old location, writes them to the new `t3code:fork-settings:v1` key, and cleans them from the old key. This migration should be noted in the plan.

## Summary Of Recommendations

| Topic                  | Recommendation                                                             |
| ---------------------- | -------------------------------------------------------------------------- |
| Phasing                | Split into Phase A (workstreams 0-2) and Phase B (workstreams 3-6)         |
| Notification prefilter | Enumerate event types as an explicit allowlist before implementing         |
| Settings store         | Separate fork-only keys into their own lightweight store                   |
| `AGENTS.md`            | Update fork-settings guidance to match the separation decision             |
| Settings migration     | Add one-time migration from unified to split localStorage keys             |
| Service worker fix     | Land `response.ok` check in Phase A, don't wait for Workstream 4           |
| Auth contract tests    | Explicitly cover auth-disabled case                                        |
| Prefilter safety       | Add catch-all log warning for unrecognized event types                     |
| Interface surface      | Keep as designed; evaluate two minor simplifications during implementation |
| Documentation          | Keep expanded surface during refactor; consolidate after stabilization     |
