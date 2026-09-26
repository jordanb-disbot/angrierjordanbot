# Family persistence recovery

This work continues the interrupted Checkpoint 18 integration tree. Existing Family, Community, Chairisms, dashboard and Gate B presentation work is retained. Family remains disabled by default. This is not production deployment or live Discord acceptance.

## Escrow contract

The failed Family implementation represented one inventory unit as `Escrow.amount = 1`, while both monetary source buckets were zero. The unchanged `0012_wager_escrow` constraint correctly rejected that row.

`0020_typed_item_escrow` adds a nullable integer `itemQuantity` and a separate typed-asset constraint. Ottoman escrow has a non-null monetary amount, no item fields, and retains the original nonnegative source-bucket equality. Item escrow has a positive explicit quantity and item reference, null monetary amount and zero monetary buckets. Both require a member owner. Unknown or mixed representations are rejected by PostgreSQL and shared adapters.

The migration acquires the table lock inside a transaction and checks existing records before changing the schema. Valid historical monetary rows, including zero amounts, are preserved. Ambiguous legacy records stop the migration with a count-only diagnostic; the migration does not guess quantities, convert monetary history, delete rows or move balances. An operator must reconcile any such records from authoritative evidence before retrying. Applied migrations, including `0012`, are unchanged.

If Prisma records a failed migration after this deliberate preflight stop, first confirm that its transaction rolled back and resolve the incompatible rows through an explicitly reviewed recovery procedure. Then use the normal `prisma migrate resolve --rolled-back 0020_typed_item_escrow` recovery step before retrying deployment. Do not automatically mark a failed migration applied, remove its history, or infer missing quantities. This work has not performed that recovery on any production database.

`PrismaItemEscrow` uses the caller's transaction and shared escrow state machine. Inventory deduction and durable reservation commit together. Reservation identity is immutable; repeated reservations do not debit inventory again. Finalization uses compare-and-swap, restores the recorded quantity on refund, and never resurrects a finalized reservation. Conflicting final outcomes fail. Family proposal and auction consumables use this shared adapter.

Wallet holds remain separate: they leave funds displayed in the wallet while reducing spendable funds. Monetary auction bids continue using `PrismaWagerEscrow` and the shared ledger; refunds retain their original wallet/bank sources. Estate lots remain durable asset projections in sessions.

## Family acceptance isolation

The previous auction test removed a bidder from its shared eligibility set, then failed before restoring it. Later auction cases inherited that ineligible bidder. Major Family acceptance cases now use independent server fixtures, clocks, eligibility sets, balances and inventory, with explicit prerequisites. Eligibility rules are not weakened.

Relationship mutations also validate current actor eligibility and bind the supplied parent identity to the invoker. Passive inheritance eligibility remains distinct from command confinement.

## Membership and estate recovery

Startup attempts an authoritative full membership census before dependent Family jobs. An incomplete census or Discord outage pauses Family work; unrelated features may continue. Recovery retries and all Family job handlers require enabled configuration and successful membership recovery.

Live gateway observations immediately advance a membership generation. Membership writes and Family jobs are serialized for the single-worker v1 deployment. Reconciliation refreshes actionable membership immediately before mutation, uses stable departure receipts, preserves completed estates and cancels pending estates on confirmed return. Detection time starts a missed departure's grace period; no historical departure time is invented.

Gateway callbacks invalidate readiness and enqueue their transitions synchronously. A trusted join remains evidence of return even if the member departs again before its handler executes; stale joins skip onboarding/economy effects. Return timestamps and applicable estate cancellations commit in one transaction. Historical duplicate joins cannot clear a newer departure, while a fresh current-presence census can repair stale presence data. Versioned request keys preserve compatibility with earlier no-timestamp receipts. Restart after a rapid return/departure can therefore recover the new membership and start its own grace period.

Estate execution rechecks passive membership inside its transaction. A synchronous guard in the shared atomic runner checks the observed generation after financial, asset, relationship, audit, publication and receipt writes, immediately before returning the transaction callback. A join/leave observation during those writes aborts the transaction. The guard does not promise atomic ordering with events Discord has not yet delivered; a return observed after the final check follows the existing post-execution return policy. Unknown membership does not authorize estate execution. Existing reserved funds/items defer execution through a new durable job. Queued Family jobs recheck feature enablement when their turn begins, including publication jobs.

## Validation record

Validation is recorded after execution; test presence alone is not a pass. All PostgreSQL acceptance uses only `TEST_DATABASE_URL` from the ignored application-root `.env.test.local`, with isolated disposable schemas and redacted output. No production database, deployment or Discord acceptance is part of this workstream.

Focused typed escrow PostgreSQL acceptance passed all 13 tests. The latest domain compilation and 207 runtime tests pass, as do workspace typechecks and 29 source membership-adapter tests. Registry/codegen synchronization, help, content, all 385 asset hashes and the 38 immutable visual references pass. Full dependency audit reports zero advisories.

The first local Family run returned 5 passed / 21 failed (25 behavior cases plus their parent). All failed behavior cases reported Prisma transaction errors: four explicitly exceeded the unchanged 20-second transaction limit; the others reported a missing/closed transaction. No escrow-constraint or eligibility-cascade error remained in that log. A subsequent receipt-guard run encountered the same class of errors. Colocated CI PostgreSQL acceptance is required to distinguish public-network timing from remaining logic defects. No production timeout or assertion was relaxed. Final consolidated results will be recorded after that run.
