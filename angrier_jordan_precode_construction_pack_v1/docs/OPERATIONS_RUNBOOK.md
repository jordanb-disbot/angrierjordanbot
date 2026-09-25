# Operations Runbook

## Bot is offline
1. Check hosting process status and deployment logs.
2. Confirm Discord token secret exists and was not rotated.
3. Confirm PostgreSQL health.
4. Restart once. Do not repeatedly restart a migration-failing build.
5. Run `/status` / health endpoint after recovery.

## Database migration failed
1. Stop rollout.
2. Do not manually mark a failed migration successful without inspecting it.
3. Restore/test against latest backup if any data mutation occurred.
4. Fix with a forward migration when possible.
5. Rehearse on staging/test DB before retry.

## Scheduled job missed
1. Inspect `ScheduledJob` by execution key.
2. Because jobs are idempotent, rerun only the missing execution key.
3. Verify downstream ledger/audit rows before manually compensating.

## Economy inconsistency
1. Disable affected feature flag, not the whole bot.
2. Preserve ledger rows and request IDs.
3. Recompute balances from ledger if needed.
4. Corrections use audited balancing transactions; never direct silent balance edits.

## Panic Mode triggered
1. Confirm actor and reason in audit log.
2. Keep containment active until destructive activity is understood.
3. Review protected/trusted identities and Discord audit log.
4. Restore using the captured pre-lockdown permission state only.
5. Record incident outcome.

## Hotseat permissions wrong
1. Do not release sentence just to fix visibility.
2. Run channel/role permission health check.
3. Repair Jailed-role overwrites.
4. Verify the member cannot access normal channels before declaring jail active.

## Music stopped
1. Determine whether provider metadata resolution or playable-source adapter failed.
2. Keep queue/session state intact.
3. Skip unavailable item with user-facing explanation; do not corrupt queue.

## Rollback deployment
Application rollback is allowed when DB schema remains backward-compatible. If a migration is not backward-compatible, use a forward fix or restore the paired DB backup; never blindly deploy old code against a newer incompatible schema.
