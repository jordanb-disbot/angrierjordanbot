# Backup / Restore Contract

- managed PostgreSQL automatic backups enabled
- take a manual snapshot before destructive migrations or major economy changes
- test restore procedure before launch
- production restore requires Throne approval because it may discard newer state
- secrets are restored from hosting secret store, not database backups
- asset/content packs remain versioned outside the database and can be re-imported
