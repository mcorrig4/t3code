# Fork Capsule Deep Review — Follow-Up Findings

Date: 2026-03-26

## Context

This document is a post-fixes code review of the current tree after the changes summarized in [FORK_CAPSULE_DEEP_REVIEW_FIXES.md](/home/claude/code/t3code/docs/archive/FORK_CAPSULE_DEEP_REVIEW_FIXES.md).

Its purpose is to validate the fixes doc against the actual codebase and to record the issues that remained after that fixes pass.

Status as of the current tree: the four concrete follow-up issues from this note have now been fixed in code. This file is preserved as a historical review record rather than a live list of unresolved defects.

Related documents:

- [FORK_CAPSULE_DEEP_REVIEW.md](/home/claude/code/t3code/docs/archive/FORK_CAPSULE_DEEP_REVIEW.md)
- [FORK_CAPSULE_DEEP_REVIEW_FIXES.md](/home/claude/code/t3code/docs/archive/FORK_CAPSULE_DEEP_REVIEW_FIXES.md)
- [FORK_CAPSULE_STATUS.md](/home/claude/code/t3code/docs/archive/FORK_CAPSULE_STATUS.md)

## Findings Identified In The Follow-Up Review

## High

### WebSocket auth path still uses insecure / divergent comparison logic

- Classification at time of review: fix only partially landed
- File: [wsServer.ts](/home/claude/code/t3code/apps/server/src/wsServer.ts#L994)

The WebSocket auth path still used:

- `if (authToken)`
- `providedToken !== authToken`

This meant:

- empty-string `authToken` disabled WebSocket auth silently
- comparison was still timing-variable there

Resolved in the current tree:

- [wsServer.ts](/home/claude/code/t3code/apps/server/src/wsServer.ts) now rejects `authToken === ""` as a visible misconfiguration
- the WebSocket upgrade path now uses timing-safe token comparison

## Medium

### Oversized web-push request bodies still return `400` instead of `413`

- Classification at time of review: fix only partially landed
- Files:
  - [http.ts](/home/claude/code/t3code/apps/server/src/notifications/http.ts#L34)
  - [webPushRoutes.ts](/home/claude/code/t3code/apps/server/src/fork/http/webPushRoutes.ts#L68)

The request-size limit existed and `readJsonRequestBody(...)` threw an error carrying `statusCode: 413`, but the route wrapper remapped those failures to `400`.

Resolved in the current tree:

- [webPushRoutes.ts](/home/claude/code/t3code/apps/server/src/fork/http/webPushRoutes.ts) now preserves the `413` status from oversized request-body failures

### Phase 4 smoke still has state bleed on fork settings

- Classification at time of review: new follow-up issue discovered during validation
- File: [sync-phase-4-settings.mjs](/home/claude/code/t3code/apps/web/e2e/sync-phase-4-settings.mjs#L17)

The script cleared only `t3code:app-settings:v1`, then later toggled a fork-only setting in `t3code:fork-settings:v1`.

Resolved in the current tree:

- [sync-phase-4-settings.mjs](/home/claude/code/t3code/apps/web/e2e/sync-phase-4-settings.mjs) now isolates the fork settings store before toggling fork-only settings

## Low

### Web-push route handlers still do not drain request bodies on early exits

- Classification at time of review: regression still present
- File: [webPushRoutes.ts](/home/claude/code/t3code/apps/server/src/fork/http/webPushRoutes.ts#L56)

Unauthorized, forbidden, and unsupported requests could return before consuming the request body.

Resolved in the current tree:

- [webPushRoutes.ts](/home/claude/code/t3code/apps/server/src/fork/http/webPushRoutes.ts) now drains unread request bodies on early exits

## Outcome

The follow-up issues from this note are resolved.

Remaining broader cleanup and hardening work is tracked in:

- [FORK_CAPSULE_STATUS.md](/home/claude/code/t3code/docs/archive/FORK_CAPSULE_STATUS.md)
- [docs/fork-architecture.md](/home/claude/code/t3code/docs/fork-architecture.md)
- [docs/fork-acceptance-matrix.md](/home/claude/code/t3code/docs/fork-acceptance-matrix.md)

## Verification Note

These findings originally came from code review and static inspection rather than a fresh implementation pass.

This historical note intentionally distinguishes:

- what was reviewed and fixed in [FORK_CAPSULE_DEEP_REVIEW_FIXES.md](/home/claude/code/t3code/docs/archive/FORK_CAPSULE_DEEP_REVIEW_FIXES.md)
- what this follow-up review identified before those remaining fixes landed
