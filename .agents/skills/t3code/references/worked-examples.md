# Worked Examples: Fork Capsule Patterns

Concrete before/after examples drawn from real changes in this repository.
Each example shows the seam pattern used, the actual file paths, and why the
pattern survives upstream syncs.

Cross-reference: [docs/fork-architecture.md](/home/claude/code/t3code/docs/fork-architecture.md)
for the full capsule inventory, [ENHANCEMENTS.md](/home/claude/code/t3code/ENHANCEMENTS.md)
for the enhancement ledger entries.

---

## Example 1: Server HTTP capsule -- Call seam pattern

### Before

Web-push subscription endpoints, branding HTML injection, and auth validation
logic were scattered inline across `wsServer.ts`. Each new fork HTTP endpoint
required modifying the core server file in multiple places -- adding imports,
inserting route-matching `if` blocks, and duplicating auth checks. Every
upstream change to the HTTP request handler created merge conflicts.

### After

`wsServer.ts` has exactly one fork import and one fork call site:

```ts
// wsServer.ts (line ~84)
import { maybeBuildForkHtmlDocumentResponse, tryHandleForkHttpRequest } from "./fork/http/index.ts";
```

```ts
// wsServer.ts (lines ~447-461) -- inside the HTTP request handler
if (
  yield *
  tryHandleForkHttpRequest({
    request: req,
    response: res,
    url,
    serverConfig,
    webPushNotifications,
    fileSystem,
    path,
    staticRoot: configuredStaticRoot,
    respond,
  })
) {
  return;
}
```

The function returns `Effect<boolean>` -- `true` means "I handled this
request, stop processing," `false` means "not my request, continue to upstream
routing."

All fork HTTP routing lives in `apps/server/src/fork/http/`. The barrel file
defines the contract and orchestrates sub-modules:

```ts
// fork/http/index.ts
export interface ForkHttpContext {
  readonly request: http.IncomingMessage;
  readonly response: http.ServerResponse<http.IncomingMessage>;
  readonly url: URL;
  readonly serverConfig: ServerConfigShape;
  readonly webPushNotifications: WebPushNotificationsShape;
  readonly fileSystem: FileSystem.FileSystem;
  readonly path: Path.Path;
  readonly staticRoot: string | null;
  readonly respond: (
    statusCode: number,
    headers: Record<string, string>,
    body?: string | Uint8Array,
  ) => void;
}

export interface ForkHttpModule {
  readonly name: string;
  readonly tryHandle: (context: ForkHttpContext) => Effect.Effect<boolean>;
}

const forkHttpModules: readonly ForkHttpModule[] = [
  { name: "web-push", tryHandle: tryHandleWebPushHttpRequest },
  { name: "branding", tryHandle: tryHandleForkBrandingRequest },
];
```

Adding a new fork HTTP endpoint means adding one entry to the
`forkHttpModules` array and creating a new file in `fork/http/`. Zero changes
to `wsServer.ts`.

### Why this works

One import, one call site, one boolean signal. Upstream can rewrite its entire
HTTP routing structure and we only need to rebind this one function call --
possibly updating `ForkHttpContext` if the available context changes.

Auth is handled fork-side (`validateForkHttpAuth`) using timing-safe comparison,
so upstream never needs to know about our auth model.

### Key files

| Role                        | Path                                          |
| --------------------------- | --------------------------------------------- |
| Mount seam (upstream-owned) | `apps/server/src/wsServer.ts`                 |
| Barrel + contract           | `apps/server/src/fork/http/index.ts`          |
| Web-push routes             | `apps/server/src/fork/http/webPushRoutes.ts`  |
| Branding routes             | `apps/server/src/fork/http/brandingRoutes.ts` |

### ENHANCEMENTS.md entries

- "Web Push Notification Delivery" (web-push subscription and dispatch)
- "Host-aware Dev PWA Branding" (branding HTML injection)

---

## Example 2: Fork settings sidecar -- Mount seam pattern

### Before

Fork settings controls (notification suppression toggle, push notification
subscription toggle, debug panel controls) were scattered through the
upstream settings route, intermixed with upstream controls. The settings
values shared the upstream localStorage key and schema. Every upstream
settings change risked clobbering fork state or creating schema conflicts.

### After

The upstream settings route (`_chat.settings.tsx`) renders exactly one fork
component:

```tsx
// _chat.settings.tsx (line ~975)
<ForkSettingsSection />
```

`ForkSettingsSection` is a self-contained mount seam that renders all fork
settings UI. It imports from `apps/web/src/fork/settings/`, which owns:

- **Schema** (`schema.ts`): `ForkSettingsSchema` with its own Zod schema,
  `FORK_SETTINGS_STORAGE_KEY` (`t3code:fork-settings:v1`), and defaults.
- **Persistence** (`persistence.ts`): `readForkSettingsSnapshot()` and
  `migrateLegacyForkSettings()` -- handles its own localStorage lifecycle,
  independent of upstream.
- **Hook** (`useForkSettings.ts`): `useForkSettings()` -- the reactive store
  that components consume.
- **Reset plan** (`resetPlan.ts`): `buildForkSettingsResetPlan()` and
  `buildCombinedSettingsResetPlan()` -- composes fork reset into the combined
  settings reset flow without modifying upstream's reset logic.
- **Registry** (`registry.ts`): `FORK_SETTINGS_REGISTRY` -- declarative
  metadata for dirty-detection and reset labeling.

### Why this works

One component mount in the upstream settings route. Fork settings have their
own localStorage key, their own schema, their own reset plan. Upstream
settings remain clean. If upstream rewrites its settings page layout, we
re-mount `<ForkSettingsSection />` in the new structure -- nothing else
changes.

The `buildCombinedSettingsResetPlan` function composes fork reset into the
upstream reset flow through a thin adapter, so the "Reset all settings" button
works for both upstream and fork settings without upstream needing to know
fork settings exist.

### Key files

| Role                        | Path                                            |
| --------------------------- | ----------------------------------------------- |
| Mount seam (upstream-owned) | `apps/web/src/routes/_chat.settings.tsx`        |
| Mount component             | `apps/web/src/settings/ForkSettingsSection.tsx` |
| Schema                      | `apps/web/src/fork/settings/schema.ts`          |
| Persistence                 | `apps/web/src/fork/settings/persistence.ts`     |
| Hook                        | `apps/web/src/fork/settings/useForkSettings.ts` |
| Reset plan                  | `apps/web/src/fork/settings/resetPlan.ts`       |
| Registry                    | `apps/web/src/fork/settings/registry.ts`        |
| Barrel                      | `apps/web/src/fork/settings/index.ts`           |

### ENHANCEMENTS.md entries

- "Fork Settings Sidecar" (schema, persistence, reset integration)
- "Codex Notification Suppression Override" (one of the settings this capsule manages)
- "Push Notification Toggle" (another setting managed through this capsule)

---

## Example 3: CSS data-slot override -- CSS seam pattern

### Before

Fork-specific styling was applied by modifying Tailwind utility classes
directly in upstream component JSX. For example, changing sidebar width on
mobile meant editing the `className` prop in the upstream `Sidebar` component.
Every upstream component update caused merge conflicts on the class strings.

### After

Target elements use `data-slot` attributes (many already present in upstream,
some added by the fork). All fork-specific CSS lives in `overrides.css`, which
is imported once in `main.tsx` via `import "./overrides.css"`.

Real examples from `overrides.css`:

```css
/* Fork-owned data-slot -- targets a badge component we control */
:root[data-host-variant="t3-dev"] [data-slot="fork-stage-badge"] {
  position: relative;
  display: inline-flex;
  /* ... */
}

/* Upstream-owned data-slot -- applies mobile sidebar styling */
[data-mobile="true"][data-slot="sidebar"] {
  max-width: 92vw;
  border-radius: 12px 12px 24px 12px;
  corner-shape: squircle;
}

/* Upstream-owned data-slot -- stacks chat title vertically on mobile */
@media (display-mode: standalone) and (max-width: 768px) {
  [data-slot="chat-title-group"] {
    flex-direction: column;
    align-items: flex-start;
    gap: 1px;
  }
}
```

The file header makes the design intent explicit:

```css
/* Local, intentionally brittle UI tweaks that we want to keep isolated from upstream edits. */
```

### Why this works

`overrides.css` is 100% fork-owned. It never conflicts during upstream sync
because upstream never touches it. The only upstream coupling is the `data-slot`
attribute values -- and these are tracked in `docs/fork-architecture.md` under
"Known upstream-owned CSS dependencies" so we know exactly what to check during
sync.

Two kinds of selectors exist:

1. **Fork-owned** (`data-slot="fork-stage-badge"`, `data-host-variant`, etc.)
   -- entirely our responsibility, never conflict with upstream.
2. **Upstream-owned** (`data-slot="sidebar"`, `data-slot="chat-title-group"`,
   etc.) -- depend on upstream DOM structure. Listed in
   `docs/fork-architecture.md` for sync-time review.

### Key pattern

```css
[data-slot="<target>"] {
  /* fork styling */
}
```

Never modify upstream component Tailwind classes for fork-only styling. If the
element does not already have a `data-slot`, add one -- that is the only
upstream touch needed, and it is a stable, non-conflicting attribute.

### ENHANCEMENTS.md entries

- "Host-aware Dev PWA Branding" (the `fork-stage-badge` CSS)
- "iPhone Standalone Shell Alignment" (mobile sidebar and shell CSS)

---

## Example 4: Web bootstrap -- Import seam pattern

### Before

Fork startup logic -- host-aware branding, boot shell color injection, PWA
service worker registration, debug subsystem initialization -- was spread
across multiple calls and import blocks in `main.tsx` and other entry files.
Each bootstrap concern added its own import and inline call, making `main.tsx`
a frequent conflict site during upstream syncs.

### After

`main.tsx` has one fork import and one fork call:

```ts
// main.tsx (line 11)
import { installForkWebShell } from "./fork/bootstrap";

// main.tsx (lines 19-22)
const forkWebShell = installForkWebShell({
  doc: document,
  hostname: window.location.hostname,
});
```

After React renders, the boot-ready promise is awaited:

```ts
// main.tsx (lines 30-32)
forkWebShell.bootReady.catch((err) => {
  console.error("[fork-bootstrap] boot ready failed:", err);
});
```

Internally, `installForkWebShell` orchestrates four bootstrap plugins through
a declarative plugin array:

```ts
// fork/bootstrap/installForkWebShell.ts
export interface ForkWebBootstrapPlugin {
  readonly name: string;
  readonly install: (input: ForkWebBootstrapInput) => void | { readonly whenReady?: Promise<void> };
}

const forkWebBootstrapPlugins: readonly ForkWebBootstrapPlugin[] = [
  { name: "branding", install: installBrandingBootstrap },
  { name: "boot-shell", install: () => installBootShellBootstrap() },
  { name: "pwa", install: installPwaBootstrap },
  { name: "debug", install: installDebugBootstrap },
];
```

Adding a new bootstrap concern means adding one entry to this array and
creating one file in `fork/bootstrap/`. Zero changes to `main.tsx`.

### Why this works

One import, one function call. If upstream rewrites `main.tsx` entirely, we
re-add two lines (the import and the `installForkWebShell` call). The entire
fork bootstrap surface in the upstream-owned file is three lines.

Plugins that need async readiness (like PWA service worker registration)
return `{ whenReady: Promise<void> }`. The coordinator collects these and
exposes them as `bootReady`. Plugins that are synchronous return `void`.

### Key files

| Role                          | Path                                                 |
| ----------------------------- | ---------------------------------------------------- |
| Mount seam (upstream-owned)   | `apps/web/src/main.tsx`                              |
| Coordinator + plugin contract | `apps/web/src/fork/bootstrap/installForkWebShell.ts` |
| Branding plugin               | `apps/web/src/fork/bootstrap/brandingBootstrap.ts`   |
| Boot shell plugin             | `apps/web/src/fork/bootstrap/bootShellBootstrap.ts`  |
| PWA plugin                    | `apps/web/src/fork/bootstrap/pwaBootstrap.ts`        |
| Debug plugin                  | `apps/web/src/fork/bootstrap/debugBootstrap.ts`      |
| Barrel                        | `apps/web/src/fork/bootstrap/index.ts`               |

### ENHANCEMENTS.md entries

- "Host-aware Dev PWA Branding" (branding + boot shell plugins)
- "PWA Service Worker Registration" (pwa plugin)
- "Codex Override Debug Breadcrumbs" (debug plugin)

---

## Anti-examples: What bad capsulation looks like

These are real patterns to avoid. Each anti-pattern is followed by the
refactoring path into the capsule model.

### Anti-pattern 1: Fork behavior scattered across 4+ upstream files

**Symptom**: A fork feature requires changes in `wsServer.ts`,
`providerManager.ts`, `codexAppServerManager.ts`, and a route file. There is
no single entry point -- the feature is woven into upstream control flow.

**Refactoring path**: Extract a `ForkHttpModule` or `ForkWebBootstrapPlugin`.
Move all fork logic into one `fork/<feature>/` subtree. Leave one call site in
the upstream file. The call site should be a single function call that returns
a signal (boolean, void, or Effect) so the upstream file does not need to know
what the fork feature does.

### Anti-pattern 2: Fork settings stored in the upstream settings schema

**Symptom**: Fork-only settings (like `suppressCodexNotifications`) are added
to the canonical `appSettings.ts` schema. Upstream settings migrations can
break or silently drop fork values. The "Reset settings" button has no way to
distinguish fork from upstream state.

**Refactoring path**: Move the setting to `fork/settings/schema.ts` with its
own `FORK_SETTINGS_STORAGE_KEY`. Read it through `useForkSettings()`. Compose
fork reset logic into the combined reset plan via
`buildCombinedSettingsResetPlan()` instead of widening the upstream schema.

### Anti-pattern 3: Fork CSS applied by modifying upstream Tailwind classes

**Symptom**: A fork change modifies a `className="..."` string in an upstream
component. The next upstream sync creates a conflict on that exact line because
upstream also changed the class list.

**Refactoring path**: Add a `data-slot` attribute to the target element (or
use an existing one). Move the CSS rule to `overrides.css`. Remove the inline
class modification. Record the upstream-owned `data-slot` dependency in
`docs/fork-architecture.md` under "Known upstream-owned CSS dependencies."

### Anti-pattern 4: Fork feature with no ENHANCEMENTS.md entry and no smoke test

**Symptom**: After an upstream sync, a fork feature silently breaks. Nobody
knows it existed because it was never recorded. There is no smoke test to
catch the regression.

**Refactoring path**: Add an `ENHANCEMENTS.md` entry following the template.
Add a smoke row to the fork acceptance matrix in
`apps/web/e2e/check-fork-acceptance-matrix.ts`. Ensure the entry includes
"If this breaks, look for" symptoms and "Verify with" steps.

### Anti-pattern 5: Debug logging sprinkled into upstream component bodies

**Symptom**: `console.log("[fork-debug] ...")` calls are scattered through
upstream components like `ChatView.tsx` and route files. Each call is a merge
conflict waiting to happen, and there is no way to disable fork debug logging
without editing multiple upstream files.

**Refactoring path**: Use the debug sidecar pattern. Fork debug state lives in
`debug/userInputDebug.ts` with its own store (`useUserInputDebugStore`).
Debug UI renders through `ForkRootSidecars` mounted once in `__root.tsx`.
Debug logging is called through `logUserInputDebugLazy()` which checks the
enabled flag before doing any work. The upstream touch is one component mount
and, at most, one lazy logging call at each observation point.

### Anti-pattern 6: Inline fork routing in the upstream HTTP handler

**Symptom**: The fork adds `if (url.pathname === "/fork/something") { ... }`
blocks directly inside `wsServer.ts` request handler, duplicating auth checks
and response formatting each time.

**Refactoring path**: Add a new `ForkHttpModule` entry to `forkHttpModules` in
`fork/http/index.ts`. Implement the route handler in a new file under
`fork/http/`. Use `validateForkHttpAuth(context)` for auth. Return `true` when
handled. The upstream file stays untouched.
