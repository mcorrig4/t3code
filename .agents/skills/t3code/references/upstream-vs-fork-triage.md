# Upstream Vs Fork Triage

Use this file when deciding whether a behavior belongs to our fork or upstream.

## Default assumptions

- If it appears in [ENHANCEMENTS.md](/home/claude/code/t3code/ENHANCEMENTS.md), assume it is fork-owned unless proven otherwise.
- If it affects a known capsule seam, inspect that capsule first.
- If it touches a generic upstream feature with no enhancement entry, treat it as upstream-owned until the evidence says otherwise.

## If it is our change

If it is our change and it used to work, gather regression context first.

That means:

1. Check the enhancement entry
2. Check the current seam and owned subtree
3. Find what changed recently in the affected fork surface
4. Preserve the sidecar design while fixing the regression

Do not jump straight to patching the core file that now happens to show the symptom.

## If it is not our change

If it is not our change, gather upstream context first, but still design the local solution in the most seam-safe way possible.

That means:

1. Read the upstream-owned surface and its tests
2. Determine whether the fix can stay upstream-shaped
3. If the fork must carry the fix, isolate it behind a narrow seam instead of spreading custom logic broadly

## When the answer is mixed

Sometimes the bug is in an upstream-owned surface but the visible behavior is part of a fork enhancement.

In that case:

1. Identify the real failure location
2. Decide which capsule owns the retained fork behavior
3. Put the fix in the lowest-drift place that still preserves the fork design
4. Update `ENHANCEMENTS.md` if the retained behavior contract changed

## Removal mindset

If upstream now covers the need:

1. Compare the local enhancement against current upstream behavior
2. Prefer deprecation or removal over preserving redundant fork code
3. Update `ENHANCEMENTS.md` with the upstream replacement trigger and removal signal

Do not preserve fork code by default just because it already exists.
