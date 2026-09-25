# Shared wallet holds

Wallet holds keep money in the member’s displayed wallet while excluding it from spending. They do not create a new money bucket or move money outside the shared ledger. `spendableWallet(account)` is `wallet - reservedWallet`; omitted aggregates on older in-memory fixtures mean zero.

Migration `0017_wallet_holds` adds `EconomyAccount.reservedWallet` and permanent WalletHold rows scoped by server, member, reference type and reference ID. PostgreSQL checks keep the aggregate nonnegative and within the full wallet balance, require positive hold amounts, and constrain active/released row states. The transaction-scoped helper maintains the aggregate and increments account version on every actual reserve/release transition.

```ts
const holds = new PrismaWalletHolds(tx);
await holds.reserve({ guildId, userId, referenceType: 'crime', referenceId: incidentId, amount });
await holds.release({ guildId, userId, referenceType: 'crime', referenceId: incidentId });
```

Both operations must run inside the same caller-owned PostgreSQL transaction as their consequential ledger/session changes, normally PrismaAtomicOperations. Reservation follows the immediate stolen-wallet credit. Restitution releases the exact incident hold immediately before the shared ledger reversal, all in that same transaction. Failed transactions roll back the hold row, aggregate, account version, ledger and operation receipt together. Callers must let operation errors abort the transaction.

The scoped row itself makes exact reserve/release retries idempotent. A reused reservation with a different amount fails. A reservation replay after release returns the permanent released row and cannot recreate its hold. Wrong server/member/reference releases fail. Exact duplicate operations do not bump the account version again. Outer OperationReceipt fingerprints still bind a complete feature operation to its original request.

Crime uses a 60-second Fight Back response and a 180-second witness/report window. The hold covers the entire unresolved restitution exposure; it releases after successful immediate restitution or final incident resolution. The helper is timer-agnostic; the persisted Crime timer/session owns that lifecycle. Bank balances remain untouched by robbery/restitution.

The shared LedgerEngine, transaction-bound Prisma ledger adapter, legacy Prisma economy ledger adapter and in-memory economy adapter enforce held-wallet protection. Account version checks invalidate stale reads after holds change. Wallet-first spending in member transfers, item purchases and wager escrow uses spendable wallet before bank. Existing non-ledger activity fines and bank upgrades also use spendable funds; credit-only starter/claim paths reject negative rewards. Wallet and liquid-net-worth display values remain full owned balances.

Verification suites:

- `testing/runtime/ledger-holds.test.mjs`: core and memory guards, stale version conflict, credits, transfer split, non-ledger fines/upgrades and negative credit rejection.
- `testing/postgres/wallet-holds.test.mjs`: isolated disposable schema, immediate credit/hold, full idempotent reversal, concurrent holds/spending, scoped reference replay, both Prisma adapter guards, database bounds, injected rollback failures, wager funding, fines/upgrades, hold aggregate and balanced-ledger reconciliation.

Only ignored `.env.test.local` → `TEST_DATABASE_URL` supplies the PostgreSQL test connection. No production credentials or runtime flags are enabled by this increment.

Validated on 2026-09-25 after the official domain-test compile: wallet-hold runtime 7/7, existing economy/items runtime and item adapter regression 29/29, and isolated PostgreSQL wallet holds 13/13 (12 cases plus the parent test). Both application TypeScript checks also passed. Crime acceptance remains a separate feature gate.
