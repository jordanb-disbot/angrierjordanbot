# Angrier Jordan — Implementation Checkpoint 06

Date: 2026-09-21  
Status: **PASS**

## Scope completed

Checkpoint 06 completes the remaining manual moderation/security surfaces before automated security work.

Implemented command paths:
- `/mod lock [channel] reason:`
- `/mod unlock [channel]`
- `/mod slowmode [channel] duration:`
- `/mod quarantine message_link: reason:`
- `/mod staff-alert @member reason:`
- `/mod modstats [period]`

Implemented review workflow:
- member **Request Review** remains idempotent if clicked repeatedly
- new appeals are posted to the configured staff log with **Uphold / Modify / Reverse** controls
- outcome actions require a written rationale through a modal
- the original acting moderator cannot be the sole reviewer of their own case
- appeal outcomes are persisted on the appeal and numbered case history
- timeout/ban review modifications can change the remaining duration and reschedule expiry
- reversals apply Discord undo where technically possible, then persist the appeal result

## Channel state safety

`/mod lock` captures the pre-lock `@everyone` Send Messages state as **allow / deny / inherit** before Angrier Jordan changes it. `/mod unlock` restores exactly that bot-owned permission state rather than guessing a default. Unrelated permission edits made while the channel is locked are not overwritten.

An active lock snapshot prevents double-locking the same channel. Lock/unlock enforcement failures retain a failed numbered case instead of claiming success.

Slowmode accepts `off` or a bounded duration up to Discord's six-hour maximum and records the previous and new rate-limit values in the case history.

## Quarantine/evidence

Message quarantine now:
1. validates a Discord message link from the current server,
2. captures the target message plus bounded surrounding context,
3. creates a numbered `QUARANTINE` case,
4. encrypts retained content with **AES-256-GCM** using `EVIDENCE_ENCRYPTION_KEY`,
5. stores only restricted encrypted content plus non-content identifiers/metadata,
6. deletes the public message,
7. schedules evidence-content deletion using the configured `moderation.evidence_retention_days` value (30 days by default), and
8. posts the event to the configured staff log when available.

Evidence expiry removes retained content while allowing non-content audit metadata to remain.

## Staff alerts and operational stats

`/mod staff-alert` is explicitly **non-punitive**. It creates a persistent internal alert and audit entry without creating a punitive moderation case.

`/mod modstats` reports operational moderation totals for a bounded period or all time. It includes case/action/status counts, quarantines, staff alerts, and appeal outcomes. It intentionally does **not** rank moderators.

## Database / registry changes

Migration `0006_moderation_security_controls` adds:
- `StaffAlert`
- `ChannelModerationState`

The shared capability registry adds:
- `moderation.lock`
- `moderation.slowmode`
- `moderation.quarantine`
- `moderation.staff_alert`
- `moderation.modstats`

The command registry now requires an explicit reason for `/mod lock` and `/mod quarantine`, matching the moderation rule that destructive actions require a reason.

## Verification

- Command registry: **192 interactions**
- Settings: **168**
- Capabilities: **37**
- Generated application commands: **65**
- Top-level chat-input commands: **64**
- Prisma models/tables: **73 / 73**
- Production visual library: **348 assets/templates**
- Domain tests: **45 passed / 0 failed**
- Domain TypeScript typecheck: **PASS**
- Registry validation: **PASS**
- Production wiring structural validation: **PASS**
- Help coverage: **PASS**
- Asset validation: **PASS**
- Full preflight: **PASS**

Environment-gated checks remain pending:
- live Discord/PostgreSQL smoke test requires credentials
- Prisma client regeneration requires workspace dependency installation
- full bot adapter typecheck requires workspace dependencies / Node typings and retains the pre-existing monorepo `rootDir` packaging issue

## Next checkpoint

Implement automated moderation/security: AutoMod rule execution, behavior heat/progressive discipline, Join Gate, anti-raid state transitions, anti-nuke containment, and Panic Mode snapshot/restore.
