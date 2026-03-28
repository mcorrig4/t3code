# CSS Overrides

Use this file for any fork-specific styling change.

## Core rule

All fork CSS stays in [apps/web/src/overrides.css](/home/claude/code/t3code/apps/web/src/overrides.css).

Do not create scattered fork CSS files unless the repo explicitly changes that convention later.

## Preferred targeting strategy

Prefer:

- `data-slot="fork-*"`
- other explicit, stable fork-owned hooks when `data-slot` is not the best fit

Avoid:

- brittle selectors based on long class chains
- selectors that rely on incidental DOM depth
- changing upstream Tailwind class lists just to land fork-only styling

## Workflow when touching CSS

1. Identify the owner surface
2. Decide whether the styling is truly fork-only
3. Add or reuse a stable hook
4. Keep the selector narrow
5. Note any unavoidable upstream-owned selectors that still remain
6. Update browser or smoke coverage if the change is user-visible

## Stability ranking

Most stable to least stable:

1. `data-slot="fork-*"` on the exact element you intend to style
2. tiny wrapper component with a fork-owned hook
3. existing semantic attribute or role that is already stable
4. upstream structural selector with a documented risk note
5. long utility-class selector chain

The goal is to stay as close to the top of that list as possible.

## Cross-reference

Check [docs/fork-architecture.md](/home/claude/code/t3code/docs/fork-architecture.md) for current CSS hotspot notes before making new overrides.
