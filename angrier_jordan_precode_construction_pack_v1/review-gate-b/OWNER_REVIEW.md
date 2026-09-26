# Gate B owner review

Deterministic fictional fixtures from the current runtime renderers. These are not live Discord captures, production events, or approvals. Family/Casino/Profile images are runtime attachments; their native controls are listed separately. Community/Chairisms/Superlative images use clearly labeled Discord-equivalent fixture windows with actual adapter controls. Full payload transcripts remain in each feature folder.

**Gate B remains pending owner approval. No production deployment or live Discord acceptance has occurred.**

Review 70 items below. Two internal estate diagnostics are listed separately and require no visual approval.

## Visual/product preferences

- Review the corrected centered, content-sized lounge panels and brass-framed member portraits across all Gate B features. Packaged chair portraits are fictional fixture avatars; runtime uses current Discord avatars or a deterministic monogram.
- Review maximum-length Chairism and multi-winner Spotlight images at mobile size; opening a long attachment may still be necessary in Discord’s constrained preview.
- Confirm the public placement and wording of staff-only Community controls. Authorization remains enforced when clicked; visibility does not grant access.

## Numbered review items

1. **Marriage result and completed community vote** — READY FOR OWNER REVIEW
   - [Desktop](family-events/marriage-desktop.png) · [Mobile](family-events/marriage-mobile.png)
   - Scenario: Ring accepted; marriage committed; the vote closes with 18 approvals and 2 disapprovals, unlocking the first child slot.
   - Controls: 👍 (disabled) · 👎 (disabled) · View Family.
   - Classification: informational, interactive.
   - Source: [packages/features-family/src/render.ts](../packages/features-family/src/render.ts).

2. **Proposal — Ring reserved** — READY FOR OWNER REVIEW
   - [Desktop](family-events/proposal-pending-desktop.png) · [Mobile](family-events/proposal-pending-mobile.png)
   - Scenario: /family marry member:Sam reserves one Ring while Sam decides.
   - Controls: Accept · Decline.
   - Classification: interactive, financial.
   - Source: [packages/features-family/src/render.ts](../packages/features-family/src/render.ts).

3. **Second-marriage proposal — Ring and Blessing reserved** — READY FOR OWNER REVIEW
   - [Desktop](family-events/proposal-blessing-desktop.png) · [Mobile](family-events/proposal-blessing-mobile.png)
   - Scenario: A member with one active spouse proposes again; one Ring and one Blessing remain reserved.
   - Controls: Accept · Decline.
   - Classification: interactive, financial.
   - Source: [packages/features-family/src/render.ts](../packages/features-family/src/render.ts).

4. **Proposal declined — item returned** — READY FOR OWNER REVIEW
   - [Desktop](family-events/proposal-declined-desktop.png) · [Mobile](family-events/proposal-declined-mobile.png)
   - Scenario: Sam declines; the Ring is returned in the committed transaction.
   - Controls: None.
   - Classification: financial.
   - Source: [packages/features-family/src/render.ts](../packages/features-family/src/render.ts).

5. **Proposal expired — item returned** — READY FOR OWNER REVIEW
   - [Desktop](family-events/proposal-expired-desktop.png) · [Mobile](family-events/proposal-expired-mobile.png)
   - Scenario: The 24-hour proposal timer expires; the Ring is returned once.
   - Controls: None.
   - Classification: financial.
   - Source: [packages/features-family/src/render.ts](../packages/features-family/src/render.ts).

6. **Marriage — voting open** — READY FOR OWNER REVIEW
   - [Desktop](family-events/marriage-live-vote-desktop.png) · [Mobile](family-events/marriage-live-vote-mobile.png)
   - Scenario: An accepted marriage opens its three-hour community approval vote with no ballots yet.
   - Controls: 👍 · 👎 · View Family.
   - Classification: interactive.
   - Source: [packages/features-family/src/render.ts](../packages/features-family/src/render.ts).

7. **Second marriage — Wedding Sack and Blessing consumed** — READY FOR OWNER REVIEW
   - [Desktop](family-events/marriage-blessing-consumed-desktop.png) · [Mobile](family-events/marriage-blessing-consumed-mobile.png)
   - Scenario: A Wedding Sack activates a second marriage and consumes the Sack plus required Blessing.
   - Controls: 👍 (disabled) · 👎 (disabled) · View Family.
   - Classification: financial, interactive.
   - Source: [packages/features-family/src/render.ts](../packages/features-family/src/render.ts).

8. **Divorce settlement** — READY FOR OWNER REVIEW
   - [Desktop](family-events/divorce-desktop.png) · [Mobile](family-events/divorce-mobile.png)
   - Scenario: /family divorce ends an eligible marriage and transfers the selected payer’s half-liquid settlement to the former spouse.
   - Controls: None.
   - Classification: financial, destructive.
   - Source: [packages/features-family/src/render.ts](../packages/features-family/src/render.ts).

9. **Divorce — long names and large settlement** — READY FOR OWNER REVIEW
   - [Desktop](family-events/divorce-large-value-desktop.png) · [Mobile](family-events/divorce-large-value-mobile.png)
   - Scenario: Readability boundary fixture: 32-character member names and a signed-64-bit-scale Ottoman amount; this is a projection fixture, not a transaction.
   - Controls: None.
   - Classification: financial, destructive.
   - Source: [packages/features-family/src/render.ts](../packages/features-family/src/render.ts).

10. **Inheritance completed** — READY FOR OWNER REVIEW
   - [Desktop](family-events/inheritance-desktop.png) · [Mobile](family-events/inheritance-mobile.png)
   - Scenario: The 24-hour departure grace expires; no reservations remain; the selected eligible beneficiary receives committed funds and 12 inventory entries.
   - Controls: None.
   - Classification: financial, destructive.
   - Source: [packages/features-family/src/render.ts](../packages/features-family/src/render.ts).

11. **Estate — no eligible heir** — READY FOR OWNER REVIEW
   - [Desktop](family-events/estate-no-heir-desktop.png) · [Mobile](family-events/estate-no-heir-mobile.png)
   - Scenario: With no eligible heir, liquid funds leave circulation and each of two eligible assets receives a separate system auction.
   - Controls: None.
   - Classification: financial, destructive.
   - Source: [packages/features-family/src/render.ts](../packages/features-family/src/render.ts).

12. **Estate — no eligible assets** — READY FOR OWNER REVIEW
   - [Desktop](family-events/estate-empty-desktop.png) · [Mobile](family-events/estate-empty-mobile.png)
   - Scenario: An estate executes with no remaining money, eligible heir or transferable inventory.
   - Controls: None.
   - Classification: informational, destructive.
   - Source: [packages/features-family/src/render.ts](../packages/features-family/src/render.ts).

13. **Sealed auction winner** — READY FOR OWNER REVIEW
   - [Desktop](family-events/auction-win-desktop.png) · [Mobile](family-events/auction-win-mobile.png)
   - Scenario: A spouse self-auction closes; Sam is the highest still-eligible reserve-meeting bidder; 87,500 Ottomans settle to Alex.
   - Controls: None.
   - Classification: financial.
   - Source: [packages/features-family/src/render.ts](../packages/features-family/src/render.ts).

14. **Sealed auction — bidding open** — READY FOR OWNER REVIEW
   - [Desktop](family-events/auction-open-desktop.png) · [Mobile](family-events/auction-open-mobile.png)
   - Scenario: /family familyauction type:spouse reserve:50000 opens a sealed self-auction; no participant bids are public.
   - Controls: Place / Increase Sealed Bid.
   - Classification: interactive, financial.
   - Source: [packages/features-family/src/render.ts](../packages/features-family/src/render.ts).

15. **Sealed auction — no qualifying winner** — READY FOR OWNER REVIEW
   - [Desktop](family-events/auction-refund-desktop.png) · [Mobile](family-events/auction-refund-mobile.png)
   - Scenario: At close every bid is below reserve or ineligible; all reserved bids refund and no relationship is created.
   - Controls: None.
   - Classification: financial.
   - Source: [packages/features-family/src/render.ts](../packages/features-family/src/render.ts).

16. **Estate item auction winner** — READY FOR OWNER REVIEW
   - [Desktop](family-events/estate-auction-win-desktop.png) · [Mobile](family-events/estate-auction-win-mobile.png)
   - Scenario: An estate’s three-Ring stack auction settles to Sam; the winner receives the items, other bids refund and funds leave circulation.
   - Controls: None.
   - Classification: financial.
   - Source: [packages/features-family/src/render.ts](../packages/features-family/src/render.ts).

17. **Adoption consent** — READY FOR OWNER REVIEW
   - [Desktop](family-events/adoption-pending-desktop.png) · [Mobile](family-events/adoption-pending-mobile.png)
   - Scenario: An eligible married parent pair with an open slot requests adoption; only the proposed child may accept.
   - Controls: Accept · Decline.
   - Classification: interactive.
   - Source: [packages/features-family/src/render.ts](../packages/features-family/src/render.ts).

18. **Adoption accepted** — READY FOR OWNER REVIEW
   - [Desktop](family-events/adoption-accepted-desktop.png) · [Mobile](family-events/adoption-accepted-mobile.png)
   - Scenario: The proposed child accepts; both parents are linked and View Family is available.
   - Controls: View Family.
   - Classification: interactive.
   - Source: [packages/features-family/src/render.ts](../packages/features-family/src/render.ts).

19. **Adoption declined** — READY FOR OWNER REVIEW
   - [Desktop](family-events/adoption-declined-desktop.png) · [Mobile](family-events/adoption-declined-mobile.png)
   - Scenario: The proposed child declines; no adoption link is created.
   - Controls: None.
   - Classification: informational.
   - Source: [packages/features-family/src/render.ts](../packages/features-family/src/render.ts).

20. **Family link ended** — READY FOR OWNER REVIEW
   - [Desktop](family-events/family-ended-desktop.png) · [Mobile](family-events/family-ended-mobile.png)
   - Scenario: /family emancipate ends an eligible adoption after its waiting period; the result confirms the saved change.
   - Controls: None.
   - Classification: destructive.
   - Source: [packages/features-family/src/render.ts](../packages/features-family/src/render.ts).

21. **Arrest and crime jail** — READY FOR OWNER REVIEW
   - [Desktop](family-events/arrest-desktop.png) · [Mobile](family-events/arrest-mobile.png)
   - Scenario: Robbery incident closes with arrest, complete restitution and a 7,200-Ottoman bail quote.
   - Controls: Rules.
   - Classification: moderation-related, financial.
   - Source: [packages/features-crime/src/render.ts](../packages/features-crime/src/render.ts).

22. **FMK result** — READY FOR OWNER REVIEW
   - [Desktop](family-events/fmk-result-desktop.png) · [Mobile](family-events/fmk-result-mobile.png)
   - Scenario: A completed FMK round freezes three named assignments, lifetime counters and 16–4 agreement ballots.
   - Controls: Play Again · Details.
   - Classification: interactive.
   - Source: [packages/features-party/src/render.ts](../packages/features-party/src/render.ts).

23. **Major voting result** — READY FOR OWNER REVIEW
   - [Desktop](family-events/voting-result-desktop.png) · [Mobile](family-events/voting-result-mobile.png)
   - Scenario: A completed WWYD vote freezes a 12–5–3 result for three choices.
   - Controls: Play Again · Details.
   - Classification: interactive.
   - Source: [packages/features-party/src/render.ts](../packages/features-party/src/render.ts).

24. **Arrest — fallback portrait and long bail** — READY FOR OWNER REVIEW
   - [Desktop](family-events/arrest-fallback-extreme-desktop.png) · [Mobile](family-events/arrest-fallback-extreme-mobile.png)
   - Scenario: Fallback portrait, unbroken long member name, large Ottoman value and moderation warning.
   - Controls: Rules.
   - Classification: financial, moderation-related.
   - Source: [packages/features-crime/src/render.ts](../packages/features-crime/src/render.ts).

25. **Robbery — member portraits** — READY FOR OWNER REVIEW
   - [Desktop](family-events/robbery-members-desktop.png) · [Mobile](family-events/robbery-members-mobile.png)
   - Scenario: Both members in an active incident use deterministic fixture portraits.
   - Controls: Fight Back (disabled) · 911 (disabled) · Rules.
   - Classification: interactive, financial.
   - Source: [packages/features-crime/src/render.ts](../packages/features-crime/src/render.ts).

26. **FMK — short and long names with fallback** — READY FOR OWNER REVIEW
   - [Desktop](family-events/fmk-fallback-extreme-desktop.png) · [Mobile](family-events/fmk-fallback-extreme-mobile.png)
   - Scenario: All three assignments retain complete names and deterministic no-avatar portraits.
   - Controls: Play Again · Details.
   - Classification: interactive.
   - Source: [packages/features-party/src/render.ts](../packages/features-party/src/render.ts).

27. **Voting — open branded feed** — READY FOR OWNER REVIEW
   - [Desktop](family-events/voting-open-desktop.png) · [Mobile](family-events/voting-open-mobile.png)
   - Scenario: Open voting has branded choice panels and real coordinator controls; ballots and totals remain hidden.
   - Controls: Open it together · Wait for the owner · Inspect the label first · +30 Seconds · Details.
   - Classification: interactive.
   - Source: [packages/features-party/src/render.ts](../packages/features-party/src/render.ts).

28. **Voting — long prompt and choices** — READY FOR OWNER REVIEW
   - [Desktop](family-events/voting-long-copy-desktop.png) · [Mobile](family-events/voting-long-copy-mobile.png)
   - Scenario: Long warning copy, long choice labels and wrapped results remain readable.
   - Controls: Play Again · Details.
   - Classification: interactive.
   - Source: [packages/features-party/src/render.ts](../packages/features-party/src/render.ts).

29. **Family — short names and no avatars** — READY FOR OWNER REVIEW
   - [Desktop](family-events/family-fallback-short-desktop.png) · [Mobile](family-events/family-fallback-short-mobile.png)
   - Scenario: Short names and deterministic fallback portraits in the pending consent card.
   - Controls: Accept · Decline.
   - Classification: interactive.
   - Source: [packages/features-family/src/render.ts](../packages/features-family/src/render.ts).

30. **Family tree — no active links** — READY FOR OWNER REVIEW
   - [Desktop](family-events/family-tree-empty-desktop.png) · [Mobile](family-events/family-tree-empty-mobile.png)
   - Scenario: /family familytree for a member with no active relationships.
   - Controls: None.
   - Classification: informational.
   - Source: [apps/bot/src/discord/family-coordinator.ts](../apps/bot/src/discord/family-coordinator.ts).

31. **Family tree — many long member names** — READY FOR OWNER REVIEW
   - [Desktop](family-events/family-tree-large-desktop.png) · [Mobile](family-events/family-tree-large-mobile.png)
   - Scenario: A large current family component with long names; complete relationships remain available in active-family.txt.
   - Controls: None.
   - Classification: informational.
   - Source: [apps/bot/src/discord/family-coordinator.ts](../apps/bot/src/discord/family-coordinator.ts).

32. **Major casino win** — READY FOR OWNER REVIEW
   - [Desktop](casino-profiles/major-casino-win-desktop.png) · [Mobile](casino-profiles/major-casino-win-mobile.png)
   - Scenario: Saved closed roulette round: wager 1000 Ottomans, result 17, return 36000 Ottomans.
   - Controls: Play Again · Rules.
   - Classification: financial, interactive.
   - Source: [packages/features-casino/src/render.ts#renderCasinoResult](../packages/features-casino/src/render.ts).
   - Native Discord controls listed above are outside this runtime attachment and are not pictured.

33. **Lottery winner** — READY FOR OWNER REVIEW
   - [Desktop](casino-profiles/lottery-winner-desktop.png) · [Mobile](casino-profiles/lottery-winner-mobile.png)
   - Scenario: Completed weekly lottery draw pays the full ticket-funded 24800 Ottoman pot to Alex.
   - Controls: None.
   - Classification: financial, informational.
   - Source: [packages/features-casino/src/render.ts#renderCasinoResult](../packages/features-casino/src/render.ts).
   - No interactive controls for this announcement.

34. **Chair Pot jackpot** — READY FOR OWNER REVIEW
   - [Desktop](casino-profiles/chair-pot-desktop.png) · [Mobile](casino-profiles/chair-pot-mobile.png)
   - Scenario: Settled slots jackpot pays Jordan 125000 Ottomans from Chair Pot.
   - Controls: None.
   - Classification: financial, informational.
   - Source: [packages/features-casino/src/render.ts#renderCasinoResult](../packages/features-casino/src/render.ts).
   - No interactive controls for this announcement.

35. **Weekly Spotlight with co-winners** — READY FOR OWNER REVIEW
   - [Desktop](casino-profiles/weekly-spotlight-desktop.png) · [Mobile](casino-profiles/weekly-spotlight-mobile.png)
   - Scenario: Frozen week has tied message winners Jordan and Alex, Jordan also wins words and voice and holds permanent Triple Threat.
   - Controls: None.
   - Classification: informational.
   - Source: [packages/features-profiles/src/render.ts#renderSpotlight](../packages/features-profiles/src/render.ts).
   - No interactive controls for this announcement.

36. **Major record** — READY FOR OWNER REVIEW
   - [Desktop](casino-profiles/major-record-desktop.png) · [Mobile](casino-profiles/major-record-mobile.png)
   - Scenario: The all-time records selector shows Jordan holding Biggest Casino Win, 125000, set September 25, 2026.
   - Controls: Record period: All time / This month.
   - Classification: informational, interactive.
   - Source: [packages/features-profiles/src/render.ts#renderRecords](../packages/features-profiles/src/render.ts).
   - Native Discord controls listed above are outside this runtime attachment and are not pictured.

37. **Chair Pot long member name and currency** — READY FOR OWNER REVIEW
   - [Desktop](casino-profiles/chair-pot-long-values-desktop.png) · [Mobile](casino-profiles/chair-pot-long-values-mobile.png)
   - Scenario: Boundary fixture: unbroken 32-character member name; exact signed BIGINT maximum 9223372036854775807 Ottoman payout, verifying no rounding or illegible shrinking.
   - Controls: None.
   - Classification: financial, informational.
   - Source: [packages/features-casino/src/render.ts#renderCasinoResult](../packages/features-casino/src/render.ts).
   - No interactive controls for this announcement.

38. **Weekly Spotlight without qualifiers** — READY FOR OWNER REVIEW
   - [Desktop](casino-profiles/weekly-spotlight-empty-desktop.png) · [Mobile](casino-profiles/weekly-spotlight-empty-mobile.png)
   - Scenario: Frozen week has zero qualifying activity and no winner in all three categories.
   - Controls: None.
   - Classification: informational.
   - Source: [packages/features-profiles/src/render.ts#renderSpotlight](../packages/features-profiles/src/render.ts).
   - No interactive controls for this announcement.

39. **Weekly Spotlight long names and totals** — READY FOR OWNER REVIEW
   - [Desktop](casino-profiles/weekly-spotlight-long-names-desktop.png) · [Mobile](casino-profiles/weekly-spotlight-long-names-mobile.png)
   - Scenario: Boundary fixture: three co-winners include a 32-character unbroken wide name and markup characters; maximum 32-bit activity totals.
   - Controls: None.
   - Classification: informational.
   - Source: [packages/features-profiles/src/render.ts#renderSpotlight](../packages/features-profiles/src/render.ts).
   - No interactive controls for this announcement.

40. **Empty records** — READY FOR OWNER REVIEW
   - [Desktop](casino-profiles/records-empty-desktop.png) · [Mobile](casino-profiles/records-empty-mobile.png)
   - Scenario: The records command has no persisted all-time records.
   - Controls: Record period: All time / This month.
   - Classification: informational, interactive.
   - Source: [packages/features-profiles/src/render.ts#renderRecords](../packages/features-profiles/src/render.ts).
   - Native Discord controls listed above are outside this runtime attachment and are not pictured.

41. **Records long names and currency** — READY FOR OWNER REVIEW
   - [Desktop](casino-profiles/records-long-values-desktop.png) · [Mobile](casino-profiles/records-long-values-mobile.png)
   - Scenario: Boundary fixture: two persisted records with 32-character unbroken member names and exact BIGINT amounts.
   - Controls: Record period: All time / This month.
   - Classification: informational, interactive.
   - Source: [packages/features-profiles/src/render.ts#renderRecords](../packages/features-profiles/src/render.ts).
   - Native Discord controls listed above are outside this runtime attachment and are not pictured.

42. **Member profile · public summary** — READY FOR OWNER REVIEW
   - [Desktop](casino-profiles/member-profile-desktop.png) · [Mobile](casino-profiles/member-profile-mobile.png)
   - Scenario: Public profile composed from already privacy-filtered activity, honors and showcase fields; actual native Edit Showcase remains member-bound.
   - Controls: Edit Showcase.
   - Classification: informational, interactive.
   - Source: [packages/features-profiles/src/render.ts#renderProfile](../packages/features-profiles/src/render.ts).
   - Native Discord controls listed above are outside this runtime attachment and are not pictured.

43. **New record · public announcement** — READY FOR OWNER REVIEW
   - [Desktop](casino-profiles/record-announcement-desktop.png) · [Mobile](casino-profiles/record-announcement-mobile.png)
   - Scenario: Durable new-record announcement: Alex improves Biggest Casino Win to125000; previous100000 held86400seconds. Publication uses current portrait and same result shell.
   - Controls: None.
   - Classification: informational.
   - Source: [packages/features-profiles/src/render.ts#renderRecords](../packages/features-profiles/src/render.ts).
   - No interactive controls for this announcement.

44. **Casino · short name and missing avatar** — READY FOR OWNER REVIEW
   - [Desktop](casino-profiles/casino-avatar-fallback-desktop.png) · [Mobile](casino-profiles/casino-avatar-fallback-mobile.png)
   - Scenario: Resolved identity Li with unavailable avatar, exact zero return and truthful fallback portrait; no network-dependent fixture content.
   - Controls: Play Again · Rules.
   - Classification: financial, interactive.
   - Source: [packages/features-casino/src/render.ts#renderCasinoResult](../packages/features-casino/src/render.ts).
   - Native Discord controls listed above are outside this runtime attachment and are not pictured.

45. **Community · anonymous poll** — READY FOR OWNER REVIEW
   - [Desktop](community/poll-hidden-desktop.png) · [Mobile](community/poll-hidden-mobile.png)
   - Scenario: /poll with hidden results; member has not voted.
   - Controls: Vote · Close Poll · Details.
   - Classification: interactive.
   - Source: [packages/features-community/src/render.ts](../packages/features-community/src/render.ts).

46. **Community · ranked poll result** — READY FOR OWNER REVIEW
   - [Desktop](community/poll-ranked-result-desktop.png) · [Mobile](community/poll-ranked-result-mobile.png)
   - Scenario: Saved closed ranked poll; final-round counts and named ballots are available in Details.
   - Controls: Details.
   - Classification: informational.
   - Source: [packages/features-community/src/render.ts](../packages/features-community/src/render.ts).

47. **Community · suggestion status** — READY FOR OWNER REVIEW
   - [Desktop](community/suggestion-desktop.png) · [Mobile](community/suggestion-mobile.png)
   - Scenario: Anonymous suggestion after a community admin changes the status to REVIEWING; voting remains available.
   - Controls: Vote · Update Status · Details.
   - Classification: interactive.
   - Source: [packages/features-community/src/render.ts](../packages/features-community/src/render.ts).

48. **Community · AMA question** — READY FOR OWNER REVIEW
   - [Desktop](community/ama-open-desktop.png) · [Mobile](community/ama-open-mobile.png)
   - Scenario: Anonymous question awaiting staff answer; staff-only Answer and Decline controls are enforced on click.
   - Controls: Upvote · Answer · Decline · Details.
   - Classification: moderation-related.
   - Source: [packages/features-community/src/render.ts](../packages/features-community/src/render.ts).

49. **Community · answered AMA** — READY FOR OWNER REVIEW
   - [Desktop](community/ama-answer-desktop.png) · [Mobile](community/ama-answer-mobile.png)
   - Scenario: Saved public answer closes voting and leaves Details.
   - Controls: Details.
   - Classification: informational.
   - Source: [packages/features-community/src/render.ts](../packages/features-community/src/render.ts).

50. **Community · declined protected question** — READY FOR OWNER REVIEW
   - [Desktop](community/ama-declined-desktop.png) · [Mobile](community/ama-declined-mobile.png)
   - Scenario: Declined question projects only the public unavailable notice; original question and author are absent.
   - Controls: Details.
   - Classification: moderation-related.
   - Source: [packages/features-community/src/render.ts](../packages/features-community/src/render.ts).

51. **Community · paid giveaway** — READY FOR OWNER REVIEW
   - [Desktop](community/giveaway-paid-desktop.png) · [Mobile](community/giveaway-paid-mobile.png)
   - Scenario: Admin-created 3-winner giveaway; entry requires separate private confirmation of the exact 5000 Ottoman fee.
   - Controls: Enter · 5000 Ottomans · Details.
   - Classification: financial.
   - Source: [packages/features-community/src/render.ts](../packages/features-community/src/render.ts).

52. **Community · custom reward pending** — READY FOR OWNER REVIEW
   - [Desktop](community/giveaway-pending-desktop.png) · [Mobile](community/giveaway-pending-mobile.png)
   - Scenario: Draw selected one actual winner from a maximum of three; organizer fulfillment remains pending.
   - Controls: Mark Reward Fulfilled · Details.
   - Classification: financial.
   - Source: [packages/features-community/src/render.ts](../packages/features-community/src/render.ts).

53. **Community · no-entry draw** — READY FOR OWNER REVIEW
   - [Desktop](community/giveaway-empty-desktop.png) · [Mobile](community/giveaway-empty-mobile.png)
   - Scenario: Giveaway closes with zero entrants; no winner or reward is claimed.
   - Controls: Details.
   - Classification: financial.
   - Source: [packages/features-community/src/render.ts](../packages/features-community/src/render.ts).

54. **Community · long-text overflow** — READY FOR OWNER REVIEW
   - [Desktop](community/long-text-desktop.png) · [Mobile](community/long-text-mobile.png)
   - Scenario: Maximum-length suggestion with unbroken wide text and long submitted name; full content stays in Details.
   - Controls: Vote · Update Status · Details.
   - Classification: interactive.
   - Source: [packages/features-community/src/render.ts](../packages/features-community/src/render.ts).

55. **Community · private ballot** — READY FOR OWNER REVIEW
   - [Desktop](community/poll-private-desktop.png) · [Mobile](community/poll-private-mobile.png)
   - Scenario: Actual adapter response to vote; fictional member has ordinary member permissions.
   - Controls: Your ballot.
   - Classification: interactive.
   - Source: [apps/bot/src/discord/community-coordinator.ts](../apps/bot/src/discord/community-coordinator.ts).

56. **Community · private paid entry confirmation** — READY FOR OWNER REVIEW
   - [Desktop](community/giveaway-confirm-desktop.png) · [Mobile](community/giveaway-confirm-mobile.png)
   - Scenario: Actual adapter response to enter; fictional member has ordinary member permissions.
   - Controls: Confirm Entry.
   - Classification: financial.
   - Source: [apps/bot/src/discord/community-coordinator.ts](../apps/bot/src/discord/community-coordinator.ts).

57. **Community · protected staff action** — READY FOR OWNER REVIEW
   - [Desktop](community/staff-denied-desktop.png) · [Mobile](community/staff-denied-mobile.png)
   - Scenario: Actual adapter response to answer; fictional member has ordinary member permissions.
   - Controls: None.
   - Classification: moderation-related.
   - Source: [apps/bot/src/discord/community-coordinator.ts](../apps/bot/src/discord/community-coordinator.ts).

58. **Chairisms · public publication** — READY FOR OWNER REVIEW
   - [Desktop](chairisms/publication-desktop.png) · [Mobile](chairisms/publication-mobile.png)
   - Scenario: Actual deterministic Chairism attachment with fictional source text; source channel details remain hidden. The optional image fixture reuses packaged lounge artwork as an explicitly fictional source attachment.
   - Controls: None.
   - Classification: informational.
   - Source: [packages/features-chairisms/src/render.ts](../packages/features-chairisms/src/render.ts).

59. **Chairisms · quote with replied message** — READY FOR OWNER REVIEW
   - [Desktop](chairisms/reply-desktop.png) · [Mobile](chairisms/reply-mobile.png)
   - Scenario: Actual deterministic Chairism attachment with fictional source text; source channel details remain hidden. The optional image fixture reuses packaged lounge artwork as an explicitly fictional source attachment.
   - Controls: None.
   - Classification: informational.
   - Source: [packages/features-chairisms/src/render.ts](../packages/features-chairisms/src/render.ts).

60. **Chairisms · optional reply and image** — READY FOR OWNER REVIEW
   - [Desktop](chairisms/image-desktop.png) · [Mobile](chairisms/image-mobile.png)
   - Scenario: Actual deterministic Chairism attachment with fictional source text; source channel details remain hidden. The optional image fixture reuses packaged lounge artwork as an explicitly fictional source attachment.
   - Controls: None.
   - Classification: informational.
   - Source: [packages/features-chairisms/src/render.ts](../packages/features-chairisms/src/render.ts).

61. **Chairisms · long names and quote** — READY FOR OWNER REVIEW
   - [Desktop](chairisms/long-text-desktop.png) · [Mobile](chairisms/long-text-mobile.png)
   - Scenario: Actual deterministic Chairism attachment with fictional source text; source channel details remain hidden. The optional image fixture reuses packaged lounge artwork as an explicitly fictional source attachment.
   - Controls: None.
   - Classification: informational.
   - Source: [packages/features-chairisms/src/render.ts](../packages/features-chairisms/src/render.ts).

62. **Chairisms · private source selector** — READY FOR OWNER REVIEW
   - [Desktop](chairisms/selector-desktop.png) · [Mobile](chairisms/selector-mobile.png)
   - Scenario: Actual adapter response with injected fixture boundaries; private state, no live source fetch or Discord publication.
   - Controls: This Message · Include Replied Message · Include Image · Include Reply + Image.
   - Classification: interactive.
   - Source: [apps/bot/src/discord/chairisms-coordinator.ts](../apps/bot/src/discord/chairisms-coordinator.ts).

63. **Chairisms · protected source rejection** — READY FOR OWNER REVIEW
   - [Desktop](chairisms/protected-desktop.png) · [Mobile](chairisms/protected-mobile.png)
   - Scenario: Actual adapter response with injected fixture boundaries; private state, no live source fetch or Discord publication.
   - Controls: None.
   - Classification: informational.
   - Source: [apps/bot/src/discord/chairisms-coordinator.ts](../apps/bot/src/discord/chairisms-coordinator.ts).

64. **Chairisms · interrupted publication** — READY FOR OWNER REVIEW
   - [Desktop](chairisms/error-desktop.png) · [Mobile](chairisms/error-mobile.png)
   - Scenario: Actual adapter response with injected fixture boundaries; private state, no live source fetch or Discord publication.
   - Controls: None.
   - Classification: informational.
   - Source: [apps/bot/src/discord/chairisms-coordinator.ts](../apps/bot/src/discord/chairisms-coordinator.ts).

65. **Chairisms · private empty browser** — READY FOR OWNER REVIEW
   - [Desktop](chairisms/empty-desktop.png) · [Mobile](chairisms/empty-mobile.png)
   - Scenario: Actual adapter response with injected fixture boundaries; private state, no live source fetch or Discord publication.
   - Controls: None.
   - Classification: informational.
   - Source: [apps/bot/src/discord/chairisms-coordinator.ts](../apps/bot/src/discord/chairisms-coordinator.ts).

66. **Superlatives · season winner** — READY FOR OWNER REVIEW
   - [Desktop](superlative/winner-desktop.png) · [Mobile](superlative/winner-mobile.png)
   - Scenario: Saved season fixture: closed; anonymous nominations/ballots; no Ottoman prizes.
   - Controls: Details.
   - Classification: informational.
   - Source: [packages/features-community/src/render.ts](../packages/features-community/src/render.ts).

67. **Superlatives · nomination phase** — READY FOR OWNER REVIEW
   - [Desktop](superlative/nominations-desktop.png) · [Mobile](superlative/nominations-mobile.png)
   - Scenario: Saved season fixture: nominations; anonymous nominations/ballots; no Ottoman prizes.
   - Controls: Nominate · Details.
   - Classification: interactive.
   - Source: [packages/features-community/src/render.ts](../packages/features-community/src/render.ts).

68. **Superlatives · voting phase** — READY FOR OWNER REVIEW
   - [Desktop](superlative/voting-desktop.png) · [Mobile](superlative/voting-mobile.png)
   - Scenario: Saved season fixture: voting; anonymous nominations/ballots; no Ottoman prizes.
   - Controls: Vote · Details.
   - Classification: interactive.
   - Source: [packages/features-community/src/render.ts](../packages/features-community/src/render.ts).

69. **Superlatives · no nominations** — READY FOR OWNER REVIEW
   - [Desktop](superlative/empty-desktop.png) · [Mobile](superlative/empty-mobile.png)
   - Scenario: Saved season fixture: closed; no nominations and no badge award.
   - Controls: Details.
   - Classification: informational.
   - Source: [packages/features-community/src/render.ts](../packages/features-community/src/render.ts).

70. **Superlatives · long winner and category** — READY FOR OWNER REVIEW
   - [Desktop](superlative/long-name-desktop.png) · [Mobile](superlative/long-name-mobile.png)
   - Scenario: Saved season fixture: closed; 80-character wide category and winner names retained in Details.
   - Controls: Details.
   - Classification: informational.
   - Source: [packages/features-community/src/render.ts](../packages/features-community/src/render.ts).

## Internal diagnostics — no visual review required

- Estate — waiting safely: Internal recovery projection only: reserved assets delay execution. No publication intent is created for this state. [Desktop](family-events/estate-waiting-desktop.png) · [Mobile](family-events/estate-waiting-mobile.png).
- Estate — canceled after return: Internal recovery projection only: a confirmed return cancels execution. No publication intent is created for this state. [Desktop](family-events/estate-returned-desktop.png) · [Mobile](family-events/estate-returned-mobile.png).

## Engineering evidence

[Current visual correction report](VISUAL_CORRECTIONS.md). [Prior integration and validation report](INTEGRATION_REPORT.md). [Machine-readable review manifest](manifest.json). [Frozen visual authority](../docs/APPROVED_VISUAL_SYSTEM.md).
