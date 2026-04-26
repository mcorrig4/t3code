# Repo Surface Map

Use this file as a quick navigation aid to likely fork-owned or fork-adjacent code surfaces.

## Server surfaces

- `apps/server/src/fork/http/`
  - fork HTTP routes, branding response shaping, auth helpers
- `apps/server/src/fork/notifications/`
  - notification intent resolution, allowlists, lifecycle policy
- `apps/server/src/wsServer.ts`
  - core server seam mount for fork HTTP and related routing decisions

## Web surfaces

- `apps/web/src/fork/bootstrap/`
  - startup seam, branding, PWA, root sidecars
- `apps/web/src/fork/settings/`
  - fork-only settings, persistence, reset composition
- `apps/web/src/overrides.css`
  - all fork-specific CSS overrides
- `apps/web/src/settings/ForkSettingsSection.tsx`
  - fork settings UI injection point
- `apps/web/src/routes/_chat.settings.tsx`
  - settings route that consumes the reset-plan seam
- `apps/web/src/routes/__root.tsx`
  - root app composition around fork sidecars and shared providers

## Tests and smoke

- `apps/web/e2e/shared/`
  - shared smoke helpers
- `apps/web/e2e/sync-phase-*.mjs`
  - phase smoke entrypoints
- `apps/web/src/fork/testing/`
  - smoke manifest and fork testing helpers
- browser specs
  - deterministic fork UI and behavior coverage

## Docs

- `docs/fork-architecture.md`
  - capsule and seam map
- `docs/fork-acceptance-matrix.md`
  - verification and syncability contract
- `UPSTREAM_SYNC_MIGRATION_LOG.md`
  - sync procedure and history
- `ENHANCEMENTS.md`
  - fork enhancement inventory and removal signals

## Practical use

When a request lands, use this file to find the likely first code surfaces to inspect before you start broader searching.
