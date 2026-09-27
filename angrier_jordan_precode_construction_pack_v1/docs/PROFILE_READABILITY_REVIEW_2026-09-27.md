# Profile readability revision — visually approved

Owner requested cleaner text, the standard style guide and member profile pictures.

- Profile now groups the avatar and name in one identity panel; the real Discord member avatar is requested at 512px. Missing avatars use initials, never a furniture substitute.
- Full-width profile sections use separate labels and values. Activity presents explicit This month / All time columns. All privacy-filtered values remain present; no feature behavior, permissions or statistics changed.
- Final alignment pass uses fixed table columns, shared text baselines, padded rows and subtle alternating fills/dividers. Wrapped cells determine row height; monthly numbers align beneath their headers. The identity subtitle sits closer to the member name.
- Profile-family typography and palette read directly from `production/theme/brand.json`: Space Grotesk / Inter, navy/teal panels, emerald accents, brass details and the existing packaged lounge backdrop. Removed profile dossier slogans, extra hero chair illustration, purple section accents and heavy centered paragraphs.
- Profile, hidden activity, leaderboard, records, showcase, empty states and long-value previews are regenerated in `review-profiles/index.html`. The sample Morgan photo is fictional, copied from the existing review-only generated portrait documented in `review-chairisms-polish-v2/PORTRAIT_PROVENANCE.md`. It is not a runtime default or an actual member identity.

Validation: bot TypeScript build passed; all 14 Profile adapter tests passed; asset manifest and immutable visual reference checks passed. No production deployment, registration or feature flag changes. Owner approved the final table-alignment Profile revision on 2026-09-27. Immutable desktop/mobile references are recorded in `docs/approved_visuals/profiles-2026-09-27.json`. This approval does not authorize production deployment.
