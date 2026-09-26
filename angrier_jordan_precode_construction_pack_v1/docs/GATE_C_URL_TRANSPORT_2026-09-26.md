# Gate C explicit URL and disconnected-player correction

Gate C remains pending audible playback and real live player confirmation. No production deployment, settings change, provider-priority change or new artwork is included.

## Evidence and causes

The local log after `19a318d` showed an idle recovery join, both Discord voice payloads, HTTP 200 and `connected=true`. Later it received a null bot voice state and a voice socket closure. Subsequent selections loaded successfully and reached a player PATCH with `voiceReady=false`, followed by `connected=false`. No new join occurred. TrackStart and source failure/end events did arrive; the system was not waiting for an impossible event ordering.

Two independent defects contributed:

1. Autocomplete passed every input, including a pasted SoundCloud URL, to multi-source text search. It then offered unrelated YouTube URLs. The actual command log shows YouTube identity `912afd680306d31b`, not a SoundCloud identity. Command execution resolved the selected YouTube URL honestly; the SoundCloud URL resolver itself did not convert providers. Autocomplete now preserves a supported canonical URL as the sole explicit choice, including collections, and never sends URL-shaped input to text search. Unsupported, partial, credential-bearing and overlong autocomplete references cannot become unrelated suggestions. Normal command execution still accepts supported longer references directly.
2. Discord's fresh bot voice-state GET can return numeric error 10065 when the bot is absent. That exception previously escaped before departure invalidation, leaving an accepted connection cursor alive. New player writes reused it and omitted a fresh voice payload. The adapter now interprets only 10065 as confirmed absence, records FAILED, retires the node/synchronizer, and clears the accepted cursor. Other REST errors do not fabricate a departure. Fresh checks are serialized after in-flight joins/relocations so a gateway update is not discarded merely because a reconciliation lease was active. Existing policy remains: after an external removal, a newer explicit `/music join` intent is needed; the bot does not automatically fight a removal.

## Presentation and diagnostics

The private command reply is a point-in-time snapshot, distinct from the shared live pinned player. Its copy now explains Refresh and the live pinned post, rather than leaving an apparently live Connecting snapshot unexplained. Active replies use the existing approved compact renderer (440 × 383 for the representative SoundCloud fixture), reducing Discord's height-driven shrinkage. Native 4/3/3 controls and approved artwork/materials remain unchanged. The full renderer remains available explicitly; Queue retains the complete queue workflow.

Existing sanitized traces retain canonical identity hashes/provider and server/channel IDs, never raw URLs, tokens or encoded tracks. Added transport wait traces identify the expected playback-start stage; confirmed departures identify the exact safe failure category. Current source/event/player observation traces distinguish accepted writes, actual events and node connection state. No REST acknowledgement is presented as audible playback.

## Owner retry

With the rebuilt test bot freshly started, use the test voice channel's attached text chat and run `/play https://soundcloud.com/kr3ture/watch-it-grow`. Autocomplete must now offer that SoundCloud reference, and source attribution must remain SoundCloud. Confirm audible playback and the pinned player. The prior YouTube-client audio failure is a separate unresolved provider limitation; a successful SoundCloud test does not approve YouTube acceptance.

## Validation

- Full workspace build and final preflight passed: 294 runtime tests, 426 adapter tests, zero failures/skips.
- Music PostgreSQL acceptance/concurrency passed: 27 tests in isolated disposable schemas, including SoundCloud identity and its durable reconciliation job.
- Regression cases cover supported SoundCloud URL autocomplete/execution, unsafe/partial URL non-search behavior, 10065 departure invalidation and explicit rejoin, other API failures, an in-flight reconciliation/departure race, unchanged native controls and the wider-aspect default player.
- Approved reference locks passed: 38 original files, 144 Gate B images and 48 Music files unchanged. No approved renderer or artwork file was edited. The active delivery surface reuses the approved compact variant.
- Secret scan and diff checks passed. The local test bot was rebuilt and restarted; audible acceptance remains owner-dependent.
