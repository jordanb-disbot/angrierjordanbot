# Test Strategy

P0 tests block a phase merge. Use unit tests for pure rules; integration tests against PostgreSQL for ledger/session/config; Discord adapter contract tests with mocked gateway events; renderer snapshot tests; end-to-end smoke tests on a dedicated test guild.

Cost-saving rule: never debug business rules inside live Discord first. Reproduce with fixture + test.
