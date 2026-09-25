# Live validation checklist

- [x] Configure owner-confirmed disposable PostgreSQL and apply migrations in isolated test schemas.
- [x] Verify item transactions, profiles and shared scheduler recovery against PostgreSQL.
- [x] Complete expanded casino/lottery PostgreSQL acceptance (10 tests).
- [x] Complete Race PostgreSQL acceptance, including no-winning-bet refunds (10 tests).
- [ ] Supply development Discord token, application/server and role/channel IDs through local secrets.
- [ ] Confirm privileged intents and hierarchy.
- [ ] Exercise enabled modules with test balances and real Discord interactions.
- [ ] Capture actual runtime desktop/mobile Race/Fight states for Gate A after Phase 12.
- [x] Keep unfinished feature flags disabled.
