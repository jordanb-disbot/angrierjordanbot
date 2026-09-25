# Phase 09 — item runtime implementation (acceptance pending)

Built on committed installed baseline bf76437. No retired command paths restored.

Implemented: deterministic 4 AM Mountain shop rotation/essentials/bonus slots, visible gates, atomic wallet-first purchases; inventory search/filter/sort/page controls; individual/category locks and unlock-all; confirmed single/junk/duplicate sales preserving best crafted chairs; named gifting; manual tool equip; bounded repair tiers; account-bound recipes; crafting materials/quality/ranks/failure/scrap and fallback; discovery-based hidden collections with prestige-only rewards; per-box durable pity.

Shared infrastructure: LedgerEngine inside serializable Prisma transactions, durable request receipts tied to request fingerprints, ConfigService, PermissionEngine, normalized PostgreSQL tables. Existing Daily/grind acquisition now creates actual tool instances and recipe ownership. Balance floors and one-equipped-tool-per-slot have database constraints. Existing grind debits/tool damage now use concurrency guards.

Discord: private item controls use the Angrier Jordan sender, dark native embeds and labeled buttons/menus/modals. Each mutation rechecks ownership and containment. Item module requires ENABLE_ITEMS_SMOKE plus features.items; both default off.

Validation: 90 domain tests and 11 Discord-adapter/renderer tests pass. Full strict workspace typecheck passes. PostgreSQL integration suite passed all 11 tests against the owner-confirmed disposable Railway database. It loads only .env.test.local, creates a uniquely named test schema, applies all migrations, tests concurrency/replay/restart/rollback and drops only that schema. No production database fallback.

Database gate passed: duplicate/distinct purchases, sale versus gift, rollback, equip exclusivity, craft consumption, repair replay, box pity and ledger balance. Live Discord smoke/readability and final live integration remain pending. Flags stay off. The handoff permits proceeding to wagering after this database gate. Gate A has not been reached.
