# Phase 23 resume point — Music integration and Gate C

Newest owner authority: [MUSIC_SOURCE_CONTRACT.md](MUSIC_SOURCE_CONTRACT.md). Normal playback is multi-source Lavalink; direct audio is optional. Gate C remains pending. Music stays disabled by default, and the runtime environment guard rejects production Music enablement while this gate is pending. Gate A/B visual references remain frozen.

## Preserve the integrated work

Continue the existing `music-application.ts` and `music-publication.ts`; their earlier interrupted drafts have been extended in place. Dedicated application and publication tests now exist. Startup/job/interaction/voice-event/shutdown wiring is present behind the opt-in development switch. Do not restore stale notes claiming that these adapters are wholly absent, or infer that their presence proves live playback.

See [PHASE_23_MUSIC_READINESS.md](PHASE_23_MUSIC_READINESS.md) for the implementation inventory and final validation record. Final offline results: full build/preflight PASS, 277 runtime tests, 366 adapter tests, 24 PostgreSQL tests, 34 fixture images, approved visual locks and secret scan PASS. This checkpoint extends e6c4d77; use its containing Git commit for live acceptance.

## Next safe sequence

1. Offline integration is complete. Preserve the tested adapters, conflict-safe refresh coalescing, five-second disable watchdog, fresh-session recovery and frozen visual references.
2. Provide the owner the bounded test-node setup in [GATE_C_MUSIC_ACCEPTANCE.md](GATE_C_MUSIC_ACCEPTANCE.md). No Java/Docker executable was available during this checkpoint and no live node was launched. No private catalog is required. Authorized Spotify/Apple metadata credentials are needed only for those cases.
3. After the owner supplies the test node and controlled Discord test access, run and record real provider, voice, permissions, controller, concurrency and restart checks. Keep failed/unavailable cases explicit. Extend the 34-image fixture gallery with actual desktop/mobile captures and audible-playback observations.
4. Present the evidence at Gate C and stop for the owner decision. Gate C and production release authorization are separate; neither has been granted. Do not continue Phase 24 across this gate.

## Boundaries to retain

- `MusicResolutionService`: canonical public metadata, conservative recording matching, explicit choices, bounded recommendations and honest unavailable results.
- `LavalinkRestClient`: reviewed source/plugin policy, projected metadata, fresh opaque playable handles; never Spotify/Apple mirror playback.
- `DiscordVoiceHandshake` / `DiscordJsVoiceGateway`: fresh epoch/sequence-bound credentials and fail-closed uncertain attempts.
- `MusicPlayerSynchronizer`: fenced desired-state effects. Queue/telemetry changes do not replay audio; acknowledgements are not playback evidence.
- `MusicRuntime`: current shared job lease for writes, correlated TrackStart for telemetry, stale-socket/generation rejection and confirmed voice departure for disconnect observation.
- `MusicApplication`: fresh non-resumed node sessions, retry/backoff, lifecycle shutdown, explicit bot-departure recovery and presentation retry independent of audio.
- `DiscordMusicPublication`: shared delivery recovery, stable marker, author/channel/pointer checks, same-message pin retry, CAS replacement and non-destructive retirement.
- Repository workflows: shared atomic operations, sessions, timers, receipts, revision/generation fencing, authoritative controller reservation and durable cleanup/refresh intents.

Do not inspect or print secret files for documentation work. Test database access remains restricted to the ignored project-root `.env.test.local` value `TEST_DATABASE_URL`; never select a production database for acceptance. The disposable Railway project `upbeat-kindness` is test-only.
