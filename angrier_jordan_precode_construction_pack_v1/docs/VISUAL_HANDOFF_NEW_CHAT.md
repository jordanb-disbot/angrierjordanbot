# Angrier Jordan Visual Handoff

This is the portable design brief for all future Angrier Jordan visual work. Treat it as the starting point for a new chat and attach the reference materials listed in `VISUAL_ASSET_MANIFEST_NEW_CHAT.md` when visual decisions or implementation are needed.

## Non-negotiable creative direction

Angrier Jordan lives in an upscale leather lounge: midnight navy and deep teal shadows, dark wood, warm brass, restrained emerald accents, and warm environmental light. The mood is polished, welcoming, quietly mischievous, and premium. It is never generic neon gaming, flat corporate SaaS, cartoonish casino, cyberpunk, or rustic western.

All artwork must look realistic or semi-realistic and belong to the same room. Use fixed, packaged raster art and deterministic rendering. Do not use runtime AI art. A new feature may get its own controlled lighting or accent color, but it must keep the same lounge world, material quality, inset panels, fine frames, typography, and spacing.

## Core design tokens

| Token | Value | Use |
| --- | --- | --- |
| Midnight | `#0B1220` | Primary dark field and lounge base |
| Navy | `#051822` | Economy and deeper background surfaces |
| Slate | `#374151` | Secondary structural detail |
| Teal | `#0EA5A6` | Frame edge, active structure, primary lounge accent |
| Emerald | `#10B981` | Readiness, success, accepted/completed states |
| Gold | `#F4C542` | Attention, brass highlights, key awards |
| Warm | `#FFE29A` | Prestige illumination and warm display text |
| White | `#E6EAF0` | Primary readable text |
| Muted | `#B4C8CA` | Supporting text |

Typography is **Space Grotesk** for headings and **Inter** for body copy. Headings should be confident and spacious; supporting copy should remain calm, readable, and secondary.

## Layout and component rules

- Windows: 18px corner radius.
- Inset panels: 12px corner radius.
- Buttons: 9px corner radius.
- Window content inset: 24px.
- Standard panel gap: 20px.
- Panels are translucent charcoal over the lounge scene, with a thin teal edge and selective warm gold highlights.
- Use generous content areas, strong row alignment, visible hierarchy, and centered balance where appropriate.
- Member names and the current primary outcome are prominent. Supporting metadata must stay inside the frame and never clip.
- Keep the outer frame stable during event motion. Animate content inside it only.
- Design for mobile from the start: full-width shop and inventory rows, readable controls, deliberate stacking, and no tiny compressed text.

## Feature accent families

Select one family for a feature, then keep it consistent through that feature's live session.

| Family | Palette | Intended use |
| --- | --- | --- |
| Lounge | Midnight, teal, gold | Standard community, profile, learning, general cards |
| Economy | Navy, emerald, gold | Wallet, shop, inventory, rewards, casino results |
| Social | Midnight, violet `#A469E2`, cyan `#38BDF8`, red `#EF4444` | Social and relationship features |
| Prestige | Midnight, warm, teal | Achievements, major honors, high-status records |

Emerald communicates readiness, success, or completion. Gold communicates attention, importance, and reward. Use color for a reason. Do not rotate colors inside a live session and do not create a new visual identity for one feature.

## Card behavior and visual hierarchy

### Standard cards

Use the lounge window and inset-panel construction. Make the main action or result immediately scannable. Use art purposefully, never as filler. Strong title, primary content, then supporting detail.

### Profile, shop, inventory, and FMK

These are the approved baseline for current cards. Preserve their large usable area, prominent identities and outcomes, aligned full-width rows, clean stat tiles, and mobile readability. Profile Fight and Race records each get their own row. FMK uses large member imagery and lifetime F/M/K data on each option.

### Private, persistent, and disposable cards

A private card is visible only to the member who initiated it. Keep its privacy cue clear without making the card feel like an error. A persistent card is the single authoritative active surface for an ongoing session and should update in place. A disposable card is a temporary result or informational response; remove it or let it expire once superseded so the channel does not become cluttered.

### Chairisms

Use a portrait-led layout: the quoted member image fills the left panel, while the quotation and attribution are centered in the right panel. Keep the amber/navy lounge materials, adapt typography for long content, and use the runtime member's actual Discord image.

### Events: Line, Race, and Fight

Keep the approved Gate A window and fixed, packaged art. The active commands are `!line`, `!race`, and `/fight @member`. Do not restore `/race`. Preserve the approved countdown and authoritative motion, with the outer frame fixed while event content animates.

## Art standards

1. Start from the approved references and existing assets before commissioning or generating anything.
2. Keep furniture, wood, brass, leather, shadows, framing, and environmental lighting consistent with the lounge.
3. Use high-resolution raster assets that remain legible at Discord card size and mobile feed size.
4. Use controlled decorative detail: thin brass corners, teal frame lines, subtle reflections, and small glow cues. Avoid excess glow, busy texture, chrome effects, or visual noise.
5. Portraits should support identity and be framed cleanly. Do not use identities from review fixtures in runtime materials.
6. Build strong empty, error, private, long-text, and long-name states. The approved review sets contain examples; those states are part of the standard.
7. Do not overwrite approved review snapshots. Make new review output separately and obtain owner approval only for a materially new direction.

## Ready-to-paste new-chat instruction

```text
Use the attached Angrier Jordan Visual Handoff and Asset Manifest as binding design authority. Preserve the approved upscale leather lounge system: deep midnight/navy background, dark wood, warm brass/gold, deep teal shadows, restrained emerald success cues, translucent charcoal inset panels with fine teal/gold frames, Space Grotesk headings, and Inter body text. Use fixed packaged raster art and deterministic rendering only - no runtime AI art. Apply one approved feature accent family consistently within a session; do not create a new visual identity. Respect the exact component tokens, mobile layout rules, stable event frame requirement, and approved card lifecycle rules. Do not overwrite reference snapshots. Before changing an existing approved visual surface, compare it to the named approval manifest and preserve its layout unless fixing a clear usability defect.
```

## Authority order

1. Direct owner instruction.
2. `docs/APPROVED_VISUAL_SYSTEM.md`.
3. `production/theme/brand.json`.
4. The immutable approval manifests and their reviewed assets listed in `docs/VISUAL_ASSET_MANIFEST_NEW_CHAT.md`.
5. Owner reference images, with `correct-role-colors.png` superseding the older role sheet.

This visual approval governs presentation only. It does not enable unfinished features or authorize production deployment.
