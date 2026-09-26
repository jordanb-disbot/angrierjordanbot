# Music visual revision 01 — owner review pending

The owner-supplied Music board is composition inspiration only. This revision inherits the approved AJ lounge shell, packaged materials, palette, Space Grotesk headings and Inter body. No reference artwork/text/logos were copied. Approved Line, Race, Fight, standard-window and Gate B files are untouched.

## Changed presentation

- `packages/features-music/src/render.ts`: modular full player, compact pinned player, labelled notices and numbered recording/list panels. Separate recording identity, confirmed/pending state, progress, voice context, requested source versus playback source, requester and queue information. Deterministic brass-record artwork fallback.
- `apps/bot/src/discord/music-coordinator.ts`: connects search/queue/history/playlists to the Music-specific modules, highlights existing native Pause/Resume and Stop controls, passes cosmetic requester portraits, and exposes the compact presentation without changing action IDs or domain behavior.
- `apps/bot/src/discord/music-publication.ts`: pinned publication uses the compact presentation and current member portrait/name when available. Delivery, permissions, generation checks and pin recovery remain intact.
- `scripts/build-music-foundation-review.mjs`: deterministic desktop/mobile gallery with actual adapter attachments and noninteractive previews of native control metadata. Includes compact states, long text, avatar/fallback and queue extremes.

## Practical tradeoffs

- Desktop attachments are 440 px; mobile previews are 360 px. The reference board's wide dashboard becomes stacked modules in Discord rather than a tiny multi-column poster.
- Autocomplete uses Discord's native menu, which cannot host a branded raster panel. The subsequent search/selection response uses AJ cards plus the real native select menu.
- Buttons/selects remain real Discord controls beneath the image. Rendered decorative elements never pretend to be clickable controls. Discord supplies their final platform font and colors.
- One pinned controller remains authoritative. Its compact attachment shares the existing controls; the richer full view is available through the current private player workflow. No extra public strip/message is created.
- Long labels wrap or visibly truncate within bounded modules; selection controls and supporting response text retain their existing full/capped metadata. Queue numbering and page navigation remain unchanged.
- Provider artwork is not fetched through a new unreviewed network path. Validated embedded raster art is supported; otherwise a deterministic record motif is shown. Requester photos use the existing bounded Discord media helper. Autoplay and missing-member states use branded fallbacks.
- Static progress represents confirmed state at render time, not a live client-side animation. Unconfirmed/recovery/error labels remain explicit.

## Review and validation

Gallery: [Music review](../review-phase-23-foundation/index.html). Its manifest records per-image hashes and native control metadata. These are fictional fixture renders, not live Discord screenshots or audible playback evidence.

Validation: bot build and full preflight passed; 285 runtime tests and 368 adapter tests passed. All 392 production asset hashes and 46 Music review-image hashes verified. The 38 immutable references and 144 approved Gate B images remain unchanged. Prior 24 PostgreSQL tests remain the persistence baseline; no domain or migration changes were made in this presentation pass. Secret/local-file scan passed. Music remains disabled. No deployment or Gate C approval is implied.

Owner review requested: full-player composition, compact pinned layout, list density/readability, and the Music-specific modular treatment within the approved AJ visual family. Live voice/provider acceptance is still pending separately under [Gate C](GATE_C_MUSIC_ACCEPTANCE.md).

The 46-image gallery includes full player states, compact pinned playing/recovery/idle/long-title states, autoplay, requested-versus-audio source attribution, recording choice, confirmation, queue/long queue, history, playlists and permission/unavailable notices. Native buttons remain on both player forms; gallery previews are deliberately noninteractive.
