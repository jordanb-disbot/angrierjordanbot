# Race command authority — 2026-09-27

Historical note: current command authority supersedes this document. Race remains `!race`, Line remains `!line`, and Fight remains `/fight @member`; `/race` is retired.

Both Race invocations use the same coordinator start path, persisted Race engine, main-chat/access-role/feature gates, notification role, event frame, wagers, recovery, and active-session protection. They are not separate games. Both require `ENABLE_EVENTS_SMOKE=true`; `/race` does not require `ENABLE_SPECIAL_SMOKE`.

Normal worker deployment re-registers `/race` from the generated guild command registry. No database migration or new configuration is required for the alias. The current Race production settings apply to both invocations.
