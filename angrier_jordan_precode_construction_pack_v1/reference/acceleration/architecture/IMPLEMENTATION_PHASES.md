# Cost-Optimized Implementation Phases

## Phase 0 — Foundation
Monorepo, env validation, database, migrations, logging, audit, capability engine, config service, feature flags, command registry loader, test harness. **Do not start feature coding before P0 tests pass.**

## Phase 1 — Interaction primitives
SessionEngine, TimerEngine, VotingEngine, renderer shells, shared Discord components, setup wizard, `/help` + tutorial plumbing.

## Phase 2 — Economy foundation
Ledger, Wallet/Bank, inventory, content service, daily/weekly/work/fish/dig/scavenge, shop.

## Phase 3 — Games
Race/Fight/PvP/party/channel games using shared engines. Add casino only after ledger+escrow soak tests pass.

## Phase 4 — Social/community
Introductions, self roles, Chairisms, community tools, custom commands, Weekly Spotlight.

## Phase 5 — Moderation/security
Cases, AutoMod, progressive discipline, Hotseat, Join Gate, anti-raid, anti-nuke, Panic Mode. Security tests are merge-blocking.

## Phase 6 — Family/crime/crafting/collections
Build on ledger/session foundations.

## Phase 7 — Music
Provider-adapter architecture and one-guild-session controller.

## Phase 8 — Dashboard
Build forms from master settings schema; custom hand-built screens only for moderation cases, introductions, custom commands, content library, Hotseat/security.

## Phase 9 — Hardening
Restart drills, concurrency tests, backup/restore drill, YAGPDB cutover, permissions audit, final asset QA, production deployment.

Feature flags allow incomplete phases to ship disabled; avoid a big-bang launch.
