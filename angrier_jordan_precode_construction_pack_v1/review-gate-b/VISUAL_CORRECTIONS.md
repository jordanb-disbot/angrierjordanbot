# Gate B visual corrections — owner review pending

All images are deterministic fictional fixture renders, **not live Discord screenshots**. No Gate B approval is inferred. Approved Line, Race, Fight and standard-window references remain unchanged. No feature flags, persistent contracts, financial logic, timers, voting eligibility or settlement rules changed.

## Changed presentation

- Family, including tree, proposal, marriage, adoption, divorce, inheritance and auctions: centered dynamic composition; framed spouses, subjects, heirs and winners where relevant.
- Party/WWYD/FMK and Crime: centered voting, result and member panels, including multiple subjects and unavailable-avatar cases.
- Community/Superlatives: centered voting and result hierarchy; framed public finalists and winners; branded private confirmations, status and error attachments.
- Chairisms: centered quote, attribution, browser, confirmation and error presentation; public attributed members retain portraits; anonymous sources remain anonymous.
- Casino: centered settled-round, lottery and Chair Pot attachments with member identity, exact amounts and content-sized panels.
- Profiles: centered records and Spotlight, balanced co-winner rows, plus branded public profile and durable record-announcement attachments. Existing privacy filtering is preserved.
- Shared Gate B composition helper: centered wrapping, adaptive panels and brass-framed raster portraits, using the existing approved lounge shell. Runtime uses current Discord member avatars through the existing bounded Discord-CDN media decoder; unavailable portraits use a deterministic monogram. No external image URL enters SVG.

The seven feature renderers are `packages/features-{family,party,crime,community,chairisms,casino,profiles}/src/render.ts`. Family tree rendering also lives in `apps/bot/src/discord/family-coordinator.ts`. Shared composition: `packages/features-events/src/gate-b-visual.ts`; avatar enrichment: `apps/bot/src/discord/member-art.ts`. Corresponding Discord coordinators and Casino/record announcement adapters were updated. Runtime source hashes and Profile/Record presentation mappings are synchronized.

## Regenerated package

| Folder | Fixture states | Desktop/mobile images |
| --- | ---: | ---: |
| [Family, Party and Crime](family-events/review-items.json) | 33 | 66 |
| [Casino and Profiles](casino-profiles/review-items.json) | 13 | 26 |
| [Community](community/review-items.json) | 13 | 26 |
| [Chairisms](chairisms/review-items.json) | 8 | 16 |
| [Superlatives](superlative/review-items.json) | 5 | 10 |
| Total | 72 | 144 |

The gallery contains **70 owner-review items**, plus two clearly separated internal estate diagnostics. Desktop width is 440px; mobile width is 360px. Community/Chairisms/Superlative fixture surroundings identify actual runtime attachments and approximate native Discord controls explicitly. Other groups show runtime attachments with native controls listed in metadata. Fixture portraits are fictional profile pictures from existing packaged chair artwork, not photographs of real members.

Start with [the gallery](index.html) or [the numbered review document](OWNER_REVIEW.md). Hashes and source links are in [the consolidated manifest](manifest.json).

## Platform and privacy exceptions

- Discord controls, selects, modal inputs, embed metadata and accessibility transcripts have client-controlled alignment/fonts. Primary feed images are centered and branded; actual native controls remain separate functional controls. The private FMK chooser is an intentional native selector, not the primary feed presentation.
- No portrait is invented for anonymous/protected Chairism sources, hidden voters, subject-free polls/WWYD choices, general status/error messages, empty records/award categories, or estates without a recipient. Missing member images use the branded monogram. Large Family trees use a focus-member portrait and retain the complete relationship text attachment.
- Very long quotes, multi-winner Spotlights and populated profiles grow vertically to preserve content. Opening the attachment may be necessary in Discord's preview. Full native transcripts remain available. These fixtures do not certify live Discord client behavior.

## Validation

- Full workspace build and preflight pass: **212 runtime tests and 167 adapter tests**, zero failures/skips.
- **389** production asset/template/source hashes verified; **38** immutable approved visual references unchanged.
- Boundary checks cover short and long/wide/Unicode names, absent avatars, exact signed-BIGINT Ottoman values, multiple members, long Family names, warnings/errors and both review dimensions. SVG text bounds and centering checks pass. Representative images were visually inspected by each workstream and centrally.
- Family repeat generation reproduced all 66 image hashes. Community/Chairisms/Superlatives verified 52 PNG hashes and dimensions. The consolidated builder checks every image dimension, unique ID, fixture label and source/image hash.
- No migrations or domain/repository changes were required. Prior database/integration evidence remains historical in [the previous report](INTEGRATION_REPORT.md); current CI status is reported separately with the final revision.

## Owner review still required

Approve or revise the corrected centered composition, portraits and dense/mobile states across the complete gallery. Existing public placement/wording of staff-only Community controls also remains available for owner review; current permissions still govern each action. Gate B remains pending. No production deployment or later gate work has begun.
