# Enhancement Ledger

This file tracks every fork-specific change we carry on top of `upstream/main`.

For the detailed historical changelog from the initial fork buildout (March 2026), see [docs/archive/ENHANCEMENTS-v1-detailed.md](docs/archive/ENHANCEMENTS-v1-detailed.md).

## How To Use This File

- Add one entry for every fork-specific enhancement, behavior change, deployment customization, or operational deviation.
- Update entries when the enhancement changes shape, files change, or upstream makes it obsolete.
- During upstream sync, consult this file capsule-by-capsule to decide: keep, drop, or merge with upstream.
- Entries are grouped by capsule (see [docs/fork-architecture.md](docs/fork-architecture.md) for the capsule map).
- Each entry should be detailed enough to recreate the fork behavior from scratch.

## Entry Format

| Field                        | Required  | Purpose                                                                                                                         |
| ---------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Status                       | always    | `active`, `deprecated`, or `rolled back`                                                                                        |
| Added / Updated              | always    | First added and last updated dates                                                                                              |
| Upstream impact              | always    | `none` / `low` / `medium` / `high`                                                                                              |
| Why                          | always    | Plain English reason (1–2 sentences)                                                                                            |
| Seam                         | always    | Upstream-owned mount point                                                                                                      |
| Files                        | always    | All files touched                                                                                                               |
| Upstream replacement trigger | always    | What upstream change makes this obsolete                                                                                        |
| Verify                       | always    | Commands or manual steps                                                                                                        |
| Rollback                     | always    | How to disable or revert quickly (1–2 lines)                                                                                    |
| Notes                        | as needed | Dated follow-up entries (keep most recent 2–3; older notes live in the [archived v1](docs/archive/ENHANCEMENTS-v1-detailed.md)) |

---

## Active Enhancements

### Server (Capsules 1–2)

#### Web Push Notifications Sidecar

- Status: active | Added: 2026-03-20 | Updated: 2026-03-25
- Upstream impact: medium
- Why: Browser push notifications for assistant completions, approval requests, and user input requests, with deep-link clicks back to the relevant thread.
- Seam: `apps/server/src/wsServer.ts` → `apps/server/src/fork/http/`; `apps/server/src/notifications/Layers/WebPushNotifications.ts` → `apps/server/src/fork/notifications/intentResolver.ts`
- Files:
  - `apps/server/src/main.ts`, `apps/server/src/serverLayers.ts`, `apps/server/src/wsServer.ts`, `apps/server/src/wsServer.test.ts`
  - `apps/server/src/persistence/Migrations.ts`, `apps/server/src/persistence/Migrations/016_WebPushSubscriptions.ts`
  - `apps/server/src/notifications/http.ts`, `apps/server/src/notifications/http.test.ts`, `apps/server/src/notifications/types.ts`, `apps/server/src/notifications/policy.ts`, `apps/server/src/notifications/policy.test.ts`
  - `apps/server/src/notifications/Layers/WebPushNotifications.ts`, `apps/server/src/notifications/Layers/WebPushSubscriptionRepository.ts`
  - `apps/server/src/notifications/Services/WebPushNotifications.ts`, `apps/server/src/notifications/Services/WebPushSubscriptionRepository.ts`
  - `apps/server/src/fork/http/index.ts`, `apps/server/src/fork/http/brandingRoutes.ts`, `apps/server/src/fork/http/webPushRoutes.ts`
  - `apps/server/src/fork/notifications/intentResolver.ts`, `apps/server/src/fork/notifications/intentResolver.test.ts`
  - `apps/web/src/appSettings.ts`, `apps/web/src/appSettings.test.ts`, `apps/web/src/pwa.ts`, `apps/web/src/pwa.test.ts`
  - `apps/web/src/routes/__root.tsx`, `apps/web/src/settings/ForkSettingsSection.tsx`
  - `apps/web/src/notifications/client.ts`, `apps/web/src/notifications/pushSupport.ts`, `apps/web/src/notifications/registerServiceWorker.ts`, `apps/web/src/notifications/types.ts`, `apps/web/src/notifications/usePushNotifications.ts`
  - `apps/web/public/manifest.webmanifest`, `apps/web/public/service-worker.js`, `apps/web/public/sw.js`
- Upstream replacement trigger: upstream adds first-class web push notification support
- Verify: `bun run test src/notifications/policy.test.ts src/notifications/http.test.ts src/wsServer.test.ts`; enable notifications in Settings, trigger background completion, confirm notification deep-links to correct thread
- Rollback: remove server notification sidecar wiring from `serverLayers.ts` and `wsServer.ts`; unset `T3CODE_WEB_PUSH_*` env vars for temporary shutdown
- Notes:
  - 2026-03-26: Extracted HTTP sidecar into `apps/server/src/fork/http/*`; added intent resolver allowlist; hardened service-worker shell cache; tightened auth to bearer-only for REST sidecar; moved browser toggle into fork settings store.

#### Production Web Push Runtime Configuration

- Status: active | Added: 2026-03-20 | Updated: 2026-03-25
- Upstream impact: none
- Why: Production needs explicit VAPID configuration before browser push subscriptions can be enabled.
- Seam: deployment env vars (outside repo)
- Files: `/etc/default/t3code-prod.env`, `/home/claude/do-box/system/etc/default/t3code-prod.env`
- Upstream replacement trigger: upstream adds first-class push notification config
- Verify: inspect `/etc/default/t3code-prod.env` for `T3CODE_WEB_PUSH_VAPID_*`; confirm `curl http://127.0.0.1:3773/api/web-push/config` reports `enabled: true` after restart
- Rollback: remove `T3CODE_WEB_PUSH_*` vars from env file and restart production

---

### Fork Settings (Capsule 3)

#### Codex App-Server Notification Suppression Sidecar

- Status: active | Added: 2026-03-24 | Updated: 2026-03-25
- Upstream impact: low
- Why: Users may want to suppress native Codex CLI notifications for T3-launched sessions without mutating `~/.codex/config.toml` or using an alternate `CODEX_HOME`.
- Seam: `apps/web/src/settings/ForkSettingsSection.tsx`, `apps/web/src/fork/settings/`
- Files:
  - `apps/server/src/codexAppServerManager.ts`, `apps/server/src/provider/codexAppServerOverrides.ts`, `apps/server/src/codexAppServerManager.test.ts`
  - `apps/web/src/appSettings.ts`, `apps/web/src/appSettings.test.ts`, `apps/web/src/components/ChatView.tsx`
  - `apps/web/src/settings/ForkSettingsSection.tsx`, `apps/web/src/fork/settings/schema.ts`, `apps/web/src/fork/settings/resetPlan.ts`
  - `packages/contracts/src/orchestration.ts`, `packages/contracts/src/provider.test.ts`
- Upstream replacement trigger: upstream adds session-scoped notification suppression
- Verify: enable setting in T3, start fresh Codex chat, confirm launch includes `-c notify=[]`; run standalone `codex` and confirm global notify unchanged
- Rollback: remove `configOverrides` transport field and the T3 settings toggle
- Notes:
  - 2026-03-26: Moved persisted flag into fork settings store; added `useForkSettingsResetPlan` composition and `apps/web/src/settings/resetPlan.ts` so settings route owns only route-local UI cleanup.

---

### Bootstrap / Branding / PWA (Capsule 4)

#### Root-Scoped PWA Install Behavior

- Status: active | Added: 2026-03-16 | Updated: 2026-03-26
- Upstream impact: medium
- Why: iPhone-installed web app sessions were opening chat routes as external web views instead of keeping navigation inside the installed app.
- Seam: `apps/web/src/main.tsx` → `apps/web/src/fork/bootstrap/`
- Files:
  - `apps/web/index.html`, `apps/web/public/manifest.webmanifest`, `apps/web/public/service-worker.js`, `apps/web/public/sw.js`
  - `apps/server/src/fork/branding.ts`, `apps/server/src/wsServer.ts`, `apps/server/src/wsServer.test.ts`
  - `apps/web/src/main.tsx`, `apps/web/src/runtimeBranding.ts`, `apps/web/src/pwa.ts`, `apps/web/src/pwa.test.ts`
  - `packages/shared/src/branding.ts`, `packages/shared/src/branding.test.ts`
- Upstream replacement trigger: upstream adds root-scoped PWA install with host-aware manifests
- Verify: install app from Safari on iPhone, open multiple thread routes — all stay in-app; confirm `manifest.webmanifest` reports `scope: "/"`
- Rollback: revert files above; remove and re-add Home Screen install on iPhone
- Notes:
  - 2026-03-26: Replaced client-side dev-manifest swap with host-aware server sidecar; hardened service-worker shell cache; reverted iOS status bar to `default` after `black-translucent` experiment.

#### Goalserve-Style Boot Shell Splash

- Status: active | Added: 2026-03-20 | Updated: 2026-03-23
- Upstream impact: medium
- Why: App should paint a branded fullscreen loader immediately on cold launch and avoid white flash before React mounts.
- Seam: `apps/web/src/main.tsx`, `apps/web/index.html` (Vite `transformIndexHtml`)
- Files:
  - `apps/web/index.html`, `apps/web/vite.config.ts`, `apps/web/src/main.tsx`
  - `apps/web/src/bootConstants.ts`, `apps/web/src/bootShell.ts`, `apps/web/src/bootState.ts`
  - `apps/web/src/routes/__root.tsx`
  - `apps/web/src/components/loading/T3Loader.tsx`, `apps/web/src/components/loading/T3LoaderMarkup.tsx`, `apps/web/src/components/loading/T3LoaderStatic.tsx`, `apps/web/src/components/loading/renderT3LoaderMarkup.tsx`
- Upstream replacement trigger: upstream adds branded boot shell with gated dismissal
- Verify: cold-load web app — T3 shell appears immediately with no white flash; shell exits only after minimum delay and hydration readiness
- Rollback: revert files above; adjust `APP_BOOT_MIN_DURATION_MS` or `APP_BOOT_FAIL_SAFE_MS` if only timing is wrong

#### T3 Dev Runtime Branding

- Status: active | Added: 2026-03-16 | Updated: 2026-03-26
- Upstream impact: low
- Why: Dev host at `t3-dev.claude.do` needs visibly distinct branding (red palette, "DEVELOP" badge) so dev sessions are hard to confuse with production.
- Seam: `apps/web/src/main.tsx` → `apps/web/src/fork/bootstrap/`; `apps/server/src/wsServer.ts` → `apps/server/src/fork/http/brandingRoutes.ts`
- Files:
  - `apps/server/src/fork/branding.ts`, `apps/server/src/fork/http/brandingRoutes.ts`
  - `apps/web/src/runtimeBranding.ts`, `apps/web/src/runtimeBranding.test.ts`, `apps/web/src/main.tsx`
  - `apps/web/src/fork/brandingVitePlugin.ts`
  - `apps/web/public/apple-touch-icon-dev.png`, `apps/web/public/favicon-dev-*.png`, `apps/web/public/favicon-dev.ico`
  - `apps/web/src/overrides.css`, `apps/web/src/index.css`
  - `packages/shared/src/branding.ts`, `packages/shared/src/branding.test.ts`
- Upstream replacement trigger: upstream adds host-aware branding with dev indicators
- Verify: open `t3-dev.claude.do` — confirm red palette, "DEVELOP" badge, dev PWA icons; confirm production has no red indicators
- Rollback: revert host-aware branding sidecar and dev asset overrides
- Notes:
  - 2026-03-26: Consolidated behind shared resolver + server sidecar; replaced brittle class-chain badge selector with `data-slot="fork-stage-badge"`; added Vite dev-server branding adapter.

#### Compact Standalone PWA Open-With Suppression

- Status: active | Added: 2026-03-20 | Updated: 2026-03-24
- Upstream impact: low
- Why: Desktop-oriented "Open" controls are not useful in compact standalone touch PWAs and take up header space.
- Seam: `apps/web/src/pwa.ts` (`useShouldHideHeaderOpenInPicker`)
- Files: `apps/web/src/pwa.ts`, `apps/web/src/pwa.test.ts`, `apps/web/src/components/chat/OpenInPicker.tsx`
- Upstream replacement trigger: upstream adds display-mode-aware header actions
- Verify: confirm open-in controls hidden in compact standalone touch session, visible in desktop browser
- Rollback: remove `shouldHideHeaderOpenInPicker` and related call sites

#### Repo Root Project Favicon

- Status: active | Added: 2026-03-23 | Updated: 2026-03-23
- Upstream impact: low
- Why: The sidebar favicon detector misses the monorepo root because the web app favicon lives under `apps/web/`, not at the repo root.
- Seam: `favicon.svg` at repo root (static asset, no code seam)
- Files: `favicon.svg`
- Upstream replacement trigger: upstream adds monorepo-aware favicon discovery
- Verify: refresh app — sidebar project row for repo root shows T3 favicon instead of generic folder icon
- Rollback: remove `favicon.svg` from repo root

---

### UI Hooks / Overrides / Debug (Capsule 5)

#### Mobile Composer Focus-Zoom Guard

- Status: active | Added: 2026-03-23 | Updated: 2026-03-24
- Upstream impact: low
- Why: Focusing the chat composer on iPhone Safari triggers browser zoom and crops the composer when the keyboard opens.
- Seam: `apps/web/src/components/ComposerPromptEditor.tsx` (inline class change)
- Files: `apps/web/src/components/ComposerPromptEditor.tsx`
- Upstream replacement trigger: upstream adds iPhone-safe composer sizing
- Verify: on iPhone Safari, tap into composer — keyboard opens without browser zoom; manual zoom still works elsewhere
- Rollback: revert mobile `text-base sm:text-[14px]` sizing in `ComposerPromptEditor.tsx`

#### Standalone Mobile Rounded App Shell

- Status: active | Added: 2026-03-24 | Updated: 2026-03-25
- Upstream impact: low
- Why: iPhone standalone sessions reveal page background around app edges during keyboard transitions; rounded shell with glass shimmer makes the exposure feel intentional.
- Seam: `apps/web/src/overrides.css`
- Files: `apps/web/src/components/BranchToolbar.tsx`, `apps/web/src/components/ChatView.tsx`, `apps/web/src/overrides.css`
- Upstream replacement trigger: upstream adds first-class mobile shell treatment
- Verify: on iPhone PWA, open keyboard — subtle top-corner rounding, 22px squircle bottom corners, fully visible branch/worktree row
- Rollback: remove standalone shell overlay and chat-stack spacing overrides from `overrides.css`
- Notes:
  - 2026-03-25: Added `corner-shape: squircle` progressive enhancement; reduced bottom radius from 28px to 22px to match iOS keyboard edge.

#### Mobile Sidebar Max-Width Override

- Status: active | Added: 2026-03-20 | Updated: 2026-03-24
- Upstream impact: low
- Why: Mobile sidebar should leave visible click-outside space instead of expanding edge-to-edge.
- Seam: `apps/web/src/overrides.css`, `apps/web/src/components/ui/sidebar.tsx` (`data-mobile`)
- Files: `apps/web/src/components/ui/sidebar.tsx`, `apps/web/src/overrides.css`
- Upstream replacement trigger: upstream adds mobile sidebar width management
- Verify: open sidebar on mobile — caps at 93vw with visible click-outside space
- Rollback: revert mobile `max-width: 93vw` override in `overrides.css`

#### Sidebar Project Row Theming And Mobile Controls

- Status: active | Added: 2026-03-23 | Updated: 2026-04-26
- Upstream impact: low
- Why: Project rows in the sidebar should feel more intentionally themed and touch-friendly, with clearer project grouping, visible project actions, and less cramped spacing than upstream.
- Seam: `apps/web/src/overrides.css`; `apps/web/src/components/Sidebar.tsx` (`data-project-*` hooks)
- Files: `apps/web/src/components/Sidebar.tsx`, `apps/web/src/overrides.css`
- Upstream replacement trigger: upstream adds first-class project-row visual treatment and touch-accessible project actions
- Verify: sidebar project rows render with bordered/gradient card styling in light and dark themes; project list spacing and heading spacing are visibly adjusted; project action button remains reachable on touch devices
- Rollback: remove the `data-project-*` hooks from `Sidebar.tsx`; remove the related project-row, project-list, and project-action rules from `overrides.css`
- Notes:
  - 2026-04-26: This includes the project-row card treatment, project-heading/list spacing, project-header alignment, and touch-visible project action affordance.

#### Project Thread Spacing Polish

- Status: active | Added: 2026-03-23 | Updated: 2026-03-23
- Upstream impact: low
- Why: First visible chat under an expanded project folder felt cramped against the folder row.
- Seam: `apps/web/src/overrides.css` (`[data-project-threads]` selector)
- Files: `apps/web/src/overrides.css`
- Upstream replacement trigger: upstream adjusts project-tree spacing
- Verify: expand a project with multiple chats — first child thread has slightly more top space
- Rollback: remove first-child margin override under `[data-project-threads]` in `overrides.css`

#### Awaiting-Input Sidebar Status Emphasis

- Status: active | Added: 2026-03-20 | Updated: 2026-04-26
- Upstream impact: low
- Why: Threads blocked on user input should read as more urgent than the upstream neutral treatment so pending responses are easier to spot in the sidebar.
- Seam: `apps/web/src/components/Sidebar.logic.ts` (`resolveThreadStatusPill`)
- Files: `apps/web/src/components/Sidebar.logic.ts`, `apps/web/src/components/Sidebar.logic.test.ts`
- Upstream replacement trigger: upstream adds a stronger first-class visual treatment for pending user-input thread status
- Verify: create a thread awaiting structured user input — sidebar pill reads "Awaiting Input" with red text/dot styling; pending approvals remain amber
- Rollback: revert the awaiting-input `colorClass` and `dotClass` in `resolveThreadStatusPill`

#### Native Assistant Message TTS

- Status: active | Added: 2026-03-16 | Updated: 2026-03-23
- Upstream impact: low
- Why: Assistant replies should be playable with built-in browser TTS on iPhone/iPad without server-side audio dependency.
- Seam: `apps/web/src/components/chat/MessagesTimeline.tsx` (TTS button mount)
- Files:
  - `apps/web/src/components/chat/MessagesTimeline.tsx`, `apps/web/src/components/ChatView.browser.tsx`
  - `apps/web/src/features/tts/AssistantMessageTtsButton.tsx`, `apps/web/src/features/tts/nativeSpeechSynthesis.ts`
  - `apps/web/src/features/tts/sanitizeTtsText.ts`, `apps/web/src/features/tts/tts.ts`, `apps/web/src/features/tts/tts.test.ts`, `apps/web/src/features/tts/useMessageTts.ts`
- Upstream replacement trigger: upstream adds native TTS or audio playback for assistant messages
- Verify: `bun run test src/features/tts/tts.test.ts`; open completed assistant reply — play button on left, timestamp right-aligned; playback speed selector 0.8x–2.0x
- Rollback: remove TTS footer render from `MessagesTimeline.tsx`; delete `apps/web/src/features/tts/*` if disabling entirely
- Notes:
  - 2026-03-25: Added `speechSynthesis` event-listener fallback for browsers that don't fire `onend`/`onerror` consistently.

#### Mobile-Visible Copy And Action Buttons

- Status: active | Added: 2026-03-25 | Updated: 2026-03-25
- Upstream impact: low
- Why: Upstream copy/revert buttons only appear on hover, which is inaccessible on mobile/touch devices.
- Seam: `apps/web/src/components/chat/MessagesTimeline.tsx` (Tailwind classes); `apps/web/src/overrides.css` (`@media (hover: none)`)
- Files: `apps/web/src/components/chat/MessagesTimeline.tsx`, `apps/web/src/overrides.css`
- Upstream replacement trigger: upstream makes action buttons touch-accessible
- Verify: on mobile/touch, copy and revert buttons visible without hovering; on desktop, still hover-only
- Rollback: remove `max-sm:opacity-100` from `MessagesTimeline.tsx`; remove `@media (hover: none)` block for `.chat-markdown-copy-button` in `overrides.css`

#### Sidebar Rename/Input Zoom Guard And Footer Touch Polish

- Status: active | Added: 2026-03-24 | Updated: 2026-04-26
- Upstream impact: low
- Why: iOS touch interactions in the sidebar needed extra polish so rename inputs do not trigger Safari zoom and the standalone/mobile sidebar footer controls feel intentional instead of cramped.
- Seam: `apps/web/src/overrides.css`; `apps/web/src/components/Sidebar.tsx`; `apps/web/src/components/ui/sidebar.tsx`
- Files: `apps/web/src/components/Sidebar.tsx`, `apps/web/src/components/ui/sidebar.tsx`, `apps/web/src/overrides.css`
- Upstream replacement trigger: upstream adds iPhone-safe rename input sizing and stronger mobile/standalone footer control styling
- Verify: on iPhone/touch, renaming a thread in the sidebar does not trigger browser zoom; in standalone/mobile sessions, the sidebar footer button is centered and visually framed
- Rollback: remove `data-slot="thread-rename-input"` from `Sidebar.tsx`; remove the rename-input and sidebar-footer override rules from `overrides.css`

#### Thread Sidebar Overflow Sidecar

- Status: active | Added: 2026-03-25 | Updated: 2026-03-25
- Upstream impact: low
- Why: Upstream thread actions only reachable by right-click, which is undiscoverable on touch devices. Fork adds an overflow trigger that opens the existing context menu without forking menu contents.
- Seam: `apps/web/src/components/Sidebar.tsx` (button mount after timestamp)
- Files:
  - `apps/web/src/components/Sidebar.tsx`, `apps/web/src/components/Sidebar.logic.ts`, `apps/web/src/components/Sidebar.logic.test.ts`
  - `apps/web/src/components/sidebar/ForkThreadContextMenuButton.tsx`, `apps/web/src/components/sidebar/ForkThreadContextMenuButton.test.tsx`
- Upstream replacement trigger: upstream adds visible thread action trigger
- Verify: hover thread row — button appears after timestamp and opens context menu; on mobile, button stays visible; multi-select opens bulk menu
- Rollback: remove `ForkThreadContextMenuButton` from `Sidebar.tsx`; delete component and test

---

### Sync & Test Infrastructure (Capsule 6)

#### Fork Capsule Sync Infrastructure

- Status: active | Added: 2026-03-26 | Updated: 2026-03-26
- Upstream impact: none
- Why: Fork tracks retained behavior by capsule so future syncs can rebind seams and rerun capsule smoke instead of rediscovering behavior from scratch.
- Seam: `apps/web/package.json` scripts; `UPSTREAM_SYNC_MIGRATION_LOG.md`
- Files:
  - `docs/fork-architecture.md`, `docs/fork-acceptance-matrix.md`
  - `apps/web/src/fork/testing/forkSmokeManifest.ts`, `apps/web/e2e/check-fork-acceptance-matrix.ts`
  - `UPSTREAM_SYNC_MIGRATION_LOG.md`
- Upstream replacement trigger: upstream adds capsule-style modular verification
- Verify: `bun run --cwd apps/web sync:acceptance:check`; `bun run --cwd apps/web sync:smoke:all`
- Rollback: remove capsule docs, manifest, and acceptance check; restore direct phase-script ownership

---

### Cross-Cutting / Operational

#### Standardized Enhancement Ledger Filename

- Status: active | Added: 2026-03-20 | Updated: 2026-03-20
- Upstream impact: none
- Why: Enhancement ledger was previously named `enhancement.MD` — easy to miss in searches.
- Files: `ENHANCEMENTS.md`
- Upstream replacement trigger: n/a (documentation convention)
- Verify: confirm repo root contains `ENHANCEMENTS.md`
- Rollback: rename back to `enhancement.MD`

#### Required Enhancement Ledger Maintenance

- Status: active | Added: 2026-03-20 | Updated: 2026-03-20
- Upstream impact: none
- Why: Fork needs a reliable record of local changes so upstream merges are easier to reconcile and obsolete patches can be deprecated cleanly.
- Files: `AGENTS.md`, `ENHANCEMENTS.md`
- Upstream replacement trigger: n/a (process convention)
- Verify: confirm `AGENTS.md` instructs contributors to document fork changes in `ENHANCEMENTS.md`
- Rollback: remove enhancement-tracking reminder from `AGENTS.md`

#### Root Repo Check Exclusion For Nested Claude Worktrees

- Status: active | Added: 2026-03-25 | Updated: 2026-03-25
- Upstream impact: none
- Why: Root-level `bun fmt` and `bun lint` were picking up duplicate files under `.claude/worktrees`.
- Files: `.gitignore`, `.eslintignore`
- Upstream replacement trigger: upstream adds worktree exclusions
- Verify: `bun lint` from repo root does not report duplicated warnings under `.claude/worktrees`
- Rollback: remove `/.claude/worktrees/` from `.gitignore` and `.eslintignore`

#### Fork Repository And Branch Safety Guardrails

- Status: active | Added: 2026-03-20 | Updated: 2026-03-24
- Upstream impact: none
- Why: Fork must avoid mutating upstream accidentally; `production` is a live deployment branch tied to `/srv/t3code/prod` needing explicit guardrails.
- Files:
  - `.gh-guard.conf`, `.github/workflows/production-source-guard.yml`
  - `AGENTS.md`, `BRANCHES.md`, `scripts/safe-delete-branch.sh`
  - `/home/claude/T3CODE_OPERATIONS.md`
- Upstream replacement trigger: n/a (fork operational policy)
- Verify: inspect production-source-guard workflow; run `scripts/safe-delete-branch.sh production` — should refuse
- Rollback: remove guard workflow, branch policy docs, and delete helper

---

## Backfill Needed

Older fork-specific changes that predate this ledger should be added here over time as we touch them. Until then, use `git log upstream/main..main` as the catch-all diff against upstream.
