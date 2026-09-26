# superlative · Gate B owner review

**Fixture renders, not live Discord captures. Gate B is pending owner approval.** Cards use current production renderers and frozen packaged lounge artwork/fonts. Private ballot, selection, confirmation and notice windows now include actual branded runtime PNG attachments. Controls are serialized from the adapter and shown with an approximate native Discord treatment; their runtime alignment/style is controlled by Discord. Native transcripts and links remain accessible and are preserved in fixture JSON. Public Community image fixtures focus on the attachment and controls; the duplicate embed transcript is omitted from the PNG and saved exactly in each fixture JSON and transcript.txt. Fictional identities only; packaged approved chair artwork stands in for member profile pictures. Runtime uses current member avatars where public identity is allowed. Anonymous poll/suggestion/AMA authors and ballots receive no identity treatment. The image Chairism exercises fallback identity art; long names wrap completely. True Discord input modals retain native layout. Desktop 440px; mobile 360px. No feature flags enabled or live publication performed.

1. **Superlatives · season winner** — Saved season fixture: closed; anonymous nominations/ballots; no Ottoman prizes.
   [Desktop](winner-desktop.png) · [Mobile](winner-mobile.png) · [Fixture / controls](winner-fixture.json)

2. **Superlatives · nomination phase** — Saved season fixture: nominations; anonymous nominations/ballots; no Ottoman prizes.
   [Desktop](nominations-desktop.png) · [Mobile](nominations-mobile.png) · [Fixture / controls](nominations-fixture.json)

3. **Superlatives · voting phase** — Saved season fixture: voting; anonymous nominations/ballots; no Ottoman prizes.
   [Desktop](voting-desktop.png) · [Mobile](voting-mobile.png) · [Fixture / controls](voting-fixture.json)

4. **Superlatives · no nominations** — Saved season fixture: closed; no nominations and no badge award.
   [Desktop](empty-desktop.png) · [Mobile](empty-mobile.png) · [Fixture / controls](empty-fixture.json)

5. **Superlatives · long winner and category** — Saved season fixture: closed; 80-character wide category and winner names retained in Details.
   [Desktop](long-name-desktop.png) · [Mobile](long-name-mobile.png) · [Fixture / controls](long-name-fixture.json)

Regenerate after build: `node scripts/render-gate-b-community-chairisms.mjs`.
