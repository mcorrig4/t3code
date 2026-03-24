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

## Codex App-Server Notification Suppression Sidecar

- Status: active
- First added: 2026-03-24
- Last updated: 2026-03-24
- Owners: T3 Code fork
- Upstream impact: low
- Areas: Codex provider launch behavior, T3 settings UI, fork-only app-server overrides
- Why this exists: users may want normal Codex CLI notify hooks everywhere else while suppressing those native notifications for Codex sessions launched inside T3, so T3 needs an app-server-only override that does not mutate `~/.codex/config.toml` or require an alternate `CODEX_HOME`.
- Files:
  - `ENHANCEMENTS.md`
  - `apps/server/src/codexAppServerManager.ts`
  - `apps/server/src/provider/codexAppServerOverrides.ts`
  - `apps/server/src/codexAppServerManager.test.ts`
  - `apps/web/src/appSettings.ts`
  - `apps/web/src/appSettings.test.ts`
  - `apps/web/src/components/ChatView.tsx`
  - `apps/web/src/routes/_chat.settings.tsx`
  - `packages/contracts/src/orchestration.ts`
  - `packages/contracts/src/provider.test.ts`
- Runtime touchpoints:
  - T3 Codex session startup via `codex app-server`
  - `/settings` Codex App Server controls
  - provider start payloads carrying Codex-specific overrides
- If this breaks, look for:
  - enabling the T3 setting still allows native Codex completion notifications to fire during T3 Codex chats
  - T3 starts using a different `CODEX_HOME` or ignores the user’s normal Codex config unexpectedly
  - normal standalone `codex` CLI runs lose their global notify behavior
- Verify with:
  - `bun fmt`
  - `bun lint`
  - `bun typecheck`
  - enable the setting in T3, start a fresh Codex chat, and confirm T3 launches `codex app-server -c notify=[]`
  - run `codex` directly outside T3 and confirm global notify behavior is unchanged
- Rollback notes:
  - remove the `configOverrides` transport field and the T3 settings toggle
  - stop adding `-c notify=[]` when launching `codex app-server`
  - if upstream adds a first-class session-scoped notification suppression option, replace this sidecar with the upstream-compatible path
- Notes:
  - 2026-03-24: Added a browser-scoped T3 setting that maps to a Codex app-server-only `-c notify=[]` override, intentionally leaving `CODEX_HOME` and `~/.codex/config.toml` unchanged.

## Standardized Enhancement Ledger Filename

- Status: active
- First added: 2026-03-20
- Last updated: 2026-03-20
- Owners: T3 Code fork
- Upstream impact: none
- Areas: repository documentation, contributor workflow, fork change tracking
- Why this exists: the enhancement ledger was previously named `enhancement.MD`, which was easy to miss because it did not match common markdown naming conventions or obvious filename searches.
- Files:
  - `ENHANCEMENTS.md`
- Runtime touchpoints:
  - contributor searches for enhancement tracking docs
  - repo-root documentation workflows
- If this breaks, look for:
  - contributors assume no enhancement ledger exists
  - tooling or humans searching for `ENHANCEMENTS.md` miss the ledger
- Verify with:
  - confirm the repo root contains `ENHANCEMENTS.md`
  - run `rg --files -g 'ENHANCEMENTS.md' .`
- Rollback notes:
  - rename `ENHANCEMENTS.md` back to `enhancement.MD`
  - update any documentation or scripts that begin depending on the standardized filename
- Notes:
  - 2026-03-20: Renamed the ledger from `enhancement.MD` to `ENHANCEMENTS.md` for discoverability and consistency.

## Required Enhancement Ledger Maintenance

- Status: active
- First added: 2026-03-20
- Last updated: 2026-03-20
- Owners: T3 Code fork
- Upstream impact: none
- Areas: contributor workflow, upstream sync hygiene, fork maintenance
- Why this exists: we need a reliable record of local fixes and enhancements so upstream merges are easier to reconcile and so obsolete fork-specific patches can be deprecated cleanly when upstream covers them.
- Files:
  - `AGENTS.md`
  - `ENHANCEMENTS.md`
- Runtime touchpoints:
  - day-to-day coding workflow
  - upstream sync and conflict resolution
  - fork cleanup after upstream fixes land
- If this breaks, look for:
  - fork-specific changes ship without corresponding ledger entries
  - upstream syncs are harder to reason about because local deviations are undocumented
  - stale fixes remain active after upstream makes them unnecessary
- Verify with:
  - confirm `AGENTS.md` instructs contributors to document fork-specific changes and deprecations in `ENHANCEMENTS.md`
  - confirm new fork-only changes update or add a matching ledger entry
- Rollback notes:
  - remove the enhancement-tracking reminder from `AGENTS.md`
  - accept higher manual effort during upstream reconciliation
- Notes:
  - 2026-03-20: Added explicit repo instructions to keep `ENHANCEMENTS.md` current as local changes are added, updated, or deprecated after upstream syncs.

## Mobile Composer Focus-Zoom Guard

- Status: active
- First added: 2026-03-23
- Last updated: 2026-03-24
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

## Standalone Mobile Rounded App Shell

- Status: active
- First added: 2026-03-24
- Last updated: 2026-03-24
- Owners: T3 Code fork
- Upstream impact: low
- Areas: mobile PWA shell styling, iPhone standalone presentation, fork-only CSS overrides
- Why this exists: iPhone standalone sessions can reveal the page background around the app edges during keyboard and browser-chrome transitions, which looked abrupt in light mode; a rounded shell treatment makes that exposure feel intentional and visually softer without hiding functional UI near the bottom edge.
- Files:
  - `ENHANCEMENTS.md`
  - `apps/web/src/components/BranchToolbar.tsx`
  - `apps/web/src/components/ChatView.tsx`
  - `apps/web/src/overrides.css`
- Runtime touchpoints:
  - `t3.claude.do`
  - iPhone Home Screen installs
  - standalone/mobile viewport rendering near the top and lower edges of the app shell
  - the chat composer stack and branch/worktree toolbar while the keyboard is open
- If this breaks, look for:
  - the standalone app returns to square or overly sharp corners on mobile
  - the `Local` / `Worktree` row or current branch becomes partially hidden when the keyboard opens
  - clipped content or overlays appear near the bottom edge in standalone mode
  - desktop or non-standalone layouts unexpectedly inherit the rounding
- Verify with:
  - `bun fmt`
  - `bun lint`
  - `bun typecheck`
  - on an iPhone-installed PWA, open the keyboard and confirm the app surface shows subtle top-corner rounding, stronger bottom-corner rounding, and a fully visible branch/worktree row
- Rollback notes:
  - remove the standalone shell overlay and chat-stack spacing overrides from `apps/web/src/overrides.css`
  - remove the standalone chat-input and branch-toolbar data hooks if the override is no longer needed
  - if upstream lands a first-class mobile shell treatment, replace this isolated override with the upstream-compatible approach
- Notes:
  - 2026-03-24: Replaced the initial standalone/mobile `#root` clipping experiment with a non-clipping shell overlay, subtle top-corner rounding, stronger bottom-corner rounding, and extra standalone bottom spacing for the composer stack so the branch/worktree toolbar remains visible during iOS keyboard transitions.
  - 2026-03-24: Temporarily rolled back the rounded-shell experiment to confirm the missing branch/worktree controls were caused by a separate issue, then restored the non-clipping visual shell overlay after confirming the control regression persisted without it.

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
  - `apps/server/src/persistence/Migrations/016_WebPushSubscriptions.ts`
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
- Last updated: 2026-03-24
- Owners: T3 Code fork
- Upstream impact: low
- Areas: mobile sidebar layout, shadcn sheet override behavior, small-screen navigation
- Why this exists: the mobile sidebar should leave visible click-outside space instead of expanding edge-to-edge, even when the sidebar sheet sets `max-w-none`, and the standalone/PWA footer actions should visually anchor to the same right edge as the rest of the mobile sheet controls.
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
  - the standalone mobile Settings action falls back to the far left of the footer instead of aligning with the sheet's right-side actions
  - upstream sidebar refactors remove the `data-mobile="true"` and `data-slot="sidebar"` hook points
- Verify with:
  - `/home/claude/.bun/bin/bun fmt`
  - `/home/claude/.bun/bin/bun lint`
  - `env PATH="/home/claude/.bun/bin:$PATH" /home/claude/.bun/bin/bun typecheck`
  - open the web app in a mobile viewport and confirm the sidebar caps at `93vw` with visible click-outside space
  - in a standalone/mobile PWA session, open the sidebar and confirm the footer Settings control sits against the right edge instead of the left
- Rollback notes:
  - revert the mobile `max-width: 93vw` override in `apps/web/src/overrides.css`
  - remove the standalone/mobile footer alignment override in `apps/web/src/overrides.css`
  - if needed, restore the previous `SheetPopup` sizing behavior in `apps/web/src/components/ui/sidebar.tsx`
- Notes:
  - 2026-03-20: PR #13 merged `fix: leave click-outside space for mobile sidebar`.
  - 2026-03-23: Follow-up commit `Preserve mobile sidebar max width override` kept the fork override in place after upstream/sidebar changes.
  - 2026-03-24: Tightened the fork mobile sidebar width cap from `95vw` to `93vw` to leave a slightly larger dismissible gutter on small screens.
  - 2026-03-24: Added a standalone/mobile-only footer override so the sidebar Settings control aligns to the right edge without changing shared sidebar component logic.

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
  - `t3-dev.claude.do`
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

## Stale Pending User-Input Recovery And Debugging

- Status: active
- First added: 2026-03-16
- Last updated: 2026-03-24
- Owners: T3 Code fork
- Upstream impact: medium
- Areas: provider session restart recovery, pending approval cleanup, pending user-input cleanup, in-app debugging
- Why this exists: provider callback state does not survive app restarts or recovered sessions, so stale approval and user-input prompts need to be cleared cleanly instead of lingering in the UI, and the fork keeps a floating debug panel plus toast breadcrumbs to diagnose these failures on mobile and dev surfaces.
- Files:
  - `ENHANCEMENTS.md`
  - `apps/server/src/orchestration/Layers/ProviderCommandReactor.ts`
  - `apps/server/src/orchestration/Layers/ProviderCommandReactor.test.ts`
  - `apps/server/src/provider/Layers/ProviderService.ts`
  - `apps/server/src/provider/Layers/ProviderService.test.ts`
  - `apps/web/src/session-logic.ts`
  - `apps/web/src/session-logic.test.ts`
  - `apps/web/src/routes/__root.tsx`
  - `apps/web/src/debug/userInputDebug.ts`
  - `apps/web/src/components/debug/UserInputDebugPanel.tsx`
  - `apps/web/src/components/chat/ComposerPendingUserInputPanel.tsx`
- Runtime touchpoints:
  - stale approval prompts after a provider session restart
  - stale user-input prompts after a provider session restart
  - `?debugUserInput=1`
  - the floating "User Input Debug" panel
  - expired-question toast messaging
- If this breaks, look for:
  - approval or user-input cards lingering after the underlying provider session has restarted
  - answering an old question failing without removing the stale prompt from the UI
  - the debug panel not appearing when `debugUserInput=1` is present
  - missing or unclear error messaging when a question belongs to an earlier provider session
- Verify with:
  - `/home/claude/.bun/bin/bun fmt`
  - `/home/claude/.bun/bin/bun lint`
  - `env PATH="/home/claude/.bun/bin:$PATH" /home/claude/.bun/bin/bun typecheck`
  - `/home/claude/.bun/bin/bun run test src/session-logic.test.ts src/provider/Layers/ProviderService.test.ts src/orchestration/Layers/ProviderCommandReactor.test.ts`
  - load the app with `?debugUserInput=1` and confirm the debug panel appears
  - reproduce a stale question/approval after a provider session restart and confirm the old prompt is cleared instead of remaining interactive
- Rollback notes:
  - revert the stale-request cleanup handling in the files above
  - remove the debug panel mount and query-param store if the debug surface should be disabled entirely
  - if only the debug UI is too invasive, keep the stale-request cleanup logic and remove the panel separately
- Notes:
  - 2026-03-16: Added the original stale pending user-input recovery flow after provider session restarts.
  - 2026-03-24: Backfilled the ledger entry after confirming current `main` already includes both the stale cleanup behavior and the floating debug panel/query-param tooling that made PR #19 obsolete.

## T3 Dev Runtime Branding

- Status: active
- First added: 2026-03-16
- Last updated: 2026-03-24
- Owners: T3 Code fork
- Upstream impact: low
- Areas: development hostname identity, dev PWA assets, host-variant styling, environment clarity
- Why this exists: the fork runs a dedicated dev host at `t3-dev.claude.do`, and it needs visibly distinct branding so development sessions are hard to confuse with production, including dedicated PWA assets and a red "DEVELOP" marker in the sidebar surface.
- Files:
  - `ENHANCEMENTS.md`
  - `apps/web/src/runtimeBranding.ts`
  - `apps/web/src/runtimeBranding.test.ts`
  - `apps/web/src/main.tsx`
  - `apps/web/public/manifest-t3-dev.webmanifest`
  - `apps/web/public/apple-touch-icon-dev.png`
  - `apps/web/public/favicon-dev-16x16.png`
  - `apps/web/public/favicon-dev-32x32.png`
  - `apps/web/public/favicon-dev.ico`
  - `apps/web/src/overrides.css`
- Runtime touchpoints:
  - `t3-dev.claude.do`
  - dev PWA installs and icons
  - `data-host-variant="t3-dev"`
  - the visible "DEVELOP" badge styling in the sidebar surface
- If this breaks, look for:
  - the dev host reusing production favicon or manifest assets
  - the dev surface no longer showing an obvious visual distinction from production
  - upstream UI refactors breaking the host-variant badge selector in `apps/web/src/overrides.css`
- Verify with:
  - `/home/claude/.bun/bin/bun fmt`
  - `/home/claude/.bun/bin/bun lint`
  - `env PATH="/home/claude/.bun/bin:$PATH" /home/claude/.bun/bin/bun typecheck`
  - open `t3-dev.claude.do` and confirm the dev-specific favicon/manifest assets load
  - confirm the UI shows the red "DEVELOP" marker while production does not
- Rollback notes:
  - revert the runtime branding wiring and dev asset overrides listed above
  - if only the badge styling is undesirable, remove the `data-host-variant="t3-dev"` overrides but keep the dev manifest/icon split
- Notes:
  - 2026-03-16: Added the initial dev host branding asset split.
  - 2026-03-24: Folded the red indicator styling into the same runtime-branding entry because it is part of the host-specific visual identity, not a separate feature.

## Fork Repository And Branch Safety Guardrails

- Status: active
- First added: 2026-03-20
- Last updated: 2026-03-24
- Owners: T3 Code fork
- Upstream impact: none
- Areas: GitHub repo targeting, production promotion safety, protected branch cleanup, operational policy
- Why this exists: this fork must avoid mutating upstream accidentally, and `production` is a live deployment branch tied to `/srv/t3code/prod`, so the repo now carries explicit guardrails for allowed mutation targets, production PR source restrictions, and protected-branch deletion safety.
- Files:
  - `ENHANCEMENTS.md`
  - `.gh-guard.conf`
  - `.github/workflows/production-source-guard.yml`
  - `AGENTS.md`
  - `BRANCHES.md`
  - `scripts/safe-delete-branch.sh`
  - `/home/claude/T3CODE_OPERATIONS.md`
- Runtime touchpoints:
  - GitHub PRs targeting `production`
  - local branch cleanup workflows
  - the live `production` worktree at `/srv/t3code/prod`
  - agent-driven GitHub mutation flows in this fork
- If this breaks, look for:
  - a PR to `production` being opened from a branch other than `main`
  - tools or agents targeting `pingdotgg/t3code` instead of the fork
  - accidental attempts to delete the local `production` branch during cleanup
- Verify with:
  - `/home/claude/.bun/bin/bun fmt`
  - `/home/claude/.bun/bin/bun lint`
  - `env PATH="/home/claude/.bun/bin:$PATH" /home/claude/.bun/bin/bun typecheck`
  - inspect `.github/workflows/production-source-guard.yml` and confirm it rejects non-`main` PR sources for `production`
  - run `scripts/safe-delete-branch.sh production` and confirm it refuses the deletion
  - confirm `AGENTS.md` and `/home/claude/T3CODE_OPERATIONS.md` both describe `production` as protected infrastructure
- Rollback notes:
  - remove the guard workflow, branch policy docs, and delete helper if the fork stops using a protected `production` branch model
  - if only the helper script becomes redundant, keep the GitHub workflow and repo policy docs
- Notes:
  - 2026-03-20: Added the fork-specific GitHub mutation guard policy and clarified upstream PR restrictions.
  - 2026-03-24: Added explicit branch safety docs plus a local safe-delete helper after nearly treating `production` as cleanup inventory.

## Compact Standalone PWA Open-With Suppression

- Status: active
- First added: 2026-03-20
- Last updated: 2026-03-24
- Owners: T3 Code fork
- Upstream impact: low
- Areas: installed PWA UX, compact touch layouts, header actions
- Why this exists: desktop-oriented "Open" controls are not useful in compact standalone touch PWAs and take up valuable header space, so the fork hides the header open-in picker for those sessions while leaving it visible for regular browser tabs and desktop standalone installs.
- Files:
  - `ENHANCEMENTS.md`
  - `apps/web/src/pwa.ts`
  - `apps/web/src/pwa.test.ts`
  - `apps/web/src/components/chat/OpenInPicker.tsx`
  - any header components that consume `useShouldHideHeaderOpenInPicker`
- Runtime touchpoints:
  - installed iPhone/iPad/mobile PWAs
  - compact touch viewport sessions
  - header open-in controls
- If this breaks, look for:
  - desktop-oriented open-in controls reappearing in compact standalone touch sessions
  - the controls disappearing unexpectedly in regular browser tabs or desktop standalone sessions
  - regressions when display-mode or iOS standalone detection changes upstream
- Verify with:
  - `/home/claude/.bun/bin/bun fmt`
  - `/home/claude/.bun/bin/bun lint`
  - `env PATH="/home/claude/.bun/bin:$PATH" /home/claude/.bun/bin/bun typecheck`
  - `/home/claude/.bun/bin/bun run test src/pwa.test.ts`
  - confirm the open-in controls are hidden in a compact standalone touch session and remain visible in a regular desktop browser session
- Rollback notes:
  - remove `shouldHideHeaderOpenInPicker` and related call sites
  - if only the viewport heuristic is wrong, keep the standalone detection and adjust the compact-touch condition instead of re-enabling the control everywhere
- Notes:
  - 2026-03-20: Hid the header open-in controls in compact standalone touch PWAs to reduce mobile PWA chrome clutter without affecting desktop sessions.

## Backfill Needed

Older fork-specific changes that predate this ledger should be added here over time as we touch them. Until then, use `git log upstream/main..main` as the catch-all diff against upstream.

## Repo Root Project Favicon

- Status: active
- First added: 2026-03-23
- Last updated: 2026-03-23
- Owners: T3 Code fork
- Upstream impact: low
- Areas: project sidebar, monorepo root project detection, repo branding
- Why this exists: the sidebar favicon detector only checks the selected project root for a fixed set of favicon paths and a few root-level source files, so the monorepo root at `t3code/` would miss the existing web app favicon under `apps/web/` and fall back to the generic folder glyph.
- Files:
  - `ENHANCEMENTS.md`
  - `favicon.svg`
- Runtime touchpoints:
  - repo-root project rows in the chat sidebar when the project `cwd` is `/home/claude/code/t3code`
  - server route `GET /api/project-favicon?cwd=...`
- If this breaks, look for:
  - the `t3code` project row showing the fallback folder-style icon instead of the T3 mark
  - root-level favicon detection regressing after upstream changes to the sidebar or favicon route
- Verify with:
  - `/home/claude/.bun/bin/bun fmt`
  - `/home/claude/.bun/bin/bun lint`
  - `env PATH="/home/claude/.bun/bin:$PATH" /home/claude/.bun/bin/bun typecheck`
  - refresh the app and confirm the sidebar project row for the repo root shows the T3 favicon
- Rollback notes:
  - remove `favicon.svg` from the repo root if repo-root branding is no longer desired
  - if upstream adds native monorepo-aware favicon discovery, prefer that and drop this compatibility file if it becomes redundant
- Notes:
  - 2026-03-23: Added a repo-root `favicon.svg` by copying the existing T3 production logo so the current sidebar detector can resolve an icon for the monorepo root without widening the server search rules.
