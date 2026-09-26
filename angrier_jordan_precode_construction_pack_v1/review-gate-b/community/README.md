# community · Gate B owner review

**Fixture renders, not live Discord captures. Gate B is pending owner approval.** Cards use current production renderers and frozen packaged lounge artwork/fonts. Discord-equivalent windows display actual adapter text and serialized controls, including private responses. Public Community image fixtures focus on the attachment and controls; the duplicate embed transcript is omitted from the PNG and saved exactly in each fixture JSON and transcript.txt. Fictional identities only. Desktop 440px; mobile 360px. No feature flags enabled or live publication performed.

1. **Community · anonymous poll** — /poll with hidden results; member has not voted.
   [Desktop](poll-hidden-desktop.png) · [Mobile](poll-hidden-mobile.png) · [Fixture / controls](poll-hidden-fixture.json)

2. **Community · ranked poll result** — Saved closed ranked poll; final-round counts and named ballots are available in Details.
   [Desktop](poll-ranked-result-desktop.png) · [Mobile](poll-ranked-result-mobile.png) · [Fixture / controls](poll-ranked-result-fixture.json)

3. **Community · suggestion status** — Anonymous suggestion after a community admin changes the status to REVIEWING; voting remains available.
   [Desktop](suggestion-desktop.png) · [Mobile](suggestion-mobile.png) · [Fixture / controls](suggestion-fixture.json)

4. **Community · AMA question** — Anonymous question awaiting staff answer; staff-only Answer and Decline controls are enforced on click.
   [Desktop](ama-open-desktop.png) · [Mobile](ama-open-mobile.png) · [Fixture / controls](ama-open-fixture.json)

5. **Community · answered AMA** — Saved public answer closes voting and leaves Details.
   [Desktop](ama-answer-desktop.png) · [Mobile](ama-answer-mobile.png) · [Fixture / controls](ama-answer-fixture.json)

6. **Community · declined protected question** — Declined question projects only the public unavailable notice; original question and author are absent.
   [Desktop](ama-declined-desktop.png) · [Mobile](ama-declined-mobile.png) · [Fixture / controls](ama-declined-fixture.json)

7. **Community · paid giveaway** — Admin-created 3-winner giveaway; entry requires separate private confirmation of the exact 5000 Ottoman fee.
   [Desktop](giveaway-paid-desktop.png) · [Mobile](giveaway-paid-mobile.png) · [Fixture / controls](giveaway-paid-fixture.json)

8. **Community · custom reward pending** — Draw selected one actual winner from a maximum of three; organizer fulfillment remains pending.
   [Desktop](giveaway-pending-desktop.png) · [Mobile](giveaway-pending-mobile.png) · [Fixture / controls](giveaway-pending-fixture.json)

9. **Community · no-entry draw** — Giveaway closes with zero entrants; no winner or reward is claimed.
   [Desktop](giveaway-empty-desktop.png) · [Mobile](giveaway-empty-mobile.png) · [Fixture / controls](giveaway-empty-fixture.json)

10. **Community · long-text overflow** — Maximum-length suggestion with unbroken wide text and long submitted name; full content stays in Details.
   [Desktop](long-text-desktop.png) · [Mobile](long-text-mobile.png) · [Fixture / controls](long-text-fixture.json)

11. **Community · private ballot** — Actual adapter response to vote; fictional member has ordinary member permissions.
   [Desktop](poll-private-desktop.png) · [Mobile](poll-private-mobile.png) · [Fixture / controls](poll-private-fixture.json)

12. **Community · private paid entry confirmation** — Actual adapter response to enter; fictional member has ordinary member permissions.
   [Desktop](giveaway-confirm-desktop.png) · [Mobile](giveaway-confirm-mobile.png) · [Fixture / controls](giveaway-confirm-fixture.json)

13. **Community · protected staff action** — Actual adapter response to answer; fictional member has ordinary member permissions.
   [Desktop](staff-denied-desktop.png) · [Mobile](staff-denied-mobile.png) · [Fixture / controls](staff-denied-fixture.json)

Regenerate after build: `node scripts/render-gate-b-community-chairisms.mjs`.
