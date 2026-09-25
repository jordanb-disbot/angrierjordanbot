# Angrier Jordan — Code / Config / Content Audit

Version: 2026-09-20
Status: Canonical supporting architecture document

This audit reviews the current Angrier Jordan feature set and defines where each part belongs. It is intended to prevent owner-adjustable values from being buried in source code and to prevent safety/transaction invariants from becoming editable configuration.

## Architecture rule

**Code** owns behavior, algorithms, validation, security, transaction semantics and hard safety bounds. **Config** owns safe owner-adjustable choices. **Content** owns authored catalogs/prompts/replies. **Database state** owns live member/server/runtime records. **Assets/templates** own static visual resources. **Secrets** live only in environment/secret storage.

For settings editable from Discord, the JSON/config file is the **default seed/schema**, not the live source of truth. Live edits must be persisted in PostgreSQL so `/...-config` changes survive deploys and do not require editing files on the host.

## Full system audit

| System | Classification | Code boundary | Config / owner-editable | Runtime state | Content / assets |
|---|---|---|---|---|---|
| Core roles & permissions | Code + Config | Permission checks and hierarchy enforcement are code; Discord role IDs and optional admin permissions are config. | Role IDs, admin capability toggles | Guild/member permissions | None |
| Channel routing | Code + Config | Routing/validation is code; actual channel IDs and allowed-channel maps are config. | Channel IDs, allowed modules per channel | Current channel/session ownership | None |
| Feature flags | Code + Config | Feature gates are code; enabled/disabled state is config. | Per-module flags | None | None |
| Time/reset scheduler | Code + Config | Idempotent jobs/DST handling are code; timezone and schedule values are config. | Timezone, reset/draw/refresh times | Job execution/last-run records | None |
| Help / tutorial / rules | Code + Config + Content + Database + Asset | Command discovery/access filtering, tutorial navigation, practice sandbox, contextual routing and build-time coverage validation are code; path/order/presentation are config; lessons/field help/examples are content; member progress and published overrides are DB state; branded tutorial frames are assets. | Enabled paths, lesson order, welcome/contextual entry points, presentation defaults | Member tutorial progress, dismissals, published content versions | Tutorial lesson bank + command-help catalog + branded tutorial templates |
| Status / bug reports | Code + Config | Health collection/reporting is code; log destinations and retention are config. | Staff log channel, retention bounds | Bug reports, incident IDs | Response copy |
| DM preference | Code + Config | Preference enforcement is code; default is config. | Default DM state | Per-member DM preference | None |
| Profiles | Code + Config + Asset | Aggregation/rendering is code; visible modules/default privacy and layout toggles are config. | Default visibility, enabled sections | Member stats, featured badges | Profile renderer/template |
| Activity tracking | Code + Config | Qualification algorithms are code; included/excluded channels and privacy defaults are config. | Excluded channels, visibility default | Message/word/VC counters | None |
| Weekly Spotlight | Code + Config + Asset | Winner computation/tie logic and Triple Threat invariant are code; schedule/post window/copy are config. | Post channel, @everyone toggle, fallback time/window | Weekly results/history | 4 badges + announcement renderer |
| Achievements & badges | Code + Config + Content + Asset | Evaluation engine/invariants are code; achievement catalog/requirements are data with bounds; badge art is asset. | Feature display settings | Unlocks/progress | Achievement catalog + badge assets |
| Ottoman economy / wallet / bank | Code + Config | Ledger, atomic transfers, wallet-bank spending order and anti-exploit bounds are code; numeric tuning is config. | Starter amount, tiers, caps, interest within hard limits | Balances, ledger, tier state | None |
| Daily / weekly / spin | Code + Config + Content | Claim/streak/spin logic is code; rewards/weights are bounded config; messages are content. | Rewards, milestone values, spin table within bounds | Claim history/streaks | Response pools |
| Fortune | Code + Config + Content | Cooldown/selection are code; cadence is config; fortune outcomes are content. | Cooldown, enabled categories | Usage history | Fortune bank |
| Work / fish / dig / scavenge | Code + Config + Content | Outcome engine/tool checks are code; payout/drop weights are bounded config; flavor text/drop catalog are data. | Payout ranges, drop weights, technical throttle | Attempts/results/stats | Activity response pools/drop catalog |
| Shop | Code + Config + Content | Rotation/buy/sell/accounting are code; refresh/slot counts/buyback bounds are config; catalog is data. | Refresh, slot counts, price bounds | Current rotation, purchases | Item catalog |
| Inventory & gifting | Code + Config | Ownership/locking/gifting rules are code; category eligibility defaults are config. | Giftable categories, bulk-sell defaults | Inventory, locks, gifts | Item catalog |
| Mystery boxes | Code + Config + Content | Pity and draw engine are code; odds/pity thresholds bounded config; box tables are content/data. | Odds, pity thresholds, prices | Per-user pity state | Box/drop tables |
| Collections | Code + Config + Content + Asset | Set completion/hide/reveal logic is code; set definitions/rewards are data; visual badges are assets. | Completion display rules | Owned pieces/completion | Collection sets + assets |
| Tools & repairs | Code + Config + Content | Durability/equip/repair logic is code; repair costs/ranges are config; tool definitions are data. | Repair costs/ranges, durability bounds | Owned/equipped/durability | Tool catalog |
| Chair crafting | Code + Config + Content + Asset | Craft transaction, rank gates and quality algorithm are code; chances/material costs within bounds are config; recipes are data. | Quality odds bounds, repair/material tuning | Skill rank, recipes owned, crafts | Recipe/item catalog + chair art |
| Casino core | Code + Config + Asset | Game math, RNG, settlement and house rules are code; wager limits/rake where applicable are config. | Bet min/max, availability, safe house parameters | Bets/results/stats | Casino renderer/assets |
| Chair slots / Chair Pot | Code + Config + Content + Asset | Reel/RNG/jackpot accounting is code; symbols/paytable/pot contribution bounded config/data. | Wager sizes, pot contribution, paytable bounds | Jackpot pool/results | Symbol catalog + slot art |
| Solo games | Code + Config + Content | Puzzle/game engines are code; difficulty/payouts are config; word banks/puzzles are content. | Payouts, difficulty, board sizes | Wins/streaks/times | Word/puzzle banks |
| Lottery | Code + Config + Asset | Ticket escrow/draw/atomic payout are code; schedule/ticket cap are config. | Friday draw time, max tickets, ticket price | Ticket sales/pot/draw result | Lottery result renderer |
| Giveaways | Code + Config | Entry/draw/permission logic is code; allowed durations/prize types/defaults are config. | Duration bounds, paid-entry bounds, channel | Giveaway records/entries | Optional event renderer |
| Chair Race | Code + Config + Content + Asset | Fair winner selection, betting settlement, 2–6 racer cap, one-event invariant, **no-lap** rule, and synchronized single-sprint 0–100% progression are code; entry timer/rake/wager caps are config; flavor names are content. | 60s entry timer, +30s once, ~15–20s sprint duration, rake, bet caps | Active race/bets/progress/results | Race flavor pool + six-chair renderer; locked visual `chair_race_discord_dashboard.png` |
| Robo Chair Fight | Code + Config + Content + Asset | Optional-target/open-slot 1v1 setup, strict 50/50 winner invariant, authoritative HP state, alternating combat updates, synchronized action text/HP bars, and settlement are code; timer/rake/caps are config; robot/action flavor is content. | 60s join/bet timer, +30s once, ~15–20s combat duration, rake, wager caps | Fight/bets/HP/combat log/results | Robot/action flavor pool + red/blue renderer; locked visual `robo_chair_fight_discord_showcase.png` |
| PvP skill games | Code + Config + Asset | Board/game rules, acceptance, escrow and timeout settlement are code; timers/wager caps are config. | Challenge/turn timeout, bet limits | Active matches/results | Game board templates |
| Crime / robbery / jail | Code + Config + Content + Asset | Wallet-only theft, wanted state machine, returns/bail/lockout are code; percentages/cooldowns/risk bounds are config; response text is content. | Cooldowns, protection, theft/bail/risk bounds | Wanted, incidents, jail/bail | Crime response pools + mugshot art |
| Marriage / divorce / adoption | Code + Config + Content + Asset | Relationship invariants/eligibility/settlement are code; timers/slot thresholds are config; event copy is content. | Proposal/remarry/min-age/slot thresholds | Relationships/history counters | Event copy + cards |
| Family auctions / wills / estates | Code + Config + Asset | Escrow, fallback heir selection and exactly-once estate execution are code; duration/grace defaults are config. | Auction duration bounds, estate grace | Bids/wills/estate jobs | Estate/auction renderers |
| Shared Voting engine | Code + Config | Ballot validity/ties/ranked/runoff algorithms are code; duration/visibility/default mode are config. | Default durations, hidden/live totals, extension | Ballots/results | None |
| FMK | Code + Config + Content + Asset | Random subject selection, chooser/assignment rules/counters are code; vote duration/extension are config; copy is content. | Vote duration, extension, channel | Rounds/votes/counters | Result renderer + response copy |
| Truth / Dare / WYR / WWYD | Code + Config + Content | Game flow/skip/voting are code; timing/category enablement are config; prompts are content files/DB. | Timers, enabled categories, recent-history sizes | Round state, prompt usage history | 6,200 core prompt bank |
| Finish the Sentence | Code + Config + Content | Submission/vote flow is code; timer/defaults are config; random starters are content. | Timers, max submissions | Round/submissions/votes | Prompt bank |
| One Word Story | Code + Config + Content | Turn enforcement and end voting are code; length presets/limits/timers are config; optional starters are content. | Presets, min/max, vote time | Story/turn/vote state | Optional starter bank |
| Line Time (`/line`) | Code + Config + Content + Asset | Slash-command host/readiness state machine, in-frame 5→1 sequence, no-zero rule, and transition to bounded white-powder explosion are code; timers are config; shame lines are content; countdown/explosion frames are assets. | 60s readiness/15m expiry timers | Active line/readiness/countdown state | Shame pool + locked countdown references `royal_chair_countdown_discord_mockup.png` / `line_time_a_chair_countdown_storyboard.png` |
| Counting | Code + Config | Parsing/order/reset/milestone logic is code; target milestones/channel are config. | Channel, milestone interval, restore role | Current count/wins/audit | None |
| Last Letter | Code + Config + Content | Validation/scoring is code; score target/channel are config; dictionary/slang allowlist is content/data. | Target score, channel, dictionary policy | Round chain/scores/wins | Dictionary/allowlist |
| Polls | Code + Config | Voting/ranked choice/anonymous behavior is code; defaults are config. | Default duration/result visibility | Polls/ballots | None |
| Superlatives | Code + Config + Content + Asset | Nomination/finalist/vote/tie engine is code; season timing is config; starter categories are content; winner badges are assets/data. | Nomination/voting duration, finalist count | Seasons/nominations/votes/winners | Category bank + season badge assets |
| Suggestions | Code + Config + Content | Submit/vote/status/search is code; status vocabulary/anonymity defaults are config/content. | Allowed statuses, anonymity default | Suggestions/votes/status history | Status labels/help copy |
| AMA | Code + Config | Question/upvote/admin answer flow is code; anonymity/default sorting are config. | Anonymity, sorting, channel | Questions/answers/upvotes | None |
| Self roles | Code + Config | Assignment safety is code; role panel definitions are config. | Allowed role IDs, labels/order | Member Discord roles | Panel copy |
| Introductions | Code + Config + Content + Asset | Modal/paging/edit/one-intro enforcement is code; prompt/card settings are DB-backed config seeded from file; welcome copy is content. | Prompts, required flags, labels/order/limits, card settings, channel | Answers, published message IDs | Intro renderer/template |
| Chairisms | Code + Config + Asset | Message-context capture, authorization and source restrictions are code; card options/copy are config; layout is asset/template. | Output channel, optional source fields, rate limit | Chairism metadata | Quote renderer/backgrounds |
| Music player | Code + Config + Content + Secret | Playback/session/queue/provider adapter logic is code; volume/defaults/DJ role/24-7 are config; help text is content; provider secrets env-only. | Default volume, autoplay, DJ role, controller behavior | Queue/history/playlists/session | Controller assets + provider credentials in env |
| Social commands | Code + Config + Content | Targeting/cooldown/channel logic is code; enabled commands and throttle are config; randomized replies are content. | Per-command enablement, throttle, channels | Usage stats if tracked | Large response pools |
| /roast | Code + Config + Content | Opt-out and bot-owned-stat personalization are code; cooldown is config; roast lines/templates are content. | Cooldown, enabled intensities/weights | Opt-out + usage | Roast pool |
| /notmad | Code only + fixed content | Permission and command flow are code; exact sentence is immutable product copy unless owner changes spec. | None by default | None | Exact fixed response |
| Haiku detector + /haiku | Code + Config + Content | Syllable heuristic/confidence detection is code; chance/cooldown/enablement are config; complaints are content; /haiku exact joke line is fixed content. | Detection enable, confidence threshold, ~15% reply chance, channel cooldown | No profiling/stat state beyond cooldown | 40–60 complaint lines + exact /haiku line |
| Moderation / AutoMod / anti-raid / anti-nuke | Code + Config + Content + Secret | Manual actions, case engine, hierarchy checks, evidence controls, progressive discipline, Join Gate, raid-state machine, anti-nuke containment, Panic Mode restoration and expiry jobs are code; thresholds/action maps/staff capability matrix/exemptions/logging/Panic profile are DB-backed config; rule catalogs and explanation copy are content; AI credentials env-only. | Filters, thresholds, weights, durations within hard bounds, join/raid thresholds, trusted/protected lists, staff capabilities, retention, logging | Cases, evidence, appeals, notes, heat/events, verification/restrictions, security state, expiry jobs | Banned-word/scam catalogs + member/staff explanation copy |
| Moderation jail / Hotseat | Code + Config + Content + Asset | Confinement, hierarchy/Admin bypass checks, safe role restoration, dual crime/mod jail state, case linkage, rejoin persistence and expiry are code; role/channel, durations, jail capabilities, announcement mode and staff authority are DB-backed config; flavor copy is content; hotseat/jail cards are assets. | Jail role/channel, sentence presets, jail permissions, voice/public-announcement behavior, staff-role suspension | Active sentences, case links, suspended-role metadata, expiry/rejoin state, appeals/history | Jail flavor copy + jail/hotseat card template |
| Records / leaderboards | Code + Config + Asset | Aggregation/reset logic is code; displayed leaderboards and reset cadence are config; cards are templates. | Enabled boards, post channel, reset schedule | Current/all-time records | Record renderer |
| Public major event cards | Code + Config + Asset | Renderer selection/data binding is code; which events get cards is config; graphics/templates are assets. | Event-card enable map | Rendered event references if stored | All event templates |
| Custom commands | Code + Config + Database + Content | Safe trigger routing, templating, role hierarchy checks, workflow delegation, execution caps and anti-recursion are code; trigger/action definitions, staff capability mapping, assignable-role allowlist and cooldowns are DB-backed config; usage/audit are database state; response copy/pools are content. | Who may manage, allowed trigger types/channels/native actions, assignable roles, bounded cooldowns/limits | Command definitions/actions, usage, cooldown state, audit history | Response templates/pools |
| NPC personalities/dialogue | Code + Config + Content | NPC selection/context binding is code; enabled NPCs/voice intensity are config; dialogue pools are content. | NPC enablement/intensity | None | Dialogue banks |
| Web administration dashboard | Code + Config + Database + Content + Asset + Secret | Discord OAuth, live server-side authorization, configuration API/service, validation, audit, safe rollback, high-risk confirmations and session security are code; page visibility/session duration/staff capability mapping are config; live settings/config versions/audit records/sessions are DB state; help/tooltips are content; approved UI mockup/brand resources are assets; OAuth/session/hosting credentials are env-only. | Dashboard enablement, session duration, capability matrix, page/module visibility, health display options | Sessions, settings, config versions, audit events, rollback-safe snapshots | Dashboard help/tooltips + approved UI reference/mockup |
| Backups / correctness / jobs | Code + Config + Secret | Transactions, idempotency, backup/restore logic are code; cadence/retention are config; storage credentials env-only. | Backup cadence/retention/log level | Job states/backups/audit logs | Secrets in env only |
| Server setup / install | Code + Config | Validation/discovery is code; role/channel/provider mappings are config. | Guild/channel/role IDs, server defaults | Setup completion state | None |

## Mandatory decision for every future feature

Before Codex implements a new command or feature, it must classify: **code behavior/invariants, owner-editable config, content/catalogs, runtime database state, assets/templates, secrets/external credentials, and help/tutorial obligations**. A feature may legitimately use more than one category.

A practical test is: **Could Jordan reasonably want to change this later without changing what the feature fundamentally does?** If yes, make it config/content. If changing it affects fairness, security, atomicity, authorization, state-machine correctness, or the algorithm itself, keep that invariant in code and expose only bounded parameters.

## Important implementation consequence

Do not build dozens of unrelated flat JSON files as the permanent runtime control plane. Keep version-controlled defaults in a structured `/config/defaults` and `/content` tree, validate them with schemas, seed PostgreSQL on install/migration, and let admin panels update DB-backed settings. This preserves the easy-to-edit design without creating deployment drift.


### Tutorial/help completion rule
A new user-facing feature is not complete until required command help, field descriptions, examples, tutorial/contextual-help hooks and safe practice behavior are present. CI must validate help coverage and command/tutorial references.


## Developer Acceleration Infrastructure

- Master Command Registry — **Config/Metadata + Code consumer + Tests**
- Master Settings Schema — **Config/Metadata + Database live values + Dashboard/Discord consumers**
- Capability Matrix — **Config/Metadata + Code enforcement**
- Feature Dependency Graph — **Build metadata**
- Prisma Schema — **Database contract**
- Shared engines (session/timer/voting/ledger/escrow/config/permission/content/audit/scheduler/renderer) — **Code**
- Acceptance test matrix / seed fixtures — **Test assets**
- Bootstrap setup wizard — **Code + Config + Database + Tutorial**
- CI/dev environment — **Developer tooling**
- Remaining authored content banks — **Content**

Standing rule: every newly added feature/command must be classified and must update all relevant single-source registries rather than adding isolated hand-coded configuration.


## Generated Architecture / Pre-Code Rule

Every future feature must also declare: shared-engine reuse, dashboard exposure, help/tutorial coverage, acceptance tests, feature-flag gate, and any code-generated artifacts. Do not hand-author duplicate command/setting definitions when the registries can generate them.
