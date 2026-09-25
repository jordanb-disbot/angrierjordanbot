# Phase 12 — Race and approved Robo Chair Fight

Both event flows are implemented behind `features.race`, `features.fight` and `ENABLE_EVENTS_SMOKE`. No feature flag was enabled. Railway readiness remains queued after owner approval of Review Gate A.

## Approved Fight sources

The owner supplied the original files at repository-root `docs/specs/ANGRIER_JORDAN_FIGHT_COMBAT_SYSTEM_SPEC.md` and `content/fight/angrier_jordan_fight_move_pool_v1.json`. Byte-identical copies are packaged inside this workspace. Runtime and preflight enforce pinned SHA-256 hashes; Git attributes prevent line-ending conversion. The original files are unchanged, including their historical optional-target metadata; current command registration still requires `/fight @member`.

The planner selects the winner once with fair RNG, then samples approved attacks/heals until the sequence matches the selected winner and 22–28 second window. It preserves alternating turns, 100 starting HP, the 68/10/12/10 attack distribution before permitted late pacing constraints, healing opportunities, approved damage/heal ranges, no repeated moves, and previous-three-fight suppression. Every action and HP bar uses one persisted beat. No replacement move text or AI art is generated.

## Shared state and money

Race and Fight share the Session, Timer, Scheduler, Ledger, escrow and atomic-operation engines. Migration 0013 enforces one active Race/Fight per channel. Wager selections cannot switch after commitment; cumulative limits and wallet-first funding apply. Settlement pays 95% proportionally with whole-Ottoman remainder allocation. No winning wagers produces `NO_WINNING_BETS_REFUND`: source-aware full refunds, no rake, normal event result and win statistics.

Fighter departure cancels during betting or combat. Durable membership state and forced Discord membership checks protect settlement; saved join timestamps detect leave/rejoin while offline. Provider errors cause retry rather than false absence. Direct departure-versus-settlement testing found an inverted cancellation lock order; cancellation now locks session state before escrow, matching settlement. The shared transaction wrapper also recognizes Prisma-wrapped PostgreSQL deadlocks and retries with bounded backoff.

## Review and validation

`review-gate-a/index.html` contains production-renderer playback and links to desktop/mobile entry, betting, live/combat and result renders. Fixture identities are labeled; these are not live Discord screenshots. No Race/Fight result has rematch or Play Again controls. The validation report records final test totals. Live Discord acceptance remains pending; Gate A is a functional/visual review, not production deployment approval.

## Gate A visual revision 02

Functional behavior has owner approval; presentation remains pending. Only renderers, deterministic art, animated attachment encoding and review materials changed. Production mapping and asset hashes are synchronized. Revised review includes desktop betting, mobile live and desktop result for both events, full renderer timelines and actual bounded ambient GIF attachments. No database, escrow, combat planner, timers, commands, permission policy or approved source content changed. Railway readiness remains blocked on visual approval.

## Gate A visual revision 03

The owner supplied two concrete visual references and explicitly replaced event typography with Space Grotesk/Inter. Reference copies, font licenses and hashes, fixed lounge/chair artwork and exact image-generation prompts are retained. Race/Fight windows now use this visual family; no behavioral files or approved Fight sources changed. The production asset map selects V3 assets and marks V2 artwork superseded. Renderer timelines and actual Discord GIF attachments are separately labeled. Functional approval is retained; visual approval remains pending.
