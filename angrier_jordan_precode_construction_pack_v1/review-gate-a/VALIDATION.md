# Review Gate A validation — 2026-09-25

## Completed implementation

Checkpoint 08 history and committed dependency lockfile are preserved. Phases 09–12 include items/crafting/collections, profiles/activity/Spotlight, casino/lottery, and Race/Fight. All feature flags remain off pending review and live acceptance.

Fight uses the unchanged approved combat specification and 100-attack/36-heal pool. Source hashes and required `/fight @member` registration pass validation. Race/Fight share durable sessions, timers, ledger, escrow and transaction recovery. No retired commands or rematch/Play Again controls were restored.

## Automated validation

- Full workspace/adapters typecheck and bot/dashboard production build: PASS.
- Preflight, registries, content, help, assets, golden rendering, production wiring and Fight source integrity: PASS.
- Domain tests: 106 passed, including 400 seeded Fight plans and shared transaction retry tests.
- Adapter/render tests: 24 passed.
- Final PostgreSQL regression: 50 passed, 0 failed (items 11, profiles 6, scheduler 3, casino/lottery 10, Race 10, Fight 10; totals include parent acceptance cases).
- Migrations 0001–0013 are applied in isolated disposable test schemas. Tests load only the ignored `.env.test.local` `TEST_DATABASE_URL`; no production database is used.

Financial acceptance covers escrow conservation, source-aware refunds, idempotent concurrent settlement, restart recovery, 5% rake only when winning wagers exist, and `NO_WINNING_BETS_REFUND`. Fight additionally covers departure cancellation and simultaneous departure versus settlement. Cancellation and settlement now acquire session state before escrow; bounded retries recognize Prisma-wrapped PostgreSQL deadlocks.

## Review artifacts and timing

Open [interactive playback](index.html). Static images, actual production-adapter payloads and manifests are in [Race](race/README.md) and [Fight](fight/README.md).

| Flow | Window | Extension | Runtime example |
| --- | --- | --- | --- |
| Race entry/betting | 60 seconds | Host, +30 seconds once | 15.440-second sprint |
| Fight betting | 30 seconds | Host, +30 seconds once | 22.283-second combat |
| Fight combat contract | Target about 25 seconds; normal 22–28 seconds | None | 30-second hard cap |

The review uses actual production renderers and coordinator payloads with labeled fixture identities. Desktop/mobile host frames are review renders, not live Discord screenshots. Browser checks verified mobile readability, no horizontal overflow, timed playback and removal of betting controls at completion. Static and interactive examples share the same deterministic plans.

Live Discord interactions and production deployment have not been validated. The five previously documented transitive dependency advisories remain in the Prisma CLI/dashboard CSS toolchain; see `KNOWN_ISSUES.md`.

## Required owner decision

Approve the Race/Fight flow and presentation, or identify specific changes in these artifacts. This is Gate A review, not production deployment approval. Phase 13 and Railway readiness remain queued until approval; production credentials and deployment are not requested.
