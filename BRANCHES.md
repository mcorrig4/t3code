# Branch Policy

## Protected Branches

- `main`
  - Primary integration branch for the fork.
  - Do not delete casually.
- `production`
  - Protected deployment branch for `t3.claude.do`.
  - Local worktree: `/srv/t3code/prod`
  - Service: `t3code-prod.service`
  - Never delete, rename, or repurpose this branch.

## Working Branches

- `feature/*`
  - Short-lived feature branches from `main`.
- `fix/*`
  - Short-lived bug-fix branches from `main`.
- `sync/upstream-YYYYMMDD`
  - Temporary upstream sync branches used to merge `upstream/main` into `main`.
- `promote/*`
  - Historical promotion branches. Review carefully before deletion because they may capture deployed snapshots.
- `wip/*`
  - Historical or in-progress branches. Never assume they are cleanup-safe without a feature-level audit.

## Worktree Rules

- Any branch attached to a live worktree needs extra care before deletion.
- `production` is always protected, even if it appears merged.
- Temporary review worktrees under `/tmp` can be removed only after their useful content is accounted for elsewhere.

## Deletion Guardrail

- Prefer `scripts/safe-delete-branch.sh <branch>` over raw `git branch -d`.
- The helper refuses to delete:
  - `production`
  - the currently checked out branch
  - branches still attached to a worktree
