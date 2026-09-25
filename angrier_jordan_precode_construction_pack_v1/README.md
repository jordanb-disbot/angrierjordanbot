# Angrier Jordan — Implementation Repository

Current source-of-truth date: **2026-09-21**  
Current implementation checkpoint: **08 — Economy Foundation**

This repository began as the pre-code construction pack and is now the active implementation baseline. Product behavior is governed by `reference/specs/ANGRIER_JORDAN_CANONICAL_BUILD_SPEC.md` and the registries under `reference/acceleration/registries/`.

## Current state
- npm-workspace monorepo for bot + dashboard + shared packages;
- PostgreSQL/Prisma schema at `0008_economy_foundation` with 79 models/tables;
- shared timer/session/voting/permission/config/ledger/escrow/audit/scheduler engines;
- reconciled 192-interaction command registry, 185-setting schema, and 40 capability definitions;
- generated Discord registration: 65 application commands / 64 chat-input roots;
- embedded final v2 production visual library: 348 assets/templates;
- implemented Golden Feature: Would You Rather domain, persistence, runtime renderer, recovery, and interaction flow;
- implemented onboarding/rejoin/rules-access foundation and member-facing `/roles` panel;
- implemented moderation Hotseat, numbered cases, evidence, appeals, manual moderation and channel controls;
- implemented AutoMod, behavior heat/progressive discipline, Join Gate verification, anti-raid, anti-nuke and Panic Mode;
- implemented Ottoman economy foundation: ledger, wallet/bank, transfers, Daily Hub, weekly rewards, grind, inventory/catalog and Tier 5 interest.

## Start here
1. Read `docs/CODEX_START_HERE.md`.
2. Read `docs/IMPLEMENTATION_CHECKPOINT_08.md`.
3. Run `npm run preflight` and `npm run validate:production-wiring`.
4. Continue with **Checkpoint 09 — Shop / Inventory / Tools / Crafting / Collections** in `docs/BUILD_ORDER.md`.

Unfinished modules remain behind feature flags until their acceptance gates pass. Live Discord/PostgreSQL validation requires the user's credentials and installed workspace dependencies.

## Reproducible installed build

Use Node.js 22+ and npm 11.6.0. Run `npm ci`, `npm run build`, then `npm run preflight`.
The build generates Prisma, checks every workspace/adaptor, compiles the bot and builds the dashboard.
Start the compiled bot with `npm --workspace @angrier-jordan/bot start` after configuring local secrets.
See `docs/INSTALLED_BASELINE_2026-09-25.md` for the baseline repair record.
The handoff controller in the sibling `ANGRIER_JORDAN_CODEX_HANDOFF_2026-09-25` directory takes precedence over older internal notes.
