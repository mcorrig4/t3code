# Fork Capsule Deep Review — Fixes Landed

Date: 2026-03-26

## Background

After the fork capsule refactor was declared "functionally done," a 3-wave, 10-agent deep code review (`FORK_CAPSULE_DEEP_REVIEW.md`) audited every capsule implementation file, integration point, test, and documentation artifact. The review identified 19 actionable findings across security, bugs, reliability, architecture documentation, and test infrastructure.

This document summarizes every fix that was implemented, why each change was necessary, and what was intentionally deferred.

## How The Fixes Were Implemented

All fixes were executed in 3 sequential batches using parallel agents within each batch, followed by a 2-wave code review (3 agents then 1 agent).

| Batch         | Agents     | Scope                                                  |
| ------------- | ---------- | ------------------------------------------------------ |
| Batch 1       | 3 parallel | Server fixes, web source fixes, service worker fix     |
| Batch 2       | 2 parallel | Architecture docs, test infrastructure                 |
| Batch 3       | 1          | Verification (fmt, lint, typecheck, tests, acceptance) |
| Review Wave 1 | 3 parallel | Server review, web review, docs+tests review           |
| Review Wave 2 | 1          | Final cross-check of all findings                      |

All verification passed: 0 lint errors, 7/7 packages typecheck clean, 55/55 server tests pass, 46/46 web tests pass, 6 capsule acceptance entries verified.

---

## Security Fixes

### SEC-1: Timing-safe token comparison

**File:** `apps/server/src/fork/http/index.ts`

**Problem:** `validateForkHttpAuth` compared the bearer token to the server's auth token using JavaScript `===`. String equality in JavaScript short-circuits on the first differing byte, leaking information about the token through response timing. An attacker with network access could theoretically reconstruct the auth token one byte at a time.

**Fix:** Replaced `===` with `crypto.timingSafeEqual`. Both the provided token and the configured token are converted to `Buffer` instances, a byte-length pre-check prevents the `RangeError` that `timingSafeEqual` throws on length mismatch, and the comparison runs in constant time regardless of where the tokens differ.

```typescript
const a = Buffer.from(providedToken, "utf8");
const b = Buffer.from(context.serverConfig.authToken, "utf8");
if (a.byteLength === b.byteLength && crypto.timingSafeEqual(a, b)) {
  return; // Auth passes
}
```

### SEC-2: Request body size limit

**File:** `apps/server/src/notifications/http.ts`

**Problem:** `readJsonRequestBody` accumulated all incoming chunks into memory with no upper bound. An authenticated caller could send an arbitrarily large request body to exhaust server memory.

**Fix:** Added a `MAX_BODY_SIZE = 65_536` (64 KB) limit. The function now tracks total accumulated bytes and throws a descriptive error with `statusCode: 413` if the limit is exceeded. The callers in `webPushRoutes.ts` already catch errors from this function and map them to HTTP error responses, so the 413 propagates correctly to the client.

### SEC-3: Empty-string authToken bypass

**File:** `apps/server/src/fork/http/index.ts`

**Problem:** The auth check used `if (!context.serverConfig.authToken)` which treats an empty string `""` as falsy, silently skipping authentication. If an operator misconfigured the server with `authToken: ""`, all web-push endpoints would be open without any indication.

**Fix:** Changed to `=== undefined` for the "auth not configured" check. Added an explicit `=== ""` check that logs a warning via `Effect.logWarning` explaining the misconfiguration and returns a 500 error. This makes misconfiguration visible and prevents silent auth bypass.

---

## Bug Fixes

### BUG-1: Phase 9 smoke test reads wrong localStorage key

**File:** `apps/web/e2e/sync-phase-9-settings-sidecar.mjs`

**Problem:** The smoke script defined `APP_SETTINGS_STORAGE_KEY = "t3code:app-settings:v1"` and checked `suppressCodexAppServerNotifications` from that key. But the runtime now writes fork-only settings to `t3code:fork-settings:v1` via `useForkSettings()`. The test was reading from the wrong store and would always find `undefined`.

**Fix:** Changed the constant to `FORK_SETTINGS_STORAGE_KEY = "t3code:fork-settings:v1"` and updated all references.

**Bonus:** The same bug existed in `sync-phase-4-settings.mjs` — it checked `suppressCodexAppServerNotifications` from the app settings key. Fixed by splitting the storage reads: `codexBinaryPath` (upstream-equivalent setting) reads from `t3code:app-settings:v1`, while `suppressCodexAppServerNotifications` (fork-only setting) reads from `t3code:fork-settings:v1`.

### BUG-2: `migrateLegacyForkSettings()` throws on corrupt store

**File:** `apps/web/src/fork/settings/persistence.ts`

**Problem:** `getLocalStorageItem` calls `Schema.decodeSync` internally, which throws if the stored JSON doesn't match the `ForkSettingsSchema`. If a user's `t3code:fork-settings:v1` localStorage entry got corrupted (manual edit, extension interference, storage quota issues), the migration function would throw an unhandled exception during the React `useEffect` that calls it.

**Fix:** Wrapped the `getLocalStorageItem` call in a try-catch. On failure, the corrupt key is removed via `removeLocalStorageItem` and execution falls through to the legacy migration path, which either recovers settings from the old key or returns defaults.

### BUG-3: `readForkSettingsSnapshot()` throws on corrupt store

**File:** `apps/web/src/fork/settings/persistence.ts`

**Problem:** Same class of bug as BUG-2. `readForkSettingsSnapshot()` calls `getLocalStorageItem` without a try-catch, so a corrupt `t3code:fork-settings:v1` entry would crash any code path that reads the fork settings snapshot (used by the reset plan builder, among others).

**Fix:** Same pattern — try-catch, remove corrupt key, fall through to `migrateLegacyForkSettings() ?? DEFAULT_FORK_SETTINGS`.

---

## Reliability Fixes

### REL-1: Unhandled `bootReady` promise rejection

**File:** `apps/web/src/main.tsx`

**Problem:** The last line was `void forkWebShell.bootReady` — a fire-and-forget promise with no `.catch()`. If any of the four bootstrap plugins (branding, boot shell, PWA, debug) rejected, it would become an unhandled promise rejection, which in some browsers triggers a console error and in strict environments can crash the page.

**Fix:** Added `.catch((err) => console.error("[fork-bootstrap] boot ready failed:", err))` so bootstrap failures are logged but don't crash the app.

### REL-2: `Effect.succeed` wraps potentially-throwing call

**File:** `apps/server/src/fork/notifications/intentResolver.ts`

**Problem:** `resolveNotificationIntent` used `Effect.succeed(notificationIntentFromEvent(...))` which evaluates the argument eagerly. If `notificationIntentFromEvent` threw, the exception would escape into the synchronous call stack rather than being captured as an Effect defect. The outer `Effect.catchCause` in the notification pipeline would still catch it as a fiber defect, so this wasn't a crash risk, but it was a code smell that undermined the Effect-TS error model.

**Fix:** Changed to `Effect.sync(() => notificationIntentFromEvent({ event, snapshot }))` which defers evaluation into the Effect runtime. `Effect.sync` was chosen over `Effect.try` because the interface declares no error channel — `Effect.sync` captures throws as defects (correct for an unexpected failure), while `Effect.try` would add an error type that doesn't match the declared return type.

### REL-3: Service worker caches its own script files

**File:** `apps/web/public/service-worker.js`

**Problem:** `APP_SHELL_ASSETS` included `/sw.js` and `/service-worker.js`. Caching service worker scripts at the application layer is an anti-pattern — browsers manage SW script caching through their own update mechanism (byte-diff check on `navigator.serviceWorker.register()`). Application-layer caching can interfere with the browser's update detection, causing stale SW scripts to persist.

**Fix:** Removed both entries from `APP_SHELL_ASSETS` and bumped `APP_SHELL_CACHE` from `v6` to `v7`. The version bump ensures that existing clients' `activate` handler deletes the old cache (which contained the SW files) and replaces it with the new, correct asset list.

### REL-4: Boot shell `whenReady` promise hangs forever

**File:** `apps/web/src/fork/bootstrap/bootShellBootstrap.ts`

**Problem:** The boot shell plugin returned a `whenReady` promise that depended on `waitForBootReady()` resolving. If `markBootReady()` was never called (app crash during hydration, network failure, JS error), `whenReady` would hang forever. The DOM-level failsafe (`scheduleBootShellFailSafe`) would still dismiss the visual boot shell after 6 seconds, but the promise itself would never resolve, leaving the `bootReady` chain in `main.tsx` permanently pending.

**Fix:** Raced `waitForBootReady()` against `delay(APP_BOOT_FAIL_SAFE_MS)` using `Promise.race`. Now the `whenReady` promise resolves within 6 seconds regardless of whether the app successfully boots. The DOM failsafe and the promise-level timeout use the same constant for consistency. Double-dismissal is safe because `dismissBootShell()` has internal guards.

### REL-5: Eager `JSON.stringify` in debug logging

**File:** `apps/web/src/components/ChatView.tsx`

**Problem:** A `useEffect` at line 2922 ran `JSON.stringify` on every pending-user-input state change to build a debug log entry, then passed it to `logUserInputDebug()` (eager form). `logUserInputDebug` checks `store.enabled` and returns early when disabled — but the `JSON.stringify` already ran. This is wasted work on every state change for every user, since debug mode is rarely enabled.

**Fix:** Migrated to `logUserInputDebugLazy(() => { ... })` with the `JSON.stringify` and the dedup check inside the factory function. The factory is only called when `store.enabled` is true, so the serialization work is completely skipped when debug is off.

### REL-6: Silent subscription pruning

**File:** `apps/server/src/notifications/Layers/WebPushNotifications.ts`

**Problem:** When a push notification delivery returned a permanent error (404 or 410), the subscription was silently deleted from the store. Operators had no visibility into subscription lifecycle — they couldn't tell whether subscriptions were being pruned, how often, or for what reasons.

**Fix:** Added `Effect.logInfo` before the `deleteByEndpoint` call in the permanent-error branch. The log message includes the HTTP status code so operators can see whether pruning is happening due to 404 (gone) or 410 (explicitly unsubscribed) errors.

---

## Architecture Documentation Fixes

### ARCH-2: `__root.tsx` documented as Capsule 5 mount seam

**File:** `docs/fork-architecture.md`

**Problem:** The debug sidecar mount and event logging in `__root.tsx` (~29 fork-specific lines) were not listed in the architecture doc. During an upstream sync, a developer consulting the doc wouldn't know that `__root.tsx` needs rebinding.

**Fix:** Added `__root.tsx` to Capsule 5's mount seam list with the annotation "(debug sidecar mount + event logging)".

### ARCH-3: `usePushNotifications.ts` ownership documented

**File:** `docs/fork-architecture.md`

**Problem:** `usePushNotifications.ts` (219 lines) is 100% fork-owned but lives at `apps/web/src/notifications/` rather than under `fork/`. During syncs, it could be mistaken for upstream code.

**Fix:** Added it to Capsule 3's owned subtree with the note "(100% fork-owned, lives outside fork/ for now)".

### ARCH-4: Upstream-owned CSS selector dependencies documented

**File:** `docs/fork-architecture.md`

**Problem:** `overrides.css` targets 10 upstream-owned `data-slot` values and uses 7 `.dark` class-chain selectors. These are the most fragile sync points — if upstream renames a slot or changes its dark mode implementation, these selectors silently break. The previous status doc incorrectly counted only 3 class-chain selectors.

**Fix:** Added a new "Known upstream-owned CSS dependencies" section listing all 10 `data-slot` targets by name and noting the 7 `.dark` selectors. Updated `FORK_CAPSULE_STATUS.md` with the corrected counts.

### ARCH-5: `ForkThreadContextMenuButton` mount in Sidebar.tsx documented

**File:** `docs/fork-architecture.md`

**Problem:** The `Sidebar.tsx` fork component mount was not listed in any capsule's seam list.

**Fix:** Added `Sidebar.tsx` to Capsule 5's mount seam list with the annotation "(ForkThreadContextMenuButton mount)". Also added `ChatView.tsx` to both Capsules 3 and 5, and added `UserInputDebugSidecar.tsx` and `UserInputDebugPanel.tsx` to Capsule 5's owned subtree.

### ARCH-6: Dead code removal

**File:** `apps/web/src/fork/settings/persistence.ts`

**Problem:** `resetPersistedForkSettings()` was exported from `persistence.ts` but never re-exported from `index.ts` and had zero callers. It was semantically different from `resetForkSettings` (removes the localStorage key entirely vs writing defaults), creating potential confusion.

**Fix:** Removed the function entirely.

---

## Test Infrastructure Fixes

### TEST-1: Missing phase 4 in smoke manifest

**File:** `apps/web/src/fork/testing/forkSmokeManifest.ts`

**Problem:** `sync-phase-4-settings.mjs` existed as a working smoke script with a `package.json` command, but had no entry in `forkSmokeManifest`. The acceptance check verified capsule coverage via the manifest, so this gap meant the settings smoke test wasn't tracked.

**Fix:** Added a `fork-settings-legacy` entry pointing to `sync-phase-4-settings.mjs` under the "Fork settings" acceptance capsule. The manifest now has 6 entries (up from 5).

### TEST-2: Phase 0 remote URL default documented

**File:** `apps/web/src/fork/testing/forkSmokeManifest.ts`

**Problem:** Phase 0 defaults to `https://t3-dev.claude.do` while all other phases default to `http://127.0.0.1:5734`. This is intentional (phase 0 tests the deployed production site), but running `sync:smoke:all` without setting environment variables creates a split-brain test run that's confusing.

**Fix:** Added a comment on the phase 0 entry: "Intentionally defaults to remote URL (t3-dev.claude.do) for production baseline checks."

### TEST-3: Shared `expect()` extracted

**Files:** `apps/web/e2e/shared/assertions.mjs` + 4 smoke scripts

**Problem:** Four smoke scripts (`sync-phase-{4,6,7,9}-*.mjs`) each defined their own identical inline `expect(condition, message)` function. This is duplicate code that would need to be updated in 4 places if the assertion behavior ever changed.

**Fix:** Added `expect()` to `shared/assertions.mjs` (which already exported `expectNoBlockedHost` and `expectJsonResponse`). Updated all 4 smoke scripts to import from the shared module and removed their inline definitions.

### TEST-4: Dead `runForkSmoke()` removed

**File:** `apps/web/e2e/shared/smokeRunner.mjs`

**Problem:** `runForkSmoke()` was exported but never imported by any smoke script. It was aspirational infrastructure from the capsule plan that was never adopted.

**Fix:** Removed the function. `runSmoke()` (which IS used) was kept.

---

## Deferred Items

These findings were identified by the review but intentionally deferred because they require larger refactors or have low impact:

| Finding                                                       | Why Deferred                                                                      |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| **ARCH-1**: ChatView.tsx ~40 scattered fork lines             | Significant refactor to extract into hooks/helpers. Track as next hardening pass. |
| **ARCH-3 move**: Move `usePushNotifications.ts` into `fork/`  | File move with import updates. Ownership is now documented; move is cosmetic.     |
| **REL-7**: `applyBrandingToHtml` silent no-op on missing tags | Low impact — all required tags exist in `index.html`. Future hardening.           |
| **TEST phases 1, 3, 5**: Create missing smoke scripts         | These phases have `package.json` commands but no actual scripts to run.           |
| **TEST-6**: Playwright specs for fork flows                   | New test authoring, not a fix for existing code.                                  |

---

## Files Changed

| File                                                           | Changes                                                       |
| -------------------------------------------------------------- | ------------------------------------------------------------- |
| `apps/server/src/fork/http/index.ts`                           | `crypto.timingSafeEqual`, empty-string authToken handling     |
| `apps/server/src/notifications/http.ts`                        | 64KB body size limit                                          |
| `apps/server/src/fork/notifications/intentResolver.ts`         | `Effect.sync` instead of `Effect.succeed`                     |
| `apps/server/src/notifications/Layers/WebPushNotifications.ts` | Subscription prune logging                                    |
| `apps/web/src/fork/settings/persistence.ts`                    | Try-catch on both read functions, dead code removal           |
| `apps/web/src/main.tsx`                                        | `.catch()` on `bootReady`                                     |
| `apps/web/src/fork/bootstrap/bootShellBootstrap.ts`            | Race `waitForBootReady` against failsafe timeout              |
| `apps/web/src/components/ChatView.tsx`                         | Lazy debug logging                                            |
| `apps/web/public/service-worker.js`                            | Remove SW from cache assets, bump to v7                       |
| `apps/web/e2e/sync-phase-4-settings.mjs`                       | Import shared `expect()`, read fork settings from correct key |
| `apps/web/e2e/sync-phase-6-debug-sidecar.mjs`                  | Import shared `expect()`                                      |
| `apps/web/e2e/sync-phase-7-web-push.mjs`                       | Import shared `expect()`                                      |
| `apps/web/e2e/sync-phase-9-settings-sidecar.mjs`               | Import shared `expect()`, fix storage key                     |
| `apps/web/e2e/shared/assertions.mjs`                           | Add shared `expect()`                                         |
| `apps/web/e2e/shared/smokeRunner.mjs`                          | Remove dead `runForkSmoke()`                                  |
| `apps/web/src/fork/testing/forkSmokeManifest.ts`               | Add phase 4 entry, document phase 0 intent                    |
| `docs/fork-architecture.md`                                    | Document missing mount seams, owned files, CSS dependencies   |
| `FORK_CAPSULE_STATUS.md`                                       | Correct CSS selector counts                                   |

---

## Follow-Up Fixes (from `FORK_CAPSULE_DEEP_REVIEW_FOLLOWUP.md`)

A post-fix review identified 4 additional issues. All 4 have been resolved.

### FOLLOWUP-1: WebSocket auth parity

**File:** `apps/server/src/wsServer.ts`

**Problem:** The WebSocket upgrade path at line 994 still used `if (authToken)` (falsy check, empty-string bypass) and `providedToken !== authToken` (timing-variable comparison). This is the primary auth path — every browser client authenticates through WebSocket, not HTTP. The fork HTTP path was hardened in SEC-1/SEC-3, but the main WebSocket auth was left with the original insecure patterns.

**Fix:** Applied the same hardening model:

- Changed `if (authToken)` to `if (authToken !== undefined)` so empty strings are not treated as "unconfigured"
- Added explicit empty-string check that logs a warning via `console.warn` and rejects with 500
- Added early `!providedToken` check before buffer operations
- Replaced `providedToken !== authToken` with `crypto.timingSafeEqual` using the same Buffer pattern from `fork/http/index.ts`
- Updated `rejectUpgrade` to map status codes to proper HTTP reason phrases (400, 401, 500)

### FOLLOWUP-2: Preserve 413 status for oversized web-push bodies

**File:** `apps/server/src/fork/http/webPushRoutes.ts`

**Problem:** `readJsonBody` caught errors from `readJsonRequestBody` and created a `ForkHttpRequestError` with hardcoded `statusCode: 400`. When `readJsonRequestBody` threw its new 413 error (from SEC-2), the route wrapper swallowed the 413 and returned 400 to the client. The fixes doc overstated this as already working.

**Fix:** Added a `resolveRequestErrorStatus` helper that extracts `statusCode` from the thrown error when available (and validates it's a number in the 400-599 range), falling back to 400. Now a 413 from the body size limit propagates correctly to the HTTP response.

### FOLLOWUP-3: Phase 4 smoke state isolation

**File:** `apps/web/e2e/sync-phase-4-settings.mjs`

**Problem:** The smoke script cleared `t3code:app-settings:v1` at startup but not `t3code:fork-settings:v1`. When the script later toggled `suppressCodexAppServerNotifications` and checked the fork settings store, a pre-existing value could cause the assertion to pass or fail depending on prior test runs — a flaky test.

**Fix:** Changed the setup to clear both `APP_SETTINGS_STORAGE_KEY` and `FORK_SETTINGS_STORAGE_KEY` in a single `page.evaluate` call before the test begins.

### FOLLOWUP-4: Drain request bodies on early web-push exits

**File:** `apps/server/src/fork/http/webPushRoutes.ts`

**Problem:** When web-push route handlers returned early (401 Unauthorized, 405 Method Not Allowed, 415 Unsupported Media Type, 403 Forbidden), they responded to the client without consuming the request body. On HTTP/1.1 keep-alive connections, the unread body data could stall the connection or cause the next request on that connection to be misframed.

**Fix:** Added a `drainRequestBody` helper that calls `req.resume()` on incomplete request streams, draining unread data. Applied it in all 4 early-exit paths: `respondMethodNotAllowed`, `ensureJsonRequest`, `ensureAllowedOrigin`, and `ensureAuthorized`.

### Follow-Up Files Changed

| File                                         | Changes                                                                            |
| -------------------------------------------- | ---------------------------------------------------------------------------------- |
| `apps/server/src/wsServer.ts`                | `crypto.timingSafeEqual` for WS auth, empty-string handling, status reason phrases |
| `apps/server/src/fork/http/webPushRoutes.ts` | 413 propagation, request body draining on early exits                              |
| `apps/web/e2e/sync-phase-4-settings.mjs`     | Clear both storage keys at test setup                                              |

---

## Verification State

All passing on the current tree:

- `bun fmt` — 592 files, no changes
- `bun lint` — 0 errors, 2 pre-existing warnings
- `bun typecheck` — 7/7 packages clean
- Server tests — 55/55
- Web tests — 46/46
- Acceptance check — 6 capsule entries verified
