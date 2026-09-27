# Race command authority — 2026-09-27

The owner's Race + Line performance request explicitly restores `/race` alongside `!race`. This newer direct instruction supersedes the previous prefix-only requirement for Race. `!line` remains a prefix command and `/fight @member` remains unchanged.

Both Race invocations use the same coordinator start path, persisted Race engine, main-chat/access-role/feature gates, notification role, event frame, wagers, recovery, and active-session protection. They are not separate games. Both require `ENABLE_EVENTS_SMOKE=true`; `/race` does not require `ENABLE_SPECIAL_SMOKE`.

Normal worker deployment re-registers `/race` from the generated guild command registry. No database migration or new configuration is required for the alias. The current Race production settings apply to both invocations.
