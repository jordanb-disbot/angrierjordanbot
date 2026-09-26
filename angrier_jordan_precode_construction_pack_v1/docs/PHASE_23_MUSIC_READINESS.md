# Phase 23 Music — implementation in progress, disabled

Gate C is pending. Nothing here deploys, enables Music, selects a provider account or claims live playback acceptance.

## Owner decision recorded

The owner approved Previous, Replay and Seek for the current requester or a DJ only (2026-09-25). Skip retains the canonical current-requester/DJ direct action and eligible-listener majority vote for others. New controls must not bypass those rules.

The owner selected a direct-audio catalog as the playable source and Lavalink as transport only. External service links may match authorized recordings but never trigger extraction or automatic playback. See MUSIC_CATALOG_SETUP.md.

## Foundations

Provider-neutral interfaces separate metadata/search references, private authorized audio streams and voice transport. Track requests and observed audio state are distinct. Generation tokens fence stale track callbacks; operation receipts and revisions serialize durable mutations. The additive 0022 migration introduces transport intents/recovery fields and playlist revisions without deleting existing rows. Legacy state fails closed rather than inventing confirmed playback.

Queue entries carry stable IDs and requester identity. Playlist edits use ownership and stale-revision checks. Queued copies survive playlist deletion. Metadata projects only public fields; stream URLs and provider credentials must not be persisted or rendered.

The controller renderer reuses the approved Gate B lounge frame, centered hierarchy, brass artwork treatment and bundled fonts. Until the Discord adapter is wired, its outputs are engineering fixtures, not Gate C runtime acceptance.

## Outstanding integration before Gate C

- Fresh voice/member/DJ authority at every interaction, embedded VC-chat enforcement, one pinned authoritative controller and safe replacement through shared delivery records.
- Serialized, generation-fenced transport intent execution; actual provider failures, restarts, permissions and listener changes.
- Registry option/autocomplete reconciliation, music help/tutorial/dashboard metadata, final manifest and controller review fixtures.
- Owner-supplied authorized catalog entries, a reachable approved test Lavalink node and live Discord acceptance. Spotify/Apple/YouTube/SoundCloud metadata links alone do not supply a selected playable backend.

No provider secret files have been inspected. Production credentials and deployment remain outside this checkpoint.
