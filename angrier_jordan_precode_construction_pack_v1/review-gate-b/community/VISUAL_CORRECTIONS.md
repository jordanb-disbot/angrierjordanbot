# Gate B visual correction audit — Community, Superlatives and Chairisms

**Fixture renders, not live Discord screenshots. Gate B remains pending owner review.**

## Changed runtime presentation

- `packages/features-community/src/render.ts`: centered headings, names, choices, amounts, status and supporting text; content-driven panels replace the fixed sparse 473px panel; brass-framed portraits for public authors, giveaway winners, Superlative winners and finalists; long member names wrap completely.
- `packages/features-chairisms/src/render.ts`: centered quote hierarchy and source metadata; integrated current member portraits with deterministic monogram fallback; content-driven quote/reply cards preserve full quote text.
- `apps/bot/src/discord/community-coordinator.ts`: current public member-avatar resolution at rendering time; actual branded PNG attachments for private ballots, nominations, confirmations, notices and archive/status states.
- `apps/bot/src/discord/chairisms-coordinator.ts`: actual branded PNG attachments for private selection, browsing, confirmation and warning/error states. Source capture, permission checks and publication protections remain unchanged.
- Shared presentation and avatar helpers are maintained by the integrating workstream. Approved Line/Race/Fight/standard-window references were not edited.

## Regenerated review set

26 fixture pairs, each at 440px desktop and 360px mobile, plus JSON payload/controls, text transcripts where applicable, READMEs and SHA-256 manifests:

- Community (13): hidden poll, ranked result, suggestion, open AMA, answered AMA, declined AMA, paid giveaway, pending custom reward, empty giveaway, long text, private ballot, paid confirmation, staff denial.
- Superlatives (5): winner, nominations, voting with multiple finalists, no nominations, long winner/category names. Compatibility `desktop.png`, `mobile.png`, `fixture.json`, `transcript.txt` and `manifest.json` were refreshed.
- Chairisms (8): publication, replied message, image/reply with fallback identity, long name/quote, source selector, protected source, interrupted publication and empty browser.

## Verification

- 34 Community/Chairisms adapter tests pass, including privacy boundaries, media safety, complete long-name wrapping, centered text, multiple public member portraits, empty results, attention-color statuses and actual private runtime attachments.
- All 52 canonical PNGs match their SHA-256 manifests and desktop/mobile dimensions.
- Inspected normal desktop hero/financial cards and mobile voting, ballot, public Chairisms, long text/names, no-avatar fallback, replied messages, image attachment and error states. Corrected hero-name baseline spacing after image inspection, rebuilt centrally, regenerated, and rechecked the final winner image.
- Short content contracts vertically; full long Chairism text intentionally increases card height. Long Community post excerpts retain their complete text in Details.
- PNG writers skip unchanged bytes to avoid unnecessary writes to files that Windows image viewers may hold open.

## Native and privacy exceptions

- Discord controls, textual accessibility transcripts, links and true input modals retain Discord-owned alignment and styling. The primary cards and non-modal private voting/confirmation/notice attachments are centered branded production PNGs. Review controls are approximate native representations of the serialized payload, not a promise of custom Discord button styling.
- Anonymous poll/suggestion/AMA authors and ballots receive no portraits. Declined AMA content never gains author identity. Topic-only or empty states have no specific member to illustrate.
- Unavailable avatars use the shared deterministic brass-framed monogram. Chairism fixtures explicitly exercise this fallback.
- Packaged approved chair artwork is used as fictional fixture profile pictures. No live member photos were retrieved for this review. Runtime uses the actual current Discord member avatar when available.

The owner still needs to review and accept these compositions. No Gate B approval, production deployment, live Discord publication or feature enablement occurred.
