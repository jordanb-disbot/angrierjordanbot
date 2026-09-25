# Required Feature Template

Every new Angrier Jordan feature must follow this order. A feature is incomplete until every applicable row exists.

1. **Canonical behavior** — user-facing rules and invariants.
2. **Command registry** — invocation, fields, required/optional metadata, handler, feature flag.
3. **Capability matrix** — who can invoke/configure/review it.
4. **Settings schema** — editable values only; hard invariants remain code.
5. **Database** — persistent state, indexes, uniqueness, idempotency keys.
6. **Domain service** — Discord-independent business logic.
7. **Discord adapter** — translates Discord events to/from domain service; no duplicated rules.
8. **Renderer composition** — reuse existing renderer nodes/components before adding a new template.
9. **Content** — authored response pools/config-separated copy.
10. **Assets** — only if a concrete missing runtime asset exists.
11. **Dashboard** — generated controls when possible; custom editor only when complexity requires it.
12. **Help/tutorial** — fields, examples, practice mode if applicable.
13. **Audit** — state-changing admin/mod/economy actions.
14. **Acceptance tests** — happy path, permission boundary, restart/retry, concurrency where relevant.
15. **Feature flag** — off until its acceptance gate passes.

## Never duplicate these engines inside a feature
- permissions
- timers
- voting
- session state
- ledger
- escrow
- audit
- scheduled-job idempotency
- configuration validation
- generic content selection/recent-history exclusion
