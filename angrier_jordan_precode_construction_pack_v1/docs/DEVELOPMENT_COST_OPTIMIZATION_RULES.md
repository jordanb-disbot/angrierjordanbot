# Permanent Development-Cost Rules

1. **Single-source command metadata.** Command registration, field descriptions, quick help, tutorial links, permissions and handler mapping derive from the command registry.
2. **Single-source setting metadata.** Live values live in PostgreSQL; types/defaults/bounds/UI metadata derive from the settings schema.
3. **Domain-first architecture.** Discord/dashboard adapters call shared domain services. They do not reimplement rules.
4. **Shared primitives are mandatory.** Timer, vote, session, ledger, escrow, permission, audit and scheduling logic are built once.
5. **Generated boilerplate beats authored boilerplate.** Prefer deterministic code generation for registrations, constants, settings forms, loaders and test skeletons.
6. **Assets are considered sufficient by default.** Add art only for a concrete runtime gap. Do not create generic concept boards during implementation.
7. **Content stays data-driven.** Large authored pools are JSON/database content, not hard-coded branches.
8. **Feature flags protect the main branch.** Incomplete modules stay disabled rather than forcing big-bang releases.
9. **Schema before dependent features.** Add persistent-state requirements to Prisma/migrations before writing feature code.
10. **Idempotency first for money/jobs.** Economy settlement, wagers, scheduled resets and moderation timers must be safe to retry.
11. **Test at boundaries.** Prioritize permissions, concurrency, settlement, restart recovery, timers and migrations over cosmetic unit tests.
12. **No premature infrastructure.** PostgreSQL + one bot process + one dashboard process is enough until measurements prove otherwise.
13. **Every new feature runs the classification check.** Decide Code / Config / DB / Content / Assets / Secrets / Dashboard / Help / Tests before implementation begins.
14. **A feature is not finished without help coverage and acceptance tests.**
