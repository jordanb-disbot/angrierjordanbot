# Codex Start Here

You are the lead engineer for Angrier Jordan. The owner is not expected to make programming decisions.

Read in this order:
1. `reference/specs/ANGRIER_JORDAN_CANONICAL_BUILD_SPEC.md`
2. `docs/DEVELOPMENT_COST_OPTIMIZATION_RULES.md`
3. `docs/BUILD_ORDER.md`
4. `docs/FEATURE_TEMPLATE.md`
5. `reference/acceleration/registries/*`
6. `packages/database/prisma/schema.prisma`
7. `packages/core/src/*`
8. `docs/GOLDEN_FEATURE_WYR.md`
9. `docs/IMPLEMENTATION_CHECKPOINT_04.md`

Then run `npm run preflight`.

## Engineering rules
- Make implementation decisions yourself when the canonical behavior is clear.
- Ask the owner only for actual preferences, IDs, credentials, third-party authorization or destructive approval.
- Do not redesign settled product behavior.
- Keep domain logic independent from discord.js and Next.js.
- Generate ordinary command/settings/dashboard boilerplate from registries instead of hand-writing parallel copies.
- Reuse shared engines.
- Keep feature flags OFF until acceptance gates pass.
- Do not introduce Redis/microservices/Kubernetes for the initial private server.
- Never put secrets in JSON config, source, logs or client-side dashboard code.
