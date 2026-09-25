# Angrier Jordan — Canonical Build Specification
Version: 2026-09-20
Status: BUILD-READY / SOURCE OF TRUTH

> This document supersedes earlier build plans, command references, wireframes, and mockups where they conflict with this specification. Codex should treat this file as the canonical product contract. Older images/documents are reference-only unless explicitly identified below as production assets.

---

## 1. Product Scope

Angrier Jordan is a private, single-server Discord bot for the Chairs community. It combines:
- community games
- profiles and activity statistics
- economy and collectibles
- crafting
- casino and betting
- crime/jail
- family/social roleplay
- moderation
- records and achievements
- music playback
- quote-card creation ("Chairisms")
- lightweight social commands
- configurable introduction/onboarding system

The bot should feel like a game layered into Discord rather than a collection of generic embeds.

Primary implementation target:
- Node.js + TypeScript
- discord.js
- PostgreSQL
- Prisma or Drizzle
- Sharp/SVG/HTML-to-image style runtime rendering for cards
- Vitest/Jest
- Docker
- Railway or comparable managed hosting
- feature flags for unfinished modules
- restart-safe state and idempotent scheduled jobs

Do not introduce Redis, Kubernetes, microservices, or distributed complexity for the initial ~50-member private-server deployment unless a concrete implementation need appears.

---

## 2. Canonical Server Roles

### Bot
- Bot display name: **Angrier Jordan**
- Bot role: **The Chairman**

### Human hierarchy
1. **Throne** — server owner / highest human authority
2. **Chaise Lounge** — administrator
3. **Recliner** — moderator

System-managed moderation role:
- **Jailed** — temporary confinement role maintained by Angrier Jordan; not part of the human hierarchy.

Permissions must be based on Discord IDs/role IDs, not display names.

### Permission model
**Throne**
- all owner controls
- all moderation/security capabilities
- Panic Mode
- anti-nuke and protected/trusted-identity configuration
- destructive global actions and resets
- exploit-item/achievement revocation
- all admin correction tools

**Chaise Lounge**
- economy/inventory corrections
- custom command create/edit/delete
- event management
- giveaway/superlative administration
- all Recliner moderation capabilities
- kick / ban / unban by default
- channel lock/unlock
- Join Gate / raid-state controls
- bounded moderation-rule configuration
- all corrections/actions logged

**Recliner**
- warnings
- timeouts / remove timeout
- message quarantine/delete
- purge
- staff notes and member moderation history
- case and appeal review subject to reviewer-independence rules
- ordinary AutoMod review
- channel slowmode
- Counting sabotage restore
- poll/community-game moderation
- no bans by default
- no Panic Mode / anti-nuke configuration
- no economy editing
- no destructive global controls

Discord guild owner may be treated as emergency super-admin at engineering level.

---

## 3. Canonical Channels

- Main chat: **`💬-sit-and-chat`**
- Bot/economy/community: **`🤖-bots-dont-sit`**
- Games: **`🏆-gaming-chair`**
- Counting: **`🔢-counting-chairs`**
- Last Letter: **`🦵-last-leg`**
- Staff/admin log: **`🚨-broken-chair`**
- Quote output: **`📝-chairisms`**
- Introduction channel: **`pull-up-a-chair`** (configured by channel ID; display name may be changed later)
- Moderation jail channel: **`🔥-hotseat`** (configured by channel ID; visible to jailed members + authorized staff)

Activity profile message/word tracking excludes bot/game/staff channels, including bot and game channels above.

---

## 4. Global UX and Bot Personality

- Slash commands use groups/subcommands where helpful.
- **`/line`** is the canonical Line Time command.
- Routine/private information should be ephemeral where Discord supports it.
- Social/community events are public in their designated channels.
- `/help` shows member-facing commands; admin-only commands are hidden from normal help.
- `/tutorial` is an interactive guided learning system; `/rules` uses branded frames. `/help` is quick reference while `/tutorial` teaches by doing.
- `/status` = current health, uptime, recent outages/errors only.
- `/bug` = bot issue reporting.
- `/dms on|off`; new members default **DMs ON**.
- Automatic backups only.
- No sounds.
- Angrier Jordan anger intensity varies by response; rare high-rage responses may swear.
- Role-based NPC presentation may vary per interaction: Banker, Shopkeeper, Bailiff, Fisherman, Digger/Scavenger, Chairwright.
- NPC personality is presentation only and must not alter odds/economy rules.
- Admin alias system: Throne/Chaise Lounge may assign a bot-facing alias to a member; mentions always target the actual Discord user.

No:
- generic XP/level system
- profile notes/taglines
- public changelog
- calendar/birthdays
- reputation/kudos
- anonymous confession
- admin member notes
- normal-message or VC economy rewards
- seasonal reskins
- hidden Easter eggs
- user-selectable themes

---

## 5. Visual System and Asset Rules

Official palette:
- `#c9a768`
- `#a68f5d`
- `#847752`
- `#615e48`
- `#3f463d`
- `#1c2e32`

Style:
- premium private lounge
- dark emerald/navy/black
- polished gold
- leather, wood, subtle plants/lighting
- clean game UI
- sharp information hierarchy
- labeled controls
- no icon-only critical controls

Angrier Jordan red/black rage styling is reserved for:
- Angrier Jordan personality moments
- arrests
- warnings
- moderation/rage moments

Normal events use the Chairs luxury visual system.

### Runtime rendering
Do not use AI image generation during normal bot operation.
Dynamic cards must be rendered from deterministic templates using actual Discord/database data.

### Functional vs decorative
Every renderer must distinguish:
- **Functional assets**: member avatar, name/alias, stats, timers, odds, wagers, queue data, controls, result data
- **Decorative assets**: furniture, lamps, foliage, borders, background signage, ambient effects

Decorative art must never carry information required to understand or operate a feature.

---

## 6. Production Assets — LOCKED

These are actual approved production assets.

### Weekly Spotlight badge PNGs
- `/mnt/data/weekly_spotlight_badges/the_loudest_chair_320.png`
- `/mnt/data/weekly_spotlight_badges/the_wordsmith_320.png`
- `/mnt/data/weekly_spotlight_badges/voice_of_the_lounge_320.png`
- `/mnt/data/weekly_spotlight_badges/triple_threat_320.png`

Asset pack:
- `/mnt/data/angrier_jordan_weekly_spotlight_badges.zip`

### Weekly Spotlight canonical production design
- `/mnt/data/luxurious_weekly_spotlight_lounge_leaderboard.png`

This design is the canonical visual target for the reusable Weekly Spotlight renderer.

The older file:
- `/mnt/data/weekly_spotlight_runtime_template.png`
is superseded by the newer canonical lounge design above.

All other generated overview sheets and visual mockups remain reference/specification art unless explicitly promoted later.

---

## 7. Time and Reset Rules

Timezone: **America/Denver**

- Daily reset: **4:00 AM MT**
- Weekly reset: **Monday 4:00 AM MT**
- Monthly reset: **1st of month 4:00 AM MT**
- Weekly lottery draw: **Friday 8:00 PM MT**
- Shop refresh: **4:00 AM daily**
- Bank Tier 5 interest: **Monday 4:00 AM weekly**

All scheduled jobs must be restart-safe and idempotent.

---

## 8. Profiles, Activity and Privacy

`/profile` is public by default and may show:
- messages month/all-time
- words month/all-time
- VC time month/all-time
- most-used word
- most-used bot command
- achievements
- featured collectibles
- game records/wins/losses
- gifting stats
- work lifetime jobs + Ottoman earned
- wanted status
- collection completion %
- Chair Building rank
- active family counts
- generic lifetime marriage/divorce/adoption counters
- Weekly Spotlight / Triple Threat area

### Activity privacy
One global toggle controls visibility of:
- message count
- word count
- VC time
- most-used word
- most-used command

Default: **Visible**

Game/economy/achievement/collection/record stats remain public.

### Message qualification
Exclude:
- bots
- commands
- bot/game/staff channels
- URL-only messages
- mention-only messages
- emoji-only messages

Message count counts qualifying messages.

### Word count
Count natural-language words in qualifying messages after stripping URLs, mentions, and standalone emoji/custom emoji tokens.
Common stop words still count toward **total word count**.
Stop words are excluded only from the **most-used word** statistic.

### VC qualification
VC time counts only when:
- channel is not AFK
- member is not alone
- at least one other non-bot member is present
- member is not self-muted
- member is not self-deafened

---

## 9. Weekly Spotlight — LOCKED

Three rotating weekly profile badges:

### The Loudest Chair
Most qualifying messages during the weekly period.

### The Wordsmith
Highest qualifying word count during the weekly period.

### Voice of the Lounge
Most qualifying VC time during the weekly period.

Weekly period freezes at **Monday 4:00 AM MT**.

### Assignment
- Badge ownership updates automatically at weekly reset.
- A member may hold multiple weekly badges.
- Ties are **co-winners**.
- Co-winners each receive the active badge.
- A co-winner counts as holding that weekly title for historical statistics and Triple Threat qualification.

### Triple Threat
If one member holds all three Weekly Spotlight titles in the same weekly result:
- unlock **Triple Threat**
- Triple Threat is permanent
- it permanently replaces the rotating Weekly Spotlight badge display in that member's premium profile showcase slot
- future weekly wins still increment historical counters
- the profile showcase remains Triple Threat once earned

### Weekly history
Track permanently:
- Loudest Chair wins
- Wordsmith wins
- Voice of the Lounge wins
- Triple Threat unlock date

### Discord roles
Weekly Spotlight badges are **bot/profile badges only**, not Discord roles. They must not interfere with the server's role hierarchy.

### Weekly public announcement
Every week Angrier Jordan posts a single standard formatted Weekly Spotlight announcement to:

**`💬-sit-and-chat`**

The post begins with:
**`@everyone`**

The actual statistics freeze at Monday 4:00 AM MT, but the public post is sent during an automatically learned active window.

### Learned posting time
Angrier Jordan learns an effective Monday posting time using recent qualifying activity:
- use prior server activity patterns
- choose a high-engagement Monday evening window
- safe operating window: approximately 5:00 PM–10:00 PM MT
- default fallback when insufficient history: 7:00 PM MT
- smooth across several weeks so the time does not jump wildly
- do not send more than one Weekly Spotlight announcement per weekly result

### Weekly announcement dynamic fields
Render:
- week/date range
- actual member avatar
- actual display name/alias
- winning total
- lifetime category wins
- status: `RETAINED`, `NEW WINNER`, or `TOOK THE TITLE`
- total active members
- total qualifying server messages
- total qualifying server words
- total qualifying VC time

Weekly award-winning totals are public in the award post even if a member hides routine activity numbers on their profile.

If Triple Threat is unlocked that week, the normal frame uses the dedicated permanent Triple Threat treatment.

---

## 10. Achievements and Badges

Achievement system has three conceptual classes:

### Achievement
Normal accomplishment.

### Mastery Badge
Awarded for completing a defined series/set of achievements.

### Legacy Badge
Very rare cross-system completion achievement.

Examples of possible Mastery/Legacy families:
- Built Different — Chair Building mastery
- The House Has a Problem — casino mastery
- Repeat Offender — crime mastery
- Socially Questionable — party-game mastery
- Seat Collector — standard collection mastery
- Chairman's Toolbox — work/fish/dig/scavenge/tool mastery
- Family Business — family-system mastery
- Against Better Judgment — cross-system difficult achievement
- The Whole Damn Lounge — completion of all major Mastery series
- The Furniture — ultimate permanent/core completionist badge

Exact thresholds are data-driven and may be tuned during balancing.

### Profile presentation
- members may feature earned badges
- Weekly Spotlight has its own premium showcase area
- Triple Threat permanently occupies that area once unlocked
- Mastery and Legacy badges receive stronger visual treatment than normal achievements

---

## 11. Currency and Economy

Currency: **Ottomans**

Balances:
- Wallet
- Bank

Spending behavior:
- Wallet first
- automatically pull remainder from Bank
- bank remains protected from robbery

Transfers:
- wallet ↔ bank instant/free
- direct Ottoman member transfers free

Starter:
- new members receive a small one-time starter balance
- rejoining after inheritance/estate execution does not regrant starter funds

Bank:
- 5 tiers
- Tier 5 receives weekly interest
- higher tiers may require achievements/rare items
- no loans

Economy balancing engine monitors:
- aggregate liquid wealth
- distribution
- shop spend
- sell volume
- casino
- bank growth

It may gradually adjust bounded configuration values:
- work payouts
- loot sell values
- shop prices
- betting limits
- odds/drop rates

No member-facing display of the hidden balancing engine.

`/statement`:
- wallet
- bank
- liquid net worth
- recent transactions/reasons

Use robust internal ledger accounting even though broad admin transaction browsing is not exposed.

---

## 12. Daily / Weekly / Fortune / Grind

### `/daily`
- guaranteed Ottoman reward
- streak
- missing one day resets immediately
- milestone rewards: 7, 30, 100, 365 days

### `/weekly`
- guaranteed larger reward

No monthly claim.

### Daily Spin
- exactly one/member/day
- cannot buy extra spins
- hidden/random reward
- Ottomans, junk, sellables, tools, mystery boxes, rare collectibles

### `/fortune`
- once/member/day
- public in bot channel
- humor + small effects/items/rare surprises

### Repeatable grind
- `/scavenge`
- `/dig`
- `/fish`
- `/work`

No gameplay cooldown for the basic grind commands, but use a small technical anti-spam throttle.

`/work` pays Ottomans only and may result in win/zero/small loss/fine/tool damage; no jackpot.

No quests.
No scratchoffs.
No economy rewards for ordinary chat/VC activity.

---

## 13. Shop / Inventory / Collections

Shop:
- daily rotating
- core essentials always available
- premium/collectibles/tools rotate
- shared core + 1–2 personalized bonus slots
- all current items shown even if unaffordable
- show gating requirements
- no limited stock

Universal item rarity:
**Common → Uncommon → Rare → Epic → Legendary → Mythic**

Shop buyback:
- dynamic bounded buyback pricing
- no price-history feature

No member-to-member item trading/selling.

### Gifting
All gifts are named. No anonymous gifting.

Giftable:
- eligible collectibles/items
- unopened mystery boxes
- unopened gift boxes

Not giftable:
- tools
- crafted chairs
- recipes

Recipes are account-bound.

### Mystery boxes
- may be purchased
- hidden pity protection per box type
- pity persists across rotations
- resets on qualifying high-rarity pull

### Inventory
Sort/filter:
- rarity
- type
- quality
- lock
- sell value
- newness

Search by name.

Locks:
- individual
- category
- `/unlock all`

Bulk sell:
- Sell All Junk
- Sell Duplicates
- preserve one normal copy
- crafted chairs preserve highest-quality copy

### Collections
- standard and hidden sets
- hidden set revealed only when first piece is found
- reveal discovered piece; undiscovered pieces remain hidden
- set completion rewards profile/prestige/badges
- no direct economic advantage
- collection completion % excludes limited/event-only items
- limited items may return later and must be marked returning
- global collection completion leaderboard

---

## 14. Tools and Equipment

Slots:
- fishing rod
- shovel
- scavenging tool
- workshop tool

- manually equipped
- broken tool auto-unequips
- fallback to best usable alternative
- no usable required tool = activity blocked
- tools mainly from shop; rarest may drop
- rarity/quality affect durability/repair

Repairs:
- allowed at any damage
- never destroy tool
- never reduce permanent max durability
- cheap / standard / premium repair options
- random durability restored
- instant result

No robbery-protection items.

---

## 15. Chair Building / Crafting

Craftable progression:
1. Folding Chair
2. Barstool
3. Recliner
4. Chaise Lounge
5. Throne

Recipes:
- rare drops
- achievements/events
- sometimes shop
- immediately usable once owned
- recipe ownership, not skill rank, gates access

Failures:
- consume some materials
- still grant skill progress
- may produce scrap

Visible ranks:
**Apprentice → Craftsman → Chairwright → Master Chairwright → Grand Chairwright**

No numeric progress bar.

Quality:
**Standard → Fine → Exceptional → Masterwork → Perfect**

Perfect:
- impossible at lower ranks
- tiny chance at Master
- highest chance at Grand

Workshop tools improve outcomes/material efficiency.

Crafted chairs:
- permanent collectibles
- duplicates allowed/sellable
- higher recipes may consume previous crafted chair
- rare bot crafting orders
- no cooperative/hired player crafting

---

## 16. Casino and Lottery

Casino games:
- blackjack
- roulette
- slots
- dice
- coinflip

No poker.

Casino pays Ottomans only.

### Blackjack
Standard rules:
- Hit
- Stand
- Double
- Split when legal

### Slots
One main 3-reel Chair slot machine.
- multiple wager sizes
- all chair symbols
- ultra-rare matching chair combo triggers **Chair Pot**
- small portion of qualifying bets feeds Chair Pot

### Solo games
- Hangman
- Word Scramble
- Mastermind
- Minesweeper

Small Ottoman payouts, intentionally below grind profitability.

Records:
- Hangman total wins + longest streak
- Word Scramble total wins + fastest solve
- Mastermind total wins + fewest guesses
- Minesweeper wins + fastest clear by board size

### Weekly lottery
- Friday 8:00 PM MT
- ticket-funded only
- one winner
- full pot
- no rake
- max 20 tickets/member/week
- no ticket sales = drawing skipped
- no system-funded rollover
- public branded result

---

## 17. Giveaways

Admin-created only.
Requires Chaise Lounge or Throne.

- 1–5 winners
- duration 1 hour–7 days
- prize may be Ottoman/item/collectible/recipe/tool/custom reward
- free or paid
- paid entry fee bounded by economy model
- paid fees removed from circulation
- one entry/member
- post in `🤖-bots-dont-sit`

---

## 18. Chair Race — `/race` — LOCKED

Allowed in `💬-sit-and-chat`.

### Core flow
- member-triggered only
- one active `/race` or `/fight` betting event in main at a time
- `/line` may coexist
- no member gameplay cooldown after settlement
- starter automatically occupies Racer #1
- **2–6 racers maximum**
- remaining entrants use **Join Race**
- first-come, first-served
- each entrant receives a distinct temporary race-chair visual
- when six racers are present, all six canonical race chairs are visible
- all racers have equal real win probability
- visual chair presentation does not influence outcome
- 60-second entry/betting window
- if 6 slots fill, entry closes; betting remains open
- one-use **+30 Seconds** extension
- if fewer than 2 racers at close: cancel and refund

### Betting
- racers may bet
- public live bets
- one selection/member/event
- cannot switch selection
- may increase wager multiple times within limits
- 5% rake
- 95% distributed proportionally among winning bettors

### Live sprint — code invariant
- after entry/betting closes, run one fast continuous sprint lasting about **15–20 seconds**
- **NO LAPS** anywhere in UI, state, results, help, tutorial, dashboard, or telemetry
- each racer has one authoritative **0–100% progress value**
- chair position, progress bar, place/standing, and finish detection all derive from that same value/state snapshot
- visual position and progress bar must never drift out of sync
- race updates edit the **single authoritative Discord race message** rather than posting repeated race-state messages
- Discord pins/jump links may make the authoritative message easy to revisit, but the bot must never claim the message is physically sticky/docked while chat scrolls
- at finish, edit that same authoritative message into the final result card
- **no Rematch button**

### Visual reference — LOCKED
- canonical visual reference: `chair_race_discord_dashboard.png`
- dark emerald/black lounge frame, polished gold structure, six color-coded race chairs, compact live progress treatment
- desktop and mobile use the same information hierarchy, reflowed for available width

Track Race wins on profile.

---

## 19. Robo Chair Fight — `/fight [@member]` — LOCKED

Allowed in `💬-sit-and-chat`.

### Invocation and opponent selection
- `/fight` works **with or without** a member argument
- `/fight @member` immediately designates that current server member as the opponent; target acceptance is not required
- `/fight` with no target creates an open 1v1 fight slot; the first eligible member to **Join Fight** becomes Player 2
- self-fight blocked
- same opponent may be fought repeatedly
- if a fighter leaves before settlement: cancel/refund

### Fight model
- always exactly **2 fighters** once combat begins
- both players receive randomized temporary Robo Chair visuals
- robot stats/powers are decorative only
- actual winner remains strict **50/50**
- winner is selected by code-controlled fair RNG before the narrated combat sequence is finalized
- the generated combat narration must remain consistent with the selected winner without exposing the outcome early
- 60-second betting/join window
- one-use **+30 Seconds** extension
- fighters and audience may bet
- one selection/member; cannot switch
- may increase wager within cap
- 5% rake
- 95% proportional winner distribution

### Live combat — code invariant
- combat is a quick animated event lasting about **15–20 seconds**
- both fighters begin at **100 HP**
- actions resolve sequentially/alternatingly and update the authoritative health state, for example:
  - `Player 1 throws a chair —23 HP`
  - `Player 2 repairs armor +12 HP`
  - `Player 1 lands a slam —18 HP`
  - `Player 2 activates shield +12 HP`
- displayed action text, signed health delta, numeric HP, health bar fill, and final KO must all derive from the **same authoritative combat-state update**
- health is clamped to valid bounds; the losing fighter reaches 0 first and the preselected 50/50 winner remains above 0
- edit the **single authoritative fight message** throughout combat rather than posting a message per action
- the live combat log may retain the most recent actions within the card
- at KO, edit the same message into the final winner/results state
- no Rematch button

### Visual reference — LOCKED
- canonical visual reference: `robo_chair_fight_discord_showcase.png`
- red vs blue Robo Chairs, large centered VS, synchronized red/blue HP bars, alternating combat log, pool/betting controls
- same dark emerald/black + polished gold application frame as Chair Race and Line Time, with red/blue combat accents only where functional

Track Fight wins on profile.

---

## 20. Direct PvP Skill Games

Games:
- Tic-Tac-Toe
- Connect Four
- Battleship

Flow:
- `/<game> @member`
- target must accept
- free by default
- optional Ottoman wager shown before acceptance
- accepted wagers escrowed from both players
- full pot to winner
- no house rake
- challenge expires after 2 minutes
- active turn timeout 5 minutes = forfeit
- may cancel before acceptance
- after acceptance, Forfeit Match requires confirmation
- wagered forfeit awards pot to opponent
- draw refunds wagers
- one active skill-game match/member

Battleship:
- Auto Place
- Place Manually

Track:
- game-specific wins
- combined Skill Game Wins

---

## 21. Crime / Robbery / Jail

`/rob @member`

- wallet only
- bank protected
- robber cooldown: 30 min
- victim protection: 60 min after any attempt
- stolen amount = bounded percentage of victim wallet
- attempts increase wanted
- successes increase wanted more
- wanted decays automatically
- arrest resets wanted to clean

Wanted:
**Clean → Suspicious → Wanted → Most Wanted → Public Enemy**

Successful robbery card:
- victim-only **Fight Back**
- 60-second response
- successful fightback returns 100% stolen + raises robber arrest risk
- failed fightback adds no extra penalty

Witness:
- **911** button
- 3-minute window
- victim cannot report
- one report/member/incident
- multiple reports affect capped catch risk

If caught:
- stolen funds returned
- randomized bail using wanted + stolen + randomness
- 24-hour full bot command lockout unless bailed
- bail may be paid by self or another member

Jailed members:
- cannot initiate bot commands
- may receive transfers/items/inheritance/passive effects/bail

Jail command namespace is shared with the moderation jail system:
- `/jail roster [type: all|crime|moderation]` — public roster; defaults to all active jail states
- `/jail status [member]` — show the caller's own status by default; staff may inspect another member

Crime-jail and moderation-jail are distinct states. A member may technically have both. Their effective restrictions are the union of both states. Paying bail only clears **crime jail** and must never release or shorten a moderation sentence.

Arrest uses public mugshot card.

No:
- bounties
- insurance
- jailbreak
- bribes

---

## 22. Family / Marriage / Adoption / Estates

Family events are public in bot channel.

### Marriage
- default one spouse
- maximum 2 active spouses
- normal proposal requires Ring
- proposal expires after 24h
- second spouse requires **The Blessing of Angrier Jordan**
- Blessing consumed for that specific second marriage
- after divorce, a new second spouse requires a new Blessing
- Wedding Sack = expensive luxury sink; guarantees yes within bot
- second spouse still requires Blessing
- finances remain separate

### Divorce
- minimum marriage age 3 days
- random one spouse pays the other 50% of payer's liquid Ottomans
- items untouched
- same pair cannot remarry for 7 days
- family-event cooldowns scale with recent activity and decay after a quiet period

### Adoption
Parents must be married.

Child slots per marriage:
- 0–2d: 0
- 3d: 1
- 7d: 2
- 14d: 3
- 30d: 4
- 60d: 5 max

- one parent initiates
- spouse approval not required
- child acceptance required
- spouse tied to marriage auto-added as second parent
- if multiple spouse pairs are eligible, use oldest eligible marriage with open slot
- child belongs to one parent pair
- minimum 3 days before disown/emancipate
- ended links removed from active tree
- do not expose identity history of ended relationships

### Largest Family record
- active relationships only
- one server record
- current record family gets one random premium non-inflationary perk
- perk rerolls whenever record changes
- old record family loses perk

### Family auctions
- self-auction as spouse/adopted-child roleplay
- sealed bids
- optional reserve
- user duration 1–72 hours
- highest valid bid auto-finalizes if reserve met
- bids may increase, never decrease/withdraw
- escrow
- proceeds paid directly to person auctioned
- no general item auction marketplace

### Wills / inheritance
- one beneficiary
- any eligible member
- inherits all eligible assets/items
- leave/kick/ban/unavailable starts 24-hour grace
- rejoin during grace cancels estate
- ineligible beneficiary triggers fallback

No will:
- if family: choose one random eligible active spouse/child from entire pool, receives all
- if no heir: wallet+bank removed from circulation; eligible inventory auctioned item-by-item
- system estate auctions default 24h
- estate execution atomic and exactly once
- once executed, irreversible
- rejoining starts fresh; no restore or starter regrant

---

## 23. Party Games and Shared Voting

Party game categories:
**Casual · Friends · Dating · Married · Spicy · Unhinged · Random**

Channel:
**`🏆-gaming-chair`**

Only one active public party-game round at a time.

### Shared system name
The reusable system is called **Voting** everywhere.

Remove all:
- Crown Vote terminology
- Crown Wins
- Crown leaderboard
- Crown Runoff
- crown-themed voting wording

Voting modes supported internally:
- standard
- blind
- ranked
- runoff
- timed
- participant-only
- server-wide
- hidden totals
- live totals where configured

For creative party-game voting:
- one vote/member
- contestants may vote for others
- no self-vote
- vote may be changed until close
- totals hidden until close by default
- ties → 30-second runoff
- second tie → deterministic server RNG/random selection with explicit disclosure
- no Ottomans

Winning a game increments the specific game win and aggregate **Party Game Wins** when a true winner exists.

---

## 24. Fuck, Marry, Kill — `/fmk`

Channel: **`🏆-gaming-chair`**

### Selection
- `/fmk` only
- no user selection arguments
- Angrier Jordan randomly selects exactly 3 eligible current non-bot server members
- no duplicates
- no FMK opt-out
- all current eligible human members may be selected

### Chooser
The member who invokes `/fmk` is the chooser.

### Choices
Chooser assigns:
- one **Fuck**
- one **Marry**
- one **Kill**

Each subject must be used exactly once.

Choices remain private until chooser submits.

### Subject lifetime counters
Every completed FMK permanently increments exactly one lifetime counter for each selected subject:
- Fucked
- Married
- Killed

These counters appear numerically on:
- the FMK result card
- member profiles

Audience voting does not alter these counters.

### Audience vote
The audience is voting only:

**Do you agree with this FMK?**
- Agree
- Disagree

Not a "best answer" vote.
No FMK winner.

Rules:
- chooser cannot vote on own FMK
- other eligible members may vote
- anonymous ballots
- member may change vote until close
- totals hidden until close
- default voting duration: **3 minutes**
- one optional **+30 Seconds** extension
- at close, show vote totals and percentages
- exact tie = **Split Decision** (50/50); no runoff needed

### Chooser stats
Track:
- FMK Rounds Played
- Average Audience Agreement
- Highest Agreement
- Lowest Agreement

No "FMK Wins".

---

## 25. Other Party Games

### Truth or Dare
`/truthordare [@member]`
- target optional; no target = self
- no acceptance
- target may Skip
- Truth/Dare choice in card
- free-text answer via modal
- render answer into game card
- named responses

### Would You Rather
- server-wide
- 2 choices
- 60 sec
- one-use +30 sec
- results after close

### What Would You Do
- server-wide
- typically 4 choices
- 60 sec + one-use +30 sec

### Finish the Sentence
- host chooses Random Prompt or Write My Own
- custom prompt through modal
- 60 sec submission + one-use +30 sec
- one submission/member
- may revise until close
- then shared Voting system

### One Word Story
- presets 25/50/75/100/150/200
- default 50
- safe range 10–200
- one word per turn
- same member cannot immediately follow self
- at target length, 60-sec hidden Voting on favorite contribution/member
- winner gets game win + Party Game Win

---

## 26. Line Time — `/line` — LOCKED

Channel: `💬-sit-and-chat`

### Readiness
- `/line` is a normal slash command; `!line` is retired and must not be registered, documented, migrated, or displayed
- any member can start
- starter becomes host and automatically **I'm In**
- one active `/line` per channel
- may coexist with `/race` or `/fight`
- readiness window 60 sec

Buttons:
- **I'm In**
- **I Need a Second**
- **Start Countdown** — host only
- **Cancel Line** — host control

No third readiness button.

At 60 sec:
- readiness buttons lock
- host may still start
- host may start early
- host may override members in Need a Second

If overriding:
- Angrier Jordan publicly shames those members using rotating prewritten lines

Abandoned line expires after 15 minutes.

### Animated countdown — code + asset invariant
- idle/readiness state displays the normal **Line Time** center artwork
- when the host starts the countdown, the countdown animation occurs **inside that same center frame and replaces the Line Time artwork**
- outer frame/layout remains stable; the center is the animation stage
- sequence is exactly **5 → 4 → 3 → 2 → 1**
- only one number is visible at a time
- each number is large, centered, and constructed from Chairs-themed chair artwork
- after **1**, **do not show 0**
- instead, the center immediately erupts into an **explosion of white powder/dust** with brief chair debris
- powder/debris remains visually bounded inside the same frame, then falls/fades into the completion state
- implementation target is an optimized Discord-compatible APNG/GIF or deterministic frame sequence driven by the authoritative Line Time state

### Visual reference — LOCKED
- canonical visual references: `royal_chair_countdown_discord_mockup.png` and `line_time_a_chair_countdown_storyboard.png`
- the storyboard is the authoritative sequence reference for Ready → 5 → 4 → 3 → 2 → 1 → white-powder explosion
- Line Time shares the same dark emerald/black, polished-gold application frame and button hierarchy as Chair Race and Robo Chair Fight

---

## 27. Channel Games

### Counting — `🔢-counting-chairs`
- count indefinitely
- wrong number resets to 1
- same member cannot post twice consecutively
- every exact 100 milestone gives poster +1 Counting Win
- count continues after milestone
- wrong number publicly shows breaker + previous valid count
- Recliner+ may restore last valid count for intentional sabotage
- restore logged

### Last Letter — `🦵-last-leg`
- word must begin with last letter of previous word
- normal English + common slang + adult/profane allowed
- reject proper names, usernames, abbreviations, made-up words
- reject duplicate words within round
- same member cannot take two valid turns consecutively
- invalid does not break chain
- scoring:
  - invalid: -1
  - valid: +1
  - same first/last letter: +2
- scores may go negative
- first to 50 wins
- winner +1 Last Letter Win
- reset round/chain

---

## 28. Community Tools

### Polls
- one vote/member
- timed or manual close
- hidden/live result options
- anonymous
- ranked-choice available

### Superlatives
- admin-started numbered Season
- nominations 48h
- voting 48h
- no self-nomination
- one nomination/member/category
- top 5 finalists
- deterministic tie handling at finalist cutoff
- final one winner/category
- nominations/votes anonymous to members
- category names only
- restrained reminders
- winner receives permanent season badge
- no Ottomans

### Suggestions
- member submissions
- voting
- statuses
- optional submitter anonymity
- searchable archive

### AMA
- question may be anonymous or named
- admins answer or decline
- declined question may disappear with private submitter status
- upvotes only
- admin sorting

### Self-assignable roles
Buttons/select menus.

---

## 29. Chairisms / Quote Creation

Output channel:
**`📝-chairisms`**

Primary interaction:
**Message → Apps → Create Chairism**

Secondary commands:
- `/quote message:<message link>`
- `/quote text:<text>` for self-authored custom quote
- `/chairisms recent`
- `/chairisms member`
- `/chairisms random`
- future search support

Manual `/quote text` may only attribute to the invoking member unless staff uses an authorized override path.

### Creation options
- This Message
- Include Replied Message
- Include Image (when attachment exists)

### Output
Finished quote always posts to `📝-chairisms`.

Creator receives small confirmation with link/jump to Chairism.

Card functional data:
- member avatar/portrait
- quote text
- member display name/alias
- timestamp
- optional source channel
- Chairism ID/number if enabled

Decorative:
- lounge background
- furniture
- lamps
- plants
- gold frame
- Angrier Jordan/Chairs branding

### Safety
Do not allow public Chairisms sourced from:
- staff/private channels
- moderation/quarantine evidence
- DMs
- deleted content unavailable to bot
- bot/system messages unless explicitly permitted

Already-created Chairism is not automatically deleted when original source message is later deleted.

Store lightweight metadata:
- Chairism ID
- source member
- created by
- source message ID
- created timestamp
- output message ID

Rate-limit spam technically.

---

## 30. Music Module

### Scope
Full music subsystem modeled after modern persistent-controller Discord music bots.

### Entry
`/play <search or link>`

There is no separate required `/search` command.

As the user types the `/play` option:
- Discord autocomplete returns matching tracks live
- selecting a result fills the command option
- pasted URLs bypass search resolution

Accepted reference inputs:
- Spotify
- Apple Music
- YouTube
- SoundCloud
- supported direct audio sources

Provider adapters must separate:
- metadata/link resolution
- actual playable audio source

Do not design the system around unauthorized extraction/rebroadcast of protected provider streams.

### Where music may be used
Music commands are only valid from **the embedded text chat associated with a voice channel**.

Normal text-channel attempts receive an ephemeral instruction to join/open a voice-channel chat.

### Concurrency — resolved default
One Angrier Jordan bot account means:
- **one active music voice channel per guild at a time**

If a second VC attempts to start playback while another music session is active:
- do not silently move the bot
- tell the user which VC owns the active session
- DJ/admin can explicitly stop/move/release it

Future companion bot accounts may add multi-room playback but are not in v1.

### Persistent controller
Each active music session has one authoritative controller message in that voice-channel chat.

It shows:
- artwork
- title
- artist
- album
- source
- requester
- progress
- duration
- volume
- loop
- autoplay
- queue count
- voice channel

Controls:
- Previous
- Pause/Resume
- Skip
- Stop
- Shuffle
- Loop
- Queue
- Volume
- additional menu as needed

Discord cannot truly dock a bot message to the client bottom.
Implementation:
- keep one authoritative controller
- pin it
- edit it for state changes
- refresh/repost to recent position after meaningful music interactions only when appropriate
- avoid spammy delete/repost loops

Idle state remains visible:
**THE JUKEBOX IS EMPTY**
Use `/play` and type something worth listening to.

### Standard music features
- `/play`
- `/pause`
- `/resume`
- `/skip`
- `/previous`
- `/stop`
- `/replay`
- `/seek`
- `/queue`
- `/remove`
- `/move`
- `/clear`
- `/shuffle`
- `/jump`
- `/loop`
- `/autoplay`
- `/volume`
- `/nowplaying`
- `/history`
- `/playlist create`
- `/playlist add`
- `/playlist remove`
- `/playlist play`
- `/playlist rename`
- `/playlist delete`
- `/playlist view`
- `/join`
- `/leave`
- `/music help`
- optional 24/7 mode

### Queue behavior
- if idle: start immediately
- otherwise append
- album/playlist link adds available tracks in bulk
- duplicate detection; user may confirm duplicate
- unavailable items skipped cleanly with explanation
- queue persists/recoverable after restart where practical

### Skip
- requester may skip own song immediately
- DJ staff may force skip
- otherwise use Vote Skip with majority of eligible current listeners

### DJ
Automatic DJ authority:
- Throne
- Chaise Lounge
- Recliner

Optional dedicated DJ role may be configured.

DJ controls:
- force skip
- stop
- clear
- move/remove anyone's queue entries
- volume
- loop/autoplay
- move/release player
- 24/7 toggle

---

## 31. Social Commands

Allowed primarily in `💬-sit-and-chat`.

Commands:
- `/ts [@member]` — response always contains “Type Shit”
- `/hit`
- `/slap`
- `/pillow`
- `/cushion`
- `/stab` — fictional/cartoon/non-gory
- `/choke` — comedic
- `/shh`
- `/belittle`
- `/bonk`
- `/yeet`
- `/sit`
- `/standup`
- `/fold`
- `/recline`
- `/sideeye`
- `/judge`
- `/shame`
- `/boo`
- `/bruh`
- `/wtf`
- `/sus`
- `/yap`
- `/touchgrass`
- `/blame`
- `/disappoint`
- `/chaircheck`
- `/throwchair`
- `/getup`
- `/calmdown`
- `/absolutelynot`
- `/explainyourself`
- `/embarrassing`
- `/questionable`
- `/respect`
- `/compliment`
- `/wheresmyvape`
- `/hitthegeekbar`

Use large prewritten randomized response pools.
No AI call required.
Small technical anti-spam throttle.

### `/roast @member`
- randomized intensity internally: mild/angry/brutal/nuclear
- no user-selected intensity
- may personalize using bot-owned stats only
- do not inspect private/raw messages for roast material
- target may **Roast Back** once, bypassing cooldown
- user may opt out of `/roast` targeting only

### `/notmad [@member]`
Throne/server-owner only.
Exact response:
**“I am not mad. I’m just disappointed.”**
No variation.

---

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

### 32.21 Moderation Jail / Hotseat

Add a full **moderation jail** system as a containment option distinct from the playful crime/economy jail in Section 21. The moderation version is an actual Discord access restriction and moderation case action.

#### Purpose
Use jail when staff want to temporarily isolate a member from normal server activity while still allowing a controlled place to communicate with staff and, if configured, other jailed members. It is not a substitute for a ban when removal from the server is required.

#### Default Discord structure
- Configured jail role: **Jailed**
- Configured text channel: **`🔥-hotseat`**
- The bot maintains channel/category permission overwrites so the Jailed role cannot view or participate in ordinary server channels.
- The jail channel remains visible to jailed members and authorized staff.
- Voice Connect/Speak access is denied while moderation-jailed by default.
- Threads, external links, attachments, stickers, and application-command access in the jail channel are configurable; default is plain text + reactions + permitted jail commands only.
- Setup/reconciliation must automatically apply required jail-role overwrites to newly created normal channels/categories.

Discord members with the Administrator permission bypass channel permission overwrites. The bot must therefore refuse to claim a normal role-only jail succeeded for a member who still has Administrator. Optional staff-jail behavior may temporarily suspend configured staff/admin roles, but this is **Throne-only and disabled by default**.

#### Command namespace
Use a shared `/jail` command group so the existing crime-jail roster and moderation jail do not collide:
- `/jail roster [type: all|crime|moderation]` — public roster
- `/jail status [member]` — own status by default; staff may inspect another member
- `/jail send @member duration: reason:` — authorized staff only
- `/jail release @member reason:` — authorized staff only
- `/jail extend @member duration: reason:` — authorized staff only
- `/jail reduce @member duration: reason:` — authorized staff only
- `/jail reason @member` — member sees own case reason; staff can inspect another member
- `/jail history @member` — staff-only historical view

`duration` supports bounded presets and human-readable input. Default supported range is 5 minutes through 30 days, plus `indefinite` for manual release. Hard safety bounds remain in code.

#### What happens when a member is jailed
1. Validate moderator authority, Discord role hierarchy, protected-user rules, and whether effective confinement is technically possible.
2. Create a numbered moderation case with action type `JAIL`.
3. Snapshot only the role/access information required for safe restoration. Do not store unrelated permissions.
4. Apply the Jailed role and any configured temporary staff-role suspension.
5. Cancel or block participation in active wagers/games where continuing would bypass confinement; refund/settle safely according to the originating game's rules.
6. Post a jail-entry card in `🔥-hotseat` containing member, reason, sentence, case ID, release time, and allowed member controls.
7. Send a private action explanation when DMs are available.
8. Log the action to `🚨-broken-chair`.

Allowed member controls while moderation-jailed:
- `/jail status`
- `/jail reason`
- `/rules`
- `/help` limited to jail-safe actions
- **Request Review** / appeal control
- messages/reactions in the jail channel according to config

All economy, gambling, game, social, music-control, custom-command, family, transfer, gifting, shop, crafting, robbery, race/fight, and ordinary community commands are blocked while moderation-jailed unless explicitly allowlisted. Passive receipts such as inheritance or already-scheduled noninteractive effects may still settle safely.

#### Release and restoration
Release may occur by:
- sentence expiry
- `/jail release`
- successful appeal/reversal
- case modification

Release must be restart-safe and idempotent. The system removes only restrictions it owns and restores only roles/access it explicitly suspended. It must never overwrite unrelated role changes that staff legitimately made while the member was jailed.

If a member leaves while jailed, the sentence persists in the database. On rejoin before expiration, jail is automatically reapplied. Expired sentences are closed cleanly on reconciliation.

#### Appeals and staff controls
The jail card/member notice includes **Request Review**. Existing appeal-independence rules apply: the original moderator cannot be the sole reviewer of their own jail action.

Staff controls on the case card may include:
- Release
- Extend
- Reduce
- Convert to Timeout
- Escalate to Ban
- Add Staff Note
- View Evidence

Every change writes to the same case audit history.

#### Progressive discipline integration
Moderation jail is an available configurable outcome in progressive discipline and AutoMod action maps. It should generally be used as a controlled containment step; critical security events may still go directly to timeout, kick, ban, quarantine, or anti-raid containment as appropriate.

#### Crime jail interaction
Crime jail remains a game/economy state. Moderation jail remains a moderation/security state.
- Bail clears only crime jail.
- `/jail release` clears only moderation jail unless an explicit Throne-only override names `type: crime`.
- If both states are active, the member remains restricted until each applicable state independently ends.
- The roster clearly labels `CRIME`, `MODERATION`, or `BOTH`.

#### Data / config boundary
**Code / invariants**
- authority/hierarchy validation
- Administrator-bypass detection
- confinement/reconciliation engine
- safe role suspension/restoration
- command allowlist enforcement
- dual crime/moderation jail-state composition
- case creation and audit linkage
- expiry jobs and rejoin reapplication
- appeal-independence rules
- hard duration limits

**Owner-editable config / DB-backed settings**
- enabled/disabled
- jail role and channel IDs
- which channels/categories are excluded from confinement rules
- default/preset sentence durations within hard bounds
- member capabilities inside jail
- whether jailed members can see/talk to one another
- reactions/attachments/links/stickers permissions
- voice access
- public vs staff-only jail announcements
- staff capability matrix
- progressive-discipline mappings
- staff-role suspension option (default off)

**Database state**
- active moderation sentences
- sentence start/end timestamps
- case ID
- reason/category
- role suspension/restoration metadata
- leave/rejoin reconciliation state
- history/reversals/appeals

**Content / assets**
- jail-entry/release/extension copy
- Angrier Jordan jail flavor lines
- jail card / cell-door visual template

## 33. Records / Leaderboards

`/tldr daily|weekly` = command-triggered only.

`/records`:
- current live records
- no permanent Hall of Fame
- monthly records reset 1st at 4 AM MT
- all-time records never reset
- record-break cards post in `🤖-bots-dont-sit`
- show old record, new record, how long held

Casino raw-stat records may include:
- biggest single win
- biggest bet
- biggest loss
- longest win streak
- biggest Chair Pot
- biggest lottery jackpot

Leaderboards:
- seasonal where appropriate
- lifetime stats remain on profiles
- wealth = wallet + bank
- collection %
- crafting
- gambling
- crime
- Weekly Spotlight historical wins

No fish/dig/scavenge leaderboard.

Channel-game stats:
- total wins
- no generic point system except Last Letter round score

---

## 34. Public Major Event Cards

Custom major image cards for:
- marriage
- divorce
- inheritance
- Superlative win
- auction win
- major casino win
- arrest/mugshot
- lottery
- Chair Pot
- major records
- Race/Fight
- FMK
- Weekly Spotlight
- major Voting results where appropriate

No full custom image card required for:
- rare drop
- completed normal chair craft
- gift-box opening

---

## 35. Technical Safety / Correctness

Always:
- Discord user ID primary key
- database transactions for currency/inventory
- escrow for wagers/auctions
- atomic settlement
- idempotency keys
- restart-safe timers/jobs
- unique settlement constraints
- one-use race/fight extension enforced atomically
- duplicate inheritance prevention
- no self-transfer/self-rob where nonsensical
- immutable settled events
- bounded economy auto-balancing
- full internal accounting ledger
- backups and restore drills
- migrations tested before production
- structured logs
- error IDs surfaced to users without leaking internals

Scheduled work should use persistent job/state records rather than in-memory-only timers for anything financially or socially important.

---

## 36. Feature Flags

Every major module should have a server configuration feature flag:
- profiles
- activity tracking
- weekly spotlight
- economy
- shop
- crafting
- casino
- lottery
- race
- fight
- crime
- family
- party games
- FMK
- channel games
- community tools
- Chairisms
- music
- moderation AI
- social commands
- introductions
- haiku detector

Disabled features:
- disappear from help/autocomplete where practical
- reject direct invocation cleanly
- retain stored data unless an explicit destructive migration/reset is authorized

---

## 37. Build Order for Codex

### Phase 1 — foundation
1. project skeleton
2. config/env validation
3. Discord client + intents
4. PostgreSQL schema/migrations
5. role/channel resolver
6. command registry
7. structured logging
8. scheduled job framework
9. feature flags
10. renderer framework
11. automated tests
12. deploy pipeline

### Phase 2 — vertical slice
1. `/profile`
2. activity tracking
3. Weekly Spotlight
4. Ottoman wallet/bank/ledger
5. `/race`
6. `/fight`
7. `/line`

### Phase 3 — core economy
1. daily/weekly/spin/fortune
2. work/fish/dig/scavenge
3. shop/inventory
4. tools
5. crafting
6. collections

### Phase 4 — games/social
1. casino
2. lottery
3. PvP skill games
4. party games
5. shared Voting
6. FMK
7. Counting/Last Letter
8. social commands

### Phase 5 — community systems
1. family
2. auctions/estates
3. polls
4. Superlatives
5. suggestions
6. AMA
7. giveaways
8. Chairisms
9. configurable introductions

### Phase 6 — music/moderation
1. music player/controller
2. provider resolver abstraction
3. playlists/history
4. DJ/vote skip
5. moderation deterministic layer
6. moderation AI review path
7. appeals/quarantine retention

### Phase 7 — hardening
1. concurrency tests
2. settlement tests
3. economy simulation
4. backup/restore drill
5. restart tests
6. permission tests
7. abuse tests
8. renderer regression screenshots
9. production soak

---

## 38. Discord Deployment Requirements

Required intents/permissions must be enabled for the functionality used, including:
- guild/member information
- message content where required for message/word tracking, Counting, Last Letter, `/line`, moderation
- voice-state updates
- message management
- attachments/embeds
- role management where authorized features need it
- connect/speak for music
- application commands/interactions

Bot startup must validate required channel IDs, role IDs, and permissions and report missing configuration clearly.

---

## 39. Resolved Defaults from Final Audit

The following are now frozen unless the owner explicitly changes them:

- Music: one active VC session per guild in v1.
- FMK chooser: command invoker.
- FMK voting: 3 minutes + one optional 30-second extension.
- FMK: no opt-out.
- Weekly Spotlight ties: co-winners.
- Weekly Spotlight badges: profile/bot badges only, not Discord roles.
- Weekly Spotlight announcement: `@everyone` in `💬-sit-and-chat`, adaptive high-activity Monday post time.
- Triple Threat: permanent and permanently occupies the Weekly Spotlight profile showcase position after unlock.
- Voting: all Crown terminology removed.
- Runtime graphics: deterministic templates, never AI-generated per interaction.
- Older mockups with outdated Crown/FM​K/Spotlight logic are reference-only.

---

## 40. Stored Content Architecture — LOCKED

Large authored pools are content data, not application code.

Core launch targets:
- Would You Rather: **2,000**
- Truth: **1,500**
- Dare: **1,200**
- What Would You Do: **1,500**
- combined core party-game bank: **6,200** prompts/scenarios

Content records use stable IDs and metadata such as category, intensity, tags, enabled status, and content version. Game-specific records may also contain options.

`Random` is a runtime selector across enabled categories and does not have its own duplicate content bank.

Runtime repetition protection:
- exclude roughly the last 250 used IDs for the selected game
- exclude roughly the last 75–100 used IDs within the selected category
- never repeat within the same active session
- Skip must force a different content ID
- prefer underused eligible content when multiple choices are available

Other large authored pools such as social replies, roast templates, `/line` shame lines, fortunes, Haiku complaints, NPC dialogue, Finish the Sentence prompts, and Superlative starter categories also belong in content files/records rather than source code.

---

## 41. Configurable Introduction System — LOCKED

Primary introduction channel: configured `pull-up-a-chair` channel.

Members may:
- view the channel
- read history
- react to published introductions
- use application commands/interactions

Normal member posting is disabled. Angrier Jordan publishes the standardized introduction card.

Member entry points:
- persistent **Create Introduction** / **Edit My Introduction** panel
- `/introduce`
- `/introduce edit`
- `/introduce preview`

Rules:
- one active introduction/member
- members may edit only their own introduction
- edits update the existing bot post when possible
- multi-page modal flow when prompt count exceeds one modal
- form prompts are owner-configurable without a code deployment
- published card header/footer, avatar/display-name/join-date visibility, prompt labels, prompt order, required/optional status, placeholders, length limits, and visibility are configurable
- Throne has full configuration access
- Chaise Lounge access is controlled by configuration
- Recliner has no form-builder access by default

The default seed configuration is stored separately, while live editable settings/prompts are persisted in PostgreSQL.

Canonical supporting files:
- `/mnt/data/ANGRIER_JORDAN_INTRODUCTION_SYSTEM_SPEC.md`
- `/mnt/data/angrier_jordan_intro_default_config.json`

---

## 42. Code vs Configuration Boundary — LOCKED

Every new command, feature, rule, content bank, or visual setting must be classified before implementation. Codex must not automatically hard-code a value merely because it appears in this specification.

### Use CODE for
- Discord interaction flow and API handling
- algorithms, probability math, scoring, validation and state machines
- security/permission enforcement
- transaction, escrow, settlement and idempotency rules
- invariants that must remain true even if an owner edits configuration
- parsing, rendering logic, provider adapters and scheduled-job execution
- safety bounds that configuration is not allowed to exceed

### Use CONFIG for
- owner-adjustable channel/role mappings
- feature flags
- timings, limits, cooldowns and bounded percentages
- enable/disable switches
- labels, headings, footer copy and display options
- economy tuning values that are safe inside code-enforced bounds
- moderation thresholds/policy toggles
- game defaults and server-specific behavior choices

Default configuration may live in version-controlled JSON/YAML/TypeScript schema files, but **live editable server configuration belongs in PostgreSQL**. A bot admin edit must not require changing a deployed JSON file.

### Use CONTENT for
- large prompt/question banks
- randomized response pools
- NPC dialogue
- fortunes, roasts, shame lines and similar authored text
- shop/item/recipe catalogs when records are data-driven

Content is seeded/imported from structured files and stored/queryable separately from application logic.

### Use DATABASE STATE for
- balances, inventories and ledgers
- member profiles/statistics
- active games/events
- marriages/adoptions/estates
- votes, submissions, introductions and suggestions
- usage counts/history and prompt last-used data
- any user-created or runtime-changing record

### Use ASSETS/TEMPLATES for
- static badge/icon/background art
- deterministic card/layout templates
- visual theme resources

### Use SECRETS/ENVIRONMENT for
- Discord bot token
- database credentials
- provider/API secrets
- signing/encryption secrets

Secrets must never be placed in ordinary configuration/content files.

### New-feature decision rule
For every newly requested command or feature, Codex must document:
1. the code behavior/invariants,
2. owner-editable configuration,
3. authored content/data pools,
4. runtime database state,
5. assets/templates, if any,
6. secrets/external credentials, if any,
7. help/tutorial obligations: command help, field explanations, contextual help and safe practice behavior.

If a value is likely to be changed by the owner without changing what the feature fundamentally *is*, make it configuration. If changing it changes the algorithm, security model, transaction semantics, or core invariant, keep that part in code.

The system-by-system audit is maintained in:
- `/mnt/data/ANGRIER_JORDAN_CODE_CONFIG_AUDIT.md`
- `/mnt/data/angrier_jordan_configuration_registry.json`

---

## 43. Web Administration Dashboard — LOCKED

Angrier Jordan includes a **simple-to-mid-level web dashboard** for managing complex configuration. Discord remains the primary member experience; the dashboard is for owner/staff administration.

### Core architecture
- Discord OAuth2 login.
- Server-side guild membership and role/capability verification.
- Throne has full dashboard access; Chaise Lounge and Recliner receive only configured capabilities.
- The dashboard and Discord admin commands use the **same configuration service** and PostgreSQL-backed live settings.
- JSON files remain defaults/seeds, not the runtime control plane.
- Every dashboard mutation is audited with actor, timestamp and before/after values.
- Code-enforced security, fairness and transaction invariants cannot be overridden by dashboard settings.

### Launch pages
Dashboard Home; Server Settings; Channels & Roles; Moderation; Jail / Hotseat; AutoMod; Raid & Anti-Nuke; Economy; Shop & Crafting; Games & Activities; Introduction System; Social Commands; **Custom Commands**; Content Library; **Tutorial & Help**; Weekly Spotlight; Community Features; User Management; Audit Logs; Bot Status.

### High-risk controls
Panic Mode, security-module changes, protected/trusted identity changes, Hotseat sentence changes, economy corrections, bulk content actions, critical role/channel remapping and safe rollbacks require confirmation and audit logging.

### Visual direction
Use the approved dark Angrier Jordan dashboard mockup as the design reference: charcoal/black surfaces, restrained red accenting, green status indicators, clear cards, left navigation and desktop-first responsive layout. It is a style/interaction reference rather than a requirement for pixel-perfect reproduction.

### Implementation
A lightweight TypeScript web app (Next.js or equivalent React stack) may run beside the bot and share PostgreSQL plus validation/configuration schemas. No Redis or microservice architecture is required for v1.

Full specification:
- `/mnt/data/ANGRIER_JORDAN_WEB_DASHBOARD_SPEC.md`
- `/mnt/data/angrier_jordan_dashboard_default_config.json`
- `/mnt/data/angrier_jordan_dashboard_assets/dashboard_reference_mockup.png`

---

## 44. Safe Custom Commands — LOCKED

Angrier Jordan includes a **safe custom-command builder** so the server can retire YAGPDB custom commands without losing familiar triggers or lightweight automation.

The engine is configuration-driven and **must not execute arbitrary user code**. It supports validated trigger types, conditions, safe response templates, role actions against an explicit assignable-role allowlist, and delegation to approved native Angrier Jordan workflows.

Primary management is through the web dashboard **Custom Commands** page, with staff Discord commands for create/edit/delete/enable/disable/list/test/clone/info. Throne has full access; Chaise Lounge may create/edit/delete by default; Recliner is view/test only unless configured otherwise.

Supported launch trigger types:
- exact text
- prefix
- optional bounded contains trigger
- optional safe-regex trigger
- native interaction alias/workflow shortcut

Supported action families:
- send/reply/DM bot-authored text or cards
- add configured reactions
- bounded delete-trigger-message behavior
- safe add/remove/toggle of allowlisted self roles
- show a native self-role panel
- delegate to approved native workflow actions such as `race.start` and `line.start`
- bounded random response pools and simple validated argument/template variables

The current YAGPDB migration path is:
- reaction-role custom commands → native Angrier Jordan Self Role panels, optionally exposed through familiar custom triggers such as `!roles`;
- race-start custom command → custom alias delegating to the native `/race` engine;
- line-start custom command → custom alias delegating to the native `/line` engine.

The custom-command system never duplicates native race/line/economy/moderation state machines. Native permissions, cooldowns, channel rules, jail restrictions and transactions are rechecked at execution.

Security invariants:
- no arbitrary JavaScript/Go templates/shell/SQL
- no arbitrary HTTP callbacks in v1
- no recursive custom-command calls or loops
- no access to secrets/environment values
- generic role actions cannot assign protected/staff/bot-managed roles
- Discord role hierarchy always applies
- regex/action count/execution time/response size have hard caps
- every command mutation is audited

Architecture classification: **Code + Config + Database + Content**.

Supporting files:
- `/mnt/data/ANGRIER_JORDAN_CUSTOM_COMMANDS_SPEC.md`
- `/mnt/data/angrier_jordan_custom_commands_default_config.json`

---

## 45. Interactive Tutorial & Help System — LOCKED

Angrier Jordan includes a **guided, interactive tutorial system** designed for members who are new to Discord, new to bots, or learning a complex Angrier Jordan feature.

`/help` is the quick reference. `/tutorial` is the teacher.

Launch capabilities:
- `/tutorial`, continue/progress/restart/path/command flows;
- welcome-panel **Show Me Around** entry point;
- permission-filtered paths for Discord Basics, Bot Basics, Essentials, Economy & Shop, Games, Crime & Family, Music, Community, Safety & Moderation, Staff Academy, Owner/Admin and Command Finder;
- field-by-field command explanations with required/optional status and complete examples;
- contextual **How This Works** help on complex feature cards;
- private tutorial progress with stable lesson IDs;
- safe practice simulations that cannot alter real economy, moderation, wagers, protected roles or destructive server state;
- dashboard **Tutorial & Help** editor with preview, content editing, ordering and coverage checks.

### Mandatory learning Definition of Done
Every user-facing feature/command must be classified as self-explanatory, guided or advanced. Every slash command requires help metadata. Every command with fields requires plain-English help for every field plus at least one completed example. Every multi-step/complex feature requires a tutorial lesson or contextual-help definition. Staff/admin learning content is permission-filtered.

New or changed commands/features must update their help/tutorial metadata in the same implementation change. Build/CI validation must fail when required help definitions are missing or tutorial links reference nonexistent commands. Practice mode must never create real economic, moderation, role, wager, security or other protected side effects. Tutorial completion never grants Ottomans or progression rewards.

Architecture classification: **Code + Config + Content + Database + Asset**.

Supporting files:
- `/mnt/data/ANGRIER_JORDAN_TUTORIAL_SYSTEM_SPEC.md`
- `/mnt/data/angrier_jordan_tutorial_default_config.json`
- `/mnt/data/angrier_jordan_tutorial_content_v1.json`
- `/mnt/data/angrier_jordan_command_help_catalog_v1.json`
- `/mnt/data/angrier_jordan_tutorial_help_coverage_report.json`

---

## 46. Build-Ready Rule

Codex should proceed without asking the owner about ordinary engineering decisions.

Only stop for:
- credentials/tokens
- Discord application/guild/channel/role IDs that cannot be discovered safely
- external provider credentials
- destructive production actions
- a genuine product contradiction not resolved by this document

When a safe standard engineering choice exists, make it, document it, test it, and continue.


---

## Developer Acceleration / Single-Source Engineering Rules

The Developer Acceleration Pack is a build-time companion to this canonical specification.

- Command definitions must originate from the **Master Command Registry**; slash registration, argument validation, `/help`, tutorial linkage, dashboard documentation, and command QA should consume the same definition rather than maintain separate hand-written lists.
- Owner-editable settings must originate from the **Master Settings Schema** and flow through one ConfigService. Dashboard and Discord admin controls must not implement independent validation rules.
- Permission checks must use one capability service shared by bot and dashboard.
- Ottoman movement must use the shared Ledger/escrow contracts. No module may write balances directly.
- Timed/consequential interactions must use persisted Session/Timer/Scheduler primitives and be restart-safe/idempotent.
- Voting features must use the shared VotingEngine unless a documented technical reason makes it impossible.
- New features must first determine whether they extend an existing shared engine before introducing new infrastructure.
- Production live state belongs in PostgreSQL; JSON remains seed/default/content data.
- Every new command/feature must update the command/config/capability registries, dependency graph, tests, help/tutorial coverage, and dashboard exposure when applicable.
- Development should follow the cost-optimized phased plan with unfinished modules behind feature flags.
- General-purpose visual asset generation should stop unless a feature has a concrete missing production asset; reuse the existing production asset pack and renderer shells.

Developer acceleration pack path in final handoff: `developer_acceleration/`.


---

## Pre-Code Construction & Generated Architecture — LOCKED


The production build must use the pre-code construction architecture supplied with the final handoff.

Permanent rules:
- Command metadata is defined once in the master command registry and used to generate Discord registration/handler/help wiring where practical.
- Editable-setting metadata is defined once in the master settings schema. Live values remain PostgreSQL-backed.
- Domain behavior is separated from Discord and dashboard adapters.
- Sessions, timers, voting, ledger, escrow, permissions, configuration validation, audit and scheduled-job idempotency are shared engines and must not be independently reimplemented inside features.
- Would You Rather is the Golden Feature reference for interactive non-economic modules.
- Ordinary dashboard controls are generated from the settings schema; custom dashboard editors are reserved for genuinely complex features.
- Prisma/database schema changes precede implementation of dependent persistent-state features.
- Unfinished features remain behind feature flags until acceptance gates pass.
- Every feature follows the Feature Template and updates Code/Config/DB/Content/Assets/Secrets/Dashboard/Help/Tests classifications as applicable.
- Generic new visual concept assets are not created during development unless a concrete production-runtime asset gap exists.
- PostgreSQL + bot process + dashboard process remain the default architecture; no Redis/microservices/Kubernetes without measured need.
- Cost-optimized build order is Foundation → Shared Engines → Golden WYR → Moderation/Onboarding → Economy → Games → Community/Social/Family → Music → Dashboard completion → Integration/Deployment.
