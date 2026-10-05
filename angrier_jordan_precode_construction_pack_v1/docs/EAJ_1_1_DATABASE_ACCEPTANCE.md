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

The required access action is to run these commands in the existing Railway TEST worker/maintenance environment, or a CI runner with outbound TCP access to the configured TEST proxy. No production database, `DATABASE_URL`, deploy, or feature flag is used. A successful run is required before the authorized TEST measurement/shadow-job deployment.

After database acceptance, deploy the measurement and shadow-controller jobs with adaptive application disabled. Record the deployment's first successful 4:00 AM Mountain snapshot as the observation start; the earliest possible adaptive activation is after seven complete, valid daily observations and the subsequent Monday 4:00 AM Mountain policy publication. Local simulations do not shorten that interval.
