# Decision Tree

Use this file for the first triage pass before you change code.

## Step 1: Classify the request

Put the request into one of these buckets:

1. Net new feature
2. Fix or regression
3. UI look, feel, or behavior change
4. Review or refactor
5. Upstream sync or reapply

If the request spans multiple buckets, start with the most structural one first. Example: a bug fix discovered during sync still starts with sync triage.

## Step 2: Ask the four fork questions

For any bucket, answer these questions before implementation:

1. Is this already our fork behavior?
2. Is this upstream behavior?
3. Is there an existing capsule that should own it?
4. What verification will prove it still works after the change?

Use the answers to decide where to gather context next.

## Net new feature

When the request adds behavior that does not exist today:

1. Check [ENHANCEMENTS.md](/home/claude/code/t3code/ENHANCEMENTS.md) to see whether it extends an existing enhancement or needs a new entry.
2. Check [docs/fork-architecture.md](/home/claude/code/t3code/docs/fork-architecture.md) to find the best-fitting capsule.
3. If it fits an existing capsule, use that seam.
4. If it does not fit, design a new seam before touching multiple upstream files.
5. Update the acceptance row and verification plan before calling it done.

## Fix or regression

If the behavior looks fork-owned:

1. Check `ENHANCEMENTS.md` first.
2. Inspect the current capsule seam and fork-owned implementation subtree.
3. Determine whether it used to work and what changed.
4. Fix the regression inside the fork-owned surface if practical.

If the behavior looks upstream-owned:

1. Inspect the relevant upstream-owned module and tests.
2. Keep the local fix as seam-safe as possible if it becomes fork-owned.
3. Avoid spreading fork logic across core files just because the bug was found there.

## UI look, feel, or behavior change

1. Check whether the change is fork-only or should remain upstream-like.
2. If fork-only, keep styling in [apps/web/src/overrides.css](/home/claude/code/t3code/apps/web/src/overrides.css).
3. Prefer `data-slot="fork-*"` hooks over brittle DOM or class-chain selectors.
4. Update browser or smoke coverage if the change is user-visible.

## Review or refactor

Review the change against the capsule model:

1. Does it use an existing seam cleanly?
2. Is fork logic living in fork-owned files where practical?
3. Are docs and acceptance coverage updated?
4. Would a future upstream rewrite require only seam rebinding, not broad file churn?

## Upstream sync or reapply

1. Start from fresh `upstream/main`.
2. Use `ENHANCEMENTS.md` as the retained-feature inventory.
3. Rebind the seam first, not the whole old patch set.
4. Rerun capsule smoke and acceptance checks.
5. Update the acceptance row if the verification story changed.

## Bottom line

Do not start by editing code.
Start by deciding ownership, capsule fit, seam location, and proof of correctness.
