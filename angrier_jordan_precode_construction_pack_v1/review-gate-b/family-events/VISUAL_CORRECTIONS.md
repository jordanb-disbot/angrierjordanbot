# Owner Gate B visual corrections — Family, Crime and Party

Fixture renders only. These are not live Discord screenshots and are not owner-approved.

All 33 states have desktop (440px) and mobile (360px) PNGs. The prior 27 states were regenerated; six added states cover active robbery with both portraits, arrest fallback with long name/bail, short Family names without avatars, three-member FMK fallback names, open voting, and long voting warning/choice copy.

Renderers retain the approved lounge shell and center all attachment text. Family and tree panels now follow content height. Party voting uses inset brass choices, centered totals, and result bars. Member portraits use the common inset brass frame; missing media uses deterministic initials. Runtime coordinators resolve current Discord portraits for public subjects without changing saved state. Review portraits use existing approved chair artwork as clearly fictional profile pictures.

Validation: 26 targeted adapter checks pass; all 66 image dimensions pass; 31 directly rendered fixture SVGs pass centered-text and text-bounds checks (tree attachments exercised through coordinator tests); an identical second regeneration reproduces all 66 PNG hashes. Mobile proposal, FMK, WWYD, extreme divorce, fallback arrest, large tree, and desktop inheritance were visually inspected for clipping, overlap, hierarchy, and spacing.

Exceptions: Discord controls and embed metadata do not expose alignment or font settings. No member picture is added for generic family changes, no-heir estates, or subject-free WWYD options. Large family trees show six complete relationships and preserve every relationship in the attached active-family.txt. Party rounds with more than five options expose all choices through the existing Details/voting controls.

Owner review remains required for final visual acceptance. No feature flag was enabled, financial state changed, production deployment performed, or Gate B approval granted.
