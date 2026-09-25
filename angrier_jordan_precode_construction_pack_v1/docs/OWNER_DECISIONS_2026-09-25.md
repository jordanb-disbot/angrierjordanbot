# Owner decisions — 2026-09-25

## Approved Fight sources and deferred hosting

The owner confirmed that `angrier_jordan_fight_move_pool_v1.json` and `ANGRIER_JORDAN_FIGHT_COMBAT_SYSTEM_SPEC.md` were omitted from the supplied workspace and subsequently supplied at repository-root `docs/specs/` and `content/fight/`. Treat those exact supplied files as approved Fight source-of-truth content when present. Preserve the approved 100-attack/36-heal pool without replacement or generated moves, alongside the locked winner, HP, timing, outcome, turn, synchronization and suppression invariants. Both files have been incorporated byte-identically, with source-integrity validation; Fight implementation now uses them.

Railway production-readiness is queued after Review Gate A approval. Requirements and authorization boundaries are recorded in `RAILWAY_AFTER_GATE_A.md`; no hosting setup is to interrupt the current event work.

## Race/Fight: no winning wagers

Direct owner instruction supersedes earlier omissions: if an event resolves normally but nobody backed the winning racer/fighter, refund 100% of all wagers to the original bettors, charge no rake, and record the event result normally. Persist the betting settlement as `NO_WINNING_BETS_REFUND`.

The 5% rake applies only when winning wagers exist. Refunds use the shared escrow's original wallet/bank allocation; settlement is atomic, idempotent and restart-safe. Race database acceptance explicitly covers concurrent refund settlement, replay through a new repository instance, original balances, zero rake, and the winner's normal recorded result. Fight must use this same shared policy when its approved combat files are available.
