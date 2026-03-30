# Sync And Obsolescence

Use this file for upstream reapplication work and for deciding when fork code should be removed.

## Reapplication model

The fork sync model is:

1. Start from fresh `upstream/main`
2. Treat that as the new base
3. Reapply retained fork behavior feature by feature
4. Rebind seams instead of replaying broad historical patches
5. Rerun capsule smoke and verify the acceptance row

Do not default to cherry-picking old drift onto an already modified branch.

## Sync checklist

For each retained feature:

1. Find the enhancement entry in [ENHANCEMENTS.md](/home/claude/code/t3code/ENHANCEMENTS.md)
2. Confirm which capsule owns it
3. Check whether the seam still exists
4. Rebind or redesign the seam as needed
5. Keep the fork-owned subtree as intact as practical
6. Run the capsule verification from [docs/fork-acceptance-matrix.md](/home/claude/code/t3code/docs/fork-acceptance-matrix.md)
7. Record any changed expectations in the docs

## Decide keep, merge, or remove

For each active enhancement, make an explicit decision:

- keep
- merge with upstream behavior
- deprecate
- remove

Never silently preserve or silently drop fork behavior.

## Detecting obsolescence

Fork code is a removal candidate when:

- upstream now ships equivalent behavior
- the original bug or behavior gap no longer exists upstream
- the fork enhancement only compensates for an older upstream architecture
- the local code now adds more sync risk than user value

## What to record

When keeping or changing a fork enhancement, make sure the enhancement entry records:

- upstream replacement trigger
- removal signal
- rollback path

These fields are what make future sync and cleanup work safe.

## Removal workflow

When upstream fully supersedes a fork enhancement:

1. remove the seam-owned fork code
2. remove or narrow the related tests and smoke coverage
3. update the acceptance row
4. mark the `ENHANCEMENTS.md` entry as deprecated or rolled back
5. update architecture or sync docs if the capsule surface changed
