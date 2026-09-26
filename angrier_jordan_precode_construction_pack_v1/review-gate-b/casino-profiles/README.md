# Casino and honors fixture review

Actual deterministic production attachment renderers with fictional saved-state inputs. These are fixture renders, not live Discord screenshots. Desktop: 440px; mobile: 360px scaled attachment. Native Discord controls are documented in review-items.json and are not drawn into the attachment. No financial execution or feature enablement. Portraits use clearly fictional profile pictures from existing approved packaged chair artwork; unavailable portraits use a deterministic branded monogram.

1. **Major casino win** — [desktop](major-casino-win-desktop.png) · [mobile](major-casino-win-mobile.png)
   Saved closed roulette round: wager 1000 Ottomans, result 17, return 36000 Ottomans.
   Controls: Play Again; Rules. Status: READY FOR OWNER REVIEW.

2. **Lottery winner** — [desktop](lottery-winner-desktop.png) · [mobile](lottery-winner-mobile.png)
   Completed weekly lottery draw pays the full ticket-funded 24800 Ottoman pot to Alex.
   Controls: None. Status: READY FOR OWNER REVIEW.

3. **Chair Pot jackpot** — [desktop](chair-pot-desktop.png) · [mobile](chair-pot-mobile.png)
   Settled slots jackpot pays Jordan 125000 Ottomans from Chair Pot.
   Controls: None. Status: READY FOR OWNER REVIEW.

4. **Weekly Spotlight with co-winners** — [desktop](weekly-spotlight-desktop.png) · [mobile](weekly-spotlight-mobile.png)
   Frozen week has tied message winners Jordan and Alex, Jordan also wins words and voice and holds permanent Triple Threat.
   Controls: None. Status: READY FOR OWNER REVIEW.

5. **Major record** — [desktop](major-record-desktop.png) · [mobile](major-record-mobile.png)
   The all-time records selector shows Jordan holding Biggest Casino Win, 125000, set September 25, 2026.
   Controls: Record period: All time / This month. Status: READY FOR OWNER REVIEW.

6. **Chair Pot long member name and currency** — [desktop](chair-pot-long-values-desktop.png) · [mobile](chair-pot-long-values-mobile.png)
   Boundary fixture: unbroken 32-character member name; exact signed BIGINT maximum 9223372036854775807 Ottoman payout, verifying no rounding or illegible shrinking.
   Controls: None. Status: READY FOR OWNER REVIEW.

7. **Weekly Spotlight without qualifiers** — [desktop](weekly-spotlight-empty-desktop.png) · [mobile](weekly-spotlight-empty-mobile.png)
   Frozen week has zero qualifying activity and no winner in all three categories.
   Controls: None. Status: READY FOR OWNER REVIEW.

8. **Weekly Spotlight long names and totals** — [desktop](weekly-spotlight-long-names-desktop.png) · [mobile](weekly-spotlight-long-names-mobile.png)
   Boundary fixture: three co-winners include a 32-character unbroken wide name and markup characters; maximum 32-bit activity totals.
   Controls: None. Status: READY FOR OWNER REVIEW.

9. **Empty records** — [desktop](records-empty-desktop.png) · [mobile](records-empty-mobile.png)
   The records command has no persisted all-time records.
   Controls: Record period: All time / This month. Status: READY FOR OWNER REVIEW.

10. **Records long names and currency** — [desktop](records-long-values-desktop.png) · [mobile](records-long-values-mobile.png)
   Boundary fixture: two persisted records with 32-character unbroken member names and exact BIGINT amounts.
   Controls: Record period: All time / This month. Status: READY FOR OWNER REVIEW.

11. **Member profile · public summary** — [desktop](member-profile-desktop.png) · [mobile](member-profile-mobile.png)
   Public profile composed from already privacy-filtered activity, honors and showcase fields; actual native Edit Showcase remains member-bound.
   Controls: Edit Showcase. Status: READY FOR OWNER REVIEW.

12. **New record · public announcement** — [desktop](record-announcement-desktop.png) · [mobile](record-announcement-mobile.png)
   Durable new-record announcement: Alex improves Biggest Casino Win to125000; previous100000 held86400seconds. Publication uses current portrait and same result shell.
   Controls: None. Status: READY FOR OWNER REVIEW.

13. **Casino · short name and missing avatar** — [desktop](casino-avatar-fallback-desktop.png) · [mobile](casino-avatar-fallback-mobile.png)
   Resolved identity Li with unavailable avatar, exact zero return and truthful fallback portrait; no network-dependent fixture content.
   Controls: Play Again; Rules. Status: READY FOR OWNER REVIEW.

The public profile summary and durable record announcement now share the branded presentation. Edit Showcase controls and accessibility transcripts remain native Discord. These fixtures do not claim to cover Discord client layout, scroll behavior, or live acceptance. Owner review: visual hierarchy and the long co-winner attachment at mobile size.
