# Angrier Jordan — Interactive Tutorial & Help System Specification

**Status:** LOCKED FOR BUILD  
**Scope:** Single-guild private deployment  
**Goal:** Teach members how Discord and Angrier Jordan work through short, contextual, interactive guidance instead of relying on a command list.

## 1. Product direction

`/help` remains the fast reference. `/tutorial` is the teacher.

The tutorial system must support people who are:
- new to Discord;
- comfortable with Discord but new to bots/slash commands;
- new to Angrier Jordan;
- learning a specific game or system;
- staff learning moderation/admin workflows.

The system is intentionally visual and button-driven. Long walls of text are avoided. Complex commands must explain every required and optional field in plain language.

## 2. Member entry points

Launch entry points:
- `/tutorial`
- `/tutorial continue`
- `/tutorial progress`
- `/tutorial restart [path]`
- `/tutorial path <path>`
- `/tutorial command <command>`
- `/help [command]`
- persistent **Show Me Around** button on the welcome/start panel;
- contextual **How This Works** / **Help** buttons on complex Angrier Jordan cards and controls.

`/help` should support command autocomplete/search and return concise usage, fields, examples and a **Walk Me Through It** button when a tutorial exists.

## 3. Tutorial paths

Launch paths:
1. **New to Discord** — channels, mentions, reactions, roles, slash commands, buttons, modals, DMs and voice basics.
2. **New to Bots** — slash command discovery, required/optional fields, autocomplete, ephemeral replies, buttons, confirmations and bot permissions.
3. **Angrier Jordan Essentials** — profile, introductions, roles, help/tutorial, DMs, server routing and basic etiquette.
4. **Economy & Shop** — Ottomans, wallet/bank, daily/weekly, statement, shop, inventory, gifts, tools and crafting.
5. **Games & Activities** — Race, Fight, party games, PvP games, channel games and voting.
6. **Crime & Family** — robbery, wanted/jail consequences, marriage, adoption, auctions and wills.
7. **Music** — play/search/link behavior, queue, controls, playlists, DJ authority and voice-channel text requirements.
8. **Community** — polls, superlatives, suggestions, AMA, Chairisms, self roles and introductions.
9. **Safety & Moderation** — what AutoMod does, appeals/review, Hotseat, member privacy and how to report issues.
10. **Staff Academy** — moderation cases, warnings/timeouts/bans, evidence, appeals, Hotseat, raid/anti-nuke, Panic Mode and audit expectations.
11. **Owner/Admin** — dashboard, configuration boundaries, custom commands, content management and high-risk controls.
12. **Command Finder** — search/browse a specific command and open its field-level walkthrough.

## 4. Lesson UX

Each lesson is a short card with:
- title;
- one-sentence purpose;
- 2–5 short teaching steps;
- relevant command(s);
- required versus optional field explanation where applicable;
- one realistic example;
- **Practice**, **Back**, **Next**, **Exit Tutorial** buttons;
- **Open Quick Help** when a command has a help catalog entry.

Routine tutorial interactions are ephemeral so learning does not clutter public channels.

## 5. Command-field teaching

Every canonical slash command must have help metadata. Any command with fields must define for each field:
- display name;
- argument name;
- required/optional;
- plain-English purpose;
- accepted value/type;
- safe example;
- validation or important limits;
- whether the field is visible/public in the resulting action.

A complex command tutorial follows this order:
1. what the command does;
2. exact command/subcommand;
3. each field one by one;
4. required fields first;
5. realistic completed example;
6. what happens after submission;
7. common mistakes;
8. optional practice simulation.

## 6. Practice mode

Practice must teach without damaging real server state.

Practice types:
- `ephemeral_demo` — bot renders a fake/example result using fictional data;
- `guided_form` — member fills a practice modal and receives a preview only;
- `safe_live` — performs a harmless personal action, such as opening profile/help;
- `read_only_walkthrough` — highlights controls without executing anything.

The tutorial must never create real wagers, move Ottomans, punish members, assign protected roles, start raids/lockdowns, create a real moderation case, publish private information, or execute destructive/admin actions in practice mode.

Discord buttons cannot pre-fill arbitrary slash-command text. Therefore **Try It** buttons either run a safe tutorial simulation directly or instruct the user exactly what to type; they must not pretend Discord supports command pre-fill when it does not.

## 7. Contextual help rule

Every feature that is not immediately self-explanatory must expose contextual help from its primary UI.

Examples:
- Blackjack → **How to Play**
- Crafting → **How Crafting Works**
- Robbery → **How Crime Works**
- Marriage/Family → **How Families Work**
- Race/Fight → **How Betting Works**
- Poll/Superlatives → **Voting Help**
- Music controller → **Music Help**
- Introduction form → **Introduction Help**
- Moderation case card → **Case Help** for authorized staff
- Hotseat control → **Jail / Hotseat Help**
- Custom-command editor → **Custom Command Guide**

Contextual help should preserve the user's current task and return them to it when possible.

## 8. Progress

Store private tutorial progress per member:
- path started;
- current lesson;
- completed lessons;
- completed paths;
- dismissed welcome tutorial prompt;
- last tutorial activity;
- optional practice completion flags.

Commands:
- `/tutorial continue`
- `/tutorial progress`
- `/tutorial restart [path]`

No Ottoman, badge, leaderboard or other economy reward is granted for tutorial completion.

Content edits must not unnecessarily reset member progress. Lessons use stable IDs and content versions.

## 9. Audience and permission filtering

Tutorial visibility follows real bot permissions:
- normal members never see staff/admin-only commands in help/tutorial search;
- Recliner sees only moderation lessons/actions they actually have capability to use;
- Chaise Lounge receives configured staff/admin lessons;
- Throne receives all lessons;
- disabled modules and unavailable commands are hidden or clearly marked unavailable.

The tutorial system must never become a way to discover hidden admin commands or bypass permission checks.

## 10. Dashboard — Tutorial & Help editor

Add a **Tutorial & Help** dashboard page with:
- enable/disable paths and lessons;
- reorder paths/lessons;
- edit titles, summaries, steps, examples and tips;
- edit contextual-help labels/copy;
- preview member and staff views;
- search command help definitions;
- show commands missing required help metadata;
- show features missing contextual help;
- validate broken command/tutorial links;
- publish/save drafts;
- version/audit all edits.

Hard security/safety warnings may be marked `locked_copy` and cannot be removed from the dashboard, though surrounding explanatory text may be owner-editable.

## 11. Configuration vs content vs code

### Code
- tutorial navigation/state machine;
- audience/permission filtering;
- practice sandbox and prohibition of real side effects;
- command metadata validation;
- contextual-help routing;
- progress persistence/version reconciliation;
- command/help search;
- stable lesson-ID handling;
- rendering and pagination;
- hard requirement checks used by CI/build validation.

### Config
- enabled tutorial paths;
- lesson order;
- welcome tutorial prompt/button placement;
- contextual-help enablement;
- default tutorial path;
- dashboard editing capabilities;
- ephemeral/public presentation defaults;
- whether Discord-basics lessons are enabled.

### Content
- lesson titles;
- explanations;
- examples;
- tips/common mistakes;
- command field descriptions;
- contextual-help text.

### Database state
- member progress;
- lesson/path completion;
- tutorial dismissals;
- published content versions;
- dashboard-authored tutorial overrides;
- tutorial edit audit records.

### Assets/templates
- branded tutorial cards/frames/icons where custom rendering is used.

### Secrets
None specific to tutorial. Existing Discord/dashboard secrets remain environment-managed.

## 12. New development rules — mandatory Definition of Done

A user-facing feature is **not finished** until its learning/help obligations are satisfied.

For every new command or feature Codex must determine:
1. Is it self-explanatory, guided, or advanced?
2. Does it require a `/help` definition?
3. Does it have fields that need field-level explanations?
4. Does it require a tutorial lesson or path update?
5. Does its primary card/UI require a contextual Help button?
6. Can it safely support practice mode? If not, provide a read-only simulation/explanation.
7. Does it introduce staff-only learning content?
8. Are all examples fictional and privacy-safe?
9. Are all tutorial/help links valid after command renames/removals?

Mandatory rules:
- every slash command gets concise command help metadata;
- every multi-field command gets plain-English field help and at least one complete example;
- every multi-step or complex feature gets a tutorial/contextual-help definition;
- staff/admin-only help is permission-filtered;
- practice mode cannot mutate protected/live state;
- disabled features do not advertise unusable steps;
- new or changed commands must update help/tutorial metadata in the same pull request;
- CI/test coverage must fail the build when a required help/tutorial definition is missing or references a nonexistent command;
- tutorial copy must use plain language and define Discord/bot jargon before relying on it;
- no tutorial-completion rewards.

## 13. Data files

Canonical seed files:
- `angrier_jordan_tutorial_default_config.json`
- `angrier_jordan_tutorial_content_v1.json`
- `angrier_jordan_command_help_catalog_v1.json`
- `angrier_jordan_tutorial_help_coverage_report.json`

Version-controlled files are defaults/seeds. Live owner edits are PostgreSQL-backed and audited.
