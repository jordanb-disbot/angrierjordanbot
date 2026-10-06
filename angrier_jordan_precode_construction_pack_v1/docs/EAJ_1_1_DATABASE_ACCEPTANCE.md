# EAJ 1.1 database acceptance

Run this only from an environment permitted to reach the disposable Railway TEST PostgreSQL endpoint. It reads only `TEST_DATABASE_URL` from the ignored application-root `.env.test.local`, assigns a randomly generated `aj_economy_test_*` schema, runs `prisma migrate deploy`, and drops that schema in `finally`.

```powershell
npm run test:postgres -- economy
```

Run the full disposable PostgreSQL regression after the focused acceptance passes:

```powershell
npm run test:postgres
```

The focused suite proves: schema migration success; non-destructive migration rerun against existing economy, inventory/tool, ledger, and marriage data; exact-once installment ledger payment; concurrent worker contention; duplicate retry; and restart recovery.

The disposable Railway project `angrier-jordan-test` currently contains only PostgreSQL; it has no worker or maintenance runner. Create or use a one-off **TEST-only** maintenance/CI runner in that project with repository access and private TCP access to its Postgres service. Supply the URL only as `TEST_DATABASE_URL` in the runner's secret environment (or CI secret), create the ignored `.env.test.local` for the command, run the two commands above, then remove the temporary file. No production database, `DATABASE_URL`, deploy, or feature flag is used. A successful run is required before the authorized TEST measurement/shadow-job deployment.

After database acceptance, deploy the measurement and shadow-controller jobs with adaptive application disabled. Record the deployment's first successful 4:00 AM Mountain snapshot as the observation start; the earliest possible adaptive activation is after seven complete, valid daily observations and the subsequent Monday 4:00 AM Mountain policy publication. Local simulations do not shorten that interval.
