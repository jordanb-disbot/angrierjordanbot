# Angrier Jordan — Implementation Checkpoint 07

Date: 2026-09-21  
Status: **PASS**

## Scope completed

Checkpoint 07 implements the automated moderation/security layer that follows the manual moderation, Hotseat, case, evidence and appeal work from Checkpoints 04–06.

Implemented runtime domains:
- AutoMod message-rule evaluation
- behavior heat / progressive discipline
- Join Gate and lightweight interaction verification
- automatic anti-raid state transitions
- anti-nuke audit-event monitoring and containment
- Throne-only Panic Mode with exact pre-panic channel-state restoration

## AutoMod

The message evaluator now covers the source-of-truth rule families that can be detected safely from Discord message events without an external ML provider, including:
- rapid message flooding
- duplicate/repeated text
- excessive caps
- excessive newlines
- excessive emoji
- sticker spam
- attachment flooding
- mass mentions
- invite links
- suspicious URL shorteners
- phishing/scam-style URLs
- configured banned phrases
- Unicode/Zalgo-style obfuscation
- very long message abuse

Trusted-domain and banned-phrase lists are DB-backed settings. Staff may be exempt from ordinary nuisance thresholds, but safety-critical URL / obfuscation monitoring remains available.

Serious AutoMod actions create permanent numbered moderation cases with `SYSTEM` as the actor. Depending on the decision, the Discord adapter can delete, warn, quarantine, timeout, or route for review. Quarantine reuses the encrypted evidence system from Checkpoint 06 and member notices keep the **Request Review** path.

## Behavior heat / progressive discipline

`BehaviorEvent` is now used as the persisted event source for an explainable, decaying score:
- recent violations contribute more than old ones;
- similar repeated violations receive a bounded repeat multiplier;
- configured warning / short-timeout / long-timeout / review thresholds are respected;
- severe rule context may bypass lower steps;
- score existence alone does not punish a member;
- staff heat adjustments require a written reason and are audited.

Default short and long timeout durations are now settings instead of code-only values.

## Join Gate / verification

Join Gate now evaluates:
- account age as a screening signal rather than an automatic violation;
- join velocity;
- suspicious username patterns;
- prior server moderation history;
- current Restricted / Lockdown state;
- unauthorized bot additions.

Young accounts by themselves are only flagged for review. Untrusted bot additions are treated as the high-confidence reject path. Members requiring verification have normal member access withheld after rules acknowledgment until they complete the server-side **Verify** interaction.

Verification state is persisted with the existing `VerificationState` model.

## Anti-raid

Persisted server security modes are now:
- `NORMAL`
- `ALERT`
- `RESTRICTED`
- `LOCKDOWN`

Automatic evaluation uses recent join velocity plus serious AutoMod triggers. Non-panic states receive persisted expiration jobs and can safely return to Normal after the configured de-escalation interval. Panic Mode cannot be overwritten by automatic raid evaluation.

## Anti-nuke

The Discord adapter now listens for destructive privileged audit-log events such as:
- channel / role creation, deletion and high-risk updates;
- kicks and bans;
- privileged member-role changes;
- bot additions;
- webhook changes;
- guild changes;
- channel permission-overwrite changes.

Burst thresholds are owner-configurable. Monitoring remains active for explicitly trusted identities; trust raises containment thresholds but does not make destructive activity invisible.

When containment is triggered and Discord hierarchy permits it, Angrier Jordan removes manageable roles carrying dangerous administrative permissions from the actor, creates a numbered `ANTI_NUKE` case, logs exactly what was removed, and can enter Lockdown. The server owner remains protected from impossible role-removal claims.

## Panic Mode

`/panic activate reason:` now matches the canonical command contract. Activation:
- requires Throne / server-owner authority;
- snapshots current `@everyone` Send Messages state per ordinary text channel;
- applies temporary send restrictions;
- enters `LOCKDOWN`;
- records runtime feature locks for vulnerable interactive systems;
- creates an audited numbered Panic case;
- posts to the configured staff/security log.

`/panic deactivate` uses an explicit **Confirm Restore** button. Deactivation restores the exact saved channel Send Messages state rather than guessed defaults and restores the pre-panic security mode.

Invite deletion is intentionally **not** performed because Discord invite codes cannot be losslessly recreated. The snapshot records that invite suspension was not applied instead of pretending the action is safely reversible.

## Database / registry changes

Migration `0007_automated_security` adds:
- `SecurityModeState`
- `SecurityEvent`

Existing persisted models now actively used by the security layer:
- `BehaviorEvent`
- `VerificationState`

Registry totals:
- **192** conceptual interactions
- **178** settings
- **40** capabilities
- **65** generated Discord application commands
- **64** top-level chat-input commands

New/expanded settings cover:
- AutoMod enablement
- banned phrase list
- trusted domains
- progressive-discipline timeout durations
- Join Gate minimum account age
- anti-nuke burst thresholds
- trusted users and bots

New capabilities:
- `security.raid_control`
- `security.automod_review`
- `security.heat_adjust`

## Verification

- Domain tests: **54 passed / 0 failed**
- Domain TypeScript typecheck: **PASS**
- Registry validation: **PASS**
- Production wiring structural validation: **PASS**
- Help coverage: **PASS**
- Asset validation: **PASS**
- Full preflight: **PASS**
- Prisma models/tables: **75 / 75**
- Production visual library: **348 assets/templates**

Environment-gated checks remain pending:
- live Discord/PostgreSQL smoke test requires credentials;
- Prisma client regeneration requires workspace dependency installation;
- full bot adapter typecheck remains blocked by the existing workspace dependency / monorepo `rootDir` packaging issue. A direct compile was still useful to catch and fix a Checkpoint 07 syntax issue before packaging.

## Next checkpoint

Begin **Phase 4 — Economy Foundation**:
- durable wallet/bank ledger accounts;
- transactional Ottoman transfers;
- bank storage and upgrades;
- inventory/catalog persistence;
- `/daily`, `/weekly`, `/work`, `/fish`, `/dig`, `/scavenge` foundation;
- idempotency/concurrency acceptance tests before casino, race/fight wagering, auctions or other escrow-heavy systems.
