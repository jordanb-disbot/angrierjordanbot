# Bootstrap / Setup Wizard

`/setup` is owner-only and resumable.

1. Verify bot role position and required Discord permissions.
2. Resolve/map Throne, Chaise Lounge, Recliner and Jailed roles by ID.
3. Resolve/map canonical channels including `🔥-hotseat`.
4. Create missing bot-managed role/panels only after explicit owner confirmation.
5. Validate channel overwrite health for introductions, Hotseat, logs and game channels.
6. Seed default config into PostgreSQL without overwriting existing live config.
7. Post/pin persistent panels/controllers where applicable.
8. Run command registration health check.
9. Run scheduled-job health check.
10. Produce a setup report with PASS/WARN/FAIL and exact remediation.

Setup must be safely rerunnable. Each operation gets an idempotency key.
