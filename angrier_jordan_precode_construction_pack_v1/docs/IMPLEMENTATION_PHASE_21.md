# Phase 21 — Chairisms

Canonical section 29 and feature-flow section 48 govern `/quote message`, `/quote text`, `/chairisms recent`, `/chairisms member`, `/chairisms random` and Message → Apps → Create Chairism. Content comes only from actual source messages or self-authored text. No quote bank, generated attribution or runtime AI art is introduced.

## Creation and presentation

Context/message-link creation offers This Message, Include Replied Message, Include Image and the combined choice only when available. Every choice refetches its source. Custom text always attributes to the invoker. Buttons are member-bound; confirmation and browsing are private with disabled mentions. Public output goes only to the configured Chairisms channel and success requires a confirmed Discord post.

The deterministic renderer reuses the approved event shell/lounge asset, Space Grotesk headings, Inter body, panels and palette. Cards include source portrait, real display name, timestamp, quote and optional replied quote/image. Text is XML-escaped, long words wrap, and quotes allow 1200 Unicode characters and 30 lines. Optional source labels and numbers are omitted in this implementation. No unused show-number/show-channel/bot/system settings are introduced.

## Privacy and media

`DiscordChairismSecurity` fetches source channels, messages, members and roles again. Public means the configured ordinary `roles.member_access` role (or everyone when unset) has View Channel + Read Message History. This role cannot be a configured staff role or Administrator. Requester and bot independently need current access. Only server text channels are accepted. Threads, DMs, staff-log/hotseat channels and `chairisms.excluded_channel_ids` channel/category entries fail closed. Configure the latter for evidence/quarantine locations before enabling the feature.

Replies are independently checked. Selected attachments require approved Discord CDN image paths, bounded streams, no redirects, a decode pixel limit and sanitized PNG bytes. Avatars use bounded Discord CDN paths. Discord channel mentions/message links are replaced with generic labels. Raw remote URLs never reach the renderer.

Canonical activity privacy controls activity counters and roast privacy controls social roast targeting. Neither is a Chairisms opt-out, and this feature does not invent a new preference. Pending jobs verify unchanged source text, reply reference, selected image identity and current access immediately before sending. Confirmed outputs remain after original source deletion.

## Persistence and recovery

`PrismaChairismRepository` uses shared atomic receipts, serializable transactions, scheduler jobs, `PrismaJobDeliveryRepository`, `DeliveryEngine` and `AuditService`. An immutable pending snapshot is stored with the delivery job. Only confirmed SENT delivery creates a Chairism metadata row. Finalization is idempotent across restart/concurrent workers and discards the content snapshot, retaining metadata and the immutable destination. Technical cooldown uses persisted job creation times.

Unknown sends remain SENDING until a bot-authored marker is found. Absence from the latest 100 messages never authorizes a resend; an older uncertain post needs operator reconciliation. Browsing scans metadata, checks current configured output eligibility and an existing bot-authored output, then applies pagination or reservoir random selection. It does not refetch original content or expose pending rows. Historical outputs in a replaced output channel are excluded.

## Integration

Keep `features.chairisms=false` and `ENABLE_CHAIRISMS_SMOKE=false` until acceptance. Required settings: `chairisms.cooldown_seconds` (30 default; 5–3600) and `chairisms.excluded_channel_ids` (unique array, maximum 100 snowflake channel/category IDs). Domain export `validateChairismExcludedChannels` validates the JSON setting. Dashboard Draft/Preview/Publish now uses that validator and checks every excluded channel/category against current server objects before publish. Capability: `chairisms.use`. Existing `channels.chairisms_channel` selects the only output destination. `/chairisms member` requires its member option.

Composition is `DiscordChairismSecurity(client,config,canUse)`, `PrismaChairismRepository(db)`, `DiscordChairismPublication(client,repository,security,config)`, then `DiscordChairismsCoordinator(security,publication,publication,config,canUse)`. Route commands and `chairism:` buttons to the coordinator. Register scheduler job `chairism.publish` to `publication.deliver(job.id)`. Existing metadata/job/receipt tables suffice; no schema migration is required.

## Validation

Domain tests cover official same-server links, Unicode/line limits, wrapping, explicit options and embedded-only media. Adapter tests cover disabled feature, self attribution, no false success, frame escaping, owner controls, ordinary Member-role public access, restricted/excluded/deleted sources, reply recapture, media SSRF constraints and privacy scope. PostgreSQL suite `chairisms` covers concurrent logical enqueue, immutable replay, persisted cooldown races, no unconfirmed metadata, uncertain delivery recovery, restart and exactly-once metadata/audit finalization with content cleanup.

Live Discord and production enablement remain pending owner acceptance. Lore, introductions and the general tutorial runtime belong to Phase 22.
