# Shared Engine Contracts

These engines are mandatory reuse points. Feature modules may configure them, not reimplement them.

## SessionEngine
Owns lifecycle for any restart-sensitive interaction: `DRAFT -> OPEN -> LOCKED -> SETTLING -> CLOSED|CANCELLED`.
Required: idempotency key, guild/channel/message refs, owner, participant snapshot, expires_at, extension budget, persisted state, recovery hook.
Used by: Race, Fight, WYR, WWYD, Finish Sentence, FMK, One Word Story, PvP, Giveaways, Auctions, Polls, Superlatives, AMA windows.

## TimerEngine
Persistent timers only. A timer is a DB record plus deterministic handler. Startup reconciles overdue jobs exactly once. Never depend solely on `setTimeout` for business state.

## VotingEngine
Configurable: eligible voters, hidden/live totals, anonymous/named ballots, editable vote, choices, self-vote policy, close strategy, tie strategy, runoff strategy. Stores one canonical ballot/member/question.

## LedgerEngine
All Ottoman movement is double-entry-ish ledger accounting with immutable transaction rows. No feature updates balances directly. Supports credit, debit, transfer, fee/sink, refund, correction, inheritance, reward, wager settle.

## EscrowEngine
Reserves Ottomans/items before a contested or delayed result. Supports `RESERVED -> SETTLED|REFUNDED|FORFEITED`. Must be atomic and idempotent.

## PermissionEngine
One capability service for bot and dashboard. Role hierarchy is input; feature code asks `can(member, capability)`.

## ConfigService
One schema-aware service. JSON files seed defaults; live values are PostgreSQL-backed. Supports validation, source metadata, audit, cache invalidation, safe rollback for marked values.

## ContentService
Versioned authored records with enabled flag, tags, use_count, last_used_at, recent-history exclusion, underused weighting, safe bulk import validation.

## Renderer
All dynamic graphics render from deterministic templates and functional data. Shared shells: profile, event lobby, voting, results, economy, moderation, leaderboard, confirmation, empty/error state.

## AuditService
Append-only audit event: actor, source, action, target, before, after, reason, request_id, timestamp. All staff/admin/dashboard mutations must call it.

## Scheduler
Idempotent scheduled jobs with unique execution key `{job}:{period}`. Handles daily/weekly/monthly resets, lottery, interest, spotlight freeze/post, temporary punishments, proposal/auction expiry.

## Rules
1. No feature may create a second wallet/balance update path.
2. No feature may create bespoke voting storage if VotingEngine can express it.
3. No feature may use non-persistent timers for consequential state.
4. No dashboard route may bypass ConfigService/PermissionEngine/AuditService.
5. Native workflow custom commands delegate to feature handlers; they never duplicate logic.
