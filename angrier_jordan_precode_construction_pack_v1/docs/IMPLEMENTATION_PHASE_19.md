# Phase 19 — Family, sealed auctions and estates

Status: source integrated for persistence recovery, features disabled, Gate B approval pending. See `FAMILY_PERSISTENCE_RECOVERY.md` for the escrow contract, membership recovery and current validation record. No production deployment or real estate execution has occurred.

## Sources and shared services

Canonical section 22, Feature Flow Reference sections 28–33 and the master controller Phase 19 govern behavior. The approved lounge/event frame and existing artwork are reused with Space Grotesk/Inter. Four actual deterministic runtime PNGs are in `packages/features-family/review`: marriage, divorce, inheritance and auction. Fictional fixture names and initials avatars are labeled as such in its README. Native Discord buttons sit outside the raster image.

The implementation uses existing Marriage, Adoption, FamilyAuction, FamilyAuctionBid, Will, GameSession, GameParticipant, Vote, ScheduledJob, OperationReceipt, Escrow, RecordValue, MemberGameStats, inventory and ledger models. Shared Session/Timer/Voting/Ledger/Escrow/Delivery/Audit services own their existing responsibilities. Migration `0019_family_invariants` adds unique indexes for current unordered pairs, current child links, active self-auctions, auction bidders and pending estates; no new Prisma model is required.

## Runtime integration

Exports: `packages/features-family/src/index.ts`; adapter: `apps/bot/src/discord/family-coordinator.ts`.

```ts
new PrismaFamilyRepository(db, familyCompatibilitySecret, currentHumanEligible,
  policy, clock, randomInt, canAct, membershipRevision);
new DiscordFamilyCoordinator(repository, config, canAct);
```

The compatibility secret must be stable, server-side, at least 32 characters, and provisioned through `FAMILY_COMPATIBILITY_SECRET`. It is not stored in public data or logs. Compatibility is a deterministic order-independent HMAC of server/member IDs. Success chance is a distinct correlated stored percentage for each marriage.

`currentHumanEligible(guildId,userId)` must describe passive eligibility/current membership, independent of command confinement. `canAct` adds the shared containment restriction. This distinction permits a jailed eligible member to receive inheritance, as required by the crime rules. The coordinator uses `features.family` and `channels.bot_channel`, the shared member capability and `canAct`. Keep `features.family=false` and `ENABLE_FAMILY_SMOKE=false` until accepted.

Production supplies `membershipRevision` from the single-worker membership recovery queue. Estate transactions validate that generation after their receipt write, so a gateway observation during database work rolls the transaction back. Startup and scheduled Family work require successful authoritative membership reconciliation; incomplete censuses fail closed. Migration `0020_typed_item_escrow` adds explicit inventory quantities without changing monetary funding invariants from `0012`.

Route `/family` and `family:` button/modal controls to `handle(interaction)`. Required command options:

| Subcommand | Options |
| --- | --- |
| marry | required member; optional item choice `ring` / `sack` |
| divorce | required member |
| adopt | required member |
| disown | required member |
| emancipate | none |
| familytree | optional member, default self |
| will | required member |
| familyauction | required type choice `spouse` / `child`; optional hours default 24, range 1–72; optional reserve default 0 |

All jobs carry `{guildId,channelId,sessionId}`. Register `family.publish` as `coordinator.publish(client,job.id)`. Register these with `coordinator.advance(client,kind,guildId,sessionId)`: `family.proposal_expire`, `family.marriage_close`, `family.adoption_expire`, `family.auction_close`, `family.estate_execute` (kind is the suffix). Job publication intent commits alongside new public events. Subsequent public edits serialize per event and verify the bot owns the original message. Shared Delivery marker reconciliation handles uncertain sends.

Lifecycle hooks call `repository.depart(context,reason)` for confirmed leave/kick/ban/member-unavailable states, and `repository.rejoin(context)` on return. Use distinct durable event request keys. Do not interpret a transient Discord request failure or whole-server connection outage as member departure. Onboarding must continue setting presence timestamps and retain `EconomyAccount.starterGrantedAt`; the estate execution preserves or creates that marker, rather than deleting the account. An unexecuted estate cancels on return; executed estates are irreversible and never restore assets or starter funds.

## Configuration and catalog

`DEFAULT_FAMILY_POLICY` supplies the canonical defaults: proposal 24h, divorce minimum 3d, same-pair remarriage 7d, estate grace 24h, auctions 1–72h, child slots at 3/7/14/30/60d, marriage vote 3h. Existing keys map to `proposalHours`, `divorceMinDays`, `remarryDays`, `graceHours`, `auctionMinHours`, `auctionMaxHours`, `childSlotDays`. Additional proposed settings map to `marriageVoteHours`, `cooldownBaseSeconds` (1800), `cooldownMaxSeconds` (86400), `cooldownQuietHours` (168). These cooldown numbers are implementation defaults; the sources prescribe scaling and quiet-period decay without numbers. Adoption requests use the proposal expiry default of 24h.

Central catalog integration should seed these configurable initial entries (prices are implementation defaults, not owner-frozen amounts):

| ID | Name | Type / rarity | Buy / sell |
| --- | --- | --- | ---: |
| family.ring | Ring | family / Common | 25,000 / 0 |
| family.blessing | The Blessing of Angrier Jordan | family / Epic | 250,000 / 0 |
| family.wedding_sack | Wedding Sack | family / Legendary | 1,000,000 / 0 |

The shared Prisma seed now adds the three definitions from `packages/content/economy/family_catalog.json` through `seedFamilyCatalog`, preserving existing admin prices and disabled entries. Catalog rarities use the existing Common/Epic/Legendary taxonomy. All three are enabled catalog data, giftable, with metadata `{inheritable:true,consumable:true}`. This does not enable the feature. The family feature consumes its items through shared escrow and never implements a separate shop.

## Implemented behavior

Normal proposals reserve an unlocked Ring and any currently required Blessing. Only the named target accepts/rejects. Rejection/expiry refunds exactly once. Wedding Sack activates immediately. Eligibility, spouse limits and any changed Blessing requirement are rechecked at activation; one Blessing is consumed for the specific marriage when either participant uses a second spouse slot. A maximum of two active spouses is enforced under serializable transactions. Finances remain separate.

The same authoritative marriage card displays members/avatars, actual marriage date, item, spouse counts, Blessing use, compatibility/success and live anonymous editable community totals. Spouses cannot vote. Three-hour close freezes the same card and disables its vote controls. Only more than 80% approval from at least five eligible unique voters unlocks the first slot early; later slots retain their age schedule.

Divorce waits three days, chooses one payer and transfers half their wallet-plus-bank liquid balance atomically, leaving items untouched. It will not spend reserved wallet funds. Same-pair remarriage waits seven days. Family changes update the decaying per-member cooldown history.

Adoption picks the oldest eligible married pair with an open slot; pending requests reserve slots, the child must accept, and the second parent is automatic. It prevents duplicate parent pairs and ancestor cycles. Ending a child link waits three days and requires the relevant parent/child. The active tree has no ended spouse/adoption edges; active child-parent links can remain after divorce. Largest-family selection uses active connected groups, preserves the incumbent on an equal-size tie, and stores one current randomly chosen cosmetic portrait perk. The finite Brass/Emerald/Midnight pool changes the tree frame accent; profile integration should read the same `RecordValue(recordKey='largest_family',scopeKey='current').value.{members,perk}`. Replacing this record removes the previous family's entitlement without awarding currency.

Self-auctions accept only spouse/adopted-child roleplay. Bids are private to the bidder, escrow incremental increases, cannot decrease or withdraw, and use wallet/bank through shared wager escrow. At close the highest still-valid reserve-meeting bid wins; equal amounts use earliest bid timestamp/ID. Eligibility and Ring/Blessing/child-slot requirements are rechecked. The result creates the relevant relationship, pays the person auctioned, and refunds all losing bids in the same transaction. Estate-item auctions are internal only; there is no member-facing general marketplace.

Wills name one eligible beneficiary. Estate fallback draws uniformly from the combined eligible active spouse/child pool. Foreign active escrow/wallet holds postpone execution with a fresh durable future job, so ordinary scheduler retries cannot exhaust while assets remain reserved. Once clear, money and eligible inventory transfer atomically and exactly once. A no-heir estate burns wallet/bank, creates one auction per stack item type and separate tool/chair auctions (24h), and removes the departed member's ownership. System estate auction payments remain out of circulation. Unbid assets stay archived with the estate rather than restoring ownership. Catalog-enabled/giftable items are inheritable unless metadata sets `inheritable:false`; item locks are preserved where applicable. Learned recipes/progression/achievements are not transferable inventory.

Estate execution closes the departed member's active spouse and parent-pair links and their child link; pending/held item flows settle before execution. It also cancels outstanding self-auctions and refunds their bidders, preventing an old auction from restoring a relationship after an irreversible estate. The old cards remain event history; active trees omit ended identity links.

## Validation boundary

Runtime/adapter coverage checks salted pair stability, separate success chance, exact child-slot thresholds, strict community bonus threshold, anonymous editable votes, cooldown decay, active-only trees, flag/channel/containment gates, message binding, escaped current-state rendering and disabled final controls. The isolated compiler uses only ignored `.tooling` outputs and does not modify shared build output.

The dedicated PostgreSQL suite creates a random schema using only ignored `.env.test.local` `TEST_DATABASE_URL`, migrates it, and drops it in `finally`. It covers concurrent proposals/acceptance, slot races, deadlines/restart, item escrow, divorce settlement, sealed bids/refunds, inheritance during confinement, wallet-hold deferral, fallback across spouses/children, duplicate estate execution and separate no-heir auctions. Run through the redacted central TEST runner after integration. PostgreSQL results and Gate B acceptance are still pending at this handoff.
