# Phase 23 Music — implementation in progress, disabled

Gate C is pending. Nothing here deploys, enables Music, selects a provider account or claims live playback acceptance.

**Latest owner update:** MUSIC_SOURCE_CONTRACT.md supersedes the catalog-first decision below. Multi-source search/playback is required; the optional private catalog is not an acceptance prerequisite. Existing catalog-only foundation tests are not evidence that the new multi-source contract is implemented.

## Owner decision recorded

The owner approved Previous, Replay and Seek for the current requester or a DJ only (2026-09-25). Skip retains the canonical current-requester/DJ direct action and eligible-listener majority vote for others. New controls must not bypass those rules.

The owner replaced the earlier catalog-first decision with Lavalink v4, maintained YouTube source support, SoundCloud, and Spotify/Apple metadata resolution. Conservative matching and explicit ambiguous choices remain required. See MUSIC_SOURCE_CONTRACT.md; MUSIC_CATALOG_SETUP.md now covers optional direct audio only.

## Foundations

Provider-neutral interfaces separate metadata/search references, private authorized audio streams and voice transport. Track requests and observed audio state are distinct. Generation tokens fence stale track callbacks; operation receipts and revisions serialize durable mutations. The additive 0022 migration introduces transport intents/recovery fields and playlist revisions without deleting existing rows. Legacy state fails closed rather than inventing confirmed playback.

Queue entries carry stable IDs and requester identity. Playlist edits use ownership and stale-revision checks. Queued copies survive playlist deletion. Metadata projects only public fields; stream URLs and provider credentials must not be persisted or rendered.

The controller renderer reuses the approved Gate B lounge frame, centered hierarchy, brass artwork treatment and bundled fonts. Until the Discord adapter is wired, its outputs are engineering fixtures, not Gate C runtime acceptance.

## Outstanding integration before Gate C

Current tested work includes the multi-source REST boundary, public reference normalization, conservative ISRC/metadata matching, opaque playback capabilities, voice handshake and Discord gateway bridge, generation-fenced player synchronization and event handling, durable selection/confirmation sessions, and controller reservation/cleanup persistence. Runtime playback remains disabled and not wired into production startup.

The initial catalog foundation is retained as an optional source. It is no longer the normal search/playback requirement. Source attribution now distinguishes requested Spotify/Apple identity from the selected audio provider. The current provisional Music fixtures were regenerated; approved Gate A/B reference images were not changed.

Final application composition (`apps/bot/src/music/music-application.ts`) and controller-publication adapter (`apps/bot/src/discord/music-publication.ts`) are preserved as uncommitted work in progress. They typecheck, but need dedicated integration/ambiguous-delivery tests and production lifecycle wiring. Do not treat a workspace build as completion of those acceptance gates. Parallel work was interrupted by a service usage limit; resume these files rather than reconstructing them.

- Fresh voice/member/DJ authority at every interaction, embedded VC-chat enforcement, one pinned authoritative controller and safe replacement through shared delivery records.
- Serialized, generation-fenced transport intent execution; actual provider failures, restarts, permissions and listener changes.
- Registry option/autocomplete reconciliation, music help/tutorial/dashboard metadata, final manifest and controller review fixtures.
- A reachable approved test Lavalink node and live Discord acceptance; authorized metadata integration credentials where required. No private catalog is required for ordinary playback. Finish offline integration before requesting node provisioning; use testing/music-node for the reviewed configuration.

No provider secret files have been inspected. Production credentials and deployment remain outside this checkpoint.
