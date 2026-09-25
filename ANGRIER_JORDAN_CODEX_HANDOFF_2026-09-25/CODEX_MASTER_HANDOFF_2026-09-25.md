# Angrier Jordan — Codex Master Handoff

**Handoff date:** 2026-09-25  
**Project:** Angrier Jordan Discord bot for the private Chairs server  
**Starting implementation baseline:** Checkpoint 08  
**Owner/product lead:** Jordan  
**Codex mission:** Continue implementation from Checkpoint 08 to a deployable, tested bot. Work autonomously until an explicit owner review gate, credentials, an irreversible production action, or a genuine unresolved product contradiction is reached.

---

## 1. Start here — do not restart the project

The working codebase is:

`ANGRIER_JORDAN_IMPLEMENTATION_CHECKPOINT_08_2026-09-21.zip`

Unpack it and continue from the contained project root:

`angrier_jordan_precode_construction_pack_v1/`

Do **not** rebuild the architecture from scratch and do **not** regress to an older handoff bundle.

Checkpoint 08 already contains the project skeleton, shared engines, registries/codegen, database schema/migrations through `0008_economy_foundation`, WYR golden feature, onboarding/rejoin roles, moderation/Hotseat, automated security, and economy foundation.

Current verified offline baseline:

- build: PASS
- preflight: PASS
- domain TypeScript: PASS
- domain tests: **68 passed / 0 failed**
- command/interaction records: **192**
- editable settings: **185**
- capabilities: **40**
- generated Discord application commands: **65**
- top-level chat-input commands: **64**
- Prisma models: **79**
- SQL migration tables: **79**
- production visual assets/templates: **348**
- production asset file/hash/dimension validation: PASS
- live Discord/PostgreSQL smoke test: **NOT YET RUN** because credentials are not in the handoff

Do not describe unimplemented systems as working simply because they have specs, assets, or registry entries.

---

## 2. Authority order

When two sources conflict, use this order:

1. **This handoff and any newer direct owner instruction.**
2. `ANGRIER_JORDAN_CANONICAL_BUILD_SPEC_2026-09-21.md`.
3. `ANGRIER_JORDAN_FEATURE_FLOW_REFERENCE_2026-09-21.txt`.
4. `ANGRIER_JORDAN_FINAL_QA_REPORT_2026-09-25.txt` for current implementation/QA status and known cleanup work.
5. `FINAL_COMMAND_TO_PRESENTATION_AUDIT.md` for current command/presentation mapping.
6. `ANGRIER_JORDAN_COMMAND_ASSET_AUDIT.md` for visual/template coverage and asset requirements.
7. Checkpoint 08 source code, registries, migrations, tests, and generated contracts.
8. `ANGRIER_JORDAN_VISUAL_REFRESH_PHASE5_FINAL_2026-09-21.zip` for production visual files.
9. Older project files only as historical reference where they do not conflict.

Never restore a retired command or stale behavior because it appears in an older document.

---

## 3. Latest owner decisions that must remain locked

### Identity and language
- Server name: **Chairs**.
- Bot display name/sender: **Angrier Jordan**.
- Bot role: **The Chairman**.
- Human hierarchy: **Throne > Chaise Lounge > Recliner**.
- User-facing text says **server** and **member**, not guild/user where ordinary language is intended.
- Internal Discord/API identifiers such as `guildId` are normal and should remain technical code terminology.

### Visual standard
- The approved WYR presentation is the golden visual/interaction reference for modern interactive features.
- Sender shown in examples/runtime should be **Angrier Jordan**, not “Server Bot.”
- Use a modern dark Discord-native system: midnight/deep navy surfaces, teal/emerald functional accents, warm gold/brass, clean neutral text, restrained texture.
- Feature accent colors may alternate within the approved palette when that improves recognition.
- Use the bot avatar/logo image as the identity mark; do not enlarge the bearded-person artwork into a hero/background illustration.
- Prefer a tasteful chair/lounge scene or clean/blank background behind runtime content.
- Do not add a prominent red “Angrier Jordan” neon wall sign.
- Avoid crown-first branding. The chair/throne is the primary brand mark. Crown imagery may remain only when semantically justified as prestige/decorative treatment and consistent with owner approval.
- Current production runtime theme tokens use **Poppins for UI/data/body** and **Cinzel only for headings/accent**. Do not introduce another font system without owner approval.
- AI image generation is not part of normal runtime rendering. Runtime cards must be deterministic from live Discord/database state.

### Current event triggers
- **`!race`** is the Race trigger. `/race` is retired.
- **`!line`** is the Line Time trigger. `/line` is retired.
- **`/fight @member`** is the Fight trigger; target is required.
- Built-in Special Commands also include `!vc` and `!chess`.
- No Special Command cooldowns.

### Race
- 60-second racer-entry + betting window.
- Host gets one use of **+30 Seconds**; it extends both entry and betting, max 90 seconds.
- 2–6 racers, first come, starter is racer #1.
- Equal odds; 5% rake.
- 15–20 second sprint, no laps.
- Bettor clicks racer -> private wager modal -> validation/confirmation -> public state updates.
- Start with opt-in Race-role notification ping.
- No Play Again / no rematch button. New Race requires another `!race`.

### Fight
- `/fight @member` starts immediately; target does not Accept/Decline.
- Immediately opens a 30-second betting window.
- Bettor clicks fighter -> private Ottoman wager modal -> validation/confirmation -> public state updates.
- Challenger has one use of **+30 Seconds**, betting only.
- Combat auto-starts after betting closes.
- Core winner selection is 50/50.
- Fighters use 100 HP and the approved randomized combat-move system.
- Normal combat target 22–28 seconds; hard cap 30 seconds.
- No Join Fight state.
- No Play Again / rematch button.

### Line Time
- Trigger is `!line`.
- 60-second readiness/entry window; host has one +30 second extension, max 90.
- No participant cap.
- Participants choose **I’m In** or **I Need a Second**.
- After the window closes, new entry locks; host may Start Countdown or Cancel. Host may start early.
- Countdown is exactly **5 -> 4 -> 3 -> 2 -> 1 -> powder burst**, never a visible 0.
- Start with opt-in Line-role ping.
- No Play Again.

### `/roles`
- Member-facing `/roles` is private/ephemeral only.
- No roles channel.
- No admin controls inside `/roles`.
- Category order: Gender -> Age -> Regions -> Vices -> Personalities -> Pings -> DM Status.
- Changes apply immediately; no Save button.
- Single-choice but clearable: Gender, Age, Regions, DM Status.
- Multi-select without product cap: Vices, Personalities.
- Pings are independent: Line, Race, Chess, VC.
- Self-select roles must have no Discord permissions and be safely manageable below Angrier Jordan.
- Administration of role categories/options is dashboard-only.

### Onboarding/rejoin
- Rules acknowledgment is the **only required onboarding gate**.
- After rules, normal access is granted unless a punishment must be restored.
- `/roles`, `/lore`, `/introduce`, and `/tutorial` are optional/skippable and remain available later.
- Rejoin requires rules acknowledgment again.
- Restore eligible persistent data, self-select roles, non-staff manual/custom roles, profile/showcase state and nickname where possible.
- Never auto-restore staff roles.
- Nitro/booster roles remain Discord-authoritative.
- Active punishment survives leave; finite punishment time pauses while absent and resumes on return.

### Daily / command reconciliations
- `/daily` is one private hub: Claim Daily + Daily Spin + Fortune.
- Daily reset: 4:00 AM Mountain Time.
- No standalone `/spin`.
- No standalone `/fortune`.
- Keep `/weekly`.
- Keep `/collection`.
- No standalone `/showcase`; use `/profile` -> Edit Showcase.
- No standalone `/sell`; selling is inside `/inventory`.
- Keep `/leaderboard` with interactive category selector.
- Keep `/privacy activity` and `/privacy roast`.
- `/haiku` exact response: **“We use it for profiling purposes.”**
- `/tldr chat time:1h|2h|4h|8h` and `/tldr events time:1d|7d`; both private/ephemeral.

### Dashboard
- Dashboard is accessible only to the server owner and members who currently have Discord Administrator permission.
- Every change is audited; retention is 12 months.
- Low-risk changes may save live directly.
- High-impact/destructive/broad changes must use Draft -> Preview -> Publish and cannot bypass it.
- One global shared draft at a time.
- One Admin edits at a time; 15-minute inactivity unlock.
- Owner can force takeover; takeover is audited.
- One Admin may publish; no second approval.
- No scheduled publish.
- Any validation failure blocks the whole draft; no partial publish.
- Dependency preview shows direct dependencies only; no automatic dependency repair.

---

## 4. First Codex actions

Perform these before adding new product features:

1. Extract Checkpoint 08 into the working repository.
2. Initialize/continue Git and make a baseline commit before modifications.
3. Install workspace dependencies using Node.js 22+.
4. Generate and commit one dependency lockfile (`package-lock.json` is acceptable). The checkpoint currently has no lockfile.
5. Run database client generation.
6. Run the **full installed-workspace** typecheck/build, not only the domain-only check. Fix packaging/rootDir/workspace issues rather than suppressing them.
7. Re-run:
   - `npm run build`
   - `npm run validate:registries`
   - `npm run validate:content`
   - `npm run validate:assets`
   - `npm run validate:help`
   - `npm run validate:golden`
   - `npm run validate:production-wiring`
   - `npm run typecheck:domain`
   - `npm run test:domain`
   - `npm run preflight`
8. Fix the stale Phase 5 README statement that says final QA failed with 3 errors. The current validator and QA report are PASS.
9. Do **not** treat `angrier_jordan_feature_system_overview.png` or `angrier_jordan_command_overview.png` as authoritative; they were excluded from this handoff because they contain stale command wording such as `/race`.
10. Preserve feature flags. Do not enable unfinished/live-risk modules by default.

If a baseline validation breaks after dependency installation, fix the build first before implementing new features.

---

## 5. Engineering rules — mandatory

- Reuse the existing shared engines for sessions, timers, scheduler, voting, permissions, configuration, audit, ledger and escrow.
- No direct Ottoman balance writes from features; all movement goes through the shared ledger/escrow contracts.
- Financial/socially consequential timers must be persisted and restart-safe/idempotent.
- Schema/migration changes come before feature code that depends on them.
- Command metadata must remain single-source from the Master Command Registry.
- Owner-editable settings remain single-source from the Master Settings Schema/ConfigService.
- Bot and dashboard permission checks must share the same capability service.
- Production live state belongs in PostgreSQL; JSON is seed/default/content data only.
- Do not add Redis, microservices or Kubernetes without a measured requirement.
- Do not implement arbitrary code execution in custom commands.
- Keep external failures transactional: never report success until Discord/provider operations actually succeed.
- Every user-facing command must have help metadata; fielded/complex commands must update tutorial/contextual-help coverage.
- Do not add generic XP/player levels.
- Do not invent new player-to-player item trading.
- Do not silently alter locked product behavior to simplify implementation.
- Use feature flags until acceptance gates pass.
- Only create new visual assets when there is a concrete runtime gap. Prefer existing production renderer shells and deterministic code-rendered state.

---

## 6. Remaining implementation sequence

Continue autonomously in this order. A logical checkpoint may be committed at each section, but **do not stop merely because a checkpoint is complete**.

### Phase 09 — Shop / Inventory / Tools / Crafting / Collections
Implement:
- rotating Shop and always-available essentials
- personalized bonus slots
- buy/gating behavior
- Inventory sort/filter/search/lock flows
- Sell Item / Sell All Junk / Sell Duplicates with confirmation
- gifting rules
- `/unlock all`
- tools, manual equip, durability, break/fallback
- repair tiers
- recipes and recipe ownership
- Chair Building progression/ranks/quality
- crafting failures/scrap/material consumption
- crafted-chair duplicate/sell behavior
- collections and hidden collections
- boxes / pity state / bounded rare drops

Do not proceed to real wagering/auctions until these item/economy invariants pass concurrency/idempotency tests.

### Phase 10 — Profiles / Activity / Records / Achievements / Weekly Spotlight
Implement:
- `/profile` and Edit Showcase
- activity tracking and privacy
- records and `/leaderboard`
- achievements/mastery/legacy framework
- Weekly Spotlight qualification, weekly freeze, co-winners and announcement
- Triple Threat permanent behavior

### Phase 11 — Escrow / Casino / Lottery
Implement:
- reusable wager/escrow settlement path
- blackjack
- roulette
- slots + Chair Pot
- dice
- coinflip
- weekly lottery
- Play Again contracts where locked
- casino/lottery records and settlement recovery

### Phase 12 — Race + Fight
Implement full real Discord flows for:
- `!race`
- `/fight @member`
- private betting modals
- public live state
- authoritative timers/extensions
- atomic escrow/settlement
- fight combat animation/log synchronization using approved move pool

**STOP AT REVIEW GATE A after Phase 12.** See Section 7.

### Phase 13 — Line + Special Commands
After Gate A approval:
- `!line`
- `!vc`
- `!chess`
- built-in permission/notification-role behavior
- dashboard-created Special Commands
- silent deletion of unauthorized triggers

### Phase 14 — Solo games
- Hangman
- Word Scramble
- Mastermind
- Minesweeper

### Phase 15 — PvP games
- Tic-Tac-Toe
- Connect Four
- Battleship

### Phase 16 — Party/social games and shared Voting
- Truth or Dare
- WYR completion/reconciliation
- WWYD
- Finish Sentence
- One Word Story
- FMK
- shared Voting/result handling
- Play Again behavior exactly per contract

### Phase 17 — Persistent channel games
- Counting
- Last Letter
- resets/win tracking
- sabotage/admin restoration behavior

### Phase 18 — Crime
- robbery
- Fight Back
- 911
- wanted status
- crime jail/bail
- protected bank behavior
- 24h command confinement where applicable
- crime records

### Phase 19 — Family / Auctions / Estates
- marriage compatibility/success/voting
- divorce
- adoption/children/emancipation/disown where defined
- Blessing of Angrier Jordan
- family tree
- sealed family auctions
- wills/inheritance/estate execution
- duplicate inheritance prevention

**Prepare REVIEW GATE B after major family/event surfaces exist.**

### Phase 20 — Community
- polls
- Superlatives
- suggestions
- AMA
- giveaways

### Phase 21 — Chairisms
- quote message/text/context action
- rendering
- `📝-chairisms` output
- browse/recent/member/random

### Phase 22 — Lore / Introductions / Tutorial / TLDR / Social / Haiku
- `/lore` + read progress + Chair Historian
- introduction form/preview/publish/edit
- tutorial/help runtime completion
- `/tldr chat` and `/tldr events`
- social/personality commands
- passive haiku detector and exact `/haiku` joke behavior

### Phase 23 — Music
- `/play` search/link behavior
- queue/control state
- pause/resume/skip/seek/volume/loop/etc. per registry
- playlists
- pinned/current player behavior where specified
- voice-channel permissions and recovery

**Prepare REVIEW GATE C for actual music control UX.**

### Phase 24 — Admin dashboard completion
Implement the complete admin-only dashboard using the shared live ConfigService:
- all launch pages in canonical spec
- role panel management
- Special Commands/custom commands
- content/tutorial editors
- audit logs
- Draft/Preview/Publish
- 15-minute edit lock
- rollback
- direct-dependency preview
- validation blocking
- owner takeover

**STOP AT REVIEW GATE D.**

### Phase 25 — Final visual-system pass
- reconcile every production surface to approved current style
- alternate accent colors by feature where useful
- remove/refresh inappropriate crown-first treatment
- preserve semantic/prestige crown use only where intentional
- verify desktop/mobile readability
- verify sender always appears as Angrier Jordan
- no stale red-neon Angrier Jordan background sign
- regenerate review boards from actual runtime output, not fantasy mockups

**STOP AT REVIEW GATE E for final owner visual sign-off.**

### Phase 26 — Integration / reliability
After visual sign-off:
- cross-feature permission tests
- economy exploit/concurrency tests
- escrow failure/restart tests
- timer/scheduler reconciliation
- data migration tests
- feature-flag behavior
- help/tutorial coverage
- complete command registration budget checks
- backup/restore drill in a safe non-production DB

### Phase 27 — Production setup
Requires owner credentials/actions when reached:
- real PostgreSQL connection
- Discord token/application/server IDs
- real channel and role IDs
- Discord privileged intents
- music/provider credentials if required
- Railway/comparable environment setup
- migrations/seed in target environment

### Phase 28 — Live acceptance
- register commands in the development/server target
- run real Discord smoke tests
- verify hierarchy and permissions
- verify restart recovery
- verify live transactions/escrow with test balances
- verify Hotseat/AutoMod/Panic in controlled test cases
- verify voice/music
- verify dashboard auth/admin checks
- verify backups and restore
- owner acceptance before enabling all feature flags

---

## 7. Owner review gates — when Codex should stop

The owner does **not** want routine engineering questions. Continue autonomously until one of these gates.

### REVIEW GATE A — Race/Fight functional + visual review
After Phase 12, provide:
- actual Discord desktop screenshot/render of `!race` entry/betting/live/result states
- actual mobile-equivalent review render
- actual `/fight @member` betting/combat/result states
- concise written flow and timing table
- confirmation of escrow/rake/settlement/recovery tests
- no rematch/play-again controls on Race/Fight
- only genuine owner decisions, if any

Do not continue the event UX family until this gate is approved.

### REVIEW GATE B — major family/event presentation
Batch-review actual runtime renders for:
- marriage result
- divorce
- inheritance
- auction win
- arrest/mugshot
- major casino win / lottery / Chair Pot
- Superlative win
- FMK / major voting result
- Weekly Spotlight / major record

Function can continue where not dependent on visual approval, but do not declare those visual families final until approved.

### REVIEW GATE C — Music controls
Show the actual Discord music controller/player behavior on desktop/mobile and any permissions/queue UX that needs owner judgment.

### REVIEW GATE D — Dashboard
Provide actual dashboard screens and a functional walkthrough for:
- Admin access
- role management
- draft/preview/publish
- destructive impact preview
- rollback
- audit
- Special Commands/custom commands

Do not proceed to final visual lock until dashboard is approved.

### REVIEW GATE E — final visual sign-off
Present a clean review set generated from real runtime layouts for all major feature families. Do not use stale overview art. Owner approval here locks the visual system before production acceptance.

### Other allowed stop conditions
Stop only if:
- credentials/tokens are required;
- Discord application/server/channel/role IDs cannot be safely discovered;
- an external provider credential is required;
- a destructive production action needs permission;
- two current authoritative product requirements genuinely contradict each other and cannot be reconciled safely.

Do not stop for naming variables, folder structure, test framework details, normal database indexes, standard error handling, or other ordinary engineering choices.

---

## 8. Definition of done for every feature

A feature is not done until all applicable items are true:

- domain behavior implemented
- Discord adapter/interaction flow implemented
- permissions/capabilities enforced
- feature flag defined/enforced
- database schema/migration complete
- restart-safe session/job behavior where applicable
- ledger/escrow used where applicable
- help metadata updated
- tutorial/contextual help updated for multi-step features
- settings schema/dashboard exposure updated where applicable
- audit events added for administrative mutations
- production presentation mapping updated
- required deterministic renderer/template exists
- desktop/mobile readability checked
- tests added for success, invalid input, permissions, concurrency/replay/idempotency and restart where applicable
- registry/content/assets/help/production-wiring validators pass
- full preflight passes
- generated contracts are current and committed

Never mark a feature complete because only the visual or only the registry exists.

---

## 9. Required validation before every review gate and final handoff

Run at minimum:

```bash
npm run build
npm run validate:registries
npm run validate:content
npm run validate:assets
npm run validate:help
npm run validate:golden
npm run validate:production-wiring
npm run typecheck:domain
npm run test:domain
npm run preflight
```

After dependencies are installed, also add and keep passing a **full workspace/adapters typecheck/build** covering bot + dashboard + database packages.

For every financial feature, add concurrency/idempotency/restart tests.

For every persistent session/timer, test process restart/reconciliation.

For every role/moderation/security feature, test hierarchy/Administrator/manageability failures.

For every destructive action, verify failure does not produce a false success record.

---

## 10. Known cleanup issues from final QA

Resolve these during the handoff build:

1. Phase 5 README contains stale wording that says Final QA failed with 3 errors. Current QA/validators pass. Correct the README.
2. Do not use the stale generated `angrier_jordan_feature_system_overview.png` or `angrier_jordan_command_overview.png` as product truth. They are intentionally not in this handoff bundle.
3. Older Phase 3 atomic art includes some ornate/crown-heavy styling. File integrity is good, but final visual pass must either refresh it or explicitly preserve only justified prestige crown usage.
4. Do not use an older style sheet that introduces a different font system as the typography authority; follow the current production tokens and owner-approved WYR direction.
5. Generate and commit a dependency lockfile.
6. Live Discord/PostgreSQL/provider testing remains pending and must not be represented as completed until it actually runs.

---

## 11. Deliverables Codex should maintain while building

Keep the repository self-documenting:

- update `IMPLEMENTATION_STATUS.json`
- add checkpoint/change notes for meaningful feature groups
- update schema/migrations and migration notes
- update Master Command Registry / Master Settings Schema / capabilities
- regenerate generated command/handler/dashboard contracts
- update acceptance-test matrix
- update help/tutorial coverage
- update production visual manifest when production assets change
- keep a concise `KNOWN_ISSUES.md`
- keep a current `LIVE_VALIDATION_CHECKLIST.md`
- preserve a change log for owner-approved product/visual changes

At each owner review gate, provide one review folder containing only the items the owner needs to inspect. Do not bury review assets inside engineering output.

---

## 12. Initial Codex completion target

Start from Checkpoint 08 and proceed through Phase 12 without pausing for ordinary decisions.

The **first required owner stop is REVIEW GATE A: working Race + Fight functional/visual review**.

Everything before that should be built, tested, documented and committed autonomously.

