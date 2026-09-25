# !line — all-state visual study

Review-only extension of the standalone Line concept. No production code or behavior was changed.

Open index.html for the gallery, full-size state viewer and one-shot countdown preview. Static state PNGs and SVGs are reproducible with node review-concepts/aj-window-study-v1/render-line-states.mjs.

## State coverage
- 01-opened: Event opened. Host is automatically in; 60 seconds remain.
- 02-checking-in: Member check-ins. Ready and “I Need a Second” shown together.
- 03-all-ready: Everyone ready. The host may start early; no automatic start.
- 04-extended: Host extension used. 42 seconds becomes 72; extension cannot repeat.
- 05-locked: Entries locked. Check-ins stay visible; only the host can act.
- 06-countdown-5: Countdown · 5. Same center, frame and authoritative countdown.
- 07-countdown-4: Countdown · 4. Same center, frame and authoritative countdown.
- 08-countdown-3: Countdown · 3. Same center, frame and authoritative countdown.
- 09-countdown-2: Countdown · 2. Same center, frame and authoritative countdown.
- 10-countdown-1: Countdown · 1. Same center, frame and authoritative countdown.
- 11-powder-burst: Powder burst. After 1, a bounded burst with brief chair debris.
- 12-complete: Complete. No replay or rematch controls.
- 13-cancelled: Cancelled. Host cancellation; the check-in record remains visible.

The all-ready and extension cards are alternate readiness fixtures. The countdown uses the host-override branch, preserving five ready / three needing a second. The first authored shame line (LINE-SHAME-001) is used unchanged after substituting Casey for {user}: “Wonderful. Casey needed more time. We are starting anyway.”

The countdown shows no zero, keeps the frame fixed, and has no terminal action buttons. Host controls are present while readiness is open; after lock only Start Countdown / Cancel Line remain. The extension is shown disabled after use. No cap is introduced by the eight-member fixture.

Unauthorized invocation is silent, so it has no event-window render. The opt-in role notification and authored launch callout belong to the surrounding Discord message, outside this window study. No extra functional states or dialogs are proposed here.

## Presentation
Permanent: fixed lounge artwork/materials/lighting, midnight and teal, gold details, frame, sender, Space Grotesk headings and Inter body. Variable: purple feature skin, state/countdown content, ready/attention accents and controls. Custom button finishes are concept styling, not a claim about native Discord button theming.

Background provenance is documented in ../README.md. Particle shapes are deterministic and bounded to the center. No runtime AI generation.

## Review boundary
Owner visual approval remains pending. Production Line implementation, Race/Fight revisions and Railway readiness are paused. These files do not enable or deploy anything.
