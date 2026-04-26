# Sidecar And Capsule Patterns

Use this file when designing or reviewing fork code structure.

## What every capsule needs

Every retained fork change should have:

1. One upstream-owned mount seam
2. One fork-owned implementation subtree
3. One explicit contract or entry surface
4. One acceptance-matrix row
5. One `ENHANCEMENTS.md` entry
6. One automated verification path

If one of these is missing, the change is not fully capsule-aligned yet.

## Preferred seams by area

### Server HTTP

- Preferred seam: narrow call from `wsServer.ts`
- Preferred subtree: `apps/server/src/fork/http/`
- Good use cases: fork routes, branding responses, auth wrappers

### Notifications

- Preferred seam: one notification intent or policy hook
- Preferred subtree: `apps/server/src/fork/notifications/`
- Good use cases: event allowlists, payload shaping, subscription pruning policy

### Fork settings

- Preferred seam: a dedicated sidecar section or reset-plan composer
- Preferred subtree: `apps/web/src/fork/settings/`
- Good use cases: fork-only settings, migration, reset composition, dirty-state helpers

### Web bootstrap

- Preferred seam: one startup entry such as `installForkWebShell(...)`
- Preferred subtree: `apps/web/src/fork/bootstrap/`
- Good use cases: branding, PWA registration, boot shell, root sidecars

### UI hooks and debug

- Preferred seam: explicit mount component or `data-slot` hooks
- Preferred subtree: `apps/web/src/fork/bootstrap/`, `apps/web/src/debug/`, `apps/web/src/overrides.css`
- Good use cases: debug sidecars, fork-specific UI polish, targeted visual overrides

### Sync and test infrastructure

- Preferred seam: package scripts, smoke manifest, acceptance matrix
- Preferred subtree: `apps/web/src/fork/testing/`, `apps/web/e2e/shared/`
- Good use cases: smoke layering, acceptance checks, browser specs, sync helpers

## Good patterns already in this repo

- Fork HTTP capsule behind a single server call seam
- Fork settings rendered through a sidecar section instead of scattering controls through the route
- `installForkWebShell(...)` as the main web bootstrap seam
- `ForkRootSidecars` as one fork-only root mount surface

## Anti-patterns

Avoid these:

- broad inline route branches spread across core files
- route-local business logic that belongs in helpers or seam-owned modules
- duplicated auth, reset, or runtime logic on both sides of a seam
- brittle DOM and class-chain selectors when a stable hook can exist
- changes that require several unrelated upstream files to know fork details

## Review heuristic

A good fork change is easy to describe like this:

- upstream file X calls seam Y
- fork code under subtree Z handles the behavior
- smoke command Q proves it still works

If that sentence is hard to write, the change is probably too coupled.
