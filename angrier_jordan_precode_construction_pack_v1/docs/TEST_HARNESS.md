# Discord Test Harness

The test harness should simulate Discord interactions without requiring a live server for most logic.

## Fake objects
- guild
- channel
- member + role/capabilities
- slash command options
- buttons/selects/modals
- clock
- session repository
- config repository
- ledger/escrow repositories
- audit sink

## Required simulation cases
- user changes vote before close
- two concurrent economy spends
- restart with open game session
- restart with active timeout/jail/scheduled job
- deleted mapped channel/role
- owner vs admin vs moderator permission boundaries
- duplicate interaction delivery/idempotency key
- stale button click after session close
- YAGPDB trigger migrated to native workflow

Only provider-specific Discord API behavior and final permission integration need a real test guild.
