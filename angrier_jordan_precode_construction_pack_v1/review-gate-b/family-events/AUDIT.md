# Family / Crime / Party integration and visual audit

Review status: READY FOR OWNER REVIEW after the central validation recorded in the consolidated Gate B report. No owner approval or live Discord acceptance is implied. `review-items.json` is the machine-readable item index; PNGs are deterministic runtime attachments, not Discord screenshots. Native component metadata comes from the actual coordinators.

## Engineering corrections

- Family uses the registered `family.use` capability in its coordinator, matching runtime eligibility.
- Marriage projections read typed ITEM escrow quantities and outcomes, validate the typed asset contract, and display reserved / returned / consumed inventory explicitly. Monetary amounts are never presented as item quantities.
- Session, vote, item escrow and winning participant reads share one RepeatableRead snapshot. An acceptance cannot combine a pending session with subsequently consumed item escrow in one render.
- Closed auctions resolve the winning member from the persisted participant snapshot; losing-bid refund wording and seller-versus-estate proceeds remain distinct. Sealed bids stay private.
- Completed estates distinguish beneficiary transfers from funds removed from circulation and items assigned to auctions. Pending/canceled estates no longer claim final execution; these two renderer diagnostics are not public announcements.
- Declined/expired adoption no longer claims that a relationship was created.
- Width-aware text layout wraps long names, result messages and currency values. Dense financial/marriage cards grow vertically instead of dropping the last facts. Financial amount hierarchy remains visible. Large family trees give a full text attachment when the card reaches its visible-line limit.
- Member mentions remain available in the embed for beneficiaries, winners and divorce participants. Attachment text does not fabricate a current Discord display name when one is unavailable.

## Post-recovery checks

- `.env.example` retains `ENABLE_FAMILY_SMOKE=false`; the settings source retains `features.family` default `false`. No flags or environment files were changed.
- Startup checks both switches before membership reconciliation. Disabled scheduler handlers retain retryable work; enabling requires a fresh complete census after suspension. No disabled startup path performs Family estate execution.
- Incomplete/unavailable censuses fail before membership mutations. Pending gateway observations and generation fencing block stale estate transactions. Passive inheritance eligibility remains distinct from command eligibility.
- Publication uses the durable DeliveryEngine intent. Replayed SENT work links the original message; uncertain SENDING work searches the marker and never blindly sends another announcement. The shared scheduler continues retrying retained jobs.
- Migrations 0012, 0019 and 0020, financial limits, escrow settlement, membership transaction guards and production enablement remain unchanged.

## Visual inspection

The approved Line/Race/Fight/standard-window source files were not edited. These Family surfaces continue to use the existing packaged lounge artwork, midnight/teal inset shell, brass details, warm lamp lighting, Space Grotesk headings and Inter text. No runtime art generation was introduced.

All 27 generated states were inspected together; representative full-size mobile images included the dense second marriage, pending two-item proposal, maximum-width member names and large divorce amount, many-member family tree, inheritance, refund auction, arrest, FMK and voting. Desktop and mobile files use the same deterministic runtime attachment at 440px and 360px respectively. Native controls are shown separately on the consolidated review page, with their actual labels and disabled states.

Readability fixes preserve the established window/material language. The existing spacious Family body panel and the text-led result treatment remain owner review choices, not engineering defects; no subjective redesign was made. Name truncation in the two compact avatar labels uses an ellipsis, while the full names remain in the embed transcript. A Family has relationships rather than a separate custom Family-name field, so no fictional Family-name setting or fixture was introduced.

## Scope and validation

27 fixture states: 25 member-facing owner-review states and 2 clearly separated internal estate diagnostics marked NO VISUAL REVIEW REQUIRED. The additional states include item reservation, refund, consumption, empty vote, auction refund, adoption consent/result, empty estate, and empty/dense family trees. Arrest, FMK and major voting remain included.

Final targeted adapter suite: **42 passed, 0 failed** (29 membership, 3 existing Family adapter, 10 new presentation/projection/delivery cases), run after the central final build including RepeatableRead. Final regeneration produced 27 metadata entries and 54 PNGs; every desktop/mobile dimension, PNG hash and renderer source hash was verified. Final enlarged-money, beneficiary/no-heir estate and dense-marriage renders were inspected again after regeneration. The new PostgreSQL regression overlaps an actual proposal acceptance with a paused projection read; its exact execution result belongs to the central validation report. Existing PostgreSQL cases also now assert typed item reservation/refund/consumption projections.

No production deployment, flag enablement, live financial execution or Discord live acceptance was performed. Owner Gate B remains unapproved.
