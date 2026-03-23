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

## Mobile Composer Focus-Zoom Guard

- Status: active
- First added: 2026-03-23
- Last updated: 2026-03-23
- Owners: T3 Code fork
- Upstream impact: low
- Areas: mobile chat composer, iPhone Safari focus behavior, accessibility-sensitive zoom expectations
- Why this exists: focusing the chat composer on iPhone Safari could trigger browser zoom and leave part of the composer cropped once the keyboard opened, while we still wanted manual page zoom to remain available outside the focused input.
- Files:
  - `ENHANCEMENTS.md`
  - `apps/web/src/components/ComposerPromptEditor.tsx`
- Runtime touchpoints:
  - `t3.claude.do`
  - mobile Safari on iPhone
  - the chat composer contenteditable field and placeholder
- If this breaks, look for:
  - tapping into the composer on iPhone Safari zooms the page
  - the composer or its footer becomes partially cropped after the keyboard opens
  - manual zoom gets disabled globally instead of only avoiding focus zoom in the input
- Verify with:
  - `/home/claude/.bun/bin/bun fmt`
  - `/home/claude/.bun/bin/bun lint`
  - `env PATH="/home/claude/.bun/bin:$PATH" /home/claude/.bun/bin/bun typecheck`
  - on iPhone Safari, tap into the composer and confirm the keyboard opens without browser zoom
  - confirm the composer remains fully visible while focused and that manual page zoom still works elsewhere
- Rollback notes:
  - revert the mobile `text-base sm:text-[14px]` sizing in `apps/web/src/components/ComposerPromptEditor.tsx`
  - if upstream lands a different iPhone-safe composer sizing strategy, replace this local override with that approach
- Notes:
  - 2026-03-23: Raised the composer editor and placeholder to `16px` on mobile while keeping the existing `14px` sizing from `sm` and up to prevent iPhone Safari focus zoom without disabling general page zoom.

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

## Web Push Notifications Sidecar

- Status: active
- First added: 2026-03-20
- Last updated: 2026-03-23
- Owners: T3 Code fork
- Upstream impact: medium
- Areas: server-side notification fanout, PWA service worker behavior, settings UX, thread deep links
- Why this exists: the fork needs browser push notifications for assistant completions, approval requests, and user input requests, with clicks deep-linking back into the relevant thread without adding a second backend or tightly coupling the feature to upstream contracts.
- Files:
  - `ENHANCEMENTS.md`
  - `apps/server/package.json`
  - `apps/server/src/main.ts`
  - `apps/server/src/serverLayers.ts`
  - `apps/server/src/wsServer.ts`
  - `apps/server/src/wsServer.test.ts`
  - `apps/server/src/persistence/Migrations.ts`
  - `apps/server/src/persistence/Migrations/014_WebPushSubscriptions.ts`
  - `apps/server/src/notifications/http.ts`
  - `apps/server/src/notifications/http.test.ts`
  - `apps/server/src/notifications/types.ts`
  - `apps/server/src/notifications/policy.ts`
  - `apps/server/src/notifications/policy.test.ts`
  - `apps/server/src/notifications/Layers/WebPushNotifications.ts`
  - `apps/server/src/notifications/Layers/WebPushSubscriptionRepository.ts`
  - `apps/server/src/notifications/Services/WebPushNotifications.ts`
  - `apps/server/src/notifications/Services/WebPushSubscriptionRepository.ts`
  - `apps/web/index.html`
  - `apps/web/public/manifest.webmanifest`
  - `apps/web/public/service-worker.js`
  - `apps/web/public/sw.js`
  - `apps/web/src/appSettings.ts`
  - `apps/web/src/appSettings.test.ts`
  - `apps/web/src/pwa.ts`
  - `apps/web/src/pwa.test.ts`
  - `apps/web/src/routes/__root.tsx`
  - `apps/web/src/routes/_chat.settings.tsx`
  - `apps/web/src/notifications/client.ts`
  - `apps/web/src/notifications/pushSupport.ts`
  - `apps/web/src/notifications/registerServiceWorker.ts`
  - `apps/web/src/notifications/types.ts`
  - `apps/web/src/notifications/usePushNotifications.ts`
  - `apps/web/vite.config.ts`
- Runtime touchpoints:
  - `GET /api/web-push/config`
  - `PUT /api/web-push/subscription`
  - `DELETE /api/web-push/subscription`
  - `/service-worker.js`
  - `/manifest.webmanifest`
  - chat settings notification controls
  - thread routes like `/$threadId`
- If this breaks, look for:
  - Settings cannot enable notifications even when VAPID config is present
  - push notifications stop arriving for assistant completions, approvals, or user-input requests
  - clicking a notification no longer focuses or opens the correct thread
  - a malformed stored subscription blocks delivery to every other valid subscription
  - wrong HTTP methods or disabled-server writes stop returning the expected `405` and `409` responses
- Verify with:
  - `/home/claude/.bun/bin/bun fmt`
  - `/home/claude/.bun/bin/bun lint`
  - `env PATH="/home/claude/.bun/bin:$PATH" /home/claude/.bun/bin/bun typecheck`
  - `/home/claude/.bun/bin/bun run test src/notifications/policy.test.ts src/notifications/http.test.ts src/wsServer.test.ts`
  - in a browser with granted notification permission, enable notifications in Settings and confirm the toggle survives reload
  - trigger an assistant completion or approval request while the app is backgrounded and confirm the notification opens the correct `/$threadId` route
- Rollback notes:
  - remove the server notification sidecar wiring from `apps/server/src/serverLayers.ts` and `apps/server/src/wsServer.ts`
  - remove the web notification bootstrap and settings wiring from `apps/web/src/routes/__root.tsx`, `apps/web/src/routes/_chat.settings.tsx`, and `apps/web/src/appSettings.ts`
  - remove the public service worker and manifest push hooks if reverting to a non-push PWA footprint
  - if production only needs a temporary shutdown, unset the `T3CODE_WEB_PUSH_*` env vars and restart so `/api/web-push/config` reports `enabled: false`
- Notes:
  - 2026-03-20: Added a self-contained web push sidecar using `web-push`, a subscription persistence table, a root-scope service worker, and settings-driven browser subscription flow.
  - 2026-03-23: Hardened route and fanout behavior so malformed stored subscriptions are deleted instead of aborting delivery, `/api/web-push/config` rejects wrong methods with `405`, and disabled subscription writes return deterministic `409` responses.

## Production Web Push Runtime Configuration

- Status: active
- First added: 2026-03-20
- Last updated: 2026-03-23
- Owners: T3 Code fork
- Upstream impact: none
- Areas: production runtime configuration, web push delivery, VPS deployment state
- Why this exists: production needs explicit VAPID configuration before browser push subscriptions can be enabled for assistant completions, approvals, and user input requests.
- Files:
  - `ENHANCEMENTS.md`
  - `/etc/default/t3code-prod.env`
  - `/home/claude/do-box/system/etc/default/t3code-prod.env`
  - `/home/claude/VPS_CHANGELOG.md`
- Runtime touchpoints:
  - `t3.claude.do`
  - `t3code-prod.service`
  - `GET /api/web-push/config`
- If this breaks, look for:
  - Settings shows "Push notifications are not configured on this server." in production
  - `GET /api/web-push/config` returns `{"enabled":false}` after a production restart/deploy
  - production push subscriptions fail even though development push works
- Verify with:
  - inspect `/etc/default/t3code-prod.env` for `T3CODE_WEB_PUSH_VAPID_PUBLIC_KEY`, `T3CODE_WEB_PUSH_VAPID_PRIVATE_KEY`, and `T3CODE_WEB_PUSH_SUBJECT`
  - after the next explicit prod restart/deploy, confirm `curl http://127.0.0.1:3773/api/web-push/config` reports `enabled: true`
  - open production settings and confirm notifications can be enabled on a browser/device
- Rollback notes:
  - remove the three `T3CODE_WEB_PUSH_*` vars from `/etc/default/t3code-prod.env`
  - restart or redeploy production so the running process drops the VAPID config
- Notes:
  - 2026-03-20: Generated a fresh production VAPID keypair and staged it in `/etc/default/t3code-prod.env`, but intentionally did not restart `t3code-prod.service`, so the live production server continues to report web push disabled until the next explicit restart/deploy.
  - 2026-03-23: Recorded the production runtime customization here so future upstream syncs and deploys keep the VAPID env requirement visible.

## Mobile Sidebar Max-Width Override

- Status: active
- First added: 2026-03-20
- Last updated: 2026-03-23
- Owners: T3 Code fork
- Upstream impact: low
- Areas: mobile sidebar layout, shadcn sheet override behavior, small-screen navigation
- Why this exists: the mobile sidebar should leave visible click-outside space instead of expanding edge-to-edge, even when the sidebar sheet sets `max-w-none`.
- Files:
  - `apps/web/src/components/ui/sidebar.tsx`
  - `apps/web/src/overrides.css`
  - `ENHANCEMENTS.md`
- Runtime touchpoints:
  - mobile sidebar sheet in the web app
  - touch devices and narrow browser widths
- If this breaks, look for:
  - the mobile sidebar covers the full viewport width with no dismissible gutter
  - tapping outside the sidebar becomes harder or impossible on narrow screens
  - upstream sidebar refactors remove the `data-mobile="true"` and `data-slot="sidebar"` hook points
- Verify with:
  - `/home/claude/.bun/bin/bun fmt`
  - `/home/claude/.bun/bin/bun lint`
  - `env PATH="/home/claude/.bun/bin:$PATH" /home/claude/.bun/bin/bun typecheck`
  - open the web app in a mobile viewport and confirm the sidebar caps at `95vw` with visible click-outside space
- Rollback notes:
  - revert the mobile `max-width: 95vw` override in `apps/web/src/overrides.css`
  - if needed, restore the previous `SheetPopup` sizing behavior in `apps/web/src/components/ui/sidebar.tsx`
- Notes:
  - 2026-03-20: PR #13 merged `fix: leave click-outside space for mobile sidebar`.
  - 2026-03-23: Follow-up commit `Preserve mobile sidebar max width override` kept the fork override in place after upstream/sidebar changes.

## Project Thread Spacing Polish

- Status: active
- First added: 2026-03-23
- Last updated: 2026-03-23
- Owners: T3 Code fork
- Upstream impact: low
- Areas: sidebar project tree, expanded folder thread rhythm, mobile and desktop visual density
- Why this exists: the first visible chat under an expanded project folder felt cramped against the folder row, so the thread stack needed a little extra breathing room without changing overall sidebar spacing.
- Files:
  - `ENHANCEMENTS.md`
  - `apps/web/src/overrides.css`
- Runtime touchpoints:
  - the expanded project thread list in the web sidebar
  - desktop and mobile sidebar layouts
- If this breaks, look for:
  - the first chat under an expanded folder sits noticeably tighter than the spacing between the rest of the chats
  - sidebar spacing looks inconsistent only at the folder-to-first-thread boundary
  - upstream sidebar markup changes remove the `[data-project-threads]` or `[data-thread-item]` hooks
- Verify with:
  - `/home/claude/.bun/bin/bun fmt`
  - `/home/claude/.bun/bin/bun lint`
  - `env PATH="/home/claude/.bun/bin:$PATH" /home/claude/.bun/bin/bun typecheck`
  - expand a project with multiple chats and confirm the first child thread has slightly more top space while the rest of the thread spacing stays unchanged
- Rollback notes:
  - remove the first-child margin override under `[data-project-threads]` in `apps/web/src/overrides.css`
  - if upstream changes the project-tree DOM, replace the selector with the new stable hook instead of broadening sidebar spacing globally
- Notes:
  - 2026-03-23: Added a targeted first-child spacing rule so only the first visible thread under an expanded project gets extra top margin.

## Goalserve-Style Boot Shell Splash

- Status: active
- First added: 2026-03-20
- Last updated: 2026-03-23
- Owners: T3 Code fork
- Upstream impact: medium
- Areas: web app first paint, PWA startup UX, iOS Home Screen launch behavior
- Why this exists: the app should paint a branded fullscreen loader immediately on cold launch, avoid a white flash before React mounts, and keep the shell visible until the first usable app snapshot is ready.
- Files:
  - `ENHANCEMENTS.md`
  - `apps/web/index.html`
  - `apps/web/vite.config.ts`
  - `apps/web/src/main.tsx`
  - `apps/web/src/bootConstants.ts`
  - `apps/web/src/bootShell.ts`
  - `apps/web/src/bootState.ts`
  - `apps/web/src/routes/__root.tsx`
  - `apps/web/src/components/loading/T3Loader.tsx`
  - `apps/web/src/components/loading/T3LoaderMarkup.tsx`
  - `apps/web/src/components/loading/T3LoaderStatic.tsx`
  - `apps/web/src/components/loading/renderT3LoaderMarkup.tsx`
- Runtime touchpoints:
  - `t3.claude.do`
  - `app-dev.claude.do`
  - iOS Safari and iOS Home Screen installs
  - first document paint before React hydration
- If this breaks, look for:
  - a white or blank frame before the T3 loader appears
  - the boot shell disappearing before threads hydrate or the fallback connecting shell renders
  - the boot shell getting stuck forever because readiness or fail-safe removal stopped firing
  - startup behavior drifting between the inline HTML shell and the React loader component
- Verify with:
  - `/home/claude/.bun/bin/bun fmt`
  - `/home/claude/.bun/bin/bun lint`
  - `env PATH="/home/claude/.bun/bin:$PATH" /home/claude/.bun/bin/bun typecheck`
  - cold-load the web app and confirm the T3 shell appears immediately with no white flash
  - confirm the shell exits only after both the minimum delay and `threadsHydrated` or fallback readiness
- Rollback notes:
  - revert the files listed above
  - restore the previous generated boot-shell flow if needed, but do not reintroduce iOS startup-image generation unless there is a separate reason
  - if only the dismissal timing is bad, start by adjusting `APP_BOOT_MIN_DURATION_MS` or `APP_BOOT_FAIL_SAFE_MS`
- Notes:
  - 2026-03-20: Replaced the generated startup-asset pipeline with a Vite `transformIndexHtml` boot shell and explicit readiness gating.
  - 2026-03-23: Recorded the fork-specific startup behavior here so upstream syncs do not accidentally reintroduce first-paint white flashes or premature shell dismissal.

## Native Assistant Message TTS

- Status: active
- First added: 2026-03-16
- Last updated: 2026-03-23
- Owners: T3 Code fork
- Upstream impact: low
- Areas: assistant message UI, browser speech synthesis, iPhone/iPad playback UX
- Why this exists: assistant replies should be playable with built-in browser TTS on iPhone/iPad without adding a server-side audio dependency, and the control should stay compact by living inline with message metadata.
- Files:
  - `ENHANCEMENTS.md`
  - `apps/web/src/components/chat/MessagesTimeline.tsx`
  - `apps/web/src/features/tts/AssistantMessageTtsButton.tsx`
  - `apps/web/src/features/tts/nativeSpeechSynthesis.ts`
  - `apps/web/src/features/tts/sanitizeTtsText.ts`
  - `apps/web/src/features/tts/tts.ts`
  - `apps/web/src/features/tts/tts.test.ts`
  - `apps/web/src/features/tts/useMessageTts.ts`
  - `apps/web/src/components/ChatView.browser.tsx`
- Runtime touchpoints:
  - assistant message footer row in the web chat timeline
  - installed iPhone/iPad PWA sessions
  - native `speechSynthesis` / `SpeechSynthesisUtterance`
- If this breaks, look for:
  - assistant messages stop showing the play button on the left side of the footer row with the timestamp aligned on the right
  - playback starts but the speed selector does not appear while speaking
  - changing speed no longer restarts playback at the selected rate
  - code-heavy responses sound wrong because markdown sanitization regressed
- Verify with:
  - `/home/claude/.bun/bin/bun run test src/features/tts/tts.test.ts`
  - `/home/claude/.bun/bin/bun run test:browser src/components/ChatView.browser.tsx`
  - `/home/claude/.bun/bin/bun fmt`
  - `/home/claude/.bun/bin/bun lint`
  - `env PATH="/home/claude/.bun/bin:$PATH" /home/claude/.bun/bin/bun typecheck`
  - open a completed assistant reply, confirm the play button sits on the left side of the metadata row and the timestamp stays right-aligned, then start playback and confirm the `0.8x` to `2.0x` selector appears and changes speed
- Rollback notes:
  - remove the TTS footer render from `apps/web/src/components/chat/MessagesTimeline.tsx`
  - revert the `apps/web/src/features/tts/*` module if native playback should be disabled entirely
  - if only the compact inline UX is problematic, keep the TTS module and move the control back to its own stacked row
- Notes:
  - 2026-03-16: Added the first native-browser TTS implementation for completed assistant messages with markdown sanitization and one-message-at-a-time playback.
  - 2026-03-23: Moved the TTS control into the assistant metadata row, kept the play button on the left, right-aligned the timestamp, and added an in-playback speed selector from `0.8x` to `2.0x` in `0.1` steps.

## Backfill Needed

Older fork-specific changes that predate this ledger should be added here over time as we touch them. Until then, use `git log upstream/main..main` as the catch-all diff against upstream.
