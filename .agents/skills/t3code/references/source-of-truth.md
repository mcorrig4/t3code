# Source Of Truth

This file tells you where truth lives for common fork-engineering questions.

## Repo policy and mandatory rules

- [AGENTS.md](/home/claude/code/t3code/AGENTS.md)

Use this for:

- repo rules
- branch safety
- versioning
- GitHub boundaries
- mandatory quality gates

## Where a change belongs

- [docs/fork-architecture.md](/home/claude/code/t3code/docs/fork-architecture.md)

Use this for:

- capsule map
- seam inventory
- owned subtrees
- current rebinding points

Architecture doc means: where it belongs.

## How to prove it still works

- [docs/fork-acceptance-matrix.md](/home/claude/code/t3code/docs/fork-acceptance-matrix.md)

Use this for:

- per-capsule tests
- smoke expectations
- browser coverage
- manual checks
- syncability notes

Acceptance matrix means: how to prove it still works.

## Why it exists and when to remove it

- [ENHANCEMENTS.md](/home/claude/code/t3code/ENHANCEMENTS.md)

Use this for:

- capsule-grouped enhancement inventory
- intentional seam and files touched
- upstream impact and replacement triggers
- rollback notes
- verification steps

Entries are grouped by capsule. The detailed historical format from the initial buildout is archived at [docs/archive/ENHANCEMENTS-v1-detailed.md](/home/claude/code/t3code/docs/archive/ENHANCEMENTS-v1-detailed.md).

Enhancements means: why it exists and when to remove it.

## How sync works

- [UPSTREAM_SYNC_MIGRATION_LOG.md](/home/claude/code/t3code/UPSTREAM_SYNC_MIGRATION_LOG.md)

Use this for:

- current phase structure
- sync lessons learned
- phase smoke commands
- historical context for reapplication work

## Branch safety and operations

- [BRANCHES.md](/home/claude/code/t3code/BRANCHES.md)
- [/home/claude/T3CODE_OPERATIONS.md](/home/claude/T3CODE_OPERATIONS.md)

Use these for:

- protected branches
- safe branch deletion
- runtime deployment
- promotion procedures

## Engineering playbook

- [docs/fork-engineering-playbook.md](/home/claude/code/t3code/docs/fork-engineering-playbook.md)

Use this for:

- seam-first design
- required shape for every fork change
- preferred patterns
- change checklist
- sync checklist
