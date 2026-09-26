# Gate C recording selection and source playback investigation

Gate C remains pending audible playback and real player confirmation. Production Music remains disabled. No production configuration or deployment is part of this correction.

## Two independent failures

The running `2f98394` build logged two complete paths through selection, durable queue, successful voice handshake, track handoff, accepted Lavalink player update and correlated TrackStart. Those starts were followed by source failures, not audible acceptance. The node log reports `AllClientsFailedException` for both attempted recordings: ANDROID_VR required login; WEB had no supported audio streams; WEB_EMBEDDED_PLAYER reported unavailable. This shared provider failure explains silence across multiple songs. DAVE native initialization succeeded. There is no evidence that missing Discord voice credentials or the player PATCH caused these two failures.

Later plain-text searches opened the private recording selector. Its persisted choices failed `exactFresh()` before enqueue: the same YouTube video ID returned `Daft Punk` in search and `Daft Punk - Topic` on direct load. The same difference occurred for ZENO; some durations differed by one second. One candidate also changed its version label to Remastered and must still be rejected. These failures are distinct from the earlier audio-source failures.

Autocomplete carries a normalized public recording URL, not an encoded track or expiring search handle. Private search choices carry owner-bound persisted metadata. Execution re-resolves the chosen URL. Playback loads a new opaque, process-local Lavalink encoded handle; the handle is neither persisted nor reused across restarts.

## Corrections

- Same-recording comparison requires the same provider and canonical reference. YouTube-only normalization tolerates case/formatting, the Topic artist suffix and at most one second of duration rounding. Different titles, artists, version indicators, conflicting known ISRC/explicit/album values and materially changed durations still fail. Non-YouTube persisted metadata comparison remains exact. Request fingerprints and concurrency receipts remain unchanged.
- The same YouTube guard runs again before issuing a freshly loaded playback handle. No cross-provider substitution or provider-priority change was introduced.
- Sanitized traces expose hashed canonical identity/provider, choice shape, fresh load result, track handoff, player HTTP status, player presence/connectivity, accepted start/exception/end events and diagnostic-only stuck/voice-socket-close events. Raw tokens, encoded tracks, URLs, session secrets, exception payloads and provider responses are excluded.
- The recording chooser shows two preview rows to reduce Discord's height-driven thumbnail shrinkage. All native selector choices remain available and the displayed total explains the preview limit.
- Player controls are grouped as transport (Previous/Pause-or-Resume/Skip/Stop), queue behavior (Queue/Shuffle/Loop), and settings/refresh (Volume/Autoplay/Refresh). Discord owns native button widths, colors and placement; clickable buttons cannot be embedded inside the raster frame. Approved art/renderers and immutable reference files are unchanged.

## Remaining live requirement

The maintained plugin's documented default clients are already installed. No cookies, login bypass, remote cipher service, stream extraction or automatic alternate recording was added to evade the provider failures. The plugin's [versioned documentation](https://github.com/lavalink-devs/youtube-source/blob/1.18.2/README.md) distinguishes search-only MUSIC from playback-capable clients; successful search/load metadata is not proof of available audio.

For an explicit alternate-source transport test, the existing SoundCloud source resolves KR3TURE's `https://soundcloud.com/kr3ture/watch-it-grow` directly. An owner can select that exact URL intentionally; it is not silently substituted for a YouTube selection. A successful SoundCloud test will not approve or repair YouTube playback. YouTube live acceptance remains blocked by the node/provider failures until a supported, authorized playback configuration works.

## Validation

- Full build and preflight passed: 294 runtime tests, 420 adapter tests, zero failures/skips.
- Music PostgreSQL acceptance/concurrency: 26 tests passed in isolated disposable schemas; no acceptance server data was reset or migrated by this fix.
- Read-only comparisons using the actual persisted search choices accepted three harmless label/rounding variations and rejected the remastered-version mismatch.
- The explicit SoundCloud test reference resolved and produced a fresh opaque playback handle. This establishes load readiness only, not audible playback.
- Approved visual locks passed unchanged: 38 original references, 144 Gate B images and 48 Music files. Native delivery composition changed only as requested by the owner; the approved art/renderers remain untouched.
- Secret scan and diff checks passed. The rebuilt local test bot restarted with readiness HTTP 200 and a ready Lavalink session. Owner live playback remains unverified.
