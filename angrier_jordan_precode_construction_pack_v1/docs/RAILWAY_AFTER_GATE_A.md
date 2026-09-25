# Railway readiness after approved Gate A

Gate A function and presentation are owner-approved. Hosting preparation is active engineering work; it does not authorize production deployment.

The repository now contains an app-root Docker build, explicit Railway worker/dashboard configurations, an isolated migration configuration, runtime environment guards, health/readiness routes, shutdown handling and GitHub CI. See [the deployment runbook](RAILWAY_DEPLOYMENT_RUNBOOK.md) for service wiring and release gates.

The target remains one active worker, a separately accepted HTTPS Admin dashboard and shared private production PostgreSQL in a project separate from disposable `upbeat-kindness`. Dashboard acceptance is required before setting `AJ_DASHBOARD_ACCEPTED=true`. All other unfinished/unaccepted features remain disabled.

CI covers current `master` and eventual `main` without deploying. Preserve history when the owner is ready to establish `main`; no branch transition or production mutation is part of this readiness checkpoint. Container build/smoke execution requires Docker or GitHub Actions and must pass before release. Live Discord, Railway deployment and backup/restore acceptance remain owner-authorized future work.
