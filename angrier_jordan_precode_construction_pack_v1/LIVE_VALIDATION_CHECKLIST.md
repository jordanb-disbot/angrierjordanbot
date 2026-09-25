# Live validation checklist

- [x] Configure owner-confirmed disposable PostgreSQL and apply migrations in isolated test schemas.
- [x] Verify item transactions, profiles and shared scheduler recovery against PostgreSQL.
- [x] Complete expanded casino/lottery PostgreSQL acceptance (10 tests).
- [x] Complete Race PostgreSQL acceptance, including no-winning-bet refunds (10 tests).
- [ ] Supply development Discord token, application/server and role/channel IDs through local secrets.
- [ ] Confirm privileged intents and hierarchy.
- [ ] Exercise enabled modules with test balances and real Discord interactions.
- [x] Capture production-runtime desktop/mobile Race/Fight review renders using labeled fixture members.
- [x] Complete Fight PostgreSQL acceptance, including departure/settlement concurrency (10 tests).
- [x] Complete full PostgreSQL regression (50 tests), domain tests (106), adapter tests (24), full build and preflight.
- [x] Complete owner Gate A flow/presentation review; permanent visual system approved.
- [ ] Capture live Discord screenshots during subsequent live acceptance.
- [x] Keep unfinished feature flags disabled.

## Prepared live acceptance order (not yet run)

- [ ] Verify test Discord server, non-production balances, intents, channel IDs and role hierarchy before enabling any smoke gates.
- [ ] Exercise each feature as owner, Administrator, ordinary member, restricted member, wrong-channel member and outsider; privileged checks must use current Discord state.
- [ ] Revoke an Administrator permission mid-dashboard session and confirm immediate denial; verify OAuth state/CSRF/callback/cookie restrictions without logging tokens.
- [ ] Validate Line host auto-entry, ready/waiting switches, unlimited enrollment, one extension, entry lock, host-only start/cancel and optional authored override. Observe 5→4→3→2→1→burst on desktop/mobile; no visible zero or replay.
- [ ] Validate solo new puzzles, hidden answers, board-size selection, capped payouts, actor/channel/version rejection, new-record replay and saved results after restart.
- [ ] PvP: verify matching-stake consent, insufficient-funds rollback, private Battleship boards, turn timeouts, full-pot payout, draw refunds and fresh replay acceptance.
- [ ] Party games: verify anonymous creative submissions, editable ballots, saved tie/runoff outcomes, independent FMK audience voting and numerical profile counters.
- [ ] Counting/Last Letter: verify duplicate posts, alternating members, milestones, staff-only sabotage restore, negative scores and automatic next round.
- [ ] Crime: verify Wallet-only theft, held funds, Fight Back/report deadlines, exactly-once restitution, wanted decay, bail and moderation/Crime overlap across leave/rejoin.
- [ ] Reconnect/restart during active events and games; verify one authoritative message, no duplicate payout/notification and retained timers.
- [ ] Race/Fight: real private wager modal, authoritative HP/positions, no-winning-bettor refund, departure cancellation and terminal controls on actual clients.
- [ ] Batch family/event visuals at Gate B; music/voice controls at Gate C; authenticated dashboard mutation workflows at Gate D; full visual consistency at Gate E.
- [ ] Run same-release GitHub CI and Linux container smoke; verify production-private DB identity, backup and isolated restore drill before any authorized release.
- [ ] Authorize and perform production migration/deployment separately; confirm one active worker, HTTPS dashboard, private database, graceful shutdown and readiness probes.

Use deterministic fixtures from each `testing/runtime`, `testing/adapters` and `testing/postgres` suite before involving live members. A rendered fixture or mocked OAuth test is never recorded as live acceptance.
