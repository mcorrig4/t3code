# Fork Settings Sidecar Plan

## Goal

Keep future fork-only settings easy to carry during upstream syncs without creating a second settings universe.

## Recommendation

Use a single fork-owned settings sidecar section/component that is injected into the upstream settings page.

Do **not** create a separate local-storage key by default.

## Why

This gives us most of the merge-safety benefit:

- one clear place for fork-only settings UI
- smaller future diffs in the upstream settings route
- easier review during upstream syncs

Without the biggest downsides of a split persistence model:

- duplicated defaults/reset behavior
- duplicated migration logic
- split tests and hydration paths
- harder "restore defaults" semantics
- hidden drift between related settings that should still behave like one app

## Preferred Architecture

### 1. Keep one canonical settings store

Continue to use:

- [appSettings.ts](/home/claude/code/t3code/apps/web/src/appSettings.ts)

This remains the source of truth for:

- schema/defaults
- persistence key
- migrations/decoding defaults
- shared tests
- runtime consumers

### 2. Add one fork-owned UI entry point

Preferred target:

- `apps/web/src/settings/ForkSettingsSection.tsx`

Responsibilities:

- render fork-only settings rows/sections
- consume `useAppSettings()`
- expose a minimal props surface if the upstream settings page needs layout hooks

Non-goals:

- creating its own store
- duplicating settings normalization/defaults
- re-implementing upstream settings scaffolding unless necessary

### 3. Keep the upstream settings page mostly intact

Preferred route shape:

- upstream settings page renders its normal sections
- one explicit insertion point renders `ForkSettingsSection`

Example seam:

```tsx
<GeneralSettingsSection />
<ModelSettingsSection />
<AdvancedSettingsSection />
<ForkSettingsSection />
```

If a fork setting truly belongs next to an upstream concept, prefer:

- a tiny upstream-route insertion seam

over:

- threading fork logic through many unrelated settings branches

### 4. Keep fork runtime wiring modular

Fork-specific settings should ideally feed small helpers/adapters rather than broaden upstream runtime code.

Example:

- UI writes canonical setting in `appSettings`
- runtime helper reads that setting and converts it into provider/session overrides

This keeps upstream-facing code narrow and easier to reapply.

## Storage Rule

### Default

Fork settings stay in the canonical app settings store and use the same storage key as the rest of the app.

### Only use a separate storage key when all of these are true

- the data is strictly fork-sidecar-only
- it should not participate in restore-defaults behavior
- it has no shared runtime coordination with normal app settings
- it can be safely lost or versioned independently
- splitting tests and hydration logic is worth the isolation

If any of those are false, keep it in `appSettings.ts`.

## What Fits Well In The Sidecar

- Codex app-server-only overrides
- fork operational toggles
- fork-only provider/session behaviors
- fork-specific dev/runtime controls
- future experimental fork controls that are clearly not upstream concerns

## What Usually Should Stay With Upstream Settings Structure

- core theme/timestamp/general preferences
- standard provider/model controls that upstream also owns
- anything whose UX meaning depends heavily on existing upstream section grouping

## Tradeoff Decision

### Best for sync safety

One dedicated fork settings section + canonical shared store.

### Most likely future footgun

One dedicated fork settings section + completely separate persistence namespace for normal app-behavior settings.

That second model looks cleaner initially but usually creates more maintenance cost over time.

## Suggested Incremental Refactor

1. Extract current fork-only settings UI into `ForkSettingsSection`.
2. Keep all values in `useAppSettings()`.
3. Leave upstream sections untouched unless a fork setting must sit beside an upstream control.
4. Add a focused browser smoke for the sidecar section.
5. As future fork settings are added, default them into the sidecar instead of extending the upstream route directly.

## Current Candidate Sidecar Items

- Codex native notification suppression
- web push settings and status
- diagnostics/debug-panel controls
- future fork operational/runtime toggles

## Rule Of Thumb

If the question is:

- "Should this live in a separate UI component?"

Usually yes.

If the question is:

- "Should this live in a separate local-storage key?"

Usually no.
