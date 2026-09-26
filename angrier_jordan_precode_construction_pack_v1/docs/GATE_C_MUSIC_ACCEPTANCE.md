# Gate C — Music acceptance record

**Visual approval: PASSED by owner on 2026-09-26 (f98de3c). Gate C functional/live acceptance: PENDING. Live checks: NOT RUN. Production Music: disabled.**

This document prepares a controlled test and owner review; it does not provision a node, request secrets, enable a feature or authorize deployment. [The source contract](MUSIC_SOURCE_CONTRACT.md) and [approved visual system](APPROVED_VISUAL_SYSTEM.md) remain authoritative. Record the final offline results in [Music readiness](PHASE_23_MUSIC_READINESS.md) before offering the test-node handoff below.

For a migrated disposable database with no test server record, use the [supported minimal server bootstrap commands](SERVER_BOOTSTRAP.md). Bootstrap does not seed demo data or enable Music. The separate test-only ConfigService opt-in command is an explicit owner action; live acceptance remains pending.

## Evidence before the owner handoff

| Evidence | Recorded result |
| --- | --- |
| Tested commit and date | This integration checkpoint based on e6c4d77; 2026-09-25 |
| Build, preflight and wiring checks | PASS |
| Domain/runtime and adapter tests | 285 runtime + 368 adapter passed |
| Targeted PostgreSQL persistence tests | 24 passed |
| Registry/help/tutorial/settings consistency | PASS |
| Frozen visual references and secret scan | PASS; 38 reference files + 144 Gate B images unchanged |
| Offline desktop/mobile review gallery | 23 fixture scenarios / 46 hash-verified images; actual Discord captures NOT RUN |
| Test node startup and audible playback | NOT RUN |

Offline fixtures test the implementation with injected boundaries. They cannot demonstrate that a provider currently serves a recording, Discord carries audible output, an actual pin succeeds, or the host survives a real node restart. Keep those results separate.

## Minimum test-node setup for the owner

Do this only after the integrator reports offline readiness and the owner chooses the controlled test environment. The simplest arrangement is a local test node on the same computer as the development bot. This avoids exposing a new public service. No private audio catalog, Spotify account or Apple account is needed for the initial YouTube/SoundCloud check.

1. Pick the test Discord server and one ordinary voice channel. Have the test operator confirm the bot can view/connect/speak there and can send messages, embed links, attach files, read history and pin messages in its embedded chat. Use an eligible requester, another eligible listener and a DJ for permission checks.
2. Have the operator install Java 17 or newer, download `Lavalink.jar` from the pinned [Lavalink 4.2.2 release](https://github.com/lavalink-devs/Lavalink/releases/tag/4.2.2), and place it in a separate test-node folder. Copy [application.example.yml](../testing/music-node/application.example.yml) into that folder as `application.yml`. The official [standalone instructions](https://lavalink.dev/getting-started/binary) describe this launch method.
3. Have the operator create a private random node password of at least 16 characters and supply it to the node as `LAVALINK_SERVER_PASSWORD`. Use the same value for the development bot's `LAVALINK_PASSWORD`. Store it through a private environment/secret mechanism; do not paste it into chat, screenshots, commands saved in shell history, Git or this record.
4. In the node folder, launch `java -jar Lavalink.jar` and keep that process running for the test. The template binds `127.0.0.1:2333`, uses `youtube-plugin:1.18.2` and SoundCloud, and leaves other sources off. A successful launch still needs the application preflight and playback checks below. If startup fails, record a sanitized error category and stop; do not substitute unreviewed plugins or authentication workarounds.
5. For that same-computer development bot only, have the operator set `NODE_ENV=development`, `LAVALINK_URL=http://127.0.0.1:2333`, and `LAVALINK_ALLOW_INSECURE_HTTP=true`. Leave `MUSIC_SPOTIFY_METADATA=false`, `MUSIC_APPLE_METADATA=false` and `MUSIC_DIRECT_AUDIO=false`. A remote bot cannot reach this localhost node; that requires an explicitly chosen private/TLS setup rather than exposing port 2333 publicly.
6. Have the integrator verify the authenticated node preflight privately: major version 4, exactly `youtube` and `soundcloud` source managers, and exactly `youtube-plugin` version `1.18.2`. Do not print authentication headers or raw provider payloads. The [test-node contract](../testing/music-node/README.md) explains the allowlist and what this check cannot prove.
7. With the owner's controlled-test authorization, the operator temporarily sets `ENABLE_MUSIC_SMOKE=true` and the test server's `music.enabled=true`, then restarts the already configured development bot. Production validation deliberately rejects this switch. Do not change production configuration or obtain production credentials. Test database credentials continue to come only from the ignored root `.env.test.local` key `TEST_DATABASE_URL` under the existing test procedure; this guide does not introduce a new database setup.
8. Join the test voice channel, open its own text chat, run `/play` with a song/artist search, choose a result and listen. Record whether the selected recording is audible and whether the controller moves from pending to confirmed playback. Keep a second known public YouTube/SoundCloud recording available to distinguish a single unavailable recording from a node/voice failure.
9. After the session, turn the test Music switches off and stop the test node if it is no longer needed. Record outstanding jobs/cleanup and any failed case for the next controlled run. Leave production unchanged.

### Spotify and Apple metadata checks

After ordinary playback works, those acceptance rows need the optional pinned `lavasrc-plugin:4.8.3` setup from [testing/music-node](../testing/music-node/README.md). An authorized operator supplies Spotify developer application credentials and/or authorized Apple MusicKit credentials privately, enables only the corresponding node manager and matching bot metadata switch, then creates a fresh node/application session for preflight. Do not enable a metadata flag before its authorized integration is configured.

No browser cookies, scraped web tokens, anonymous token services, remote cipher service, yt-dlp, DRM workaround or opaque Spotify/Apple mirror playback is part of this test. Metadata integration being unavailable is a recorded blocker for those rows, not evidence of success or permission to bypass it. Direct audio stays optional and is a separate opt-in test if the owner wants it.

## Live acceptance matrix

Every row starts **NOT RUN**. Record PASS, FAIL or BLOCKED, the tested commit, timestamp, public test reference where relevant, and a short observation. Never include passwords, encoded tracks, transient stream links, Discord voice tokens or private provider payloads.

| ID | Scenario | Required observable result |
| --- | --- | --- |
| C01 | Text search; YouTube Music, YouTube and SoundCloud links | Choices are usable; the chosen recording plays audibly; queueing another track does not restart current audio. Provider/source labels are truthful. |
| C02 | Spotify track/playlist and Apple track; album/playlist where supported | Requested title/artist/source remain visible; the selected playable provider is separate; no preview or opaque mirror silently substitutes for the chosen recording. Partial collection results are disclosed. |
| C03 | ISRC match, ambiguous candidates, different duration and live/remix/cover versions | Conflicting recordings are rejected or require explicit choice. Ambiguity never silently chooses the first result. Unavailable references produce an honest unavailable state. |
| C04 | Pause/resume, requester/DJ Previous/Replay/Seek, DJ volume | Actual sound and position agree with confirmed state. Unauthorized members cannot bypass authority using a stale button. Unsupported seeking fails honestly. |
| C05 | Skip votes and changing listener membership | Requester/DJ action and eligible-listener majority behave as specified; departed/ineligible members do not supply current voting authority. |
| C06 | Queue remove/move/clear/shuffle/jump, loop and duplicate/batch confirmation | The chosen queue operation applies once to current state; expired or repeated confirmation does not duplicate tracks. Queue-only changes preserve playback. |
| C07 | Personal playlist create/add/view/rename/remove/play/delete | Ownership and revisions hold; another member cannot edit it; already queued copies survive playlist deletion. |
| C08 | Controller send/pin, refresh and permission loss | One authoritative pinned controller remains. Pin failure is retried on the same confirmed post. Refresh failure preserves healthy audio. Restore permission and confirm recovery without duplicate publication. |
| C09 | Deleted controller; uncertain send; move to another voice channel | Positive deletion creates one replacement. Uncertain send is recovered by its marker or remains explicitly uncertain, never blindly resent. Old controls are retired and the old post unpinned. |
| C10 | Node failure, worker restart and reconnect | Queue/requester state survives; a fresh session resolves new playable handles. Old socket events cannot advance the queue; recovery is not reported as already audible. Paused state and seekable position are checked separately. |
| C11 | Bot removal/move and ordinary listener departure | Bot removal quarantines the current process until an explicit join request. A full process restart follows persisted desired playback recovery; record this separately. Listener changes refresh controls/vote eligibility without an invented empty-channel timer. |
| C12 | Autoplay on/off and a concurrent member request | Only deliberate bounded eligible recommendations enter an empty queue. Turning it off, losing authority or a newer member request prevents a late recommendation from overwriting intent. |
| C13 | Two rapid requests, stale controls and lost worker authority | Each accepted operation has one durable result; stale revision/generation/lease work cannot mutate current playback or another server's player. |
| C14 | Disabled gates and shutdown during startup/playback | New work is refused; shutdown removes active timers/listeners and prevents late initialization. Record disabled-job recovery/cleanup behavior explicitly. No production enablement occurs. |

## Gate C presentation package

Use the approved Gate A/B lounge frame, Space Grotesk headings, Inter body, centered readable hierarchy and deterministic packaged art. Do not modify the immutable references. Native Discord buttons/selects/modals retain native limitations; test their labels and ordering alongside the raster attachment.

Prepare paired desktop/mobile evidence for empty, pending, playing, paused, recovering and unavailable states; long track/artist/album/channel names; artwork fallback; requested Spotify/Apple identity versus actual audio provider; queue/history/playlist views; candidate selection; duplicate/batch confirmation; permission/unavailable notices; and retired controller controls. Confirm the actual requester name and voice-channel label, progress/duration, volume/loop/autoplay labels and clear button text. A placeholder portrait/name in an engineering fixture is not proof of the final member presentation.

The [foundation gallery](../review-phase-23-foundation/index.html) contains 23 scenarios / 46 images and is explicitly simulated; live captures remain outstanding. Label all additional deterministic fixtures as simulations. Label actual Discord captures separately with test date/client size and link them to the matrix rows; a screenshot of a playing label is not proof of audible output. Preserve public message links or sanitized observation notes where useful.

## Owner decision

Music presentation is owner-approved. Gate C remains pending until functional/live acceptance evidence is complete and reviewed. Capture the decision against a specific commit/gallery manifest, with any accepted limitations and remaining failures. Do not claim Gate C approval from a successful build or a fixture gallery. Production release authorization remains separate even after approval.

| Decision field | Value |
| --- | --- |
| Owner visual decision/date | APPROVED — 2026-09-26 |
| Reviewed commit/gallery manifest | f98de3c; docs/approved_visuals/music-2026-09-26.json |
| Live matrix record | NOT RUN |
| Accepted presentation / required follow-up | Current native controls, stacking and truncation approved; live rows C01–C14 outstanding |
| Production deployment authorization | NOT PROVIDED |

Music presentation revision 01 uses the reference-inspired modular AJ layout; see [visual review notes](MUSIC_VISUAL_REVISION_01.md). This revision does not approve Gate C or change playback behavior.

The next action is described in [Gate C remaining work and first action](GATE_C_NEXT_ACTION.md). The live evidence ledger is [music-live-acceptance.json](../testing/music-node/music-live-acceptance.json); it begins with no claimed live passes.
