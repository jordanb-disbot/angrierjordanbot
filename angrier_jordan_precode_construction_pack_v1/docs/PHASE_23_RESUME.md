# Phase 23 resume point — 2026-09-25

Newest owner authority: MUSIC_SOURCE_CONTRACT.md. Normal playback is multi-source Lavalink; do not reinstate the private-catalog prerequisite. Gate C is pending. Music is disabled in production wiring. Gate A and B references remain frozen.

## Preserve current work

Two parallel agents hit the service usage limit. Their existing files were retained. In particular, `apps/bot/src/discord/music-publication.ts` and `apps/bot/src/music/music-application.ts` are uncommitted composition work, not accepted production integration. Do not replace or discard them. Both typecheck with the current tree; controller publication still needs dedicated tests.

## Next safe sequence

1. Add controller-publication tests for shared DeliveryEngine recovery, pin-only retry, stale/foreign post rejection, replacement after confirmed deletion, relocation during send/edit, permission loss, disabled publication and non-destructive retirement. Ensure a controller refresh failure does not unnecessarily destroy the healthy audio session; use durable refresh retry where needed.
2. Test the application composition, including optional catalog loading, new non-resumed node sessions, fresh provider resolution after restart, shutdown during initialization and node failure. Reconcile reconnects without clearing uncertain write guards on an existing node session.
3. Wire the composition into production startup, shared scheduled job handlers (`music.reconcile`, `music.controller.publish`, `music.controller.cleanup`), interaction/autocomplete routing, health/lifecycle shutdown and environment validation. Keep the default Music flag/environment switch off. Derive DJ access from the shared capability matrix and fresh server roles; preserve confinement/security checks.
4. Finish enabled autoplay/recommendation integration, current listener/voice departure handling and controller refresh pacing. Do not claim these work from domain-only tests. Update help/tutorial/settings/status and deterministic desktop/mobile fixtures together.
5. Run full build/preflight, targeted PostgreSQL and lifecycle/provider/controller integration tests, visual locks and secret scan. Commit/push only verified work without rewriting history.
6. Only after offline integration is complete, provide the owner exact test-node setup instructions from `testing/music-node/` and identify any authorized Spotify/Apple metadata credentials genuinely needed. No production credentials/deployment are authorized. Then complete real voice/provider/restart acceptance and the established Gate C review package.

## Useful boundaries

- `MusicResolutionService`: public canonical metadata, conservative ISRC/title/artist/duration/version matching and explicit ambiguous choices.
- `LavalinkRestClient`: reviewed node/source policy, projected metadata, fresh opaque playable handles, no Spotify/Apple mirror playback.
- `DiscordVoiceHandshake` / `DiscordJsVoiceGateway`: fresh epoch/sequence-bound voice credentials; fail closed after uncertain attempts.
- `MusicPlayerSynchronizer`: accepts desired state under a live fence; acknowledgements never imply audible playback. Queue-only revisions do not replay tracks.
- `MusicRuntime`: one per-server event/reconciliation lane plus shared job lease checks. Telemetry needs correlated TrackStart and does not create reconciliation feedback. Disconnect is observed only after the voice boundary confirms departure.
- Repository event/selection/controller APIs: shared atomic operations, sessions/timers/receipts, stable controller reservation and durable late-send cleanup. Do not use the legacy unfenced `completeIntent` helper from a worker; let the scheduler complete with its lease token.

The current node template is research/configuration, not evidence of successful JVM startup or audible playback. Current Music images are explicitly fixture simulations, not live Discord screenshots or Gate C approval.
