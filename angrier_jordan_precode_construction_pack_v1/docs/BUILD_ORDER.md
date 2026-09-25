# Cost-Optimized Build Order

## Phase 0 — Preflight
- registries validate
- schema reviewed
- secrets/env contract established
- local PostgreSQL boots
- feature flags default off except core diagnostics

## Phase 1 — Foundation
- Prisma repositories/migrations
- config service + config revisions
- audit service
- capabilities/permissions
- scheduler/idempotency
- command dispatcher + generated Discord registration
- renderer primitives
- health/status

## Phase 2 — Shared Engines + Golden Feature
- sessions
- timers
- voting
- content selector/history
- WYR end-to-end
- restart/recovery tests

**Gate:** do not start economy or other games until WYR proves the interaction architecture.

## Phase 3 — Onboarding + Moderation
- setup wizard
- introductions/self roles
- manual moderation/cases/evidence/appeals
- Hotseat
- AutoMod/raid/anti-nuke in bounded increments

## Phase 4 — Economy Foundation — CHECKPOINT 08 COMPLETE
- ledger
- wallet/bank
- escrow foundation
- inventory/catalog foundation
- daily/weekly/grind

**Gate passed:** economy concurrency/idempotency acceptance tests pass. Shop/tools/crafting/collections remain the next protected expansion before casino/wager/auction systems.

## Phase 5 — Games and Economy Extensions
- race/fight
- casino/lottery
- crafting/tools/shop
- party/solo/PvP games
- channel games

## Phase 6 — Community/Social/Family
- polls/superlatives/suggestions/AMA
- social response commands
- Chairisms
- crime/family systems

## Phase 7 — Music
- provider adapters
- queue/controller
- playlists/history

## Phase 8 — Dashboard Completion
- generated config pages already work early
- finish custom editors for moderation, intros, content, custom commands, shop/crafting

## Phase 9 — Integration/QA/Deployment
- migration rehearsal
- restart/failure tests
- backup/restore drill
- permissions health check
- YAGPDB migration
- feature-by-feature enablement
