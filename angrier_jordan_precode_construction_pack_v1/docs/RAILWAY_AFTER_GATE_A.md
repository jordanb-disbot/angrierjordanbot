# Railway production-readiness — queued after Review Gate A

Owner instruction, 2026-09-25. This is a deferred engineering work item, not deployment authorization. Finish Race/Fight and stop for Review Gate A first. Begin this work only after that gate is approved; do not interrupt the current implementation for hosting setup.

## Production target

- One Railway long-running worker service for Angrier Jordan; one bot replica for v1.
- A separate Railway web service for the Admin dashboard, with a public HTTPS URL.
- A separate Railway production PostgreSQL service shared privately by the worker and dashboard. Use Railway private networking; no public database exposure is required.
- GitHub `main` is the eventual production deployment source. Preserve current history; the existing development branch is `master`. Branch transition and CI setup belong to this deferred task.
- Keep the existing disposable database and its ignored `.env.test.local` / `TEST_DATABASE_URL` completely separate from production `DATABASE_URL`. The Railway environment named `production` on the existing disposable project does not make that database the production Chairs database.

## Deliverables

- Docker/Railway configuration and explicit build/start commands for both services.
- Health checks suitable for the worker and web service; graceful shutdown.
- Production environment validation, including dashboard public-base and OAuth-callback variables.
- A safe migration workflow for the shared production database.
- GitHub CI aligned with the eventual `main` deployment source.
- An owner deployment runbook documenting prerequisites, service wiring, validation and controlled release.

Do not deploy production, create production credentials, or request production Discord secrets as part of the current Race/Fight work. Preparing configuration is not authorization to execute a production deployment.
