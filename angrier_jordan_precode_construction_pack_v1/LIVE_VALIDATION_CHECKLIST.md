# Live validation checklist

- [x] Configure owner-confirmed disposable PostgreSQL and apply migrations in isolated test schemas.
- [x] Verify item transactions, profiles and shared scheduler recovery against PostgreSQL.
- [x] Complete expanded casino/lottery PostgreSQL acceptance (10 tests).
- [x] Complete Race PostgreSQL acceptance, including no-winning-bet refunds (10 tests).
- [ ] Supply development Discord token, application/server and role/channel IDs through local secrets.
- [ ] Confirm privileged intents and hierarchy.
- [ ] Exercise enabled modules with test balances and real Discord interactions.
- [x] Capture production-runtime desktop/mobile Race/Fight review renders using labeled fixture members.
- [x] Complete Fight PostgreSQL acceptance, including departure/settlement concurrency (10 tests).
- [x] Complete full PostgreSQL regression (50 tests), domain tests (106), adapter tests (24), full build and preflight.
- [ ] Complete owner Gate A flow/presentation review.
- [ ] Capture live Discord screenshots during subsequent live acceptance.
- [x] Keep unfinished feature flags disabled.
