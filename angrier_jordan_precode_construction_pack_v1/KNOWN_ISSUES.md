# Known issues

- Live Discord smoke tests have not run. Core PostgreSQL acceptance passed against the owner-confirmed disposable test database. Expanded Phase 09 (11), Phase 10 (6), and scheduler recovery (3) tests passed. No production database fallback is permitted.
- Phase 09 runtime is implemented but PostgreSQL acceptance passed; live Discord checks are pending; Phases 10–12 and Review Gate A are not complete.
- Older ornate/crown-heavy atomic assets remain for the owner-approved final visual review.
- Sharp was patched to 0.35.4 and its actual WYR renderer verified. Five transitive advisories remain in the Prisma CLI configuration and dashboard CSS toolchain (1 moderate, 4 high); further dependency remediation remains pending. Do not mark production ready.
