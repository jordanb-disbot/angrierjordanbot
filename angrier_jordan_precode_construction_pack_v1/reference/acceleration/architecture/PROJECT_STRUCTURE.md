# Recommended Monorepo

```text
angrier-jordan/
  apps/
    bot/                 # discord.js gateway + commands
    dashboard/           # Next.js mid-level admin dashboard
  packages/
    core/                # shared engines, domain rules, capabilities
    db/                  # Prisma client/migrations
    config/              # schema + ConfigService
    content/             # authored JSON and import validation
    rendering/           # Sharp/SVG renderer shells
    discord-adapter/     # Discord-specific wrappers
    testing/             # fixtures/simulators
  assets/                # production asset pack
  scripts/               # seed, validate, bootstrap, QA
  prisma/schema.prisma
  docker-compose.yml
  .env.example
```

Rules: no business logic in Discord interaction files; handlers call domain services. Dashboard never imports bot process internals; both share packages/core + packages/config + packages/db.
