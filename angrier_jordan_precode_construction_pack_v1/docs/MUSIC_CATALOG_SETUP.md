# Authorized Music catalog setup (development preparation)

**Superseded as the primary playback requirement:** see MUSIC_SOURCE_CONTRACT.md. This document now describes optional owner-supplied direct audio only. Ordinary playback must not require this catalog.

Owner decision: direct audio supplied by the owner is the playable source. Lavalink supplies transport only. External music services may provide permitted metadata links; they do not become audio sources automatically. No commercial account or subscription is selected.

The empty tracked example is docs/examples/music-catalog.example.json. Real catalog entries belong only in the ignored project-root .music.catalog.local.json. Never commit that file, paste signed URIs into chat or put them in public metadata. No real catalog has been created by this implementation.

Document shape: schemaVersion=1; tracks is an array. Each entry requires id, title, artist, durationMs, authorizedAudioUri, format, provenance {kind, reference}, enabled, availability. Optional fields: album, artworkUrl, externalMetadataLinks and seekable. Supported declared formats: mp3, ogg, opus, aac, m4a, flac, wav; actual decoding still depends on the configured transport and must be accepted live. Provenance kinds: owner-supplied, licensed, permission-granted, public-domain. Availability values: available, unavailable.

Use a stable catalog ID for a specific recording. External metadata links match recording IDs exactly. Search presents choices; it must not silently choose a different recording. Signed URI queries stay in the private catalog; credentials in URL username/password fields are unsupported. Public search, queue state, controller messages, audits and errors must contain no playable URI or private provenance reference.

Lavalink node setup is an external development-infrastructure step, not production deployment authorization. Its endpoint, password and active session are private transport configuration. Production Discord secrets are not requested here. Before live playback, the owner must supply authorized audio and an approved reachable test node/server. A successful mocked HTTP test does not prove actual voice playback.

Configure source managers for authorized direct HTTP audio only; do not enable extractor/search plugins as a fallback for unmatched external links. Node egress must validate permitted catalog hosts, resolved public addresses and redirects. The bot-side catalog validator does not prove DNS safety at the remote node. Do not log loadtrack query strings or credential-bearing request/response bodies.

Implementation references: https://lavalink.dev/api/rest and https://lavalink.dev/api/websocket (official v4 API). No actual node, catalog URL or credentials are included in this file.
