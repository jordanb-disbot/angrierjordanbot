# Railway deployment runbook

Prepared after owner approval of Gate A. This is a release procedure, not authorization to create production resources, obtain credentials, migrate, register commands or deploy. No production deployment has been performed by this checkpoint.

## Prerequisites

1. Record the owner-authorized release scope, accepted feature flags, target server and full 40-character Git commit. Gate A does not approve the Admin dashboard or remaining roadmap gates. Keep unfinished/unaccepted features disabled.
2. Require the `Build and acceptance` GitHub workflow to pass for that exact commit: full build/preflight, disposable PostgreSQL suites and container build/smoke. Image smoke does not prove live Discord connectivity or Railway readiness.
3. Use a separate owner-authorized production Railway project. `upbeat-kindness` is TEST-ONLY even if its environment is named `production`. Verify project ID and database service identity, not merely display names.
4. Preserve `master` history. When authorized to establish production source `main`, create it from tested approved history without resetting, squashing or deleting `master`; require CI protection before connecting production services. This checkpoint does not create/push `main` or connect a deployment source.
5. Before schema changes, verify a restorable backup and completed restore drill on isolated non-production data. Review pending SQL and compatibility with the prior release. Stop if compatibility or restoration is unresolved.

## Services and image

Use Railway Root Directory `/angrier_jordan_precode_construction_pack_v1` and Dockerfile `Dockerfile` for all roles. Build context must be this app directory, never its repository parent. The Dockerfile builds Node.js 22 workspaces, dashboard and Prisma client without credentials. Its allowlisted context excludes local dependencies, environment files, keys and output. The image keeps Prisma CLI dependencies for the approved migration role and runs as unprivileged `node`.

| Role | Repository-absolute config path | Start command | Deployment health check |
| --- | --- | --- | --- |
| Worker | `/angrier_jordan_precode_construction_pack_v1/railway/worker.json` | `node dist/apps/bot/src/index.js` | `/readyz` |
| Dashboard | `/angrier_jordan_precode_construction_pack_v1/railway/dashboard.json` | `node scripts/start-dashboard.mjs` | `/api/health` |
| Migration | `/angrier_jordan_precode_construction_pack_v1/railway/migration.json` | `node scripts/migrate-production.mjs` | None; successful exit required |

Railway's config path is repository-absolute and does not inherit Root Directory. Configure exactly one replica in exactly one region per application service. Do not add autoscaling, regional replicas, cron execution or PR production environments. Both applications have bounded failure restarts and a 30-second drain window. Railway supplies `PORT`; health traffic binds there. Application state persists in PostgreSQL; no application volume is required.

Worker and database must have no public domain or TCP proxy. PostgreSQL is reachable only over private networking. The accepted dashboard alone receives a public HTTPS domain. Keep its service stopped until acceptance.

Keep GitHub automatic deploys disabled for the worker and migration job, including after `main` is established. Manually select the tested commit. One replica and `overlapSeconds=0` do **not** ensure a single active worker during a rolling replacement: Railway starts the replacement and health-checks it before removing the previous deployment. V1 therefore requires explicitly stopping the old worker and confirming termination **before** starting its replacement. A maintenance interruption is intentional. Do not use ordinary rolling redeploy/rollback for the worker.

The image records `RAILWAY_GIT_COMMIT_SHA` in `/app/RELEASE_SHA`; building without a full SHA fails. Railway supplies this non-secret variable for GitHub builds. Local/CI builds pass `--build-arg RAILWAY_GIT_COMMIT_SHA=<full-commit-sha>`. Never pass runtime secrets as build arguments. Use the same recorded release for every role, preferably the identical image digest when promoting images.

## Variables

Store secrets in Railway service variables and use private service references. Never commit or print credentials. Give the bot token only to the worker.

| Scope | Required configuration |
| --- | --- |
| All production roles | `NODE_ENV=production`, `AJ_DATABASE_PURPOSE=production`, private production `DATABASE_URL` using a `*.railway.internal` hostname; project identity must not be `upbeat-kindness` |
| Worker | `DISCORD_TOKEN`, `DISCORD_APPLICATION_ID`, `DISCORD_GUILD_ID`; accepted feature settings and valid server/channel/role IDs; `EVIDENCE_ENCRYPTION_KEY` when moderation/security requires it |
| Dashboard, after acceptance | `AJ_DASHBOARD_ACCEPTED=true`, `DISCORD_OAUTH_CLIENT_ID`, `DISCORD_OAUTH_CLIENT_SECRET`, `DISCORD_GUILD_ID`, `DASHBOARD_SESSION_SECRET`, `PUBLIC_DASHBOARD_URL=https://<dashboard-host>`, `DISCORD_OAUTH_CALLBACK_URL=https://<dashboard-host>/api/auth/discord/callback` |
| Migration job only | `AJ_PRODUCTION_MIGRATIONS_APPROVED=true`, `AJ_MIGRATION_RELEASE=<exact-full-release-commit>` matching image `RELEASE_SHA` |

Never set `TEST_DATABASE_URL` on production services. Never use a public database proxy. Name/hostname checks are additional guards, not proof of identity; independently inspect the database service/reference before migration approval.

Leave `AJ_DASHBOARD_ACCEPTED` unset/false until the real dashboard passes Gate D, including current owner/Administrator authorization, audit and draft/publish behavior. The wrapper intentionally refuses to start beforehand. Supplying OAuth values does not make the placeholder dashboard accepted. After acceptance, register the exact HTTPS callback with Discord and test owner/Admin access and unauthorized-member rejection. Keep all `ENABLE_*_SMOKE` switches false unless the owner has accepted and included that feature in the production release. Validate roles, channels and hierarchy before enabling accepted flows.

## Controlled release

1. Record release commit/image digest, backup identifier, accepted flags and migration list. Obtain owner authorization for this concrete production release and database target.
2. Disable automatic deployment triggers. Stop the existing worker and confirm both its deployment/container and Discord gateway connection are gone. Allow graceful shutdown within the 30-second drain window. Never start another worker while the old one may be active. Stop the dashboard too for schema changes incompatible with its current version.
3. Run exactly one manual migration job from the approved release image on the private production network. The migration configuration uses restart policy `NEVER`, no cron and no automatic deployment trigger. Apply migration approval variables only to this job. Do not attach migrations to either application's startup or pre-deploy command.
4. Run `node scripts/migrate-production.mjs` and require successful exit. It checks production purpose/private host/release approval and runs only Prisma `migrate deploy`. Never run reset, `db push`, seed or test suites against production. Failure blocks deployment: inspect migration state privately, without blind retry, rewriting applied history or suppressing failures.
5. Remove approval variables and disable/remove the migration job. Start exactly one worker from the same release; require `/readyz` and verify database and Discord usability. A liveness/listening response is insufficient. Investigate failures without creating additional workers.
6. Deploy the dashboard only after acceptance; require `/api/health`, HTTPS, OAuth and owner/Admin checks. Otherwise leave it stopped and unavailable publicly.
7. Run the approved live acceptance checklist: permissions/hierarchy, enabled commands, persisted timers, transaction/replay/recovery checks and audit. Record results without secrets before enabling more features. Inspect worker health privately through Railway; do not expose it publicly.

Railway health checking is a deployment startup gate, not ongoing uptime monitoring. Configure operational monitoring/alerts during authorized production setup. CI image smoke deliberately uses no Discord credentials and makes no production connectivity claim.

## Recovery

Keep automatic deployment disabled and stop the current worker before starting the prior tested image. First verify compatibility with the current schema: code rollback does not reverse migrations. Prefer a reviewed forward schema fix. Database restoration requires separate owner approval, data-loss review and isolated restore verification. Never reset/seed production or run concurrent versions as a recovery shortcut. Preserve release logs, backup references and migration state without credential values.

## Validation and remaining limits

From the app root run `npm ci`, `npm run build`, `npm run preflight` and `npm run test:postgres`. Tests read only `TEST_DATABASE_URL` from ignored app-root `.env.test.local`; run them only against disposable data. CI creates that file for its disposable PostgreSQL service and removes it afterward. CI needs no production secret and never deploys.

CI builds the image and checks its non-root user, bot/dashboard output, Prisma CLI, release marker and exclusion of local environment files. Every role must refuse startup without credentials while container networking is disabled. Local Docker is absent in this development environment; local TypeScript/build validation cannot establish a passing container build. The first successful CI container run remains a release prerequisite. Live Discord/Railway and backup/restore acceptance also remain pending until authorized and executed.

## Official references

Checked on 2026-09-25: [configuration fields](https://docs.railway.com/config-as-code/reference), [monorepo paths](https://docs.railway.com/deployments/monorepo), [deployment lifecycle](https://docs.railway.com/deployments/reference), [health checks](https://docs.railway.com/deployments/healthchecks) and [restart policy](https://docs.railway.com/deployments/restart-policy). Config files declare the official [Railway schema](https://railway.com/railway.schema.json). Direct automated schema retrieval was unavailable in the preparation environment; validate against the current schema and inspect resolved Railway settings before the authorized release.
