# Angrier Jordan — Custom Commands System Specification

## Purpose

Angrier Jordan includes a safe, owner-configurable custom command system so the server does not depend on YAGPDB for custom triggers, reaction-role style workflows, or lightweight command aliases.

The system is intentionally **not** a general-purpose scripting engine. It must not execute arbitrary JavaScript, Go templates, shell commands, SQL, arbitrary HTTP requests, or owner-supplied code. Custom commands are assembled from validated triggers, conditions, templates, and approved bot actions.

## Primary management surfaces

### Web dashboard
Preferred interface for building and maintaining custom commands.

Dashboard page: **Custom Commands**

Functions:
- create
- edit
- clone
- enable/disable
- delete
- test/preview
- search/filter
- reorder actions
- inspect usage
- view audit history
- import/export Angrier Jordan custom-command definitions

### Discord admin commands
- `/custom-command create`
- `/custom-command edit`
- `/custom-command delete`
- `/custom-command enable`
- `/custom-command disable`
- `/custom-command list`
- `/custom-command test`
- `/custom-command clone`
- `/custom-command info`

Alias `/cc` may be registered for staff convenience if command-space limits permit.

Throne: full access.
Chaise Lounge: create/edit/delete by default.
Recliner: view/test only by default unless explicitly granted.

## Trigger types

Supported v1 triggers:
1. **Exact text** — e.g. `!race`, `!roles`, `line start`.
2. **Prefix** — e.g. `!say <text>`.
3. **Contains phrase** — optional, bounded and rate-limited.
4. **Regex / pattern** — advanced staff-only option with validated safe regex and execution timeout.
5. **Native interaction alias** — exposes a custom label/button or approved alias that delegates to an existing Angrier Jordan workflow.

Top-level dynamically registered Discord slash commands may be supported for a small bounded set, but the normal custom-command model should not depend on dynamically creating hundreds of global application commands. Text aliases and dashboard-configured workflow buttons are preferred for lightweight custom behavior.

## Conditions

Each command may optionally require:
- one or more allowed channels
- one or more excluded channels
- required role(s)
- excluded role(s)
- staff capability
- command invoker not jailed
- per-user cooldown
- per-channel cooldown
- guild-wide cooldown
- minimum account/server tenure where useful
- argument count/type validation

The runtime always re-checks permissions. A command creator cannot grant themselves or another user powers above their own authority.

## Safe action library

A custom command may execute one or more approved actions in order.

### Messaging
- send plain text
- send embed/card
- reply to triggering member
- DM triggering member
- add configured reactions to the bot's response
- delete trigger message when allowed
- ephemeral response for interaction-based triggers

### Role actions
- add role to invoker
- remove role from invoker
- toggle role for invoker
- show a configured self-role panel

Role actions are restricted to an explicit **assignable-role allowlist** and must respect Discord role hierarchy. Custom commands may never grant staff, administrator, bot-managed, security, jail, or otherwise protected roles unless a separate code-controlled workflow explicitly allows it.

### Native workflow actions
Custom commands may delegate to existing Angrier Jordan systems instead of duplicating their logic. Initial workflow action IDs:
- `race.start`
- `line.start`
- `role_panel.show`
- `introductions.open`
- `help.show`
- `shop.open`
- `profile.show_self`
- `fortune.run`

More workflow action IDs may be added as features are built. Every workflow action uses the native feature's own permission checks, cooldowns, channel rules, transactions, and state machine.

### Utility actions
- wait a bounded short delay between response actions
- choose one random response from an approved content pool
- set local variables from validated arguments
- branch on simple safe conditions such as role/channel/argument presence

No arbitrary external network callbacks/webhooks in v1.

## Safe templating variables

Custom response copy may use bounded template values such as:
- `{user}` — display name
- `{mention}` — member mention
- `{user_id}`
- `{channel}`
- `{channel_id}`
- `{server}`
- `{member_count}`
- `{args}`
- `{arg1}` ... bounded argument positions
- `{random_member}` where explicitly enabled and eligibility rules pass

Templating is escaped/sanitized. It cannot execute code or arbitrary expressions.

## Reaction roles / self roles

Angrier Jordan's preferred replacement for YAGPDB reaction roles is the existing **Self Roles / Role Panels** system using buttons or select menus rather than relying only on emoji reactions.

Custom commands can:
- post/open an existing role panel via `role_panel.show`
- create a shortcut such as `!roles` that shows the panel
- optionally post a bot-owned message with reactions when a legacy reaction-based experience is desired

Actual role assignment remains handled by the native self-role engine so role safety, exclusivity groups, prerequisites and audit behavior are centralized.

## Existing YAGPDB use-case migration

### Current reaction-role commands
Recreate each as a native Angrier Jordan self-role panel. If Jordan wants to keep the old trigger phrase, attach a custom-command alias that executes `role_panel.show`.

### Current race-start command
Create a custom command using the existing trigger Jordan prefers and delegate to `race.start`. The native `/race` engine remains authoritative; custom commands do not duplicate betting, entrant, timer or settlement logic.

### Current line-start command
Create a custom command using the existing trigger Jordan prefers and delegate to `line.start`. The existing `!line` readiness/countdown engine remains authoritative.

This allows the existing server habits to remain familiar while eliminating YAGPDB.

## Builder data model

Each custom command stores at minimum:
- `id`
- `name`
- `description`
- `enabled`
- `trigger_type`
- `trigger_value`
- `case_sensitive`
- `conditions`
- `actions[]`
- `cooldowns`
- `allowed_channels[]`
- `excluded_channels[]`
- `required_roles[]`
- `excluded_roles[]`
- `created_by`
- `updated_by`
- `created_at`
- `updated_at`
- `usage_count`
- `last_used_at`
- `content_version`

## Dashboard builder UX

The mid-level dashboard adds a **Custom Commands** page with:
- command list with enabled status, trigger and usage count
- Create Command button
- trigger editor
- conditions panel
- ordered action builder
- response/template editor
- channel and role selectors
- cooldown fields
- Test Command preview
- Save Draft / Enable
- duplicate/clone
- delete confirmation
- audit-history drawer

For native workflow actions, the dashboard presents a dropdown of supported actions rather than requiring technical action IDs.

## Security invariants

These remain code-enforced and cannot be weakened by configuration:
- no arbitrary code execution
- no arbitrary SQL
- no shell execution
- no unrestricted HTTP requests
- no secret/environment access
- no staff/protected role assignment through generic role actions
- Discord role hierarchy always respected
- native workflow permissions always rechecked at execution
- jailed users remain subject to jail restrictions
- command/action count, regex complexity, response size and execution time have hard caps
- recursive custom-command invocation is prohibited
- loops are prohibited
- every create/edit/delete/enable/disable action is audited

## Code vs Config vs Database vs Content

### Code
- trigger matcher/router
- safe templating engine
- action executor
- permission enforcement
- role hierarchy safety
- native workflow dispatch
- regex timeout/validation
- recursion/loop prevention
- rate-limit enforcement
- audit hooks

### Config
- feature enablement
- which staff roles may manage commands
- maximum commands
- allowed trigger types
- global hard-within-bounds cooldown defaults
- assignable-role allowlist
- channels where custom commands may operate
- allowed native workflow actions

### Database
- command definitions
- conditions/actions
- usage counts
- last-used timestamps
- per-command cooldown state as necessary
- audit history/config versions

### Content
- response text/templates
- reusable response pools

### Assets
No unique asset is required for the engine itself. Custom response cards may use the standard Angrier Jordan card templates.

### Secrets
None required for the base custom-command engine.

## Launch defaults

- custom commands enabled
- management: Throne + Chaise Lounge
- Recliner view/test only
- text exact/prefix triggers enabled
- contains/regex triggers disabled by default until explicitly enabled
- safe native workflow delegation enabled
- maximum custom commands: 100 for this private server
- maximum actions per command: 8
- maximum execution duration: 5 seconds excluding approved native workflows
- recursive custom command calls: disabled
- external HTTP callbacks: disabled
- arbitrary scripts/templates: disabled

