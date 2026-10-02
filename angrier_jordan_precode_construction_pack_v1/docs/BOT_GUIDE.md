# Angrier Jordan — Complete Bot Guide

## What this guide covers

Angrier Jordan is the Chairs server bot. It runs member-facing games, profiles, achievements, suggestions, introductions, community tools, economy, moderation workflows, administration, and automated server operations. This guide reflects the production command registry. A command may be hidden when its feature is disabled or when Discord/channel permissions prevent access.

## Quick rules

- Use slash commands by typing `/` in Discord. Prefix-only event commands are `!race` and `!line`; `/fight @member` remains a slash command.
- Commands are server-only unless the response says otherwise. A command must be used in an allowed channel and by a member with the required permission.
- `member` means ordinary member access. `throne` means owner/staff authority in the command registry. Runtime Administrator checks always use current Discord permissions.
- Economy, game, voting, timer, and role actions are recorded in the bot database. Repeating a button click or a delayed Discord interaction cannot intentionally pay or award twice.
- Commands and panels may be unavailable while their feature switch is disabled, the bot is recovering after a restart, or a member is restricted by an active punishment.

## Cards, panels, and privacy

### Public cards
A **public card** is a bot message that everyone with channel access can see. Public cards show shared state such as a suggestion, vote, game, queue, event, leaderboard, or channel-game progress. Their buttons update the shared record. Do not assume a public card gives you permission to use every control: player, host, requester, staff, or voting rules still apply.

### Private cards
A **private card** is an ephemeral Discord response visible only to the member who opened it. It is used for personal information and actions that should not reveal balances, puzzle answers, inventories, ballots, suggestion forms, game choices, onboarding responses, or moderation details. Other members cannot see or interact with a private card. Private cards can contain buttons, selects, and modals; they are tied to the correct member and cannot be reused by someone else.

### Persistent versus disposable cards
A **persistent card** represents stored server state. Examples include suggestion records, community votes, casino/game sessions, onboarding panels, achievement cabinet pages, and durable channel-game posts. It is restored or reconciled after a bot restart when the feature supports recovery.

A **disposable card** is a temporary convenience response such as a personal statement, short-lived interaction panel, or temporary game display. It may expire, be replaced by a newer response, or require reopening the command. Expiration never removes the underlying balance, achievement, vote, session, or audit record.

### Buttons, select menus, and modals
- **Buttons** perform a named action, such as Vote, Submit, Pause, Claim, or Details.
- **Select menus** choose an option, category, target, or status without posting the choice publicly when the card is private.
- **Modals** are Discord forms used for bounded text, wagers, descriptions, and other member input. Submit only the final text/amount you intend to use.

## Main sections

### Profile, activity, records, and achievements
`/profile` renders a member profile with activity, economy-facing records, showcase controls, achievement count, and prestige badges. Prestige badges appear on the profile header. `/achievements` is the cabinet for basic and prestige achievements. It uses locked/earned cards, progress counts, and pages when needed. Profile activity respects the configured privacy rules; message and voice tracking are used for statistics, records, and achievement progress rather than exposing message contents.

### Economy and inventory
Ottomans are the server currency. All currency movement uses a balanced ledger: a reward, transfer, wager, fee, purchase, or burn has a durable transaction record. Wallet and bank balances are separate. Wallet funds may be held by an active wager; held funds cannot be spent elsewhere.

Daily reset is 4:00 AM Mountain Time. `/daily` opens a private hub with Claim Daily, Daily Spin, and Fortune. `/weekly` is once per configured weekly cycle. Work, fish, dig, and scavenge are repeatable activities with technical anti-double-click throttling; tools and durability apply where required. The current baseline reward guard reduces routine system-minted Daily, Daily Spin Ottoman, Weekly, and grind payouts by 50%, capped at 2,000 Ottomans per payout. It does not alter existing money, member transfers, wagers, event rewards, item drops, or banked money.

### Games and voting
Solo games use private cards for answers or boards. PvP games preserve turn state and private Battleship fleets. Party/community games use shared public cards and anonymous/editable voting where their rules require it. Casino results and private betting entry cards preserve the authoritative ledger result. Persistent channel games operate only in their configured channels.

### Suggestions and community
`/suggest` gives the member a private pointer to the Empty Seats suggestion flow. The public suggestions panel lives in `🪑-empty-seats`; submitted suggestions publish there for community voting. The panel is persistent and suggestions use public shared cards. Community tools include polls, giveaways, superlatives, AMA, and voting flows where enabled.

### Introductions, learning, and lore
Rules acknowledgement is the only required onboarding gate. `/introduce`, `/roles`, `/tutorial`, `/help`, and `/lore` remain available after onboarding. Introduction and profile editing use private forms/preview cards before public publication. Lore reading records chapter progress; Chair Historian is earned from its configured progress rules.

### Events and Fully Furnished
Fully Furnished tracks six defined event achievements. A newly completed event state awards only once. The event currently ends Sunday, October 4, 2026 at 11:59 PM Mountain Time; after its cutoff, new event role/badge awards stop. Completion messages are public plain text in the main chat and do not tag names.

### Administration, dashboard, and audit
The dashboard is for the server owner and current Discord Administrators. It uses a shared draft, preview, and publish workflow for financial/high-impact settings. The bot records administrative changes and sensitive operational actions in the audit log. `/announce` is available only to Discord Administrators and can post only in the main chat; all mentions are suppressed.

## Automation and recovery

- **Command registration:** the worker registers only feature-enabled commands at startup.
- **Health/readiness:** the worker exposes readiness and reports startup stages. A healthy startup ends with `Health=ok`.
- **Scheduled jobs:** durable jobs cover timed game/event completion, bank interest, jail expiry, channel-game resets, record/spotlight publication, and other configured timers. Restart recovery reconciles due work without intentionally duplicating results.
- **Daily/weekly cycles:** Daily uses 4:00 AM Mountain Time. Weekly/bank schedules honor configured Mountain Time settings and daylight-saving changes.
- **Voice activity:** qualifying voice time requires another human and excludes AFK/self-muted/deafened state according to the profile rules.
- **Moderation and rejoin:** active punishments survive leave/rejoin. Finite time pauses while absent and resumes on return. Staff roles are never automatically restored.
- **Fully Furnished:** event progress is durable, duplicate-safe, and checks its end time before issuing a new unlock.
- **Economy guard:** routine rewards use the current baseline safeguard described above. The adaptive governor is a future enhancement.

## Command reference

The table below is generated from the live master command registry. `Private` means the command defaults to a private/ephemeral response. Options show required fields with `*`. Nested commands are listed by their complete invocation. A command may have buttons, select menus, modals, follow-up cards, or persistent public state described by its interaction field.


### Core and administration

| Command | What it does | Access | Channel | Private | Options / interaction |
|---|---|---|---|---|---|
| /help | Quick command reference. | member | any_allowed | Yes | command string |
| /rules | Show branded server rules. | member | any_allowed | Yes | — |
| /status | Bot health and uptime. | member | any_allowed | Yes | — |
| /announce | Post an owner announcement in this channel. | member | main_chat | Yes | message* string |
| /bug | Report a bot issue. | member | any_allowed | Yes | description* string |
| /dms | Enable or disable bot DMs. | member | any_allowed | Yes | state* choice |

### Help and tutorial

| Command | What it does | Access | Channel | Private | Options / interaction |
|---|---|---|---|---|---|
| /tutorial | Interactive guided tutorial. | member | any_allowed | Yes | — |

### Profiles and achievements

| Command | What it does | Access | Channel | Private | Options / interaction |
|---|---|---|---|---|---|
| /profile | Show a member profile. | member | any_allowed | No | member user |
| /records | Show current live records. | member | any_allowed | No | — |
| /achievements | View a member's achievement cabinet. | member | any_allowed | No | member user |
| /tldr chat | Privately summarize recent main-chat conversation. | member | main_chat | Yes | time* choice |
| /tldr events | Privately summarize recent structured Angrier Jordan events. | member | bot_channel | Yes | time* choice |
| /privacy activity | Set activity-stat visibility. | member | any_allowed | Yes | state* choice |

### Economy and inventory

| Command | What it does | Access | Channel | Private | Options / interaction |
|---|---|---|---|---|---|
| /daily | Open the private daily hub for Claim Daily, Daily Spin, and Fortune. | member | any_allowed | Yes | — |
| /weekly | Claim weekly reward. | member | bot_channel | No | — |
| /scavenge | Scavenge for loot. | member | bot_channel | No | — |
| /dig | Dig for loot. | member | bot_channel | No | — |
| /fish | Fish for loot. | member | bot_channel | No | — |
| /work | Perform a work action. | member | bot_channel | No | — |
| /statement | Show wallet, bank, and recent transactions. | member | bot_channel | No | — |
| /inventory | Browse inventory. | member | bot_channel | No | — |
| /bank | Open banking controls. | member | bot_channel | No | — |
| /shop | Open the shop. | member | bot_channel | No | — |
| /craft | Open Chair Building/crafting. | member | bot_channel | No | — |
| /repair | Repair an equipped or owned tool. | member | bot_channel | No | — |
| /transfer | Transfer Ottomans to another member. | member | bot_channel | No | member* user; amount* integer |
| /gift | Gift an eligible item to another member. | member | bot_channel | No | member* user; item* string |
| /unlock all | Unlock all inventory locks. | member | bot_channel | Yes | — |

### Casino and lottery

| Command | What it does | Access | Channel | Private | Options / interaction |
|---|---|---|---|---|---|
| /casino blackjack | Start blackjack. | member | bot_channel | No | — |
| /casino roulette | Play roulette. | member | bot_channel | No | — |
| /casino slots | Play the Chair slots. | member | bot_channel | No | — |
| /casino dice | Play dice. | member | bot_channel | No | — |
| /casino coinflip | Flip for Ottomans. | member | bot_channel | No | — |
| /lottery | View/buy weekly lottery tickets. | member | bot_channel | No | — |

### Community and suggestions

| Command | What it does | Access | Channel | Private | Options / interaction |
|---|---|---|---|---|---|
| /giveaway | Create or manage a giveaway. | chaise_lounge, throne | bot_channel | Yes | prize* string; winners* integer; hours* integer; fee integer |
| /poll | Create/manage a poll. | member | bot_channel | Yes | question* string; choices* string; minutes integer; results string; anonymous boolean; ranked boolean |
| /superlatives | Create/manage a superlatives season. | chaise_lounge, throne | bot_channel | Yes | categories string |
| /suggest | Submit a suggestion. | member | bot_channel | Yes | text string; anonymous boolean; search string; page integer |
| /ama | Submit/manage AMA questions. | member | bot_channel | Yes | question string; anonymous boolean; sort string; page integer |

### Special events

| Command | What it does | Access | Channel | Private | Options / interaction |
|---|---|---|---|---|---|
| !race | Start Chair Race, ping the configured Race role, and open the 60-second join/betting window. | member | main_chat | No | — |
| !line | Start Line Time, ping the configured Line role, and open readiness/entry. | member | main_chat | No | — |
| !vc | Ping the configured VC role with a randomized voice-chat invitation. | member | main_chat | No | — |
| !chess | Ping the configured Chess role with a randomized chess challenge. | member | main_chat | No | — |

### Race

| Command | What it does | Access | Channel | Private | Options / interaction |
|---|---|---|---|---|---|
| /race | Start the same Chair Race as !race in main chat. | member | main_chat | No | — |

### Fight

| Command | What it does | Access | Channel | Private | Options / interaction |
|---|---|---|---|---|---|
| /fight @member | Immediately start a 1v1 Robo Chair Fight against the named member with a 30-second betting window. | member | main_chat | No | member* user |

### PvP games

| Command | What it does | Access | Channel | Private | Options / interaction |
|---|---|---|---|---|---|
| /game tictactoe | Challenge a member to Tic-Tac-Toe. | member | games_channel | No | member* user; wager integer |
| /game connectfour | Challenge a member to Connect Four. | member | games_channel | No | member* user; wager integer |
| /game battleship | Challenge a member to Battleship. | member | games_channel | No | member* user; wager integer |

### Party games

| Command | What it does | Access | Channel | Private | Options / interaction |
|---|---|---|---|---|---|
| /fmk | Start a random-member FMK round. | member | games_channel | No | — |
| /truthordare | Start Truth or Dare. | member | games_channel | No | member user |
| /wyr | Start Would You Rather. | member | games_channel | No | category choice |
| /wwyd | Start What Would You Do. | member | games_channel | No | category choice |
| /finishsentence | Start Finish the Sentence. | member | games_channel | No | — |
| /onewordstory | Start One Word Story. | member | one_word_story_channel | No | length integer |

### Roles

| Command | What it does | Access | Channel | Private | Options / interaction |
|---|---|---|---|---|---|
| /roles | Open the private self-role selection panel. | member | any_allowed | Yes | — |

### Chairisms

| Command | What it does | Access | Channel | Private | Options / interaction |
|---|---|---|---|---|---|
| /quote message | Create Chairism from a message. | member | any_non_private | Yes | message_link* string |
| /quote text | Create Chairism from self-authored text. | member | any_non_private | Yes | text* string |
| /chairisms recent | Browse Chairisms: recent. | member | any_allowed | Yes | — |
| /chairisms member | Browse Chairisms: member. | member | any_allowed | Yes | member* user |
| /chairisms random | Browse Chairisms: random. | member | any_allowed | Yes | — |
| Create Chairism | Create a Chairism from the selected message. | member | any_non_private | Yes | — |

### Social

| Command | What it does | Access | Channel | Private | Options / interaction |
|---|---|---|---|---|---|
| /social react action:<reaction> [member] | Choose an approved social reaction. | member | main_chat | No | action* string; member user<br>Actions: ts, hit, slap, pillow, cushion, stab, choke, shh, belittle, bonk, yeet, sit, standup, fold, recline, sideeye, judge, shame, boo, bruh, wtf, sus, yap, touchgrass, blame, disappoint, chaircheck, throwchair, getup, calmdown, absolutelynot, explainyourself, embarrassing, questionable, respect, compliment, wheresmyvape, hitthegeekbar |
| /social roast | Roast a member. | member | main_chat | No | member* user |
| /social notmad | Owner-only disappointed response. | throne | main_chat | No | member user |
| /privacy roast | Allow or block roast targeting. | member | any_allowed | Yes | state* choice |
| /haiku | Return the server haiku profiling joke. | member | any_allowed | No | — |

### Introductions

| Command | What it does | Access | Channel | Private | Options / interaction |
|---|---|---|---|---|---|
| /introduce | Create an introduction. | member | introduction_channel | Yes | — |
| /introduce → Edit | Edit your introduction. | member | introduction_channel | Yes | — |
| /introduce → Preview | Preview your introduction. | member | introduction_channel | Yes | — |
| /intro-config | Open introduction form builder. | chaise_lounge, throne | introduction_channel | Yes | — |

### Crime

| Command | What it does | Access | Channel | Private | Options / interaction |
|---|---|---|---|---|---|
| /crime rob | Attempt to rob a member. | member | bot_channel | No | member* user |
| /crime 911 | Crime system: 911. | member | bot_channel | No | — |
| /crime wanted | Crime system: wanted. | member | bot_channel | No | — |
| /crime bail | Crime system: bail. | member | bot_channel | No | — |

### Family

| Command | What it does | Access | Channel | Private | Options / interaction |
|---|---|---|---|---|---|
| /family marry | Family system: marry. | member | bot_channel | Yes | member* user; item string |
| /family divorce | Family system: divorce. | member | bot_channel | Yes | member* user |
| /family adopt | Family system: adopt. | member | bot_channel | Yes | member* user |
| /family disown | Family system: disown. | member | bot_channel | Yes | member* user |
| /family emancipate | Family system: emancipate. | member | bot_channel | Yes | — |
| /family familytree | Family system: familytree. | member | bot_channel | Yes | member user |
| /family will | Family system: will. | member | bot_channel | Yes | member* user |
| /family familyauction | Family system: familyauction. | member | bot_channel | Yes | type* string; hours integer; reserve integer |

### Moderation

| Command | What it does | Access | Channel | Private | Options / interaction |
|---|---|---|---|---|---|
| /mod warn | Moderation: warn. | recliner, chaise_lounge, throne | staff_or_any_target | Yes | member* user; reason* string |
| /mod timeout | Moderation: timeout. | recliner, chaise_lounge, throne | staff_or_any_target | Yes | member* user; duration* duration; reason* string |
| /mod untimeout | Moderation: untimeout. | recliner, chaise_lounge, throne | staff_or_any_target | Yes | member* user; reason* string |
| /mod kick | Moderation: kick. | chaise_lounge, throne | staff_or_any_target | Yes | member* user; reason* string |
| /mod ban | Moderation: ban. | chaise_lounge, throne | staff_or_any_target | Yes | member* user; duration duration; reason* string |
| /mod unban | Moderation: unban. | chaise_lounge, throne | staff_or_any_target | Yes | user_id* string; reason* string |
| /mod purge | Moderation: purge. | recliner, chaise_lounge, throne | staff_or_any_target | Yes | count* integer; member user; reason* string |
| /mod note | Moderation: note. | recliner, chaise_lounge, throne | staff_or_any_target | Yes | member* user; text* string |
| /mod history | Moderation: history_mod. | recliner, chaise_lounge, throne | staff_or_any_target | Yes | member* user |
| /mod case view | Moderation: case_view. | recliner, chaise_lounge, throne | staff_or_any_target | Yes | case_id* integer |
| /mod case edit | Moderation: case_edit. | chaise_lounge, throne | staff_or_any_target | Yes | case_id* integer; reason* string |
| /mod case reverse | Moderation: case_reverse. | chaise_lounge, throne | staff_or_any_target | Yes | case_id* integer; reason* string |
| /mod lock | Moderation: lock. | chaise_lounge, throne | staff_or_any_target | Yes | channel channel; reason* string |
| /mod unlock | Moderation: unlock. | chaise_lounge, throne | staff_or_any_target | Yes | channel channel |
| /mod slowmode | Set or disable channel slowmode while recording the previous value. | recliner, chaise_lounge, throne | staff_or_any_target | Yes | channel channel; duration* duration |
| /mod quarantine | Remove a message from public view and preserve restricted staff evidence. | recliner, chaise_lounge, throne | staff_or_any_target | Yes | message_link* string; reason* string |
| /mod staff-alert | Create a non-punitive internal staff alert for a member. | recliner, chaise_lounge, throne | staff_or_any_target | Yes | member* user; reason* string |
| /mod modstats | Show operational moderation totals without ranking staff. | recliner, chaise_lounge, throne | staff_or_any_target | Yes | period string |

### Hotseat

| Command | What it does | Access | Channel | Private | Options / interaction |
|---|---|---|---|---|---|
| /jail send | Hotseat jail: send. | recliner, chaise_lounge, throne | hotseat_or_staff | No | member* user; duration* string; reason* string |
| /jail release | Hotseat jail: release. | recliner, chaise_lounge, throne | hotseat_or_staff | No | member* user; reason* string |
| /jail extend | Hotseat jail: extend. | recliner, chaise_lounge, throne | hotseat_or_staff | No | member* user; duration* string; reason* string |
| /jail reduce | Hotseat jail: reduce. | recliner, chaise_lounge, throne | hotseat_or_staff | No | member* user; duration* string; reason* string |
| /jail reason | Hotseat jail: reason. | member, recliner, chaise_lounge, throne | hotseat_or_staff | No | member user |
| /jail history | Hotseat jail: history. | recliner, chaise_lounge, throne | hotseat_or_staff | No | member* user |
| /jail roster | Hotseat jail: roster. | recliner, chaise_lounge, throne | hotseat_or_staff | No | type choice |
| /jail status | Hotseat jail: status. | member | hotseat_or_staff | No | member user |

### Security

| Command | What it does | Access | Channel | Private | Options / interaction |
|---|---|---|---|---|---|
| /panic activate | Activate Panic Mode with an audited reason. | throne | staff | Yes | reason* string |
| /panic deactivate | Deactivate Panic Mode after confirmation and restore saved pre-panic state. | throne | staff | Yes | — |
| /panic status | Panic Mode: status. | throne | staff | Yes | — |

### Custom commands

| Command | What it does | Access | Channel | Private | Options / interaction |
|---|---|---|---|---|---|
| /custom-command create | Custom command: create. | chaise_lounge, throne | staff | Yes | — |
| /custom-command edit | Custom command: edit. | chaise_lounge, throne | staff | Yes | — |
| /custom-command delete | Custom command: delete. | chaise_lounge, throne | staff | Yes | — |
| /custom-command enable | Custom command: enable. | chaise_lounge, throne | staff | Yes | — |
| /custom-command disable | Custom command: disable. | chaise_lounge, throne | staff | Yes | — |
| /custom-command list | Custom command: list. | recliner, chaise_lounge, throne | staff | Yes | — |
| /custom-command test | Custom command: test. | recliner, chaise_lounge, throne | staff | Yes | — |
| /custom-command clone | Custom command: clone. | chaise_lounge, throne | staff | Yes | — |
| /custom-command info | Custom command: info. | recliner, chaise_lounge, throne | staff | Yes | — |

### Server bootstrap

| Command | What it does | Access | Channel | Private | Options / interaction |
|---|---|---|---|---|---|
| /setup | Run guided server setup. | throne | staff | Yes | — |
| /setup health | Run non-destructive server health checks. | recliner, chaise_lounge, throne | staff | Yes | — |

### Lore

| Command | What it does | Access | Channel | Private | Options / interaction |
|---|---|---|---|---|---|
| /lore | Open the private Chairs lore reader and resume saved progress. | member | any_allowed | Yes | — |

### Collections

| Command | What it does | Access | Channel | Private | Options / interaction |
|---|---|---|---|---|---|
| /collection | Open the collection browser. | member | any_allowed | Yes | — |

### Records

| Command | What it does | Access | Channel | Private | Options / interaction |
|---|---|---|---|---|---|
| /leaderboard | Open leaderboards and choose a category. | member | any_allowed | No | — |

### Solo games

| Command | What it does | Access | Channel | Private | Options / interaction |
|---|---|---|---|---|---|
| /hangman | Start Hangman. | member | games_channel | No | — |
| /wordscramble | Start Word Scramble. | member | games_channel | No | — |
| /mastermind | Start Mastermind. | member | games_channel | No | — |
| /minesweeper | Start Minesweeper. | member | games_channel | No | size integer |

## Reading the command table

- **Access:** Registry access is enforced together with current Discord permissions and feature rules. Administrator-only runtime commands, including /announce, perform an additional permission check.
- **Channel:** ny_allowed means the feature may still enforce channel configuration. main_chat means the configured main chat. Game and event commands may be scoped to their dedicated channels.
- **Private:** A Yes response is visible only to the actor by default. A No command can still open a private modal or private follow-up card when the flow needs confidential input.
- **Actions:** Named actions are interactions available under a shared command family; buttons/selects/modals may add the detailed steps.

## Common troubleshooting

- If a command is missing, wait briefly after a deploy, refresh Discord’s command picker, and confirm the feature is enabled.
- If a button says unavailable, reopen the source command/card; the card may have expired or been replaced.
- If a game or economy action says it is unavailable, check the required channel, role, tool, balance, voice state, or active restriction.
- If a command is private, other members cannot verify it by looking in the channel.
- If a result looks wrong, use the relevant Details/Statement/Profile view and report the action time or message link; ledger, session, and audit records are retained for troubleshooting.

## Card catalog

| Card or panel | Visibility | Persistence | Typical controls |
|---|---|---|---|
| Profile header and activity continuation | Public to the command recipient's response context | Rendered from durable profile/activity data | Edit Showcase, navigation where available |
| Achievement Cabinet | Private to the viewer | Achievement and progress records persist | Previous/Next page, Details |
| Daily Hub | Private | Claim/spin/fortune usage persists per reset cycle | Claim Daily, Daily Spin, Fortune |
| Statement and Bank | Private | Balances and transactions persist; card itself can be reopened | Previous/Next statement, Deposit, Withdraw, Upgrade |
| Inventory, Shop, Crafting, Collections | Private | Inventory, ownership, locks, crafting and collection progress persist | Filter, buy, sell, equip, repair, craft, claim |
| Casino and wager entry | Private entry with public result/session card where applicable | Session, escrow, outcome and ledger settlement persist | Bet, hit/stand, spin/roll, vote/confirm, Details |
| Solo game board | Private | Puzzle/game state persists while the game is active | Guess, reveal/select, flag, new game |
| PvP game board | Shared public state plus private Battleship fleet where applicable | Match, turns, stakes and results persist | Join/accept, move, place fleet, resign, rematch only where supported |
| Party/Voting card | Public shared card; ballots may be private | Prompt, submissions, ballots, close/result state persist | Submit, vote, edit vote, reveal/result |
| Suggestion card | Public in Empty Seats; submission starts privately | Suggestion, status and vote totals persist | Submit Suggestion, Support, Oppose, Vote, Update Status, Details |
| Introduction preview/publication | Private until publish; published introduction is public | Form answers and publication persist | Preview, Publish, Edit |
| Onboarding and Roles | Private | Rules acknowledgement and selected roles persist | Acknowledge Rules, select/clear roles |
| Event cards | Public shared state or private progress view | Session/event progress, roles and achievements persist | Join, vote, status, Details |
| Moderation/Hotseat controls | Private to authorized staff/member as appropriate | Cases, sentence, evidence and expiry jobs persist | Send, extend, reduce, release, review |
| Jukebox/music | EAJ Music, a separate branded bot | Managed by EAJ Music | Use EAJ Music's own commands and panels |

## Channel-specific behavior

- **Main chat:** server conversation and Administrator `/announce` destination. `/announce` is rejected outside the configured main chat.
- **Empty Seats:** persistent Suggestions panel, submitted suggestions, public voting, and staff status updates.
- **Gaming Chair and Bots Don’t Sit:** shared game command surfaces where configured.
- **Dedicated channel games:** Counting, Last Letter, and One Word Story retain their own channel state and rules.
- **Voice channels:** profile voice tracking requires qualifying human presence. EAJ Music handles playback separately.

## EAJ Music

Music playback is intentionally separate from Angrier Jordan. Use the white-labeled **EAJ Music** bot and its available Discord commands in any allowed voice channel. Angrier Jordan help/tutorial material points members to EAJ Music, but Angrier Jordan does not join voice, manage queues, or require Lavalink configuration.
