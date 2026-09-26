# Gate C live search failure — 2026-09-26

Gate C remains pending. No audible-playback or Discord controller success is claimed by these transport/search checks. Approved presentation files are unchanged.

## Findings and correction

The local Lavalink 4.2.2 node loaded youtube-plugin 1.18.2 correctly but advertised `soundcloud, bandcamp, twitch, vimeo, youtube, http`. AJ's reviewed multi-source policy expects exactly `youtube, soundcloud` unless optional sources are explicitly enabled. HTTP authentication and WebSocket readiness do not run this source/plugin preflight; the first lookup does. Therefore a healthy-looking node session could still fail every search with `LAVALINK_NODE_POLICY`. The resolver caught that failure while trying each fallback, hiding the configuration cause.

Only the local test node's source-manager flags were aligned with the existing `testing/music-node/application.example.yml`: unused Bandcamp/Twitch/Vimeo/Nico/HTTP/local managers disabled; built-in YouTube stays disabled, plugin YouTube and SoundCloud stay enabled. Credentials and plugin version were preserved. No runtime allowlist was relaxed. The verified test Java process was restarted, with private local stdout/stderr logs. Before that restart this node had no file logs available for inspection; the original interaction exception cannot be reconstructed conclusively from historical logs.

Two objective autocomplete defects were corrected: the deadline now starts before fresh authorization/context reads and lazy provider startup, and valid earlier search choices survive a later provider timeout. Explicit cancellation still fails; failed/empty providers still fall back. Response dispatch is bounded at 2250 ms (subject to event-loop scheduling), with no retry or late response. Authorization remains fresh and required. Node startup may finish in the background after the interaction cutoff, but cannot send a late autocomplete reply.

Sanitized operator diagnostics now distinguish reviewed node-policy, transport/provider, known Discord and persistence failure categories. Arbitrary error messages/codes, tokens, URLs, encoded tracks and payloads are never logged. Discord Unknown Voice State is mapped to the existing join-the-voice-channel guidance instead of a generic exception. The server owner's voice-state REST lookup returned 404 during investigation; this does not establish where they were during the original attempt.

## Integration trace and live evidence

| Check | Result |
| --- | --- |
| v4 WebSocket/session | Actual `LavalinkConnection` established/authenticated, configured a fresh non-resumed session and remained ready after searches plus 3 seconds. The preexisting test bot also reconnected after node restart. |
| Autocomplete/provider path | Production injects the real `MusicResolutionService`, whose provider calls `MusicApplication.start()` then `LavalinkRestClient.search`. No mock/catalog-only path is selected for normal configured Music. |
| Identifiers | `ytmsearch:`, then `ytsearch:`, then `scsearch:`. The pinned plugin [documents both YouTube prefixes](https://github.com/lavalink-devs/youtube-source/tree/1.18.2#plugin). |
| Node clients/search | Existing plugin configuration had search enabled and no explicit client override; all three actual prefix requests returned search results. No plugin client/token bypass changes were made. |
| Response parsing | Actual AJ client parsed 20 YouTube Music, 20 YouTube and 10 SoundCloud results, approximately 765/483/1723 ms respectively on the measured run. |
| Resolver | Actual composed service returned 25 choices for `Daft Punk Get Lucky` within a 2200 ms search budget. |
| Selected recording | `loadPlayableTrack` returned a fresh opaque track handle. This is metadata/track loading, not proof that a provider stream or Discord audio succeeds. |
| Fallback | Ordered empty/error fallback preserved; regression tests cover initial failure, empty results, timeout with prior choices and explicit cancellation. |
| Shared configuration | Autocomplete and final `/play` use the same injected service/node policy. Final execution still performs fresh recording resolution and shared persisted session/intent work. |
| Build | Existing compiled integration contained the real provider wiring and strict policy. Revised source compiled successfully; full preflight passed with 293 runtime and 397 adapter tests. |
| Persistence regression | All 24 Music PostgreSQL tests passed in an isolated disposable schema. No production data was used. |
| Revised-build live probe | 25 choices in 914 ms; selected track handle loaded successfully through the rebuilt adapter. Audio remains untested. |
| Test bot restart | Verified prior local test bot stopped to release the Windows Prisma DLL, then restarted from the revised build using existing ignored test settings and the guarded disposable database URL. Online log confirmed; readiness HTTP 200; no startup/node diagnostic failures. |

## Owner acceptance still required

In the test voice channel's embedded text chat, run `/play` with a normal song/artist query, select the intended result and listen. Verify the bot joins, audible playback starts, and the real pinned player appears. Search/loading evidence alone does not pass these rows. Production remains disabled; no production deployment or gate approval occurred.
