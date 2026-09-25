# Angrier Jordan — Configurable Introduction System

Status: Approved for build
Scope: Single-server private Discord bot
Primary channel: Pull Up a Chair / introductions channel

## Goal
Keep the introductions channel visually consistent and clean by preventing normal member posting. Members create or edit their introduction only through Angrier Jordan. The bot publishes a standardized introduction card that other members can react to.

## Member Experience

### Entry points
- Permanent bot panel in the introductions channel with button: `Create Introduction`
- `/introduce`
- `/introduce edit`
- `/introduce preview`

`/introduce` should only execute in the configured introductions channel. If used elsewhere, reply ephemerally with a jump link to the correct channel.

### Create flow
1. Member presses `Create Introduction` or runs `/introduce`.
2. Bot loads the currently enabled introduction prompts in configured display order.
3. Bot presents prompts through one or more Discord modals/pages as needed.
4. Required fields must be completed before publication.
5. Member sees a private preview.
6. Member chooses `Publish` or `Go Back`.
7. Bot publishes one standardized introduction card in the introductions channel.
8. The published post supports normal Discord reactions.

### Edit flow
- A member can only edit their own introduction.
- `/introduce edit` reopens the current form prefilled with saved answers.
- Saving edits updates the existing bot post rather than creating a second introduction.
- If the original message no longer exists, the bot creates a replacement and updates the stored message ID.

### One-introduction rule
- One active introduction per member.
- Rejoining the server does not automatically create a new introduction.
- Staff may reset a user's introduction if needed.

## Channel Permissions

### Members
Allow:
- View Channel
- Read Message History
- Add Reactions
- Use Application Commands

Disable:
- Send Messages
- Send Messages in Threads
- Create Public Threads
- Create Private Threads
- Attach Files
- Embed Links if normal posting would use it
- Send Stickers
- Use External Emoji if desired by server policy

### Angrier Jordan
Allow:
- View Channel
- Send Messages
- Embed Links
- Attach Files if introduction card rendering uses image assets
- Read Message History
- Manage Messages only if required for replacing/resetting bot-owned cards

The bot should never depend on members having Send Messages permission for the form workflow.

## Admin Configuration

### Primary command
`/intro-config`

Throne: full access.
Chaise Lounge: configurable access via `allow_admin_intro_config` toggle.
Recliner: no form-builder access by default.

### Admin panel controls
- `Add Prompt`
- `Edit Prompt`
- `Delete Prompt`
- `Move Up`
- `Move Down`
- `Required / Optional`
- `Enable / Disable`
- `Edit Placeholder`
- `Edit Public Label`
- `Edit Character Limit`
- `Preview Form`
- `Preview Published Card`
- `Edit Card Settings`
- `Reset to Defaults`
- `Export Configuration`

Destructive actions such as deleting a prompt or resetting the whole form require confirmation.

## Prompt Model

Each prompt stores:
- `id`: stable internal UUID/string
- `display_order`: integer
- `enabled`: boolean
- `required`: boolean
- `prompt_text`: full question shown to member
- `public_label`: short label shown on published card
- `placeholder`: optional form hint/example
- `min_length`: integer or null
- `max_length`: integer
- `input_style`: `short` or `paragraph`
- `show_on_card`: boolean
- `created_at`
- `updated_at`

The prompt text and public label are intentionally separate.

Example:
- Prompt: `Tell us a little about yourself — hobbies, interests, personality, whatever you want people to know.`
- Public label: `About Me`

## Default Form

1. `What should we call you?`
   - Public label: `Name`
   - Required: Yes
   - Short answer
   - Max: 80

2. `How old are you?`
   - Public label: `Age`
   - Required: Yes
   - Short answer
   - Max: 20

3. `What part of the world are you joining us from? Share only as much as you're comfortable with.`
   - Public label: `From`
   - Required: No
   - Short answer
   - Max: 100

4. `Tell us a little about yourself — hobbies, interests, personality, whatever you want people to know.`
   - Public label: `About Me`
   - Required: Yes
   - Paragraph
   - Max: 700

5. `What brought you here, or what are you hoping to find in the community?`
   - Public label: `Why I'm Here`
   - Required: No
   - Paragraph
   - Max: 500

## Multi-page Forms
Discord modal component limits must not restrict the feature. If enabled prompts exceed what fits cleanly in one modal, Angrier Jordan automatically splits the form into sequential pages.

Expected behavior:
- `Page 1 of N`
- `Next`
- `Back`
- Preserve all answers while paging
- Validate required fields per page
- Final page offers preview

Changing the number of prompts must not require a code change.

## Published Introduction Card

Default presentation:

**PULL UP A CHAIR**
Member display name + avatar

**Name**
Answer

**Age**
Answer

**From**
Answer

**About Me**
Answer

**Why I'm Here**
Answer

Footer: configurable server welcome message.

### Card configuration
Admin can configure:
- Header text
- Footer/welcome text
- Show/hide avatar
- Show/hide Discord display name
- Show/hide server join date
- Show/hide individual prompt fields
- Field order follows prompt display order
- Optional accent/theme selection if multiple bot themes exist later

Use the approved Angrier Jordan / Chairs premium visual language where supported. Functional readability takes priority over decoration.

## Persistent Channel Panel

Angrier Jordan maintains one persistent introduction panel in the introduction channel.

Default text:
`New here? Pull up a chair and introduce yourself.`

Buttons:
- `Create Introduction`
- `Edit My Introduction`

Behavior:
- If the member has no introduction, Create starts the form.
- If the member already has one, Create can redirect to Edit or become Edit dynamically through interaction logic.
- Panel is restored after bot restart if deleted/recreated by staff.

## Data Model

### introduction_form_config
- guild_id
- introduction_channel_id
- panel_message_id
- header_text
- footer_text
- show_avatar
- show_display_name
- show_join_date
- allow_admin_intro_config
- updated_at

### introduction_prompts
- id
- guild_id
- display_order
- enabled
- required
- prompt_text
- public_label
- placeholder
- min_length
- max_length
- input_style
- show_on_card
- created_at
- updated_at

### member_introductions
- guild_id
- user_id
- introduction_message_id
- created_at
- updated_at

### member_introduction_answers
- guild_id
- user_id
- prompt_id
- answer_text
- updated_at

Use Discord user ID as the member identity key.

## Prompt Changes After Members Have Posted

Prompt editing must not corrupt existing introductions.

Rules:
- Editing prompt wording or public label updates the form immediately.
- Existing saved answers remain attached to the stable prompt ID.
- Changing public label can update previously posted cards the next time that member edits; bulk refresh is optional/admin-triggered.
- Disabling a prompt removes it from future forms and cards without deleting historical answer data.
- Deleting a prompt is soft-delete by default so existing data remains recoverable.
- Reordering prompts affects form/card order but not answers.

## Staff Tools

Suggested subcommands/actions:
- `/introduce reset member:@user` — Throne/authorized admin
- `/introduce repost member:@user` — recreate missing card from stored answers
- `/intro-config panel-repost` — restore persistent Create Introduction panel
- `/intro-config channel` — set/change introduction channel

All staff actions should be logged to the staff-log channel when appropriate.

## Privacy / Safety
- Do not require exact city, legal name, employer, phone number, social media, or other sensitive identifying information.
- Location prompt explicitly tells users to share only as much as they are comfortable with.
- The bot must not publish hidden account metadata beyond intentionally selected Discord profile information.
- Editing/deleting a prompt must not expose historical answers to members who could not already see them.

## Runtime / Technical Requirements
- No AI call is required for introduction creation.
- Configuration and answers persist in PostgreSQL.
- Interactions are restart-safe where Discord allows; incomplete forms may safely expire and be restarted.
- All admin configuration changes are validated before save.
- Use stable prompt IDs rather than matching by prompt text.
- Sanitize user text for mentions so an introduction cannot mass-ping roles/users unless explicitly allowed.
- Respect Discord length/component limitations and automatically paginate where needed.

## Acceptance Criteria
- Members cannot make normal text posts in the introduction channel.
- Members can create/edit an introduction without Send Messages permission.
- Published introductions are bot-authored and visually consistent.
- Reactions work normally.
- Throne can edit every form prompt without modifying code.
- Prompt wording, label, required state, order, enabled state, placeholder, input type, and length can be changed.
- Forms automatically become multi-page when necessary.
- Editing a member introduction modifies the existing post.
- One active introduction exists per member.
- Existing answers survive prompt wording/reorder changes.
- All configuration persists across bot restarts.
