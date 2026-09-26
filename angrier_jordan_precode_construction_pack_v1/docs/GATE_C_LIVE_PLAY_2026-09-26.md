# Gate C selected-track execution failure — 2026-09-26

Gate C remains pending until actual Discord voice join and audible playback are confirmed. Search is passing and its resolver behavior is unchanged by this correction. Approved visuals and production settings are untouched.

## Confirmed root cause

The generated `/play` registration exposes a required autocomplete string option named `query`. The coordinator incorrectly read `query_or_link`. Autocomplete independently reads the focused string, so it succeeded. On Enter, the real discord.js option resolver threw `CommandInteractionOptionNotFound`, a TypeError, before resolution or persistence; the safe generic unavailable card was therefore correct about no playback. Earlier fixtures supplied the same incorrect option name and masked the integration mismatch.

Evidence: two sanitized `MUSIC_TYPE_ERROR` interaction failures in the running test bot log; actual generated registration has `query`; the disposable test server had zero MusicSession and zero music.resolution rows. No queued playback job or voice join could originate from those failed selections. The correction reads `query`; command registration and the working search path do not change.

The regression constructs `CommandInteractionOptionResolver` using the generated command definition and a realistic selected public reference. It proves the old read throws and the real registered value reaches the actual resolution service and queue boundary intact. PostgreSQL coverage separately exercises a fresh single selected recording through the real resolution service and repository, with one persisted job/session and idempotent retry.

## Voice-path audit

- Member voice context uses fresh channel, member and voice-state reads, then current access rules. Voice IDs are not inferred from a generic text channel. The canonical Music contract explicitly requires the voice channel's attached text chat; that requirement is preserved, not expanded or redesigned.
- The GuildVoiceStates gateway intent and raw voice-state/server-event bridge are installed in the production composition. Ordered gateway epochs, sequence checks, current persisted fences, deadlines and fresh Lavalink sessions remain authoritative.
- Discord voice session credentials and Lavalink session routing remain separate. Credentials are passed directly to the player update and never persisted in public metadata or diagnostic output.
- A fresh channel-specific bot permission check now requires ViewChannel, Connect and Speak immediately before joining. Abort, gateway epoch and persisted authority are checked again after asynchronous reads. Disconnect remains available without these join permissions.
- Read-only live permission inspection found all five current test voice channels grant the bot ViewChannel, Connect and Speak after applying role/member/channel overwrites. Permissions were not the confirmed cause of this failure and were not changed.

## Sanitized traces

Fixed trace stages cover interaction/context, detected server/voice channel, selection receipt (reference/text only), resolution, durable enqueue, worker start/failure, node-session readiness, join start/success/failure, validated bot voice-state/server-event receipt, track handoff, player update acknowledgement/failure and correlated playback start.

Only validated public server/channel IDs and allowlisted failure categories are projected. Track identifiers, member input, encoded tracks, tokens, passwords, session IDs, voice endpoints, database URLs, raw exceptions and provider payloads are excluded. `player.update.success` is only an acknowledgement; `playback.started` requires a current correlated TrackStart accepted by persistence and still does not substitute for human audible acceptance.

## Validation and retry

- Full workspace build and preflight: PASS.
- Runtime tests: 293 passed; adapter tests: 410 passed; Music PostgreSQL tests: 25 passed, zero failures/skips. PostgreSQL tests used isolated disposable schemas, not the live acceptance server's schema.
- Regression coverage includes real registered option parsing, selected-reference persistence/idempotency, channel overwrites, permission denial, abort/epoch changes during permission reads, persistent authority recheck, and rejection of voice events received before the final outbound join barrier.
- Approved reference locks: 38 Gate A files, 144 Gate B images and 48 Music files unchanged. Secret scan and Git diff whitespace check passed.
- Rebuilt local acceptance bot restarted successfully; readiness HTTP 200 and sanitized `node.session.ready` confirmed. No voice join or audible playback is claimed by these startup checks.

Owner retry: while connected to the test voice channel, use its attached text chat to run `/play Daft Punk Get Lucky`, select the intended autocomplete recording, and submit. Confirm whether AJ joins and audio is audible. Gate C remains pending that live result; production Music remains disabled and no production deployment was performed.
