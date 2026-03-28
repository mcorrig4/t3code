# Fork Sidecar Review

Date: 2026-03-26

Purpose: capture the current review findings about fork-specific changes, especially places where security, reliability, or maintainability would improve if the fork were pushed further toward sidecar-style compartmentalization.

This document is intentionally separate from `ENHANCEMENTS.md`.

- `ENHANCEMENTS.md` is the historical ledger of what the fork does.
- This file is a review/audit of where the fork can be improved.

## Review Scope

The review covered the fork delta against `upstream/main`, with emphasis on:

- server-side branding, web-push, and Codex integration
- web/mobile shell, PWA, boot, and branding behavior
- settings, debug tooling, and fork-specific UI seams
- opportunities to reduce upstream merge pressure by narrowing fork integration points

## Highest-Priority Findings

### 1. Web Push HTTP Routes Bypass The Existing Auth Boundary

- Severity: high
- Area: server, security, notifications
- Files:
  - `apps/server/src/wsServer.ts`
  - `apps/server/src/notifications/policy.ts`
  - `apps/server/src/notifications/Layers/WebPushNotifications.ts`

What we found:

- Web-push HTTP endpoints are handled as plain HTTP routes in `wsServer.ts`.
- They do not currently appear to reuse the same auth boundary enforced for the interactive app/WebSocket path.
- Successful subscriptions later receive thread titles and message excerpts derived from orchestration state.

Key references:

- [wsServer.ts](/home/claude/code/t3code/apps/server/src/wsServer.ts#L469)
- [wsServer.ts](/home/claude/code/t3code/apps/server/src/wsServer.ts#L493)
- [policy.ts](/home/claude/code/t3code/apps/server/src/notifications/policy.ts#L40)

Why this matters:

- If the server is reachable, an unauthenticated caller may be able to register a subscription and receive future thread metadata.

Recommended direction:

- Require the same auth model used by the app for the web-push REST endpoints when auth is enabled.
- Move web-push route handling behind a fork HTTP sidecar seam rather than keeping it inline in `wsServer.ts`.

### 2. Fork Settings Are No Longer Truly Sidecar-Scoped

- Severity: high
- Area: web, settings architecture, upstream sync risk
- Files:
  - `apps/web/src/appSettings.ts`
  - `apps/web/src/routes/_chat.settings.tsx`
  - `apps/web/src/components/ChatView.tsx`
  - `apps/web/src/components/Sidebar.tsx`
  - other consumers of `useAppSettings()`

What we found:

- The fork reintroduced a localStorage-backed canonical settings store through `useAppSettings()`.
- Core runtime code now depends on this fork-owned store directly.
- That broadens the fork diff substantially and weakens the original sidecar pattern.

Key references:

- [appSettings.ts](/home/claude/code/t3code/apps/web/src/appSettings.ts#L268)
- [Sidebar.tsx](/home/claude/code/t3code/apps/web/src/components/Sidebar.tsx#L385)
- [\_chat.settings.tsx](/home/claude/code/t3code/apps/web/src/routes/_chat.settings.tsx#L358)

Why this matters:

- Future upstream settings work will conflict broadly.
- Fork-only settings are no longer isolated behind a narrow adapter or seam.

Recommended direction:

- Rebase fork-only settings onto a dedicated `useForkSettings()` adapter over the canonical settings model.
- Keep `ForkSettingsSection` as the visual seam, but move persistence and dirty/reset logic into fork-owned helpers.

## Medium-Priority Findings

### 3. Service Worker Can Cache Transient Error HTML As The App Shell

- Severity: medium
- Area: PWA reliability
- File:
  - `apps/web/public/service-worker.js`

What we found:

- Navigation fetches cache any successful `fetch(request)` result as the app shell.
- That includes transient error responses returned as HTML.

Key reference:

- [service-worker.js](/home/claude/code/t3code/apps/web/public/service-worker.js#L74)

Why this matters:

- A temporary backend issue can poison the cached shell and make offline/app-shell behavior less reliable.

Recommended direction:

- Only cache same-origin, `response.ok`, HTML navigation responses.

### 4. Expired Push Subscriptions Are Not Reliably Pruned

- Severity: medium
- Area: notifications reliability
- File:
  - `apps/server/src/notifications/Layers/WebPushNotifications.ts`

What we found:

- Permanent-delivery-error detection relies on `statusCode`.
- The send wrapper currently preserves only the error message, not the status code.

Key references:

- [WebPushNotifications.ts](/home/claude/code/t3code/apps/server/src/notifications/Layers/WebPushNotifications.ts#L41)
- [WebPushNotifications.ts](/home/claude/code/t3code/apps/server/src/notifications/Layers/WebPushNotifications.ts#L151)
- [WebPushNotifications.ts](/home/claude/code/t3code/apps/server/src/notifications/Layers/WebPushNotifications.ts#L216)

Why this matters:

- Dead subscriptions can accumulate and continue to be retried forever.

Recommended direction:

- Preserve `statusCode` on wrapped delivery errors so 404/410 subscriptions are deleted.

### 5. Notification Sidecar Adds Snapshot Reads To The Hot Event Path

- Severity: medium
- Area: server performance, orchestration integration
- Files:
  - `apps/server/src/wsServer.ts`
  - `apps/server/src/notifications/Layers/WebPushNotifications.ts`

What we found:

- Every domain event is forwarded to web-push notification processing.
- The notification service loads a full projection snapshot before it decides whether the event is relevant.

Key references:

- [wsServer.ts](/home/claude/code/t3code/apps/server/src/wsServer.ts#L840)
- [WebPushNotifications.ts](/home/claude/code/t3code/apps/server/src/notifications/Layers/WebPushNotifications.ts#L165)

Why this matters:

- This is extra fork overhead on a hot runtime path.
- It also increases coupling between the sidecar and core orchestration throughput.

Recommended direction:

- Add a cheap prefilter for potentially notifiable event types before any snapshot read.
- Long term, split notification intent resolution into a narrower service/helper.

### 6. Restore Defaults UX Is Inconsistent With Fork Settings

- Severity: medium
- Area: settings UX, correctness
- Files:
  - `apps/web/src/routes/_chat.settings.tsx`
  - `apps/web/src/appSettings.ts`

What we found:

- The settings page’s dirty-label list omits fork-only settings.
- The restore-defaults action still resets the whole settings object, including fork-only settings.

Key references:

- [\_chat.settings.tsx](/home/claude/code/t3code/apps/web/src/routes/_chat.settings.tsx#L253)
- [\_chat.settings.tsx](/home/claude/code/t3code/apps/web/src/routes/_chat.settings.tsx#L358)
- [appSettings.ts](/home/claude/code/t3code/apps/web/src/appSettings.ts#L282)

Why this matters:

- The confirmation UI can be incomplete or misleading.

Recommended direction:

- Separate upstream and fork dirty-state accounting.
- Make reset flow explicitly compose upstream reset plus fork reset.

### 7. Debug Sidecar Still Does Eager Work When Disabled

- Severity: medium
- Area: debug tooling, runtime overhead
- Files:
  - `apps/web/src/debug/userInputDebug.ts`
  - `apps/web/src/components/ChatView.tsx`
  - `apps/web/src/routes/__root.tsx`

What we found:

- The debug store checks `enabled` only inside `logUserInputDebug()`.
- Several callsites eagerly build and stringify payloads before the enabled check runs.

Key references:

- [userInputDebug.ts](/home/claude/code/t3code/apps/web/src/debug/userInputDebug.ts#L215)

Why this matters:

- The sidecar is visually optional but still imposes hot-path work when disabled.

Recommended direction:

- Add a lazy debug logging helper or guard hot callsites before payload construction.

### 8. Touch UX Override Is Too Broad

- Severity: medium
- Area: CSS isolation, UI behavior
- File:
  - `apps/web/src/overrides.css`

What we found:

- The touch-device rule forcing visibility on `.group .group-hover\:opacity-100` is global.
- It can affect unrelated controls that happen to use the same Tailwind pattern.

Key reference:

- [overrides.css](/home/claude/code/t3code/apps/web/src/overrides.css#L219)

Why this matters:

- It is isolated in one file, but not behaviorally scoped.

Recommended direction:

- Replace this with explicit `data-*` hooks on the intended controls.

## Lower-Priority Findings

### 9. Shared Branding Test And Implementation Are Out Of Contract

- Severity: low
- Area: tests, branding sidecar
- Files:
  - `packages/shared/src/branding.test.ts`
  - `packages/shared/src/branding.ts`

What we found:

- The test expects `applyBrandingToHtml()` to add missing meta tags.
- The implementation only rewrites existing tags.

Key references:

- [branding.test.ts](/home/claude/code/t3code/packages/shared/src/branding.test.ts#L56)
- [branding.ts](/home/claude/code/t3code/packages/shared/src/branding.ts#L228)

Why this matters:

- The shared branding sidecar currently has a contract mismatch.

Recommended direction:

- Decide whether the helper should inject tags or only rewrite them.
- Align tests and implementation to that choice.

### 10. Mobile PWA Smoke Check Is Not Verifying The Branded Manifest Path

- Severity: low
- Area: smoke tests, PWA verification
- File:
  - `apps/web/e2e/sync-phase-2-mobile-pwa.mjs`

What we found:

- The test fetches the manifest from `localWebUrl`, not the branded `baseUrl`.

Key reference:

- [sync-phase-2-mobile-pwa.mjs](/home/claude/code/t3code/apps/web/e2e/sync-phase-2-mobile-pwa.mjs#L35)

Why this matters:

- The test can pass while the actual host-aware manifest path is broken.

Recommended direction:

- Fetch the manifest from the branded host under test.

## Sidecar / Modularity Opportunities

## Server

### A. Add A Single Fork HTTP Sidecar Entry Point

Current issue:

- `wsServer.ts` directly owns multiple fork HTTP behaviors:
  - branding manifest/icon/html mutation
  - web-push REST endpoints

Recommended shape:

- Add a single server seam like:
  - `apps/server/src/fork/httpSidecar.ts`
- Then move:
  - branding routes into `apps/server/src/fork/http/brandingRoutes.ts`
  - web-push routes into `apps/server/src/fork/http/webPushRoutes.ts`

Desired result:

- `wsServer.ts` only asks the sidecar whether it handled the request.

### B. Narrow Notification Dependencies

Current issue:

- The notification sidecar reaches deeply into projection snapshots and event flow.

Recommended shape:

- Introduce a small notification intent resolver or prefilter layer so web-push delivery is not tightly coupled to full snapshots for every event.

### C. Keep Fork Config More Self-Contained

Current issue:

- Fork-specific VAPID configuration is threaded through core server config.

Recommended shape:

- Prefer a dedicated `WebPushConfig` or fork-config object/service where practical, rather than widening the core config surface.

### D. Move Codex Override Resolution Outward

Current issue:

- Fork-specific override parsing for Codex launch behavior lives inside the upstream-heavy app-server manager.

Recommended shape:

- Resolve spawn overrides closer to the Codex adapter seam and keep the manager focused on transport/session orchestration.

## Web

### E. Rebase Fork Settings Onto A Narrow Adapter

Current issue:

- Fork settings currently behave like the app’s universal canonical settings.

Recommended shape:

- Introduce a narrow `useForkSettings()` adapter and keep fork keys sidecar-scoped.

### F. Collapse Fork Startup Behind One Bootstrap Entry Point

Current issue:

- Fork startup behavior is spread across:
  - `main.tsx`
  - `runtimeBranding.ts`
  - `pwa.ts`
  - `routes/__root.tsx`

Recommended shape:

- Add a fork bootstrap seam such as:
  - `apps/web/src/fork/installWebShell.ts`

Desired result:

- `main.tsx` stays close to upstream and delegates fork boot behavior through one explicit hook.

### G. Move Fork Boot Shell / Loader Under A Clear Fork Namespace

Current issue:

- Fork-owned boot shell and loader files live in core-looking locations.

Recommended shape:

- Group them behind a more explicit fork namespace over time, while keeping churn controlled.

### H. Replace Brittle CSS Selectors With Explicit Hooks

Current issue:

- Some dev-branding and touch-visibility overrides rely on utility-class chains.

Recommended shape:

- Add explicit `data-*` hooks or wrapper elements in the relevant fork seams.

Key example:

- [overrides.css](/home/claude/code/t3code/apps/web/src/overrides.css#L77)

### I. Keep Manifest Data Single-Sourced

Current issue:

- `apps/web/public/manifest.webmanifest` duplicates information already modeled in shared branding code.

Recommended shape:

- Keep the shared branding module as the canonical source of manifest metadata and reduce or generate static fallback duplication.

## Suggested Implementation Order

1. Secure web-push auth.
2. Fix permanent subscription pruning.
3. Add notification event prefiltering.
4. Rebase fork settings onto a narrow adapter.
5. Fix restore-defaults semantics.
6. Collapse fork web startup behind one bootstrap seam.
7. Tighten service-worker shell caching.
8. Replace broad CSS selectors with explicit hooks.
9. Fix branding test mismatch and PWA smoke coverage.

## Review Method

This review was assembled from:

- direct local inspection of fork deltas against `upstream/main`
- targeted code reading across server/web/settings/PWA slices
- parallel subagent review of:
  - server/runtime branding and notification changes
  - web/mobile shell and PWA changes
  - settings/debug/UI sidecar changes

## Notes

- Some findings were corroborated by subagent static review.
- One subagent reported that targeted `apps/web` Vitest checks passed, while targeted `packages/shared` Vitest surfaced the branding contract mismatch described above.
- This document is intended to feed the implementation hardening plan, not replace it.
