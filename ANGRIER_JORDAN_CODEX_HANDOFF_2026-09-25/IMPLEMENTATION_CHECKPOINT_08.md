# Angrier Jordan — Implementation Checkpoint 08

Date: 2026-09-21  
Status: **PASS**

## Scope completed

Checkpoint 08 implements the first durable Ottoman economy layer on top of the shared ledger/scheduler/config foundation.

Implemented runtime domains:
- one-time starter Ottoman grants;
- wallet + protected bank accounts;
- free member transfers with wallet-first / bank-remainder spending;
- five bank tiers and Tier 5 weekly interest;
- `/statement` transaction history;
- persisted catalog/inventory stacks;
- private `/daily` hub with Claim Daily, Daily Spin and Fortune;
- `/weekly`;
- repeatable `/work`, `/fish`, `/dig`, `/scavenge`;
- tool requirements, durability damage and automatic fallback;
- technical anti-spam throttling without gameplay cooldowns;
- Discord/PostgreSQL runtime wiring behind `ENABLE_ECONOMY_SMOKE`.

## Ledger and account safety

All Ottoman movement in this checkpoint is represented as balanced ledger lines. Member transfer behavior is now canonical:
- wallet is spent first;
- any remainder is pulled from bank;
- recipient funds arrive in wallet;
- member-to-member transfer fee is zero;
- insufficient funds fail without moving either balance;
- duplicate interaction IDs cannot double-apply a transfer.

The one-time starter grant is persisted with `starterGrantedAt`. A rejoin or a later bootstrap request therefore cannot regrant the starter balance.

The PostgreSQL repository uses optimistic account versions for ordinary ledger commits and unique idempotency headers for economic transactions.

## Bank

Five configurable tiers are supported. Tiers 1–4 have bounded capacities and Tier 5 is unlimited. An upgrade requires the current tier to be full before the upgrade charge is applied. Upgrade spending follows the normal wallet-first rule.

Tier 5 interest is:
- scheduled for Monday at 4:00 AM Mountain Time;
- persisted through the shared job scheduler;
- idempotent per member per weekly cycle;
- bounded by configurable basis points and a per-member payout cap.

Banked Ottomans remain a distinct balance so the later crime/robbery system can protect them.

## Daily Hub

`/daily` is now one private hub with three independent actions:
- **Claim Daily** — guaranteed Ottomans + streak milestones;
- **Daily Spin** — one weighted cash/item result;
- **Fortune** — one authored fortune.

The runtime uses `America/Denver` calendar boundaries rather than a fixed UTC offset, so the **4:00 AM Mountain Time** reset follows daylight-saving changes correctly.

Each daily action has its own once-per-cycle claim field. Claim Daily continues a streak only when the prior claim was in the immediately previous daily cycle; missing a cycle resets it to 1. The configurable milestone defaults are 7, 30, 100 and 365 days.

The 300-entry authored fortune bank is copied into the runtime content package. Standalone `/spin` and `/fortune` are not introduced.

## Weekly and grind

`/weekly` is a guaranteed larger reward with the existing weekly reset settings.

Basic grind commands are repeatable and have no gameplay cooldown. The only delay is a small persisted technical throttle intended to reject duplicate/rapid interaction bursts.

`/fish`, `/dig` and `/scavenge` require the matching equipped usable tool. Broken tools automatically unequip and the best usable same-slot fallback is equipped when available.

`/work` does not require a tool. If an equipped workshop tool exists, configured tool-damage outcomes can affect it. A hard runtime invariant rejects item-drop configuration for `/work`, keeping it Ottoman-only as required by the canonical spec.

Negative work/grind outcomes cannot drive balances below zero and collect wallet first, then bank.

## Inventory/catalog foundation

Checkpoint 08 makes inventory stacks unique by `(server, member, item)` and uses atomic upserts for grants. A minimal initial catalog is seeded for Daily Spin and early grind drops. `/inventory` presents the persisted stacks; selling remains part of the later inventory/shop implementation and no standalone `/sell` command is created.

## Discord presentation

The member-facing economy coordinator uses the approved Angrier Jordan presentation rules:
- sender remains **Angrier Jordan**;
- user-facing language says **server/member**, never guild;
- feature colors alternate within the approved palette rather than forcing every economy feature to one accent;
- `/daily` is ephemeral;
- public grind/weekly/transfer surfaces remain concise and Discord-native.

Economy buttons and modals are blocked for moderation-Hotseat members. Join Gate restrictions and security Lockdown also block economy actions so stale interactions cannot bypass containment.

## Database / registry changes

Migration `0008_economy_foundation` adds or formalizes:
- `EconomyAccount.starterGrantedAt`;
- `EconomyTransaction` idempotency headers;
- unique inventory stack identity;
- `EconomyActivityStat`;
- `EconomyActivityEvent`;
- `EconomyActionThrottle`;
- initial catalog rows used by Daily Spin/grind.

Registry totals:
- **192** conceptual interactions;
- **185** settings;
- **40** capabilities;
- **65** generated Discord application commands;
- **64** top-level chat-input commands.

New settings cover bank tiers, Tier 5 interest, daily streak milestones, Daily Spin weights, grind technical throttling and per-activity grind tables. `server.daily_reset_hour` is fixed to 4 and direct-transfer fee configuration is fixed to zero to preserve canonical invariants.

## Verification

- Domain tests: **68 passed / 0 failed**
- Economy-specific tests added: **14**
- Domain TypeScript typecheck: **PASS**
- Registry validation: **PASS**
- Production wiring structural validation: **PASS**
- Help coverage: **PASS**
- Content validation: **PASS**
- Asset validation: **PASS**
- Full preflight: **PASS**
- Prisma models/tables: **79 / 79**
- Production visual library: **348 assets/templates**

Environment-gated checks remain pending:
- live Discord/PostgreSQL smoke test requires credentials;
- Prisma client regeneration requires workspace dependency installation;
- full bot adapter typecheck remains blocked until workspace dependencies are installed.

## Next checkpoint

Begin **Checkpoint 09 — Shop / Inventory / Tools / Crafting / Collections** before enabling casino, Race/Fight wagering, auctions or other escrow-heavy systems. This will add the member-facing inventory sale flow, rotating shop, tool acquisition/equip/repair, recipes/crafting, collections and the economy invariants those systems need.
