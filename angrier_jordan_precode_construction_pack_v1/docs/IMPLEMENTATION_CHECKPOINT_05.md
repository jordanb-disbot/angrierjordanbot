# Angrier Jordan — Implementation Checkpoint 05

Date: 2026-09-21  
Status: **PASS**

## Scope completed

Checkpoint 05 implements the primary manual moderation/case execution layer on top of the existing foundation and Hotseat system.

Implemented Discord command paths:
- `/mod warn`
- `/mod timeout`
- `/mod untimeout`
- `/mod kick`
- `/mod ban`
- `/mod unban`
- `/mod purge`
- `/mod note`
- `/mod history`
- `/mod case view`
- `/mod case edit`
- `/mod case reverse`

## Case safety model

Manual punitive actions now use a prepared-case pattern. A permanent numbered case is created before Discord enforcement, then finalized only after Discord confirms the action. If Discord rejects the action, the case is retained as `REVERSED` with an `ENFORCEMENT_FAILED` transition rather than falsely recording success.

Case transitions are persisted in the new `ModerationCaseEvent` model. Reason corrections and reversals therefore retain before/after history instead of rewriting the record without an audit trail.

Automatic reversals are intentionally limited to actions that can actually be undone safely:
- warning: mark case reversed
- timeout: remove timeout, then reverse case
- ban: unban, then reverse case

Kick and purge are not automatically reversible because Discord cannot restore a kicked member or deleted messages.

## Temporary actions

- Discord timeout: 10 seconds through 28 days.
- Temporary ban: 1 minute through 365 days.
- Permanent ban is supported.
- Timeout and temporary-ban expiry jobs are persisted in `ScheduledJob` and are restart-safe/idempotent.
- Requesting review does not stop the action clock; appealed temporary cases can still expire normally.

## Member review

Warn/timeout/kick/ban notifications may include a `Request Review` button. The subject may request review only for their own case. The request is persisted in the existing appeal table and the case transitions to `APPEALED` while the underlying temporary-action expiry remains active.

## Permission/hierarchy behavior

- Recliner+: warn, timeout/untimeout, purge, notes, history/case view.
- Chaise Lounge+: kick, ban/unban, case edit/reverse.
- Server owner is protected from moderation targeting.
- Non-owner moderators cannot act on members at equal/higher Discord hierarchy.
- Angrier Jordan never claims success before Discord confirms the external action.

`moderation.purge` was added to the shared capability matrix. `/mod purge` now requires an explicit reason in the master command registry, matching the moderation safety rule that destructive/punitive manual actions require a reason.

## Verification

- Command registry: 192 interactions
- Settings: 168
- Capabilities: 32
- Generated application commands: 65
- Prisma models/tables: 71 / 71
- Production visual library: 348 assets/templates
- Domain tests: **39 passed / 0 failed**
- Domain TypeScript typecheck: **PASS**
- Production wiring structural validation: **PASS**
- Full preflight: **PASS**

Environment-gated checks remain intentionally pending:
- live Discord/PostgreSQL smoke test requires credentials
- Prisma client regeneration requires workspace dependency installation
- full bot adapter compilation requires workspace dependency installation

## Next checkpoint

Implement remaining manual/security moderation surfaces: channel lock/unlock and slowmode with exact restoration, quarantine/evidence capture, staff-alert/modstats, and appeal outcome/reviewer-independence handling before moving into automated moderation, Join Gate, anti-raid, anti-nuke and Panic Mode.
