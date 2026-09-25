# Phase 09 — item runtime implementation (acceptance pending)

Built on committed installed baseline bf76437. No retired command paths restored.

Implemented: deterministic 4 AM Mountain shop rotation/essentials/bonus slots, visible gates, atomic wallet-first purchases; inventory search/filter/sort/page controls; individual/category locks and unlock-all; confirmed single/junk/duplicate sales preserving best crafted chairs; named gifting; manual tool equip; bounded repair tiers; account-bound recipes; crafting materials/quality/ranks/failure/scrap and fallback; discovery-based hidden collections with prestige-only rewards; per-box durable pity.

Shared infrastructure: LedgerEngine inside serializable Prisma transactions, durable request receipts tied to request fingerprints, ConfigService, PermissionEngine, normalized PostgreSQL tables. Existing Daily/grind acquisition now creates actual tool instances and recipe ownership. Balance floors and one-equipped-tool-per-slot have database constraints. Existing grind debits/tool damage now use concurrency guards.

Discord: private item controls use the Angrier Jordan sender, dark native embeds and labeled buttons/menus/modals. Each mutation rechecks ownership and containment. Item module requires ENABLE_ITEMS_SMOKE plus features.items; both default off.

Validation: 78 domain tests and 5 real Discord-adapter tests pass. Full strict workspace typecheck passes. PostgreSQL integration suite exists but remains pending a resolved disposable TEST_DATABASE_URL. It loads only .env.test.local, creates a uniquely named test schema, applies all migrations, tests concurrency/replay/restart/rollback and drops only that schema. No production database fallback.

Not yet accepted: real PostgreSQL migrations/concurrency suite; live Discord smoke/readability; final live integration. Phase 09 is not marked acceptance-complete and wagering remains blocked behind this gate. Gate A has not been reached.
