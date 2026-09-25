# Server Bootstrap / Setup Wizard

Goal: one guided owner flow takes a new deployment from zero to healthy.

## `/setup` or Dashboard Setup
1. Verify invoking user is Throne/guild owner.
2. Verify bot permissions/intents and role hierarchy.
3. Map core channels: main, bot, games, counting, last-letter, staff log, Chairisms, introductions, Hotseat.
4. Map human roles: Throne, Chaise Lounge, Recliner.
5. Create or map managed `Jailed` role.
6. Validate that `Jailed` can only see/send in `🔥-hotseat` plus minimum required system access; verify it cannot speak/connect elsewhere.
7. Validate bot role is above managed roles it must change.
8. Install/pin persistent panels: introductions, self roles, optional help/tutorial entry, music controller only when session starts.
9. Seed default configuration and authored content.
10. Register slash commands from Master Command Registry.
11. Run database migrations and seed catalog/recipes/achievements.
12. Run permission health check and present PASS/WARN/FAIL list.
13. Run dry-run scheduler reconciliation.
14. Offer YAGPDB migration checklist for current role/race/line commands.
15. Mark setup complete only when P0 health checks pass.

## Health command
`/setup health` re-runs non-destructive checks after channel/role changes.

## Never automate without confirmation
- deleting old bot roles/messages
- removing YAGPDB
- changing channel permission overwrites beyond Angrier Jordan-managed resources
- bulk role removal
