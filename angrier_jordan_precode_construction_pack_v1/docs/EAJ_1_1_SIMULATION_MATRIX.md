# EAJ 1.1 simulation matrix

These deterministic domain simulations are not a substitute for the required seven-day production shadow observation or live Discord acceptance.

| # | Simulation | Evidence |
| --- | --- | --- |
| 1 | Mountain 4 AM reset across daylight-saving change | `economy snapshots schedule at the next 4 AM Mountain boundary through DST` |
| 2 | Monday policy publication schedule | `startup scheduling persists daily snapshots and Monday shadow-policy publication independently` |
| 3 | Reconciliation of wallet, bank, escrow, and communal pot | `economy reconciliation counts active member escrow and communal pots exactly once` |
| 4 | Shadow policy small-sample and anomaly freeze | `automated economy freezes adjustments for invalid reconciliation, anomalies, and small samples` |
| 5 | Composite affordability controller remains shadow-only | `composite controller uses participation, item utility, concentration, issuance, and gambling without changing shadow payouts` |
| 6 | Random chat payout retry, cap, and throttle recovery | `qualified chat awards are throttle-, cap-, and retry-safe with the sampled amount stored in the ledger` |
| 7 | Voice two-full/one-half-hour maximum | `voice earnings settle two qualifying hours at full rate, then one at half, then stop` |
| 8 | Tier 5 locked-term, time-weighted, benchmark-capped settlement | `Tier 5 bank interest locks the benchmark-scaled cap and is idempotent per member and cycle` |

Run command: `npm run test:domain`. The simulations are verified as part of the current 336-test domain suite. PostgreSQL and live checks remain separate acceptance gates.
