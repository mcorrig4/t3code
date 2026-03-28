# Seam Design Principles

This document defines what makes a good seam in the fork capsule architecture and how to design new ones. Read this before creating or modifying any seam.

Cross-reference: [docs/fork-architecture.md](/home/claude/code/t3code/docs/fork-architecture.md) for the current seam inventory.

## Definition

A seam is a single point in an upstream-owned file where upstream code delegates to fork code. Fork owns everything on the callee side; upstream owns the caller side. The seam call site lives in the upstream file, but the call target lives in a fork-owned module under `apps/*/src/fork/`.

The seam is the narrowest possible bridge between the two ownership domains. All fork behavior reachable through a given capsule should flow through that capsule's seam and nowhere else.

## Good Seam Properties

A well-designed seam has all of the following characteristics:

1. **Single call site.** One import and one function call (or one component mount) in the upstream file. If you grep for the fork module name in upstream code, it appears in exactly one place.

2. **Graceful degradation.** Removing the seam call and its import leaves the upstream file compiling and behaving as it did before the fork existed. The seam is additive, not structural.

3. **Narrow surface.** The seam exposes one function, one component, or one module boundary. It is not a broad interface with many methods that upstream must call in sequence.

4. **Full reachability.** Every fork behavior provided by the capsule is reachable through that single seam point. There are no secret side-channels where fork code also hooks into other upstream files to deliver the same capsule's behavior.

5. **Simple contract.** The seam's function signature, component props, or module export shape is small enough that re-implementing the seam after an upstream rewrite is straightforward. If understanding the seam requires reading upstream internals, it is too coupled.

## Bad Seam Signals

Watch for these patterns. Each one indicates the seam needs redesign:

- **Multiple call sites.** The same fork behavior requires edits in several different upstream files. This means the behavior is not properly funneled through a single delegation point.

- **Fork logic in the seam body.** The upstream file contains fork-specific branching, formatting, or business logic rather than a clean delegation call. Fork logic should live entirely in fork-owned modules.

- **Upstream-internal dependency.** The seam depends on upstream implementation details (internal state, private helpers, DOM structure assumptions) that could change for reasons unrelated to the fork feature.

- **Understanding required.** Using the seam correctly requires reading upstream implementation details. A good seam's contract is self-describing.

- **Hard dependency.** Removing the seam import or call would break the upstream file (syntax error, missing variable, broken control flow). The seam should always be a soft delegation that upstream can survive without.

## Seam Taxonomy

This repo uses four kinds of seams. Each has a distinct shape and placement convention.

### Call seam

Upstream calls a fork function. The fork function accepts a context object and returns a simple signal (boolean, nullable, Effect).

**Real example:** `wsServer.ts` calls `tryHandleForkHttpRequest(context)`. One function call handles all fork HTTP routes. The function returns an `Effect<boolean>` indicating whether the request was handled. If it returns `false`, upstream continues its normal routing. If the import and call are removed, upstream routes work exactly as before — fork-specific endpoints simply stop existing.

```typescript
// In wsServer.ts (upstream-owned):
import { tryHandleForkHttpRequest } from "./fork/http/index.ts";

// Single call site — delegates all fork HTTP handling:
if (yield* tryHandleForkHttpRequest({ request, response, url, ... })) {
  return;
}
// ... upstream routing continues
```

### Mount seam

Upstream renders a fork React component at a single point in the component tree. The fork component owns all rendering and state below that mount point.

**Real example:** `_chat.settings.tsx` renders `<ForkSettingsSection />`. One component mount provides all fork-specific settings UI. Removing the import and the JSX tag leaves the upstream settings page working normally with only upstream controls visible.

```tsx
// In _chat.settings.tsx (upstream-owned):
import { ForkSettingsSection } from "../settings/ForkSettingsSection";

// Single mount point for all fork settings UI:
<ForkSettingsSection />;
```

### Import seam

Upstream imports and calls a fork module at startup to bootstrap fork behavior. The call happens once during initialization and installs all fork-specific runtime behavior for the session.

**Real example:** `main.tsx` calls `installForkWebShell(...)`. One function import and one call bootstraps all fork web behavior (branding, PWA metadata, debug wiring, boot shell treatment). Removing it leaves the upstream app starting normally with default branding.

```typescript
// In main.tsx (upstream-owned):
import { installForkWebShell } from "./fork/bootstrap";

const forkWebShell = installForkWebShell({
  doc: document,
  hostname: window.location.hostname,
});
```

### CSS seam

An upstream-owned component carries a `data-slot` attribute. Fork CSS in `overrides.css` targets that attribute to apply fork-specific styling. No JavaScript change is needed on the upstream side beyond the attribute.

**Real example:** `BranchToolbarBranchSelector.tsx` has `data-slot="fork-stage-badge"` on a span element. Fork CSS in `overrides.css` targets `:root[data-host-variant="t3-dev"] [data-slot="fork-stage-badge"]` to style the dev environment badge. Removing the CSS rules leaves the element rendering with its default upstream Tailwind classes.

```tsx
// In upstream component:
<span data-slot="fork-stage-badge" className="...upstream tailwind...">
  {badge}
</span>
```

```css
/* In overrides.css (fork-owned): */
:root[data-host-variant="t3-dev"] [data-slot="fork-stage-badge"] {
  /* fork-specific styling */
}
```

## Direction of Dependency

The dependency always flows in one direction: **upstream calls fork**.

- The seam call site in the upstream file imports from a fork-owned module.
- Fork modules may freely import from upstream (reading types, schemas, utilities, shared contracts).
- But the seam itself is always "upstream delegates to fork" — never "fork patches upstream" or "fork monkey-patches an upstream export."

If fork code needs to intercept upstream behavior, it should do so through a seam that upstream explicitly invokes, not by wrapping or replacing upstream exports behind the scenes.

## Signature Design for Call Seams

When designing or extending a call seam function, follow these conventions:

**Accept a context object, not positional arguments.** A context object is easy to extend without breaking the call site. Adding a new field to the context is backward-compatible; adding a new positional parameter is not.

```typescript
// Good: context object
export const tryHandleForkHttpRequest = (context: ForkHttpContext): Effect.Effect<boolean> => ...

// Bad: positional args that will grow over time
export const tryHandleForkHttpRequest = (req, res, url, config, webPush, fs, path, root, respond) => ...
```

**Return a simple signal.** The upstream caller should not need to interpret a complex structure from the fork. Prefer:

- `boolean` — "I handled it" / "I did not handle it"
- `T | null` — "Here is a result" / "I have nothing"
- `Effect<boolean>` or `Effect<T | null>` — same signals, effectful

**Keep the contract typed but minimal.** Export the context interface from the fork module. Include only the fields the fork actually needs from the upstream side. Do not pass the entire upstream state object when three fields suffice.

**Pass upstream data in via the context.** If the fork needs upstream data (config, request details, runtime state), the upstream caller should assemble it into the context object. The fork module should not reach back into upstream modules to pull data. This keeps the dependency direction clean and makes the seam's data requirements explicit.

```typescript
// Good: upstream assembles what fork needs
yield* tryHandleForkHttpRequest({
  request: req,
  response: res,
  url,
  serverConfig,
  webPushNotifications,
  ...
});

// Bad: fork reaches back to pull upstream state
// import { getServerConfig } from "../../config.ts";  // fork importing upstream runtime state
```

## Seam Quality Checklist

Before considering a new or modified seam complete, verify:

- [ ] Exactly one import and one call/mount in the upstream file
- [ ] Removing the seam leaves upstream compiling and functional
- [ ] All fork behavior for this capsule flows through this seam
- [ ] The seam contract is documented in `docs/fork-architecture.md`
- [ ] The seam has at least one automated test verifying delegation works
- [ ] The function/component signature is small enough to re-implement after an upstream rewrite
