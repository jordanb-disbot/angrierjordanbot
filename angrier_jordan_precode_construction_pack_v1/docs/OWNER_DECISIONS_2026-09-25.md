# Owner decisions — 2026-09-25

## Latest: Gate A and permanent visual-system approval

The owner approved current Line, Race, Fight and standard-window artwork/presentation. Gate A is passed. `APPROVED_VISUAL_SYSTEM.md` and the immutable approval manifest are now permanent visual source-of-truth; later features inherit them. Space Grotesk headings / Inter body now apply to all future features. Accent skins, feature artwork and controlled lighting may vary within the approved lounge world. Earlier pending/rejected notes below are historical.

Proceed with queued Railway readiness, then Phase 13 onward; ordinary checkpoints do not require permission. Existing meaningful owner gates B–E remain. Keep unfinished/unaccepted production flags off. Commit and push tested work without rewriting history. Preparation is authorized; production deployment/secrets and live acceptance still require owner involvement. The owner's `/race` spelling approves the presentation, not restoration of the retired command; `!race` remains canonical.

## Approved Fight sources and deferred hosting

The owner confirmed that `angrier_jordan_fight_move_pool_v1.json` and `ANGRIER_JORDAN_FIGHT_COMBAT_SYSTEM_SPEC.md` were omitted from the supplied workspace and subsequently supplied at repository-root `docs/specs/` and `content/fight/`. Treat those exact supplied files as approved Fight source-of-truth content when present. Preserve the approved 100-attack/36-heal pool without replacement or generated moves, alongside the locked winner, HP, timing, outcome, turn, synchronization and suppression invariants. Both files have been incorporated byte-identically, with source-integrity validation; Fight implementation now uses them.

Railway production-readiness is queued after Review Gate A approval. Requirements and authorization boundaries are recorded in `RAILWAY_AFTER_GATE_A.md`; no hosting setup is to interrupt the current event work.

## Race/Fight: no winning wagers

Direct owner instruction supersedes earlier omissions: if an event resolves normally but nobody backed the winning racer/fighter, refund 100% of all wagers to the original bettors, charge no rake, and record the event result normally. Persist the betting settlement as `NO_WINNING_BETS_REFUND`.

The 5% rake applies only when winning wagers exist. Refunds use the shared escrow's original wallet/bank allocation; settlement is atomic, idempotent and restart-safe. Race database acceptance explicitly covers concurrent refund settlement, replay through a new repository instance, original balances, zero rake, and the winner's normal recorded result. Fight must use this same shared policy when its approved combat files are available.

## Gate A split approval and presentation revision 02

Owner approved Race/Fight functional behavior, but rejected the initial presentation. Only Race/Fight presentation is being revised. Visual approval remains pending. Railway readiness and Phase 13 remain on hold. Required review: Race and Fight desktop betting, mobile live and desktop result, plus revised animations. Approved Fight source files and all gameplay/financial policy remain unchanged.

## Gate A visual revision 03 — latest owner direction

Revision 02 is rejected. The newly supplied Feature System Overview is the window/scene visual reference, and the supplied Brand Style Guide is the palette/component reference. Their embedded command/copy examples do not supersede current functionality. Space Grotesk headings and Inter body/supporting UI replace the earlier Poppins/Cinzel rule for this Race/Fight presentation-only pass. Approved gameplay, timers, data, commands and settlement remain unchanged. Fixed offline art is packaged; runtime remains deterministic. Railway readiness stays queued until visual approval.
