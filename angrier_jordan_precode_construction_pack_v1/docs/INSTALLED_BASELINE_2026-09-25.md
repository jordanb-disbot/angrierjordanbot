# Installed Checkpoint 08 baseline — 2026-09-25

Source baseline: 9397f54, extracted from Checkpoint 08. No product decisions changed.

- Node 24.19.0 / npm 11.6.0; workspace package-lock.json pins installed dependencies.
- Prisma 6.19.3 client generation succeeds after correcting schema declaration syntax.
- Full strict workspace check includes bot, shared packages, database adapters/seed and dashboard.
- Bot output is isolated in root dist, with content/registration/fixture data copied alongside it.
- Removed stale emitted JS/declarations alongside TypeScript source; TypeScript remains authoritative.
- Windows domain test compiler runs the local TypeScript CLI through Node.
- Corrected Discord optional-field/partial-member typings and Prisma transaction-client contracts.
- Build includes codegen, Prisma generation, full typecheck, bot and dashboard production builds.
- Preflight now includes help, production wiring and full workspace checks.
- Original Phase 5 archive README was inspected directly: it already says “Final QA: PASS with 0 errors.” The QA report's stale README finding does not reproduce in this supplied archive; no archive rewrite is needed.

Offline validation: 68 domain tests pass; all supplied validators pass; bot/dashboard build passes.
Live Discord/PostgreSQL validation remains pending. No smoke flags were enabled.
