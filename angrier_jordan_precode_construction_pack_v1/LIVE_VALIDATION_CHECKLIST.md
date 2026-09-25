# Live validation checklist

- [ ] Configure a development PostgreSQL database; apply all migrations and verify schema parity.
- [ ] Supply development Discord token, application/server and role/channel IDs through local secrets.
- [ ] Confirm privileged intents and hierarchy.
- [ ] Exercise enabled modules with test balances and real Discord interactions.
- [ ] Verify process restart, ledger/escrow replay and timer recovery against PostgreSQL.
- [ ] Capture actual runtime desktop/mobile Race/Fight states for Gate A after Phase 12.
- [ ] Keep all unfinished feature flags disabled.
