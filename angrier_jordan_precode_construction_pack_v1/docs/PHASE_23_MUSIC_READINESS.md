# Phase 23 Music readiness — Gate C pending

The current checkpoint adds offline Music integration. It does not establish live playback acceptance or authorize production deployment. [MUSIC_SOURCE_CONTRACT.md](MUSIC_SOURCE_CONTRACT.md) is the newest owner authority: normal playback uses Lavalink v4 with maintained YouTube support and SoundCloud; direct audio is optional. A private catalog is not a prerequisite.

## Implementation present

- Provider-neutral search checks YouTube Music, YouTube, then SoundCloud. Public provider references and artwork are normalized. Spotify/Apple references are metadata only; matching considers ISRC, title, artist, duration and version, with explicit selection for ambiguous candidates. Requested identity and selected audio-source provenance remain separate.
- The REST client verifies reviewed source managers and pinned plugins, projects bounded metadata and creates opaque playback handles only for freshly loaded selected recordings or opted-in catalog entries. Credentials, encoded tracks and temporary audio URLs are not public metadata.
- Discord voice collection and gateway projection use current identity, channel, epoch and revision/generation checks. Acknowledged transport writes and connected telemetry do not by themselves mean the track played. Correlated TrackStart and subsequent observations drive recorded playback.
- The synchronizer preserves the current recording for queue-only revisions. The runtime uses shared job leases and per-server event ordering. A new node session resolves fresh playback capabilities; uncertain writes are not reset on the same client.
- Durable selection/confirmation sessions, queue/requester identity, playlist ownership/revisions and history are implemented through shared persistence. Previous, Replay and Seek require the current requester or DJ; other eligible listeners vote to skip. DJ access uses the shared capability matrix and configured DJ role with fresh interaction membership checks.
- Controller publication uses the shared DeliveryEngine, a stable publication marker, authoritative message pointers, pin retries, positive-deletion replacement and durable relocation cleanup. Retirement removes controls and unpins while preserving the post. Refresh jobs are coalesced in five-second buckets; presentation retry is separated from audio recovery.
- Application composition includes optional on-demand catalog loading, fresh node sessions, reconnect backoff, shutdown guards, conservative same-artist autoplay candidates and listener/bot departure handling. Unexpected bot removal quarantines the current process until an explicit join request; process restart still recovers persisted desired playback and queue. No unapproved empty-channel idle timer is introduced.
- Worker startup, autocomplete/interaction routes, voice-state events, shared scheduled job handlers and lifecycle shutdown are wired. These paths remain opt-in for controlled development acceptance.

Combined offline validation passed on 2026-09-25. Live voice/provider acceptance remains unverified.

## Disabled defaults and boundaries

`ENABLE_MUSIC_SMOKE=false` and the server setting `music.enabled=false` remain the default. Runtime environment validation rejects the Music smoke switch when `NODE_ENV=production` while Gate C is pending. Spotify metadata, Apple metadata and direct audio each have separate false-by-default environment switches. No node, provider account, credential or production resource was provisioned by this checkpoint.

With the development composition loaded, publication may reconcile existing SENDING/SENT receipts while disabled and retire obsolete controllers. It cannot send new disabled posts. A five-second enabled-state watchdog retires active audio on disablement or configuration-read failure; reenabling uses a fresh session. With the environment switch off, no Music composition is loaded and durable jobs remain pending.

Offline tests use injected provider, Discord and transport boundaries. PostgreSQL tests establish persistence behavior; they do not establish audible output. The [test-node template](../testing/music-node/README.md) records reviewed versions and operator constraints, not proof of successful node startup, current provider availability or Discord playback.

## Validation record

| Check | Final checkpoint result |
| --- | --- |
| Commit under review | This Phase 23 integration checkpoint, based on e6c4d77 |
| Full build and preflight | PASS (workspace/dashboard build; final preflight) |
| Runtime/domain tests | 285 passed |
| Adapter/composition/publication tests | 368 passed, including 15 application and 17 publication cases |
| Targeted PostgreSQL tests | 24 passed on disposable TEST_DATABASE_URL; migrations applied to isolated schema |
| Registration/help/settings/wiring checks | PASS; 256 settings generated, optional music.dj_role added |
| Approved visual locks and secret scan | PASS; 38 immutable references + 144 approved Gate B images unchanged; no detected secret/local paths |
| Real node/provider/Discord voice acceptance | NOT RUN |
| Owner Gate C review | Visuals APPROVED; functional/live acceptance PENDING |

## Remaining acceptance work

Follow [GATE_C_MUSIC_ACCEPTANCE.md](GATE_C_MUSIC_ACCEPTANCE.md) for the controlled test-node handoff, live scenarios and evidence record. Offline validation is complete; the next dependency is the controlled test node and live Discord participation. Optional metadata credentials are needed only for the Spotify/Apple part of the acceptance matrix; ordinary YouTube/SoundCloud tests do not require a catalog or those credentials.

The current [foundation gallery](../review-phase-23-foundation/index.html) contains 23 fictional scenarios / 46 desktop/mobile images, including source attribution, private choices/confirmations, queue/history/playlists and notices. It is not a live Discord capture or the complete Gate C package. The final package must include desktop/mobile controller states, requested/playback source attribution, selection/confirmation/error flows and the live evidence listed in the acceptance document. Preserve [the approved visual system](APPROVED_VISUAL_SYSTEM.md), Space Grotesk/Inter, the immutable Gate A/B references and deterministic runtime rendering. No redesign or runtime AI artwork is authorized.

Music presentation revision 01 uses the reference-inspired modular AJ layout; see [visual review notes](MUSIC_VISUAL_REVISION_01.md). This revision does not approve Gate C or change playback behavior.

## Owner Music visual approval — 2026-09-26

Music visuals at `f98de3c` are APPROVED and hash-locked in `docs/approved_visuals/music-2026-09-26.json`. Gate C is now waiting only on remaining functional/live acceptance; do not redesign Music or repeat visual approval absent an objective live usability defect. Offline integration and mocks are complete. Follow [the next action plan](GATE_C_NEXT_ACTION.md); production remains disabled.
