# Permanent Angrier Jordan visual system

## Owner reference update — 2026-09-28

Keep the approved modern premium layout, Space Grotesk/Inter hierarchy, generous frame use, balanced centered text, portraits and item art, clean stat tiles, mobile legibility, and polished Discord controls. Rotate approved accents by feature family within the same lounge design language. The base palette and typography remain in `production/theme/brand.json`; role identity gradients are separate and recorded in `production/theme/role-colors.json`.

The owner-supplied [style guide](owner_references/2026-09-28/brand-style-guide.png) is a visual reference, [examples](owner_references/2026-09-28/ideas-only-examples.png) are ideas only, and [bot imagery](owner_references/2026-09-28/angrier-jordan-bot-imagery.png) shows the existing Angrier Jordan character. The [correct role color and icon sheet](owner_references/2026-09-28/correct-role-colors.png) supersedes the earlier [role sheet](owner_references/2026-09-28/superseded-role-sheet.png); never use the earlier sheet for role-color decisions. These are owner-provided references for future review, not permission to replace approved runtime art or enable unfinished production features.

## Unified card presentation approval — 2026-09-28

The owner approved the FMK, profile, shop, and inventory review in local commit `b7342d0` as the presentation standard moving forward. The [approval manifest](approved_visuals/unified-cards-2026-09-28.json) records the exact desktop and mobile reference images. The approval also covers the matching lifecycle behavior for disposable economy results, temporary non-interactive information, and persistent active sessions. It is visual/UX approval, not production deployment authorization.

Use the same readable hierarchy, generous content area, aligned rows, purposeful imagery, and mobile sizing across future cards. Keep member names and primary outcomes prominent; keep supporting text inside the frame without clipping. Profile Fight and Race records each occupy their own row. Shop and inventory items use full-width rows at mobile feed size. FMK keeps large member imagery and lifetime F/M/K data on each option. Preserve one authoritative active card during a game and remove or expire superseded and disposable output according to the approved lifecycle.

Alternate **approved color themes by feature** while retaining the common lounge materials, frame construction, Space Grotesk headings, Inter body text, and `production/theme/brand.json`. The base midnight/teal/gold theme, emerald/gold economy theme, magenta/violet/cyan social theme, and gold/teal prestige theme are approved examples. Choose an accent for the feature's meaning and maintain readable contrast; do not rotate colors inside one live session or invent a new visual identity. Existing Gate A/B and feature-specific approvals remain valid.

## Chairisms owner visual approval — 2026-09-27

The owner approved the portrait-led Chairisms revision: quoted member profile image filling the left panel, quotation and attribution centered within the right panel, adaptive font sizing, and existing amber/navy lounge materials with Space Grotesk/Inter. The [approval manifest](approved_visuals/chairisms-2026-09-27.json) records 16 immutable short/long/reply/image/archive/notice desktop and mobile review images. Preserve this typography placement for future Chairisms changes. Fixture identities are fictional; runtime captures the quoted member's actual Discord profile image. This approves presentation, not production deployment. The separate wheelchair race revision remains pending explicit visual approval.

The owner approved Gate A and the current Line, Race, Fight and standard-window presentation on 2026-09-25. This supersedes earlier pending/rejected revision notes. Approval locks the visual system, not unimplemented Line functionality or live Discord acceptance.

Immutable review snapshots and SHA-256 fingerprints live in [the approval manifest](approved_visuals/locked-2026-09-25/manifest.json). The standard-window image includes the approved basic game window. These are production design references; fixture identities are not real runtime state.

All new features inherit realistic/semi-realistic lounge artwork, leather, dark wood, brass/gold, emerald accents, midnight navy/deep teal, warm environmental light, the same inset panels and fine frames, confident spacing and hierarchy, and Space Grotesk headings / Inter supporting text. Use `production/theme/brand.json`. Do not independently redesign later feature families. Existing older surfaces are reconciled during their roadmap visual pass, not silently declared compliant.

Feature-specific artwork, accent skins and controlled lighting variations are allowed within this same world. State color has semantic meaning: emerald readiness/success, gold attention, restrained feature accents. Keep the outer frame stable during event animation. Preserve the approved quality of motion and rendering. Use fixed packaged artwork and deterministic state rendering, never runtime AI generation.

Sender is Angrier Jordan. User-facing terminology is server/member. The visual approval's `/race` wording does not change command reconciliation: Race remains `!race`, Line `!line`, Fight `/fight @member`.

Do not overwrite the approved snapshots when generating new runtime reviews. A materially new visual direction requires owner approval; normal application of the approved system does not. Gate B (family/event), C (music), D (dashboard), and E (final visual review) remain meaningful owner gates.

## Gate B owner approval — 2026-09-25

Gate B is PASSED. The owner approved the complete corrected review gallery from commit `3837503`: 70 review items and two internal estate fixtures, 144 desktop/mobile images. [The Gate B approval manifest](approved_visuals/gate-b-2026-09-25.json) locks their hashes. These approved centered, content-sized lounge panels, member portraits, privacy-preserving fallbacks, voting and feed treatments are the current source-of-truth alongside Gate A. Do not redesign them. Native Discord control/modal limitations remain documented. This is owner visual approval, not live Discord acceptance, feature enablement or production deployment authorization. Gates C–E remain pending.

## Music owner visual approval — 2026-09-26

The owner approved the Music presentation at commit `f98de3c2ffd3b02aa2d742862b68f2dd52d06f63`: full player, compact/pinned player, search, queue, playlists, source/status surfaces, error/unavailable states and current Discord-native controls. Preserve the AJ palette/materials/fonts, desktop/mobile stacking and truncation. The [Music approval manifest](approved_visuals/music-2026-09-26.json) freezes 46 images and the gallery/control metadata. Do not alter these layouts except for an objective usability defect found in live acceptance. Gate C visual approval is PASSED; functional/live acceptance remains pending. Production Music remains disabled; deployment is not authorized.

## Race / Line motion approval — 2026-09-27

The owner approved the six wheelchair racer designs and the reviewed 20fps `!race` / `!line` animations. Preserve the approved lounge styling, exact countdown and authoritative race motion. The [approval manifest](approved_visuals/smooth-events-2026-09-27.json) locks the review GIFs and all six wheelchair runtime assets. Portrait and Chairisms are excluded from this approval batch. This is visual approval; live Discord acceptance remains pending and production deployment is not authorized by this approval.
