# Angrier Jordan — Implementation Checkpoint 04

Date: 2026-09-21
Status: PASS / live smoke pending credentials

## Scope completed

This checkpoint implements the moderation Hotseat execution layer on top of the persistent onboarding/rejoin foundation.

### Moderation Hotseat service
- `/jail send`, `/jail release`, `/jail extend`, `/jail reduce`, `/jail reason`, `/jail history`, `/jail roster`, and `/jail status` now have reconciled registration metadata and implementation contracts.
- Moderation Hotseat sentences support human-readable durations from 5 minutes through 30 days plus `indefinite` manual release.
- Every send/change/release creates or links a numbered moderation case and audit event.
- Only one active moderation Hotseat sentence may exist per member.
- Sentence expiry is persisted, scheduled, restart-safe, and idempotent.
- Leaving the server pauses finite moderation sentences; returning after rules acknowledgment resumes the stored remaining duration.
- Indefinite sentences persist without unsafe numeric timer conversion.
- Moderation release does not clear a separate crime-jail state.
- Request Review remains available to the jailed member and links back to the original moderation case.

### Discord containment
- The configured `Jailed` role is reconciled across server channels.
- Ordinary channels deny visibility/participation to the Jailed role.
- The configured Hotseat channel remains available with plain-text/reaction/application-command access; links and attachments follow configuration.
- Voice connection/speaking and thread creation are denied by default while moderation-jailed.
- New server channels receive the Hotseat overwrite policy through channel-create reconciliation.
- Angrier Jordan validates moderator authority, server role hierarchy, bot manageability, Administrator bypass, and actual post-role channel containment before claiming a jail succeeded.
- A member with Administrator cannot be role-only jailed. Optional Administrator-role suspension is disabled by default, configurable only at the locked high-risk setting, and requires Throne authority at execution.
- Only roles explicitly suspended by the Hotseat action are considered for restoration.

### Release safety
- Manual release and scheduled expiry now track Discord-side changes so an incomplete database transition can restore the prior jailed state instead of accidentally freeing a still-active sentence.
- Announcement/DM failures after the sentence is successfully committed do not roll back the moderation action.
- Role restoration failures do not block release; only safe/manageable explicitly suspended roles are restored.
- Normal member access restoration runs only after no active jail state remains.

### Interaction containment
- A moderation-jailed member is limited to jail-safe slash commands.
- Stale interactive components are also blocked: WYR voting/replay, role selectors, and future ordinary game/community component controls cannot be used to bypass Hotseat.
- Rules acknowledgment and Request Review remain available while jailed.

### Registry and generated-contract reconciliation
- Registry remains 192 conceptual interactions.
- Settings schema is now 168 entries, adding `moderation.jail.staff_role_suspension_enabled`.
- Capability contracts include Hotseat extend/reduce/reason-other/history/roster capabilities.
- Discord application-command generation now carries the complete `/jail` option contracts.
- Generated output remains 65 Discord application commands, 64 of them chat-input commands.
- Dashboard-facing access copy now says **server owner**, while Discord/API-internal `guild` identifiers remain unchanged.

## Database changes

Migration `0004_hotseat_execution` adds moderation-release persistence fields to `JailSentence`:
- `indefinite`
- `releaseReason`
- `releasedByUserId`

Database schema version is now `0004_hotseat_execution`.

## Production wiring

- Added `DiscordJailCoordinator`.
- Added `jail.expire` scheduler execution.
- Added startup Hotseat permission/schedule reconciliation.
- Added channel-create permission reconciliation.
- Added jail-safe slash-command and component guards.
- Added Request Review component routing.
- Hotseat remains behind `ENABLE_JAIL_SMOKE=false` by default until live validation is completed.

## Verification

- command/code generation: PASS — 192 interactions / 168 settings / 31 capabilities / 65 Discord application commands;
- domain TypeScript typecheck: PASS;
- runtime/domain tests: PASS — 31/31;
- registry validation: PASS;
- content validation: PASS;
- production visual manifest: PASS — 348 assets/templates;
- production wiring structural validation: PASS;
- full preflight: PASS.

## Environment-limited validation

A live Discord/PostgreSQL Hotseat smoke test has not been executed because this workspace does not contain the user's production/development credentials or a live database connection. Prisma client regeneration also requires installing the workspace dependencies first. The repository therefore keeps `ENABLE_JAIL_SMOKE=false` by default.

Before enabling Hotseat in the development server:
1. install workspace dependencies;
2. provide `DATABASE_URL`, `DISCORD_TOKEN`, `DISCORD_APPLICATION_ID`, and `DISCORD_GUILD_ID`;
3. run Prisma client generation and apply migrations through `0004_hotseat_execution`;
4. ensure the Discord Server Members privileged intent is enabled;
5. configure the Jailed role, Hotseat channel, staff roles, and Angrier Jordan role hierarchy;
6. set `ENABLE_ONBOARDING_SMOKE=true` and `ENABLE_JAIL_SMOKE=true`;
7. test finite/indefinite send, hierarchy refusal, Administrator refusal, extend/reduce, review, leave/rejoin pause, expiry, manual release, role restoration, and restart recovery.

## Next checkpoint

Continue the moderation stack: numbered case/history surfaces and manual moderation execution (`warn`, `timeout`, `untimeout`, `kick`, `ban`, `unban`, `purge`) using the same capability, audit, hierarchy, expiry, and safe-restoration foundations.
