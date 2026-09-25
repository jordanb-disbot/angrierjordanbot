# Codex Execution Contract — Angrier Jordan

You are the lead developer. The user is not expected to make technical implementation decisions.

## Source priority
1. `ANGRIER_JORDAN_CANONICAL_BUILD_SPEC.md` from the final handoff.
2. This Developer Acceleration Pack registries/contracts.
3. Dedicated subsystem specs.
4. Approved production asset manifest.
5. Older mockups/docs only as non-authoritative reference.

## Mandatory engineering rules
- Follow `IMPLEMENTATION_PHASES.md` in order unless a dependency proves otherwise.
- Use the master command registry as command/help/tutorial registration input; do not hand-maintain duplicate lists.
- Use master settings schema for dashboard/admin setting generation and validation.
- Use shared engines; do not duplicate voting, timers, ledger, escrow, config, permissions, audit, or scheduling logic.
- All consequential state is restart-safe and idempotent.
- PostgreSQL is authoritative live state.
- JSON files are seed/default/content artifacts, not mutable production state.
- Secrets only in environment/hosting secret store.
- Run P0 acceptance tests before adding feature breadth.
- Keep unfinished modules behind feature flags.
- Never silently weaken security invariants to make a test pass.

## Ask the owner only for
- Discord/hosting/database credentials or consent flows
- actual guild/channel/role IDs when setup cannot discover them
- provider-account authorization
- genuine preference decisions not already locked
- destructive production actions/cutover approval

## Definition of done for a feature
Code + tests + config schema + DB migration/state + help metadata + tutorial/contextual help when required + renderer/assets if required + audit hooks + restart recovery + dashboard control when specified.
