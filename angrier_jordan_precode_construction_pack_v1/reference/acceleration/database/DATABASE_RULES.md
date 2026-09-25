# Database Rules

- PostgreSQL is authoritative for live state.
- Use transactions and row/version checks for money, inventory, wagers, auctions, and destructive moderation operations.
- Every consequential handler accepts an idempotency key.
- Never derive authority from names. Store Discord snowflakes as strings.
- Store authored content separately from live state.
- Scheduled jobs are persisted and restart-reconciled.
- Keep moderation evidence content retention separate from permanent case metadata.
- Prefer JSON only for extensible payloads; high-query fields stay typed/indexed.
