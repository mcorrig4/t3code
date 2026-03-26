# Fork Capsule Architecture

This fork is organized around a small set of capsules. Each capsule should have:

- one upstream-owned mount seam
- one fork-owned implementation subtree
- one contract/interface surface
- one test bundle
- one smoke/acceptance entry
- one `ENHANCEMENTS.md` entry with rollback or replacement notes

## Capsules

### 1. Server HTTP capsule

- Mount seam: [wsServer.ts](/home/claude/code/t3code/apps/server/src/wsServer.ts)
- Owned subtree:
  - [apps/server/src/fork/http/index.ts](/home/claude/code/t3code/apps/server/src/fork/http/index.ts)
  - [apps/server/src/fork/http/brandingRoutes.ts](/home/claude/code/t3code/apps/server/src/fork/http/brandingRoutes.ts)
  - [apps/server/src/fork/http/webPushRoutes.ts](/home/claude/code/t3code/apps/server/src/fork/http/webPushRoutes.ts)
- Contract:
  - `ForkHttpContext`
  - `ForkHttpModule`
  - `tryHandleForkHttpRequest(...)`
  - `validateForkHttpAuth(...)`
  - `renderForkHtmlDocument(...)`

### 2. Notification delivery capsule

- Mount seam: [WebPushNotifications.ts](/home/claude/code/t3code/apps/server/src/notifications/Layers/WebPushNotifications.ts)
- Owned subtree:
  - [apps/server/src/fork/notifications/intentResolver.ts](/home/claude/code/t3code/apps/server/src/fork/notifications/intentResolver.ts)
- Contract:
  - `ForkNotificationIntentResolver`
  - `isPotentiallyNotifiableEvent(...)`
  - `resolveNotificationIntent(...)`

### 3. Fork settings capsule

- Mount seams:
  - [ForkSettingsSection.tsx](/home/claude/code/t3code/apps/web/src/settings/ForkSettingsSection.tsx)
  - [routes/\_chat.settings.tsx](/home/claude/code/t3code/apps/web/src/routes/_chat.settings.tsx)
  - [components/ChatView.tsx](/home/claude/code/t3code/apps/web/src/components/ChatView.tsx) (suppressCodexAppServerNotifications consumption)
- Owned subtree:
  - [apps/web/src/fork/settings/index.ts](/home/claude/code/t3code/apps/web/src/fork/settings/index.ts)
  - [apps/web/src/fork/settings/schema.ts](/home/claude/code/t3code/apps/web/src/fork/settings/schema.ts)
  - [apps/web/src/fork/settings/persistence.ts](/home/claude/code/t3code/apps/web/src/fork/settings/persistence.ts)
  - [apps/web/src/fork/settings/useForkSettings.ts](/home/claude/code/t3code/apps/web/src/fork/settings/useForkSettings.ts)
  - [apps/web/src/fork/settings/useForkSettingsResetPlan.ts](/home/claude/code/t3code/apps/web/src/fork/settings/useForkSettingsResetPlan.ts)
  - [apps/web/src/fork/settings/resetPlan.ts](/home/claude/code/t3code/apps/web/src/fork/settings/resetPlan.ts)
  - [apps/web/src/fork/settings/registry.ts](/home/claude/code/t3code/apps/web/src/fork/settings/registry.ts)
  - [apps/web/src/notifications/usePushNotifications.ts](/home/claude/code/t3code/apps/web/src/notifications/usePushNotifications.ts) (100% fork-owned, lives outside fork/ for now)
- Contract:
  - `ForkSettingsSchema`
  - `useForkSettings()`
  - `useForkSettingsResetPlan(...)`
  - `buildForkSettingsResetPlan(...)`
  - `ForkSettingsRegistryEntry`

### 4. Web bootstrap and branding/PWA capsule

- Mount seam: [main.tsx](/home/claude/code/t3code/apps/web/src/main.tsx)
- Owned subtree:
  - [apps/web/src/fork/bootstrap/index.ts](/home/claude/code/t3code/apps/web/src/fork/bootstrap/index.ts)
  - [apps/web/src/fork/bootstrap/installForkWebShell.ts](/home/claude/code/t3code/apps/web/src/fork/bootstrap/installForkWebShell.ts)
  - [apps/web/src/fork/bootstrap/brandingBootstrap.ts](/home/claude/code/t3code/apps/web/src/fork/bootstrap/brandingBootstrap.ts)
  - [apps/web/src/fork/bootstrap/bootShellBootstrap.ts](/home/claude/code/t3code/apps/web/src/fork/bootstrap/bootShellBootstrap.ts)
  - [apps/web/src/fork/bootstrap/pwaBootstrap.ts](/home/claude/code/t3code/apps/web/src/fork/bootstrap/pwaBootstrap.ts)
  - [apps/web/src/fork/bootstrap/debugBootstrap.ts](/home/claude/code/t3code/apps/web/src/fork/bootstrap/debugBootstrap.ts)
  - [apps/web/src/fork/brandingVitePlugin.ts](/home/claude/code/t3code/apps/web/src/fork/brandingVitePlugin.ts)
- Contract:
  - `installForkWebShell(...)`
  - `ForkWebBootstrapPlugin`

### 5. UI hooks and debug capsule

- Mount seams:
  - [overrides.css](/home/claude/code/t3code/apps/web/src/overrides.css)
  - [routes/\_\_root.tsx](/home/claude/code/t3code/apps/web/src/routes/__root.tsx) (debug sidecar mount + event logging)
  - [components/Sidebar.tsx](/home/claude/code/t3code/apps/web/src/components/Sidebar.tsx) (ForkThreadContextMenuButton mount)
  - [components/ChatView.tsx](/home/claude/code/t3code/apps/web/src/components/ChatView.tsx) (debug breadcrumbs)
  - explicit `data-slot="fork-*"` hooks in touched components
- Owned subtree:
  - [apps/web/src/debug/userInputDebug.ts](/home/claude/code/t3code/apps/web/src/debug/userInputDebug.ts)
  - [apps/web/src/debug/UserInputDebugSidecar.tsx](/home/claude/code/t3code/apps/web/src/debug/UserInputDebugSidecar.tsx)
  - [apps/web/src/components/debug/UserInputDebugPanel.tsx](/home/claude/code/t3code/apps/web/src/components/debug/UserInputDebugPanel.tsx)
- Contract:
  - `logUserInputDebugLazy(...)`
  - owned DOM hooks such as `data-slot="fork-stage-badge"`

### 6. Sync and test infrastructure capsule

- Mount seams:
  - `sync:phaseN:smoke` scripts in [apps/web/package.json](/home/claude/code/t3code/apps/web/package.json)
  - `UPSTREAM_SYNC_MIGRATION_LOG.md`
- Owned subtree:
  - [apps/web/src/fork/testing/forkSmokeManifest.ts](/home/claude/code/t3code/apps/web/src/fork/testing/forkSmokeManifest.ts)
  - [apps/web/e2e/check-fork-acceptance-matrix.ts](/home/claude/code/t3code/apps/web/e2e/check-fork-acceptance-matrix.ts)
  - [apps/web/e2e/shared/urls.mjs](/home/claude/code/t3code/apps/web/e2e/shared/urls.mjs)
  - [apps/web/e2e/shared/browser.mjs](/home/claude/code/t3code/apps/web/e2e/shared/browser.mjs)
  - [apps/web/e2e/shared/assertions.mjs](/home/claude/code/t3code/apps/web/e2e/shared/assertions.mjs)
  - [apps/web/e2e/shared/smokeRunner.mjs](/home/claude/code/t3code/apps/web/e2e/shared/smokeRunner.mjs)

## Known upstream-owned CSS dependencies

These selectors in `overrides.css` target upstream-owned DOM attributes. If upstream changes these, the selectors need updating.

**Upstream-owned `data-slot` targets (10):**
`sidebar`, `sheet-backdrop`, `sidebar-footer`, `sidebar-menu`, `sidebar-menu-button`,
`chat-title-group`, `badge`, `user-message-actions`, `thread-terminal-close-action`,
`custom-model-remove-action`

**`.dark` class-chain selectors (7):**
These use Tailwind `.dark` context which depends on upstream's dark mode implementation.

## Sync rule

When upstream changes a subsystem, the preferred adaptation path is:

1. rebind the seam
2. rerun that capsule’s smoke/tests
3. update the acceptance matrix row

Do not spread new fork behavior into core files when an existing capsule seam can host it.
