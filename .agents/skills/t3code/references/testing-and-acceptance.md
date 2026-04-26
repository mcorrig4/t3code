# Testing And Acceptance

Use this file when adding or updating verification for a fork change.

## Mandatory quality gates

These must pass before the task is considered complete:

```bash
bun fmt
bun lint
bun typecheck
```

## Match every change to verification layers

Every fork change should answer these questions:

1. What unit test proves the local logic?
2. What seam, contract, or browser test proves the integration?
3. What smoke command proves the capsule still works after rebinding?
4. What manual check still remains, if any?

## Main smoke layers

Use the smoke commands that match the scope of the change:

- `bun run --cwd apps/web sync:smoke:quick`
  - deterministic local checks
  - best default for iterative work

- `bun run --cwd apps/web sync:smoke:hosted`
  - hosted checks that depend on the dev environment

- `bun run --cwd apps/web sync:smoke:all`
  - final combined run when you need the full gate

## Capsule-level verification

For changes concentrated in one capsule:

1. Run the targeted tests for that area
2. Run the matching phase smoke or browser coverage
3. Update [docs/fork-acceptance-matrix.md](/home/claude/code/t3code/docs/fork-acceptance-matrix.md) if expectations changed

## Browser and acceptance coverage

Use browser specs for deterministic user-facing behavior.
Use smoke scripts for environment-sensitive checks.

Do not rely only on manual testing for a retained capsule if the behavior is stable enough to automate.

## Acceptance-matrix rule

Whenever verification obligations change, update the acceptance matrix immediately.

That includes:

- new smoke commands
- new browser specs
- new manual checks
- changed syncability notes

The matrix is the contract future sync work depends on.
