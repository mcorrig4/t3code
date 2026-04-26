# CSS Override Patterns

Prescriptive guide for fork-only CSS styling in t3code. All fork CSS lives in
`apps/web/src/overrides.css`. This doc explains how to add, maintain, and verify overrides.

---

## The Rule

Never modify inline Tailwind classes in upstream components for fork-only styling.
Instead, add a `data-slot` attribute to the target element and put the CSS rule in
`apps/web/src/overrides.css`.

This keeps the upstream diff narrow and makes fork CSS easy to audit, update, and carry
through upstream syncs.

---

## Fork-Owned Hooks

Attributes prefixed with `data-slot="fork-*"` or other `data-fork-*` attributes are
entirely fork-controlled. They survive upstream rewrites because they live in fork-owned
or explicitly-hooked code.

Example from `overrides.css` -- the dev stage badge:

```css
:root[data-host-variant="t3-dev"] [data-slot="fork-stage-badge"] {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: 0.1rem;
  padding-inline: 0.42rem;
  padding-block: 0.18rem;
  background: color-mix(in srgb, var(--color-red-500) 12%, transparent);
}
```

Fork-owned hooks are the most stable selector type. Prefer them for all new fork CSS.

---

## Upstream-Owned Hooks

Upstream components already use `data-slot` attributes for their own styling. The fork CSS
can target these, but they may change without notice during an upstream sync.

Current upstream-owned targets (from `docs/fork-architecture.md`):

- `sidebar`, `sheet-backdrop`, `sidebar-footer`, `sidebar-menu`, `sidebar-menu-button`
- `chat-title-group`, `badge`, `user-message-actions`
- `thread-terminal-close-action`, `custom-model-remove-action`

When targeting an upstream-owned `data-slot`, add a note to the "Known upstream-owned CSS
dependencies" section of `docs/fork-architecture.md` if it is not already listed there.

---

## How to Add a New CSS Hook

1. **Identify the target DOM element** in the browser dev tools or source code.

2. **If the element already has a `data-slot` attribute**, target it directly from
   `overrides.css`. No JSX changes needed.

3. **If it does not have a `data-slot`**, add `data-slot="fork-<descriptive-name>"` to
   the element. Use a name that describes the element's purpose, not its visual appearance.
   Good: `fork-stage-badge`, `fork-session-indicator`. Bad: `fork-red-text`, `fork-big-box`.

4. **If the element is in an upstream component**, prefer a thin fork wrapper component
   over modifying the upstream JSX directly. This keeps the upstream file untouched and
   limits the sync surface to the wrapper.

5. **Write the CSS rule** in `overrides.css`. Group it near related rules and add a brief
   comment if the purpose is not obvious.

---

## The `.dark` Class-Chain Problem

The current `overrides.css` has 7 selectors using `.dark` prefix chains:

```css
.dark [data-project-row] {
  border-color: color-mix(in srgb, var(--color-white) 7%, transparent);
}

.dark [data-mobile="true"][data-slot="sidebar"] {
  box-shadow:
    inset -0.5px 0 0 0 color-mix(in srgb, var(--color-white) 25%, transparent),
    inset -1px 0 0 0 color-mix(in srgb, var(--color-black) 40%, transparent);
}
```

These depend on upstream's Tailwind dark mode implementation (a `.dark` class on the root
element). If upstream changes how dark mode is applied, all 7 selectors break simultaneously.

**Preferred approach for new CSS** -- use CSS custom properties that respond to the theme
automatically:

```css
/* Good -- works in both light and dark via theme-aware custom properties */
[data-project-row] {
  border-color: color-mix(in srgb, var(--foreground) 6%, transparent);
}

/* Avoid -- requires a separate .dark variant */
.dark [data-project-row] {
  border-color: color-mix(in srgb, var(--color-white) 7%, transparent);
}
```

When a single theme-aware rule cannot express the desired difference between light and dark
(e.g., the dark variant needs a meaningfully different color, not just an opacity shift), the
`.dark` prefix is acceptable but should be noted as a sync-sensitive selector.

---

## Selector Stability Ranking

From most stable to least stable:

| Rank | Selector pattern                | Why                                                                                    |
| ---- | ------------------------------- | -------------------------------------------------------------------------------------- |
| 1    | `[data-slot="fork-*"]`          | Fork-owned, fully controlled, survives upstream rewrites                               |
| 2    | `[data-fork-*]`                 | Fork-added attributes on upstream elements; controlled but requires upstream file edit |
| 3    | `[data-slot="<upstream-name>"]` | Upstream-owned hooks; may change without notice                                        |
| 4    | `.dark [selector]`              | Depends on upstream dark mode implementation detail                                    |
| 5    | `.upstream-class-name`          | Most brittle; depends on Tailwind output and upstream class choices                    |

Always use the highest-ranked selector that can express the rule. If you must use rank 3+,
document the dependency in `docs/fork-architecture.md`.

---

## Verification Checklist

After changing `overrides.css`, verify all of the following:

- [ ] **Light theme** -- open the app in light mode and check affected elements
- [ ] **Dark theme** -- switch to dark mode and check the same elements
- [ ] **Desktop viewport** -- check at typical desktop widths (1280px+)
- [ ] **Mobile viewport** -- check at phone widths (375px-428px)
- [ ] **Standalone PWA mode** -- if the override targets PWA-specific selectors
      (`@media (display-mode: standalone)`), test in the installed PWA
- [ ] **Browser mode** -- verify the same elements also work in a normal browser tab
- [ ] **Upstream-owned hooks** -- if targeting any upstream `data-slot`, confirm the
      dependency is listed in `docs/fork-architecture.md`

---

## Cross-References

- `apps/web/src/overrides.css` -- the single file where all fork CSS overrides live
- `docs/fork-architecture.md` -- "Known upstream-owned CSS dependencies" section lists
  all upstream `data-slot` targets and `.dark` chain selectors the fork depends on
