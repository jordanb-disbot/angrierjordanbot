# Music source contract — owner update, 2026-09-25

This direct owner decision supersedes the earlier catalog-as-primary requirement in MUSIC_CATALOG_SETUP.md and Phase 23 notes. Music remains disabled pending integration and Gate C. A missing private direct-audio catalog is not a blocker for ordinary playback.

## Approved architecture

Music domain → provider-neutral search/resolution service → provider adapters → Lavalink v4 → Discord voice adapter. Use the maintained lavalink-devs YouTube source plugin, not Lavalink's deprecated built-in YouTube source. Enable supported SoundCloud playback. Evaluate LavaSrc for Spotify and Apple Music metadata, albums and playlists. Direct HTTP audio remains an optional, explicitly authorized source with SSRF protections.

Plain text search orders YouTube Music, YouTube, then SoundCloud and presents choices. Spotify and Apple Music retain the requested recording identity while separately recording public playback-source provenance. Resolve ISRC first, then title/artist, in the same playable-source order. Score identity, duration, album and version indicators; reject conflicting ISRCs and covers/karaoke/remix/live/instrumental/speed variants unless requested. Low-confidence matches require member selection. Never silently accept the first result.

Persist canonical metadata and stable references, not temporary stream URLs or encoded provider capabilities. Restart recovers queue/session state and resolves new playable capabilities. Preserve the pinned controller, permissions, requester/DJ Previous/Replay/Seek policy, queue controls, repeat, shuffle, approved volume and explicit source attribution.

Use maintained documented integrations. Do not implement custom scraping, stream ripping, DRM/authentication/ad bypass, credential harvesting or protection workarounds. Provider unavailability must produce an honest unavailable state or an explicit safe fallback, not a bypass.

## Research and acceptance

Official sources: [YouTube source](https://github.com/lavalink-devs/youtube-source), [LavaSrc](https://github.com/topi314/LavaSrc), [Lavalink configuration](https://lavalink.dev/configuration/config/file). Pin reviewed released versions in deployment configuration; do not copy stale syntax or enable unrelated providers/plugins.

LavaSrc mirroring alone does not demonstrate the owner's conservative matching requirements. The application must inspect candidate metadata before handing a chosen playable-source track to transport; do not hand an opaque Spotify/Apple mirror track to playback and assume its internal choice met those requirements.

Ordinary tests mock providers. Acceptance coverage must include text search, YouTube/YouTube Music/SoundCloud links, Spotify track/playlist and Apple track resolution, fallback, ISRC, ambiguity, duration mismatch, unavailable recordings, restart re-resolution and node disconnect/reconnect. Complete offline implementation first, then provide exact owner instructions for the minimum test node and any genuinely required authorized metadata credentials. No production deployment is authorized by this contract.
