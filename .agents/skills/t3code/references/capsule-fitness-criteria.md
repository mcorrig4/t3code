# Capsule Fitness Criteria

This document helps decide whether new fork behavior fits an existing capsule or needs a new one. Read this before adding any fork feature.

Cross-reference: [docs/fork-architecture.md](/home/claude/code/t3code/docs/fork-architecture.md) for the current 6-capsule map.

## The Capsule Fitness Test

When you have new fork behavior to add, ask these five questions about each candidate capsule:

1. Does the new behavior share a mount seam with the candidate capsule? (Same upstream file, same delegation point.)
2. Does it naturally extend the candidate capsule's owned subtree? (Would you put the new files under the same `apps/*/src/fork/<capsule>/` directory?)
3. Does it share a contract surface with the candidate capsule? (Same types, same exported functions, same module boundary.)
4. Would it make sense in the same smoke or acceptance test as the candidate capsule? (Testing the new behavior alongside the existing capsule behavior feels natural, not forced.)
5. If you removed the candidate capsule entirely, would the new behavior also need to be removed?

**If 2 or more answers are yes, the new behavior fits the existing capsule.** Add it there.

**If 0 or 1 answers are yes, the behavior likely needs its own capsule.** See "When to create a new capsule" below.

## When to Extend an Existing Capsule

These are concrete placement decisions for common scenarios:

| New behavior                                                | Target capsule                             | Why                                                                                       |
| ----------------------------------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------- |
| New fork-only setting (toggle, input, dropdown)             | Fork settings (capsule 3)                  | Shares the `ForkSettingsSection` mount seam and the `apps/web/src/fork/settings/` subtree |
| New fork HTTP endpoint (API route, asset route)             | Server HTTP (capsule 1)                    | Shares the `tryHandleForkHttpRequest` call seam in `wsServer.ts`                          |
| New notification filter or delivery rule                    | Notification delivery (capsule 2)          | Shares the `resolveNotificationIntent` call seam in `WebPushNotifications.ts`             |
| New debug panel, debug overlay, or diagnostic formatting    | UI hooks and debug (capsule 5)             | Shares the `ForkRootSidecars` mount seam and the `data-slot` CSS seam pattern             |
| New fork-specific CSS override                              | UI hooks and debug (capsule 5)             | Lives in `overrides.css`, targeting a `data-slot` hook                                    |
| New branding variant, PWA metadata, or boot-shell treatment | Web bootstrap and branding/PWA (capsule 4) | Shares the `installForkWebShell` import seam in `main.tsx`                                |
| New smoke script, e2e helper, or acceptance check           | Sync and test infrastructure (capsule 6)   | Shares the `package.json` script mount and `apps/web/e2e/shared/` subtree                 |

The general principle: if the new behavior is a natural elaboration of an existing capsule's concern, extend that capsule rather than creating a new one.

## When to Create a New Capsule

Create a new capsule when the new behavior fails the fitness test above. Concrete triggers:

1. **Different mount seam.** The new behavior requires a delegation point in a different upstream file than any existing capsule uses. For example, if you needed fork behavior in a new upstream service file that no current capsule touches.

2. **Unrelated smoke coverage.** Adding the new behavior to an existing capsule's acceptance row would mean that row now covers unrelated concerns. The acceptance test becomes "check settings AND check this completely separate thing" rather than testing one cohesive area.

3. **Independent removal trigger.** The new behavior has its own upstream-replacement condition that is distinct from the host capsule's. When upstream eventually covers the behavior, you would remove the new code without touching the host capsule at all.

4. **File ownership conflict.** Two different capsules would need to share ownership of the same fork-owned files. This is a sign of entanglement. If capsule A's subtree and capsule B's subtree would overlap, one of them needs to be restructured or they belong together.

5. **Different lifecycle.** The new behavior could be added or removed on a completely different timeline than any existing capsule. It does not depend on any existing capsule being present and no existing capsule depends on it.

## Size Heuristic

A capsule should be small enough that one agent can verify it in one pass. Concretely:

- Its acceptance-matrix row should describe one cohesive concern.
- Its smoke command should finish in a reasonable time testing related things.
- An agent reading the capsule's owned subtree should be able to understand the entire capsule without switching context to unrelated features.

**If a capsule's acceptance row requires checking 5 or more unrelated features, the capsule is probably too big and should be split.** Look for natural seam boundaries within it.

On the flip side, do not create capsules for trivial single-line changes. A one-line CSS override does not need its own capsule — it belongs in the UI hooks and debug capsule (capsule 5).

## New Capsule Creation Procedure

When you have confirmed the fitness test fails and a new capsule is warranted:

1. **Identify the mount seam.** Find the upstream file that will call into your fork code. There should be exactly one. If you need multiple upstream files to call in, reconsider whether this is actually one capsule or two.

2. **Create the owned subtree.** Make a new directory under `apps/*/src/fork/<capsule-name>/` with an `index.ts` barrel that exports the seam contract. Keep all fork implementation files in this directory.

3. **Define the contract.** Export the types and functions that the upstream seam will call. Follow the signature design principles in [seam-design-principles.md](seam-design-principles.md): context object in, simple signal out.

4. **Add an acceptance-matrix row.** Update [docs/fork-acceptance-matrix.md](/home/claude/code/t3code/docs/fork-acceptance-matrix.md) with the new capsule's mount seam, core tests, smoke commands, manual checks, and syncability notes.

5. **Add an ENHANCEMENTS.md entry.** Record the enhancement with rollback notes, removal signals, and upstream replacement triggers per the entry template.

6. **Update fork-architecture.md.** Add the new capsule to [docs/fork-architecture.md](/home/claude/code/t3code/docs/fork-architecture.md) with its mount seam, owned subtree, and contract listing.

7. **Add automated verification.** At minimum, one of: a unit test for the seam contract, a smoke script, or a browser spec. The capsule must have at least one automated verification path before it is considered complete.

## Merging Two Capsules

If two capsules always change together during every sync and share all their mount seams, they are probably one capsule that was incorrectly split. To merge:

1. Confirm they share mount seams (same upstream delegation points).
2. Confirm they always appear together in sync diffs (never one without the other).
3. Combine their owned subtrees under a single `apps/*/src/fork/<name>/` directory.
4. Merge their acceptance-matrix rows into one row covering the combined concern.
5. Update `docs/fork-architecture.md` to reflect the merged capsule.
6. Update `ENHANCEMENTS.md` entries to reference the merged capsule.

Do not merge capsules that merely happen to be in the same package. The criterion is shared mount seams and co-occurrence in change sets, not directory proximity.

## Decision Flowchart Summary

```
New fork behavior arrives
        |
        v
Run the 5-question fitness test against each existing capsule
        |
        v
  2+ yes for any capsule? ---yes---> Extend that capsule
        |
        no
        v
  Does it need a mount seam in a new upstream file? ---yes---> Create new capsule
        |
        no (rare — may share a file but not a concern)
        v
  Would adding it to the closest capsule make that capsule's
  acceptance row cover unrelated concerns? ---yes---> Create new capsule
        |
        no
        v
  Extend the closest capsule (it was a borderline fit)
```
