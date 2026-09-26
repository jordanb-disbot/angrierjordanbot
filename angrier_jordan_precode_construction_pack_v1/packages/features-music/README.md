# Music implementation boundary

This package contains provider-neutral state transitions, persistence intents, and private provider/voice interfaces. It does not provide a playable catalog, audio provider, Discord voice driver, or live acceptance. Keep `music.enabled` disabled until those integrations and their acceptance checks exist.

Metadata/link resolution and authorized playable-source resolution are separate interfaces. Provider adapters must canonicalize public references, exclude authenticated stream URLs and secrets, and validate remote media hosts, resolved addresses and every redirect before fetching. Artwork classification is not authorization to fetch a URL.

Transport workers must serialize every operation per server and check both revision and generation fences. Scheduled reconciliation effects are hints; the latest desired state is authoritative. Successful intent persistence/completion does not mean audio played. Only confirmed transport observations update observed playback; only confirmed PLAYING observations create durable played history. The bounded domain `history` array supports previous-track navigation and can contain skipped or unavailable attempts.

The owner approved on 2026-09-25 that Previous, Replay and Seek require the current track’s requester or a DJ. Previous while idle checks the historical requester. This newer owner decision resolves the earlier permission gap.

Before wiring controller publication, use one durable shared delivery record for the authoritative post. `linkController` only confirms an externally delivered message; its compare-and-swap cannot alone prevent two workers from sending two messages. Domain fixture renders are provisional and do not establish Gate C or live acceptance.
