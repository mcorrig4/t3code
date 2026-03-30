# Fork Capsule Deep Code Review

Date: 2026-03-26

Review method: 3-wave, 10-agent deep code review across the full capsule implementation.

- Wave 1: 6 parallel agents performing focused capsule-by-capsule review
- Wave 2: 3 parallel agents performing cross-validation (security+correctness, syncability+architecture, test coverage+acceptance)
- Wave 3: 1 agent verifying the consolidated action plan for completeness and feasibility

## Confirmed Bugs

### BUG-1: Phase 9 smoke test reads wrong localStorage key

- Severity: medium
- File: `apps/web/e2e/sync-phase-9-settings-sidecar.mjs:6`
- Confirmed by: Agents 3, 6, 7, 9

The smoke script defines `APP_SETTINGS_STORAGE_KEY = "t3code:app-settings:v1"` and reads `suppressCodexAppServerNotifications` from that key after toggling it in the UI. But the runtime now writes this setting to `t3code:fork-settings:v1` via `useForkSettings()`. The test checks the wrong store.

Fix: Change the storage key constant to `t3code:fork-settings:v1`.

### BUG-2: `migrateLegacyForkSettings()` throws on corrupt fork-settings store

- Severity: low (console error, not crash — `useLocalStorage` initializer has its own try-catch, but the `useEffect` migration path does not)
- File: `apps/web/src/fork/settings/persistence.ts:39`
- Confirmed by: Agents 3, 7, 10

`getLocalStorageItem(FORK_SETTINGS_STORAGE_KEY, ForkSettingsSchema)` calls `Schema.decodeSync` which throws if the stored JSON is unparseable. The `useEffect` in `useForkSettings.ts:20` that calls this function has no try-catch.

Fix: Wrap the `getLocalStorageItem` call in try-catch. On failure, remove the corrupt key and fall through to legacy migration or defaults.

### BUG-3: `readForkSettingsSnapshot()` throws on corrupt store

- Severity: low (same class as BUG-2)
- File: `apps/web/src/fork/settings/persistence.ts:70-71`
- Confirmed by: Agents 3, 7, 10

Same pattern. `getLocalStorageItem` can throw; no try-catch around it.

Fix: Same pattern — try-catch, fall through to defaults.

## Security Findings

### SEC-1: Timing-attack-vulnerable token comparison

- Severity: medium
- File: `apps/server/src/fork/http/index.ts:76`
- Confirmed by: Agents 1, 7

`validateForkHttpAuth` uses `===` for token comparison. JavaScript string equality short-circuits on the first differing byte, making it vulnerable to timing side-channel attacks.

Fix: Use `crypto.timingSafeEqual` with a byte-length pre-check:

```typescript
const a = Buffer.from(providedToken, "utf8");
const b = Buffer.from(context.serverConfig.authToken, "utf8");
if (a.byteLength !== b.byteLength || !crypto.timingSafeEqual(a, b)) {
  return yield * new HttpAuthError({ message: "Unauthorized request", statusCode: 401 });
}
```

### SEC-2: No request body size limit on web-push JSON endpoints

- Severity: medium (requires authentication to exploit)
- File: `apps/server/src/notifications/http.ts:34-42`
- Confirmed by: Agents 1, 7

`readJsonRequestBody` reads all chunks into memory with no size limit. An authenticated caller could send an arbitrarily large body to OOM the server.

Fix: Add `MAX_BODY_SIZE = 65536` with early termination and 413 response.

### SEC-3: Empty-string authToken bypass

- Severity: low (requires misconfiguration)
- File: `apps/server/src/fork/http/index.ts:71`

`if (!context.serverConfig.authToken)` treats `""` as falsy, silently skipping auth.

Fix: Log warning for empty-string authToken, or check `=== undefined` explicitly.

## Reliability Findings

### REL-1: `bootReady` promise rejection unhandled in main.tsx

- Severity: high
- File: `apps/web/src/main.tsx:30`
- Confirmed by: Agents 4, 10

`void forkWebShell.bootReady` with no `.catch()`. If any bootstrap plugin rejects, it becomes an unhandled promise rejection.

Fix: Add `.catch((err) => console.error("[fork-bootstrap]", err))`.

### REL-2: `Effect.succeed` wraps potentially-throwing call in intent resolver

- Severity: low (outer `catchCause` prevents crash)
- File: `apps/server/src/fork/notifications/intentResolver.ts:28-31`
- Confirmed by: Agents 2, 7

`notificationIntentFromEvent` is evaluated eagerly inside `Effect.succeed()`. The outer `Effect.catchCause` catches defects, so this does not crash the event stream, but it is a code smell.

Fix: Replace with `Effect.try(() => notificationIntentFromEvent({ event, snapshot }))`.

### REL-3: Service worker caches its own files in APP_SHELL_ASSETS

- Severity: medium
- File: `apps/web/public/service-worker.js:10-11`
- Confirmed by: Agents 4, 10

`APP_SHELL_ASSETS` includes `/sw.js` and `/service-worker.js`. Caching SW scripts at the application layer is an anti-pattern.

Fix: Remove `/sw.js` and `/service-worker.js` from `APP_SHELL_ASSETS`. Bump `APP_SHELL_CACHE` from `v6` to `v7` so existing clients invalidate their stale cache.

### REL-4: Boot shell `whenReady` hangs forever if `markBootReady()` never fires

- Severity: medium
- File: `apps/web/src/fork/bootstrap/bootShellBootstrap.ts:14`

The failsafe dismisses the DOM shell after 6000ms, but the `whenReady` promise never resolves if `markBootReady()` is never called.

Fix: Race `waitForBootReady()` against a timeout that resolves after `APP_BOOT_FAIL_SAFE_MS`.

### REL-5: Eager `logUserInputDebug` callsite runs JSON.stringify unconditionally

- Severity: low
- File: `apps/web/src/components/ChatView.tsx:2922-2937`
- Confirmed by: Agent 5

The `useEffect` at line 2922 runs `JSON.stringify` unconditionally on every pending-user-input state change, regardless of whether debug is enabled. The result is then passed to `logUserInputDebug()` (eager form), which checks `enabled` internally — but the stringify already happened.

Fix: Migrate this callsite to `logUserInputDebugLazy` with the stringify inside the factory.

Note: The debug sidecar's global `window.addEventListener` calls (Agent 5 finding) are acceptable as-is — the `logUserInputDebug` early-return when disabled makes the callbacks effectively free. The listener registration cost is near-zero.

### REL-6: Silent subscription deletion — no log on 404/410 prune

- Severity: low
- File: `apps/server/src/notifications/Layers/WebPushNotifications.ts:242-246`

Dead subscriptions are deleted with no log message. Operators have no visibility into subscription lifecycle.

Fix: Add `Effect.logInfo` before `deleteByEndpoint` for permanent delivery errors.

### REL-7: `applyBrandingToHtml` silently drops branding for missing meta tags

- Severity: low (deferred)
- File: `packages/shared/src/branding.ts:213-239`

The regex `.replace()` is a no-op if the target meta tag is missing from the HTML. Currently safe because `index.html` has all required tags, but fragile.

Deferred: Low impact. Track as future hardening.

## Architecture Findings

### ARCH-1: ChatView.tsx has ~40 scattered fork lines with no containment boundary

- Severity: high (sync risk)
- File: `apps/web/src/components/ChatView.tsx`
- Confirmed by: Agent 8

~40 fork-specific lines across a 4,419-line file covering two separate concerns (Codex notification suppression + debug breadcrumbs). This is the single most expensive file to rebind during an upstream rewrite (estimated 1-2 hours).

Deferred: Significant refactor. Track extraction targets in TODO.md:

- `useSuppressCodexNotifications()` hook
- Debug breadcrumb wrapper/helper

### ARCH-2: `__root.tsx` is undocumented second mount surface

- Severity: medium
- File: `apps/web/src/routes/__root.tsx:18-19, 68, 240-265`

Debug sidecar mount + event logging are not in `fork-architecture.md`.

Fix: Update architecture doc to list `__root.tsx` as a Capsule 5 mount seam.

### ARCH-3: `usePushNotifications.ts` is 100% fork-owned but lives outside `fork/`

- Severity: medium
- File: `apps/web/src/notifications/usePushNotifications.ts` (219 lines)

Creates ownership confusion during syncs.

Fix: Document ownership in architecture doc. Consider moving to `fork/notifications/` in a future pass.

### ARCH-4: `overrides.css` has 10 unique upstream-owned `data-slot` selectors and 7 `.dark` class-chain selectors

- Severity: medium
- File: `apps/web/src/overrides.css`
- Corrected count by: Agent 10

Upstream-owned `data-slot` targets: `sidebar`, `sheet-backdrop`, `sidebar-footer`, `sidebar-menu`, `sidebar-menu-button`, `chat-title-group`, `badge`, `user-message-actions`, `thread-terminal-close-action`, `custom-model-remove-action`.

`.dark` selectors: 7 distinct rules (not 3 as in status doc, not 5 as in earlier review).

Fix: Update status doc with correct counts. Document each upstream-owned selector as an explicit sync-risk dependency.

### ARCH-5: `ForkThreadContextMenuButton` mount in Sidebar.tsx undocumented

- Severity: low
- File: `apps/web/src/components/Sidebar.tsx:105, 1289-1295, 1631`

Not in fork-architecture.md.

Fix: Add to architecture doc.

### ARCH-6: `resetPersistedForkSettings()` is exported but unused

- Severity: low
- File: `apps/web/src/fork/settings/persistence.ts:77-79`

Semantically different from `resetForkSettings` (removes key entirely vs writes defaults). May be an intentional escape hatch.

Fix: Either add a comment documenting intent, or remove if confirmed unnecessary.

## Test Infrastructure Findings

### TEST-1: `forkSmokeManifest` is missing phase 4

- Severity: high
- File: `apps/web/src/fork/testing/forkSmokeManifest.ts`

Phase 4 (`sync-phase-4-settings.mjs`) has a working smoke script but no manifest entry. Phases 1, 3, 5 have `package.json` commands but no smoke scripts — these cannot be added to the manifest without first creating their scripts.

Fix: Add phase 4 to the manifest now. Track phases 1, 3, 5 as future work.

### TEST-2: Phase 0 smoke defaults to remote URL, others default to local

- Severity: medium
- File: `apps/web/e2e/sync-phase-0-baseline.mjs:3`

Phase 0 defaults to `https://t3-dev.claude.do`, other phases to `http://127.0.0.1:5734`. This may be intentional (phase 0 tests the deployed site), but running `sync:smoke:all` without env vars creates a split-brain situation.

Fix: Document the intentional difference in the manifest. Ensure env var override works consistently across all phases.

### TEST-3: 4 scripts each define their own inline `expect()`

- Severity: medium
- Files: `sync-phase-{4,6,7,9}-*.mjs`

Duplicate assertion logic across 4 scripts.

Fix: Extract `expect()` to `shared/assertions.mjs` and import everywhere.

### TEST-4: `runForkSmoke()` is exported but never used

- Severity: low
- File: `apps/web/e2e/shared/smokeRunner.mjs:7-15`

Fix: Either adopt in smoke scripts or remove.

## Syncability Assessment

Overall score: **6/10** (Agent 8)

### Per-Capsule Rebinding Cost

| Capsule                  | Core files to rebind                                                          | Fork lines in core                                            | Difficulty |
| ------------------------ | ----------------------------------------------------------------------------- | ------------------------------------------------------------- | ---------- |
| Server HTTP              | `wsServer.ts` (4 lines)                                                       | 4                                                             | Easy       |
| Notification delivery    | `serverLayers.ts` (2 lines)                                                   | 5                                                             | Easy       |
| Fork settings            | `_chat.settings.tsx` (7 lines), `ChatView.tsx` (~15 lines)                    | ~22 + `usePushNotifications.ts` (219 lines, fully fork-owned) | Medium     |
| Web bootstrap/PWA        | `main.tsx` (4 lines)                                                          | 4                                                             | Easy       |
| UI hooks/debug           | `__root.tsx` (~29 lines), `ChatView.tsx` (~25 lines), `Sidebar.tsx` (3 lines) | ~58                                                           | Hard       |
| Sync/test infrastructure | (no core file seams)                                                          | 0                                                             | Easy       |

### Biggest sync risks

1. `ChatView.tsx` — ~40 scattered fork lines, most actively changed upstream file
2. `usePushNotifications.ts` — 219 lines, 100% fork-owned, lives outside `fork/`
3. `overrides.css` — 10 upstream-owned `data-slot` selectors, 7 `.dark` class-chain selectors
4. `__root.tsx` — undocumented mount surface with ~29 fork lines in event router

### Architecture doc gaps found

1. `ChatView.tsx` not listed as a mount seam for any capsule despite fork logic in provider options and debug breadcrumbs
2. `__root.tsx` not listed as Capsule 5 mount seam
3. `Sidebar.tsx` `ForkThreadContextMenuButton` mount not documented
4. `usePushNotifications.ts` ownership not documented
5. `UserInputDebugSidecar.tsx` and `UserInputDebugPanel.tsx` not listed in Capsule 5 owned subtree

## Recommended Action Plan

### Phase 1: Bug Fixes + Security Hardening

1. Fix Phase 9 smoke localStorage key (BUG-1)
   - File: `apps/web/e2e/sync-phase-9-settings-sidecar.mjs`
   - Change: `t3code:app-settings:v1` to `t3code:fork-settings:v1`

2. Add try-catch to `migrateLegacyForkSettings()` and `readForkSettingsSnapshot()` (BUG-2, BUG-3)
   - File: `apps/web/src/fork/settings/persistence.ts`
   - Change: Wrap `getLocalStorageItem` calls in try-catch, remove corrupt key on failure, fall through to defaults

3. Replace `===` with `crypto.timingSafeEqual` for auth token comparison (SEC-1)
   - File: `apps/server/src/fork/http/index.ts`
   - Change: Import `crypto`, add byte-length pre-check, use `timingSafeEqual`

4. Add body size limit to `readJsonRequestBody` (SEC-2)
   - File: `apps/server/src/notifications/http.ts`
   - Change: Add `MAX_BODY_SIZE = 65536`, accumulate byte count, abort with 413 on exceed

5. Add `.catch()` to `bootReady` in `main.tsx` (REL-1)
   - File: `apps/web/src/main.tsx`
   - Change: `forkWebShell.bootReady.catch((err) => console.error("[fork-bootstrap]", err))`

6. Replace `Effect.succeed` with `Effect.try` in intent resolver (REL-2)
   - File: `apps/server/src/fork/notifications/intentResolver.ts`
   - Change: `Effect.try(() => notificationIntentFromEvent({ event, snapshot }))`

7. Remove SW files from APP_SHELL_ASSETS + bump cache version (REL-3)
   - File: `apps/web/public/service-worker.js`
   - Change: Remove `/sw.js` and `/service-worker.js` from array; change `APP_SHELL_CACHE` from `v6` to `v7`

### Phase 2: Reliability + Code Quality

8. Race boot-shell `whenReady` against a timeout (REL-4)
   - File: `apps/web/src/fork/bootstrap/bootShellBootstrap.ts`
   - Change: Race `waitForBootReady()` against a timeout that resolves after `APP_BOOT_FAIL_SAFE_MS`

9. Migrate ChatView.tsx line 2937 to lazy debug logging (REL-5)
   - File: `apps/web/src/components/ChatView.tsx`
   - Change: Move `JSON.stringify` inside a `logUserInputDebugLazy` factory at the hot callsite

10. Add log on subscription pruning (REL-6)
    - File: `apps/server/src/notifications/Layers/WebPushNotifications.ts`
    - Change: Add `Effect.logInfo` before `deleteByEndpoint` for permanent errors

11. Handle empty-string authToken edge case (SEC-3)
    - File: `apps/server/src/fork/http/index.ts`
    - Change: Add warning log or explicit `=== undefined` check

12. Clean up `resetPersistedForkSettings` dead code (ARCH-6)
    - File: `apps/web/src/fork/settings/persistence.ts`
    - Change: Remove function and its re-export, or add documenting comment

### Phase 3: Architecture Documentation

13. Update `docs/fork-architecture.md`:
    - Add `__root.tsx` as Capsule 5 mount seam (debug sidecar + event logging)
    - Add `Sidebar.tsx` `ForkThreadContextMenuButton` mount to Capsule 5
    - Add `ChatView.tsx` as a mount seam for Capsules 3 and 5 (fork settings + debug breadcrumbs)
    - Document `usePushNotifications.ts` ownership under Capsule 3
    - Add `UserInputDebugSidecar.tsx` and `UserInputDebugPanel.tsx` to Capsule 5 owned subtree

14. Update `FORK_CAPSULE_STATUS.md`:
    - Correct `.dark` selector count from 3 to 7
    - Note upstream-owned `data-slot` selector count (10)
    - Update remaining work items to reflect review findings

15. Document upstream-owned CSS selectors as sync risks:
    - Add a section to `docs/fork-architecture.md` or `FORK_CAPSULE_STATUS.md` listing each upstream-owned `data-slot` and `.dark` selector with its break condition

### Phase 4: Test Infrastructure

16. Add phase 4 to `forkSmokeManifest` (TEST-1)
    - File: `apps/web/src/fork/testing/forkSmokeManifest.ts`
    - Change: Add `fork-settings-legacy` entry pointing to `sync-phase-4-settings.mjs`

17. Extract shared `expect()` from 4 smoke scripts (TEST-3)
    - File: `apps/web/e2e/shared/assertions.mjs`
    - Change: Export `expect(condition, message)`, update phases 4, 6, 7, 9 to import it

18. Document Phase 0's intentional remote URL default (TEST-2)
    - File: `apps/web/src/fork/testing/forkSmokeManifest.ts` or `UPSTREAM_SYNC_MIGRATION_LOG.md`
    - Change: Add comment explaining the remote default is intentional for production baseline checks

19. Remove or adopt `runForkSmoke()` (TEST-4)
    - File: `apps/web/e2e/shared/smokeRunner.mjs`
    - Change: Either migrate smoke scripts to use it, or remove dead code

### Deferred / Future Work

- **ARCH-1**: Extract ChatView.tsx fork logic into contained hooks/helpers (significant refactor — next hardening pass)
- **ARCH-3**: Move `usePushNotifications.ts` to `fork/notifications/` (file move — next structural pass)
- **REL-7**: Handle missing meta tags in `applyBrandingToHtml` (low impact)
- **TEST phases 1, 3, 5**: Create smoke scripts for phases that only have unit-test-only commands
- **TEST-6**: Create `apps/web/e2e/playwright/fork/` Playwright specs (new test authoring)
- **Notification policy expansion**: Add `runtime.error` and `provider.turn.start.failed` activity kind handling
- **Acceptance matrix parsing**: Replace substring matching with structured markdown parsing

## Manual UAT Checklist

Perform after all fixes land. Run `bun fmt && bun lint && bun typecheck` first. Run targeted capsule tests.

### Auth Boundary

- [ ] With auth enabled: `curl -X GET http://localhost:<port>/api/web-push/config` returns 401
- [ ] With auth enabled: `curl -X GET -H "Authorization: Bearer <valid-token>" http://localhost:<port>/api/web-push/config` returns 200
- [ ] With auth disabled: `curl -X GET http://localhost:<port>/api/web-push/config` returns 200
- [ ] With auth enabled: `curl -X PUT -H "Content-Length: 100000" http://localhost:<port>/api/web-push/subscription` with >64KB body returns 413

### Settings

- [ ] Clear all localStorage, load app — verify no console errors
- [ ] Set `t3code:app-settings:v1` in localStorage to contain `{"suppressCodexAppServerNotifications": true}` (simulating legacy data), load app — verify the setting appears correctly in Fork Settings section as enabled
- [ ] Toggle "Suppress Codex native notifications" on, refresh — verify it persists (check `t3code:fork-settings:v1` in DevTools)
- [ ] Set `t3code:fork-settings:v1` to `{invalid json` in DevTools, refresh — verify app loads without crashing (setting resets to defaults)
- [ ] Click "Restore defaults" — verify confirmation dialog lists both upstream and fork changes
- [ ] Verify defaults are restored for both stores after confirming

### Service Worker

- [ ] Load the app, check DevTools > Application > Cache Storage — verify `sw.js` and `service-worker.js` are NOT in the app shell cache
- [ ] Verify cache name is `t3code-app-shell-v7` (or the bumped version)
- [ ] Force the server to return a 500 for the root path, refresh — verify the error page is NOT cached as the app shell

### Notifications

- [ ] Enable push notifications (if VAPID configured) — verify subscription succeeds
- [ ] Verify server logs show no errors from notification event processing

### Debug Panel

- [ ] With debug panel disabled: verify no unnecessary `JSON.stringify` calls visible in DevTools Performance tab during user input state changes
- [ ] Toggle debug panel on/off — verify panel renders and hides correctly

### Bootstrap

- [ ] Load the app — verify no unhandled promise rejection warnings in console
- [ ] Verify boot shell displays and dismisses cleanly
- [ ] Simulate stalled boot (block network before React hydrates) — verify boot shell dismisses via failsafe timeout

### Smoke Tests

- [ ] Run `bun run --cwd apps/web sync:phase9:smoke` — verify it passes with corrected localStorage key
- [ ] Run `bun run --cwd apps/web sync:acceptance:check` — verify all capsules registered
- [ ] Run `bun fmt && bun lint && bun typecheck` — verify all pass
- [ ] Run targeted capsule tests:
  - `bun run --cwd apps/server test --run src/wsServer.test.ts src/notifications/http.test.ts src/notifications/policy.test.ts src/fork/notifications/intentResolver.test.ts`
  - `bun run --cwd apps/web test --run src/appSettings.test.ts src/fork/settings/useForkSettings.test.ts src/pwa.test.ts src/runtimeBranding.test.ts src/fork/bootstrap/installForkWebShell.test.ts`
