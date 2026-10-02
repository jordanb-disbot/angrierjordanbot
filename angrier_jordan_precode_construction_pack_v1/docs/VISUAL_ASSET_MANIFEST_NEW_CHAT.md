# Angrier Jordan Visual Materials Manifest

Use this index to choose what to attach to a new chat. The first three items are the minimum portable authority set. Keep paths relative to the repository root.

## Attach first: binding authority

| Material | Path | Purpose |
| --- | --- | --- |
| Full approved visual system | `docs/APPROVED_VISUAL_SYSTEM.md` | Complete policy, approved card behavior, Gate A/B rules, Chairisms, event motion, and owner references |
| Brand tokens | `production/theme/brand.json` | Canonical palette, typography, components, and approved feature themes |
| Portable brief | `docs/VISUAL_HANDOFF_NEW_CHAT.md` | Concise implementation brief and ready-to-paste new-chat instruction |

## Approved review and reference sets

| Set | Path | What it governs |
| --- | --- | --- |
| Gate A immutable set | `docs/approved_visuals/locked-2026-09-25/manifest.json` | Standard window, Line, Race, Fight cards and motion references. Hashes lock the approved originals. |
| Gate B gallery | `docs/approved_visuals/gate-b-2026-09-25.json` | 70 reviewed family, casino, community, Chairisms, and superlative items across desktop/mobile. |
| Unified cards | `docs/approved_visuals/unified-cards-2026-09-28.json` | FMK, profile, shop, inventory hierarchy and card lifecycle presentation. |
| Chairisms | `docs/approved_visuals/chairisms-2026-09-27.json` | Portrait-left, quote-right placement and long/short/reply/archive states. |
| Profiles | `docs/approved_visuals/profiles-2026-09-27.json` | Profile and hidden/privacy states. |
| Race and Line entry | `docs/approved_visuals/race-line-entry-2026-09-27.json` | Entry and locked states. |
| Smooth events | `docs/approved_visuals/smooth-events-2026-09-27.json` | Reviewed 20fps Race and Line motion plus six wheelchair assets. |
| Approved visuals index | `docs/approved_visuals/README.md` | Orientation for the approval archive. |

## Owner-supplied graphic references

| Material | Path | Status |
| --- | --- | --- |
| Brand style guide | `docs/owner_references/2026-09-28/brand-style-guide.png` | Reference for the approved modern premium layout and visual mood. |
| Angrier Jordan bot imagery | `docs/owner_references/2026-09-28/angrier-jordan-bot-imagery.png` | Existing character reference. |
| Correct role colors and icons | `docs/owner_references/2026-09-28/correct-role-colors.png` | Current authority for role colors and icons. |
| Ideas-only examples | `docs/owner_references/2026-09-28/ideas-only-examples.png` | Inspiration only; not runtime visual authority. |
| Superseded role sheet | `docs/owner_references/2026-09-28/superseded-role-sheet.png` | Historical only; never use for role decisions. |

## Production visual materials

| Material | Path | Notes |
| --- | --- | --- |
| Runtime brand configuration | `production/theme/brand.json` | Use as the code-facing source of truth. |
| Extended token set | `production/theme/visual_tokens_v2.json` | Supporting implementation tokens; follow `brand.json` if a conflict exists. |
| Approved Gate A visual files | `docs/approved_visuals/locked-2026-09-25/` | Attach a specific image or GIF only when the new task touches that surface. |
| Gate B review gallery files | `review-gate-b/` paths named in the Gate B manifest | Do not overwrite; use as reviewed visual targets. |
| Chairisms approved images | `docs/approved_visuals/chairisms-2026-09-27/` | Includes desktop/mobile, long copy, images, notices, archive, and reply states. |
| Profile approved images | `docs/approved_visuals/profiles-2026-09-27/` | Includes standard and private/hidden variants. |
| Race and Line motion files | `docs/approved_visuals/smooth-events-2026-09-27/` | Includes `race.gif`, `line.gif`, report, and six approved assets. |

## Safe handoff procedure

1. Attach `VISUAL_HANDOFF_NEW_CHAT.md`, `APPROVED_VISUAL_SYSTEM.md`, and `production/theme/brand.json`.
2. Attach this manifest so the next chat can request the exact visual evidence it needs instead of inventing new styling.
3. For a specific feature, attach its applicable approval manifest and one desktop plus one mobile example.
4. State that direct owner instructions can supersede the package, but a materially new visual direction needs owner review.
5. Keep the archived images immutable. New mockups, exports, and tests must live in a separate review location.

## Current boundary

These materials document Angrier Jordan's visual system and approved runtime card language. The separate EAJ Music bot is not part of Angrier Jordan's active visual runtime, so do not treat the older music player review set as a current implementation target.
