# Minimal server bootstrap

The shared `PrismaServerBootstrapRepository.ensure` establishes the server prerequisite without running the development seed. It creates one `Guild` row and one `server.bootstrap.created` audit event in the same transaction. No members, balances, roles, content, configuration rows, or feature state are created. Existing records, including the server name, remain unchanged. Settings continue to resolve registry defaults through `ConfigService`; bootstrap does not enable features or change existing enablement.

PostgreSQL's unique server primary key and `createMany(skipDuplicates)` arbitrate concurrent callers across processes. READ COMMITTED allows the subsequent read to see the committed winner. Only the inserting transaction writes the audit. Audit failure rolls back creation; interruption before commit can be retried, and interruption after commit is a no-op on retry. Existing migrations already define both tables, so no new migration is required. Apply normal forward migrations before startup.

## Production triggers

Startup awaits a census of connected servers before feature initialization, recovery and scheduled workers. `GuildCreate` covers later arrivals. Server-bearing gateway events await the same prerequisite before their handlers, covering an event that races startup or server creation. In-process coalescing reduces duplicate calls; database constraints remain the cross-process authority. Failures are not cached and do not admit the dependent handler. Configuration reads themselves remain read-only: reading an arbitrary ID must not create a server.

## Owner's disposable test commands

Run from the project directory, after the normal build. The script reads `NODE_ENV=development` and `DISCORD_GUILD_ID` only from `.env.music.local`, and `TEST_DATABASE_URL` only from `.env.test.local`. It does not load either file into the process environment. It refuses any endpoint/database other than the established disposable Railway target, alternative schemas, or unsupported connection parameters. It never falls back to `DATABASE_URL` and never displays credentials. These commands do not connect to Discord, start playback, or deploy.

```powershell
node scripts/test-server.mjs bootstrap
node scripts/test-server.mjs status
node scripts/test-server.mjs enable-music
node scripts/test-server.mjs music-status
```

`bootstrap` creates only the server/audit or reports it already exists. `status` is read-only and reports server existence plus the current Music value/version. The separate, explicit `enable-music` command requires an existing server and changes only `music.enabled` using the versioned, audited `ConfigService` path. Repeating it when already enabled performs no write. `music-status` is read-only. No command seeds data or applies migrations. A failed version check should be investigated/read again rather than overwritten. Operator execution is a trusted local maintenance action, not an unauthenticated dashboard route.

Production deployment, Music enablement in production, and live Gate C acceptance remain unauthorized by this bootstrap fix. The owner executes the test commands separately; development tests use isolated disposable schemas and do not initialize the owner's server or enable its Music setting.

## Validation — 2026-09-26

- Full workspace build passed; 288 runtime tests and 383 adapter tests passed.
- 39 PostgreSQL tests passed across bootstrap, dashboard configuration and Music, using isolated schemas. Bootstrap coverage includes eight concurrent attempts across clients, retry from a new client, exact preservation of existing settings/member/balance/role state, atomic rollback after an audit failure, and all-table counts proving no unrelated writes.
- The supported CLI bootstrap, read-only status and separate ConfigService Music opt-in were exercised against an isolated fixture server. A read-only check against the owner's selected test server still reported `SERVER_NOT_INITIALIZED`; owner bootstrap/enablement were not performed.
- Approved visual references are unchanged. Gate C functional/live acceptance remains pending.
