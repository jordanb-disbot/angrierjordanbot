# Community Utility + Casino + Visual UX Standardization

Owner scope, 2026-09-28. This is an implementation and acceptance plan, not production authorization. Preserve the approved visual system in `docs/APPROVED_VISUAL_SYSTEM.md`, the approved manifest, and `production/theme/brand.json`. Use Space Grotesk for headings and Inter for body copy. Alternate approved color themes across feature families; Casino uses the approved black/charcoal, gold, emerald, and ruby accents with restrained neon highlights.

## Included systems

- Superlatives; Social/Reacts; `/remind`; `/purge` and small moderation utilities; spotlight and badges; help, tutorials, and lore; polls and giveaways; Chairisms cleanup.
- Casino: Slots, Blackjack, Roulette, and Coinflip first. Keep other existing games working, but do not expand their rules in this batch.
- Global card lifecycle, width, mobile readability, typography, spacing, and status clarity across the included systems.

## Current implementation audit

- Casino already reserves and settles wagers through `PrismaWagerEscrow` inside `PrismaAtomicOperations`, shared with other wager flows. It checks configured minimum and maximum bets and available balance, uses idempotency keys, persists rounds, and schedules Blackjack expiry. Keep this one money-moving path.
- Blackjack actions edit the existing card. Instant games currently create result messages. The initial cleanup makes completed results replace the member's previous result in the channel and expire; verify live before release.
- Casino game stats currently record plays, wins, losses, draws, streak, and record observations. Accurate historical lifetime wagered/won/lost totals are not yet shown in profile/records; define and verify historical semantics before labeling any new metric “lifetime.”
- `/remind` is absent. It requires a command definition, durable scheduled delivery, cancellation/listing behavior, permission/privacy review, help copy, and restart tests.
- Polls, giveaways, Superlatives, Social/Reacts, `/purge`, spotlight/badges, and learning/help flows already exist. Audit their active-card ownership, button acknowledgement, timer closure, and visuals before changing their behavior.

## Casino acceptance gates

1. Verify one escrow and ledger path for every stake, extra Blackjack stake, payout, push, refund, expiry, and retry. Test concurrency and replay against the database.
2. Enforce configured min/max bets, balance checks, cooldown/anti-spam, and one active session where appropriate. A rejected action must neither reserve funds nor alter the card.
3. Confirm restart-safe Blackjack and Roulette state where a round remains active; expiration settles or refunds exactly once.
4. Active Blackjack/Roulette: one persistent card edited in place. Slots/Coinflip: short-lived result or replacement of the prior result. Casino menu: temporary interactive card. Final results update the active card rather than stacking messages.
5. Present explicit win, loss, push, and refund states. Add accurate casino stats to profile/records only after historical totals are defined and tested.
6. Produce a local visual review for each Casino state at Discord desktop and mobile widths. Prioritize typography, content fill, hierarchy, and readable wager/outcome details. Owner visual approval precedes production deployment.

## Community and visual acceptance gates

1. Audit each included feature's registration flag, config keys, channel restrictions, help/tutorial entry, buttons, timers, and persisted state.
2. Implement `/remind` with durable, idempotent delivery and clear controls; audit `/purge` and moderation utilities without broadening permissions.
3. Bring cards to approved wide-frame and mobile standards. Keep active interactive cards in place, replace or expire disposable results, and avoid message stacks.
4. Add targeted tests for lifecycle, retries, restarts, permission denial, and visual-state generation. Run the full build and relevant PostgreSQL integration tests.
5. Review local output with the owner. Production settings and worker flags remain unchanged until separate, explicit release authorization.
