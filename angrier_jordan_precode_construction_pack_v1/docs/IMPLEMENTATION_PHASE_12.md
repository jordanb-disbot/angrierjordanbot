# Phase 12 — Race implementation and shared event foundation

Race is implemented behind `features.race` and `ENABLE_EVENTS_SMOKE`. Fight remains off: the canonical contract's approved move pool and full combat-system specification are not in the supplied sources. Their path has been requested; no replacement move pool has been fabricated.

Race includes silent deletion of unauthorized `!race`, independently configured access and notification roles, main-chat enforcement, no cooldown, first-come entry for 2–6 distinct chairs, one host extension of entry and betting, private immutable-selection cumulative wager modals, persisted fair motion plans, one authoritative public message, and no replay/rematch controls.

The shared Session/Timer/Ledger/Escrow engines drive state and settlement. Migration 0013 prevents overlapping Race/Fight channel sessions throughout betting and animation. Durable jobs and a bounded visual sweep recover persisted deadlines. All movement, standings and finish detection derive from one progress snapshot. Source-aware refunds use the owner-confirmed NO_WINNING_BETS_REFUND policy and retain the normal race result.

PostgreSQL Race suite: 10 passed. Domain suite: 102 passed. Adapter/render suite: 20 passed. Full preflight passes. Full build is recorded in IMPLEMENTATION_STATUS.json. Live Discord validation remains pending.

`review-gate-a/race/` contains real production-adapter output using labeled fixture members, with desktop/mobile host review frames and raw production cards. These are not live Discord screenshots. Entry, betting, live and result states are included. Gate A is incomplete until actual Fight runtime and its review artifacts exist.
