# chairisms · Gate B owner review

**Fixture renders, not live Discord captures. Gate B is pending owner approval.** Cards use current production renderers and frozen packaged lounge artwork/fonts. Discord-equivalent windows display actual adapter text and serialized controls, including private responses. Public Community image fixtures focus on the attachment and controls; the duplicate embed transcript is omitted from the PNG and saved exactly in each fixture JSON and transcript.txt. Fictional identities only. Desktop 440px; mobile 360px. No feature flags enabled or live publication performed.

1. **Chairisms · public publication** — Actual deterministic Chairism attachment with fictional source text; source channel details remain hidden. The optional image fixture reuses packaged lounge artwork as an explicitly fictional source attachment.
   [Desktop](publication-desktop.png) · [Mobile](publication-mobile.png) · [Fixture / controls](publication-fixture.json)

2. **Chairisms · quote with replied message** — Actual deterministic Chairism attachment with fictional source text; source channel details remain hidden. The optional image fixture reuses packaged lounge artwork as an explicitly fictional source attachment.
   [Desktop](reply-desktop.png) · [Mobile](reply-mobile.png) · [Fixture / controls](reply-fixture.json)

3. **Chairisms · optional reply and image** — Actual deterministic Chairism attachment with fictional source text; source channel details remain hidden. The optional image fixture reuses packaged lounge artwork as an explicitly fictional source attachment.
   [Desktop](image-desktop.png) · [Mobile](image-mobile.png) · [Fixture / controls](image-fixture.json)

4. **Chairisms · long names and quote** — Actual deterministic Chairism attachment with fictional source text; source channel details remain hidden. The optional image fixture reuses packaged lounge artwork as an explicitly fictional source attachment.
   [Desktop](long-text-desktop.png) · [Mobile](long-text-mobile.png) · [Fixture / controls](long-text-fixture.json)

5. **Chairisms · private source selector** — Actual adapter response with injected fixture boundaries; private state, no live source fetch or Discord publication.
   [Desktop](selector-desktop.png) · [Mobile](selector-mobile.png) · [Fixture / controls](selector-fixture.json)

6. **Chairisms · protected source rejection** — Actual adapter response with injected fixture boundaries; private state, no live source fetch or Discord publication.
   [Desktop](protected-desktop.png) · [Mobile](protected-mobile.png) · [Fixture / controls](protected-fixture.json)

7. **Chairisms · interrupted publication** — Actual adapter response with injected fixture boundaries; private state, no live source fetch or Discord publication.
   [Desktop](error-desktop.png) · [Mobile](error-mobile.png) · [Fixture / controls](error-fixture.json)

8. **Chairisms · private empty browser** — Actual adapter response with injected fixture boundaries; private state, no live source fetch or Discord publication.
   [Desktop](empty-desktop.png) · [Mobile](empty-mobile.png) · [Fixture / controls](empty-fixture.json)

Regenerate after build: `node scripts/render-gate-b-community-chairisms.mjs`.
