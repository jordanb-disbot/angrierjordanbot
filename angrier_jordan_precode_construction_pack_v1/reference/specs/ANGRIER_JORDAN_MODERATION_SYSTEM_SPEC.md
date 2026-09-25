# Angrier Jordan — Moderation & Security System Spec

## 32. Moderation — FULL-SUITE / SINGLE-BOT MODE

Angrier Jordan is intended to be the **only moderation bot required in the server**. The moderation module therefore includes manual moderation, AutoMod, case management, appeals, anti-spam, join protection, anti-raid, anti-nuke, emergency lockdown, logging, and staff controls in one system.

### 32.1 Moderation posture

Adult-server default posture permits:
- ordinary profanity
- sexual/adult conversation
- dark humor
- consensual shit-talking
- ordinary disagreements and sarcasm

Automated moderation focuses on actual harmful or disruptive behavior:
- targeted/repeated harassment
- credible threats
- doxxing/private information
- scams/phishing
- malicious or deceptive links
- repeated/flood spam
- protected-class hate/slurs
- raid behavior
- destructive privileged-account actions

Use deterministic rules for obvious cases. Use AI only after a relevant trigger when context is genuinely ambiguous. Do **not** run AI classification on every message.

### 32.2 Manual staff commands

Implement the full staff command suite, with permissions controlled by the staff-permission matrix:
- `/mod warn @member reason:`
- `/mod timeout @member duration: reason:`
- `/mod untimeout @member reason:`
- `/mod kick @member reason:`
- `/mod ban @member [duration/permanent] reason:`
- `/mod unban user_id: reason:`
- `/mod purge count: reason: [member]`
- `/mod note @member text:` — staff-only note, never shown to member
- `/mod history @member` — searchable member moderation history
- `/mod case view case_id:` — full case view
- `/mod case edit case_id: reason:` — controlled reason correction with audit trail
- `/mod case reverse case_id: reason:` — reversal/undo where technically possible
- `/lock [channel] [reason]`
- `/unlock [channel]`
- `/slowmode [channel] duration:`
- `/quarantine message:` — staff-triggered message quarantine
- `/staff-alert @member reason:` — non-punitive internal flag
- `/modstats [period]` — operational moderation totals, not a punitive staff leaderboard

All destructive or punitive actions require an explicit reason unless the action is an automated emergency response with a generated reason.

### 32.3 Case management

Every warn, timeout, kick, ban, quarantine, serious AutoMod intervention, anti-raid action, anti-nuke action, appeal outcome, and manual reversal creates or links to a permanent numbered moderation case.

Each case stores:
- case ID
- subject Discord user ID where applicable
- action type
- reason/category
- acting staff member or `SYSTEM`
- timestamps
- source channel/message IDs where available
- evidence references/snapshots where authorized
- policy/rule ID that triggered the case
- original action duration
- current status: open / active / expired / reversed / appealed / upheld / modified
- edit/reversal history
- appeal history/outcome

Case IDs never get reused.

### 32.4 Evidence and quarantine

Quarantine behavior:
- remove the public message when Discord permits deletion
- preserve restricted evidence/context for staff review
- capture enough surrounding context to understand the incident, not just one isolated sentence
- evidence retained **30 days** by default
- original content deleted from retained evidence after the retention window
- non-content audit metadata may remain longer
- access limited to authorized staff roles

Discord does not provide a true hidden-but-not-deleted message state. Where the spec says quarantine, the implementation means remove from normal public visibility and preserve authorized evidence separately.

### 32.5 Member notification and appeals

When appropriate, the affected member receives a private explanation containing:
- action taken
- broad policy category
- duration if temporary
- case ID
- **Request Review** button

Appeals:
- route to `🚨-broken-chair`
- Recliner+ may review if allowed by the permission matrix
- original acting moderator may provide context but should not be the sole reviewer of their own action
- reviewer can uphold, modify, or reverse the action
- outcome and rationale are added to the case audit history

### 32.6 AutoMod filter library

Support configurable filters for:
- repeated-message spam
- rapid-message flooding
- duplicate text
- excessive caps
- excessive newlines
- excessive emoji
- sticker spam
- image/attachment flooding
- repeated mentions
- mass mentions
- invite links
- general links by allow/deny policy
- malicious/phishing/scam URLs
- masked/misleading links
- suspicious URL shorteners
- banned words/phrases
- protected-class slurs/hate terms
- Zalgo/obfuscation/unicode abuse
- spoiler abuse
- very long-message abuse
- webhook/bot spam patterns where detectable

Each rule supports a configurable action path such as:
- allow/log only
- warn
- delete
- quarantine/review
- timeout
- escalation through progressive discipline

Role, channel, user, and trusted-domain exemptions are configurable. Safety-critical invariants stay in code.

### 32.7 Progressive discipline / behavior heat

Maintain a bounded, explainable behavior score for recent moderation events rather than treating every event as isolated.

Requirements:
- configurable weights by violation category/severity
- score decays over time
- repeated similar violations escalate faster
- staff can view why the score is elevated
- staff can manually clear/adjust only with audit logging and appropriate permission
- no punishment solely because a score exists; enforcement follows configured thresholds plus rule context
- severe events may bypass lower stages

Default conceptual escalation:
1. log / soft warning
2. warning
3. short timeout
4. longer timeout
5. staff review / restricted state
6. kick or ban when configured/approved

Exact thresholds and durations are owner-editable config.

### 32.8 Join Gate / new-member security

New-member screening may evaluate:
- account age
- rapid join velocity
- suspicious/default-profile characteristics
- suspicious usernames/display names
- known scam/link patterns in immediate post-join activity
- unauthorized bot additions
- repeated join/leave cycling
- prior server case history for the same Discord ID

Actions are configurable:
- allow normally
- flag staff
- require verification
- temporary restricted role/state
- quarantine first messages
- reject/kick only under configured high-confidence rules

Having an alt account is **not** itself a violation. Suspected farming/manipulation is flagged for review rather than automatically punished solely for being an alt.

### 32.9 Verification

Optional verification system for suspicious joins or raid conditions:
- simple button/interaction verification by default
- optional challenge flow if needed later
- verification state stored in database
- verification should not be required for normal trusted members unless enabled by policy or emergency mode
- no unnecessary collection of personal identity information

### 32.10 Anti-raid

Detect abnormal coordinated activity using signals such as:
- join velocity
- many young accounts joining together
- repeated identical/similar messages
- mass mentions
- coordinated invite/link spam
- rapid channel flooding
- many new accounts triggering the same serious rule

Escalation states:
- **Normal**
- **Alert** — staff warning + enhanced logging
- **Restricted** — tighter new-member limits/verification
- **Lockdown** — temporary emergency restrictions

Automatic escalation/de-escalation thresholds are configurable. Staff can manually enter or leave a state when authorized.

### 32.11 Anti-nuke / privileged-account protection

Monitor destructive administrative actions using Discord events/audit-log data where available, including:
- mass channel creation/deletion
- mass role creation/deletion
- repeated kicks/bans
- dangerous permission escalation
- webhook creation/deletion abuse
- unauthorized bot additions
- large-scale channel permission changes
- server configuration changes
- mass member-role removal/addition where detectable

Response may include, subject to Discord role hierarchy and bot permissions:
- immediate staff alert
- create emergency case
- remove dangerous roles/permissions from the actor
- quarantine/restrict the actor
- enter Restricted or Lockdown mode
- temporarily disable vulnerable bot-admin features

The bot must not pretend it can prevent actions Discord has already completed. Anti-nuke is rapid detection, containment, logging, and recovery assistance.

### 32.12 Protected identities and trusted infrastructure

Configurable protected/trusted lists:
- protected roles
- protected users
- trusted bots
- trusted webhooks
- trusted domains
- channels exempt from specific filters
- staff roles exempt from ordinary spam thresholds where appropriate

No staff member is exempt from anti-nuke solely because they hold a privileged role. Throne may define explicit trusted identities, but destructive-action monitoring remains active.

### 32.13 Panic Mode

Throne-only **Panic Mode** provides an emergency one-command response for an active raid/nuke.

`/panic activate reason:` should, within Discord permission limits:
- enter Lockdown state
- restrict ordinary member sends in configured public channels
- stop new-member posting or require verification
- suspend invites where technically available/appropriate
- disable vulnerable bot features such as wagers/transfers/custom-command creation
- raise AutoMod sensitivity to emergency profile
- preserve/log current security context
- post an emergency staff card in `🚨-broken-chair`

`/panic status` shows exactly what protections are active.

`/panic deactivate` requires confirmation and restores the **saved pre-panic state**, not guessed defaults.

Panic activation/deactivation is always audited.

### 32.14 Channel security commands

Provide staff controls for:
- channel lock/unlock
- slowmode
- emergency read-only mode
- new-member-only restrictions
- mass cleanup/purge within safe API limits
- restore tracked pre-lockdown permission state

Never overwrite channel permissions without preserving enough state to restore them accurately.

### 32.15 Logging and audit coverage

`🚨-broken-chair` is the primary staff/security log destination.

Configurable logging supports:
- moderator commands/actions
- warnings/timeouts/kicks/bans/unbans
- message delete/edit events where configured
- AutoMod triggers
- quarantine events
- appeals/reversals
- member joins/leaves
- suspicious joins
- role changes
- channel create/delete/update
- role create/delete/update
- webhook changes where observable
- server configuration changes where observable
- anti-raid state changes
- anti-nuke alerts/actions
- Panic Mode changes
- moderation/configuration changes

Low-value events may be summarized/batched to avoid flooding staff logs.

### 32.16 Staff permission matrix — safe defaults

Permissions are DB-backed config seeded from defaults and must always be constrained by code-level security rules.

**Recliner — moderator default**
- warn
- timeout / remove timeout
- purge
- staff note
- member history / case view
- quarantine/delete
- appeal review subject to independence rule
- channel slowmode
- ordinary AutoMod review
- no bans by default
- no Panic Mode
- no anti-nuke configuration

**Chaise Lounge — administrator default**
- all Recliner capabilities
- kick
- ban / unban
- lock / unlock channels
- configure moderation rules within owner-set bounds
- Join Gate / raid-state controls
- trusted-domain/list management if enabled by Throne
- no destructive global reset
- no Panic Mode activation by default unless Throne grants it

**Throne — owner**
- all moderation/security capabilities
- Panic Mode
- anti-nuke configuration
- protected/trusted identity management
- destructive security overrides
- retention/configuration bounds

Discord guild owner remains engineering-level emergency super-admin.

### 32.17 Automatic expiration and restart safety

Temporary moderation actions must survive bot restarts:
- timeouts
- temporary bans if implemented by bot-managed unban job
- restricted/verification states
- channel lockdowns with scheduled end
- raid/security states with optional expiration

Use persisted jobs/idempotent reconciliation so actions are not lost or applied twice after restart.

### 32.18 Search and staff UX

Staff should be able to search/filter cases by:
- member
- moderator
- case ID
- action type
- violation category
- date range
- active/expired/reversed/appealed status

Routine staff controls should use Discord buttons/selects/modals where they materially improve safety and reduce mistyped commands.

### 32.19 Configuration boundary

**Code / invariants**
- authorization checks
- Discord hierarchy validation
- transactional case creation
- appeal-independence enforcement
- evidence access control
- safe restoration of lockdown state
- anti-nuke containment logic
- progressive-discipline algorithm
- idempotent expiry jobs
- hard safety bounds

**Owner-editable config / DB-backed settings**
- enabled filters
- thresholds
- violation weights
- timeout/escalation durations within hard bounds
- action mapping
- channel/role/user exemptions
- trusted domains/bots/webhooks
- join-age thresholds
- raid velocity thresholds
- verification behavior
- evidence retention within supported bounds
- staff capability matrix
- logging destinations/verbosity
- Panic Mode profile

**Content/data files**
- banned word/phrase catalogs
- scam/phishing patterns where safely maintainable
- user-facing moderation explanations
- warning/appeal copy
- staff alert copy

**Database state**
- moderation cases
- evidence metadata/content subject to retention
- appeals
- staff notes
- behavior heat/events
- verification/restriction state
- security mode state
- temporary-action expiry jobs
- configuration overrides

**Secrets**
- any AI moderation provider credential/API key remains environment-secret only

### 32.20 Single-bot installation requirement

Because Angrier Jordan is intended to replace separate moderation/security bots, setup validation must verify that **The Chairman** has the Discord permissions and role placement required for every enabled feature. The installer must clearly report missing capabilities rather than silently degrading security behavior.

At minimum, depending on enabled modules, this may include permissions such as Manage Messages, Moderate Members, Kick Members, Ban Members, Manage Channels, Manage Roles, View Audit Log, Manage Webhooks, and related permissions required by Discord for the selected controls.

The Chairman's role must be positioned high enough in Discord's role hierarchy to manage the members/roles it is expected to moderate. The bot must never claim an enforcement action succeeded until Discord confirms it.

---

## Moderation Jail / The Hotseat

Implement the moderation jail exactly as defined in Canonical Build Spec §32.21. It is a real access-containment action, distinct from crime/economy jail.

### Required commands
- `/jail roster [type: all|crime|moderation]`
- `/jail status [member]`
- `/jail send @member duration: reason:`
- `/jail release @member reason:`
- `/jail extend @member duration: reason:`
- `/jail reduce @member duration: reason:`
- `/jail reason @member`
- `/jail history @member`

### Required safety properties
- Never report successful confinement when Discord Administrator permission or hierarchy prevents it.
- Preserve/restore only bot-owned jail restrictions and explicitly suspended roles.
- Persist through restart and member leave/rejoin.
- Bail never releases moderation jail.
- Moderation release never silently clears crime jail.
- Every sentence/change is attached to a numbered moderation case.
- Jailed members retain Request Review access.
- Default jail channel is `🔥-hotseat`; configured by channel ID.
- Default jail role is `Jailed`; configured by role ID.
- Default staff-role suspension is disabled and, if enabled, Throne-only.
