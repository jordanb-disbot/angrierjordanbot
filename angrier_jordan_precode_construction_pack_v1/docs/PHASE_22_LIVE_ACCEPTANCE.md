# Phase 22 live acceptance — pending owner participation

These checks are prepared in advance. They have not been performed in the live Chairs server. Production gates remain off; do not enable or deploy merely to execute this checklist.

## Safe staging prerequisites

Use a separately authorized Discord test server and approved test accounts. Apply migrations through the controlled migration workflow. Confirm current member roles, confinement and feature configuration. Verify the private introductions editing flow and read-only introduction channel configuration. Never place tokens or database URLs in this document.

## Introductions

- Bare /introduce opens private Create/Edit/Preview controls. Another member cannot use those controls.
- Required/optional fields, maximum lengths, paginated forms and a long display name render correctly.
- Preview matches the public card. Nothing is public until Publish.
- Edit updates the same confirmed message; concurrent edits reject stale revisions. Restart preserves unfinished drafts.
- Simulate an uncertain send and verify recovery does not blindly duplicate the introduction.
- Revoke eligibility while editing; publication is refused. Published configuration changes invalidate stale forms.

## Learning and Lore

- Help and learning paths show only currently enabled, permitted commands, including authorized Special Commands.
- Search and pagination expose commands beyond the first 25. Revoking a role removes its custom commands immediately.
- Continue restores progress; Restart lesson and Restart path affect only the requesting member and selected scope.
- Practice does not execute a command, spend Ottomans, grant rewards or mutate server settings.
- After rules acknowledgment, optional learning controls appear only after access is restored and eligibility checks pass.
- Lore remains unavailable while authentic content is absent. Do not author placeholder canon for acceptance.
- After owner-authored prose is approved separately: publish the three external chapter records with versions, verify all text/pagination, resume, version changes and once-only Chair Historian completion. No Ottoman reward.

## Social / Haiku

- All 38 ordinary reactions are searchable by intuitive names/aliases using /social react.
- Reactions requiring a member reject missing targets; fresh permissions, restrictions and throttle still apply.
- Roast checks current opt-out at queue and delivery time; Roast Back is one-use and survives restart safely.
- /social notmad is restricted to the actual current server owner, regardless of privileged role names.
- Passive Haiku observes only eligible messages, shares the channel cooldown and stores no observed chat text.

## TLDR

- Wrong-channel requests return a private redirect. Revoke history permission during collection and verify output is withheld.
- No ordinary chat archive is created. Bots, commands and system messages are excluded.
- Current snapshots are explicitly labeled limited activity counts; they must not imply that a conversation summary provider is active.
- Broader structured notable-event projection and actual summary-provider acceptance remain outstanding before launch enablement.

## Review evidence

Record Discord screenshots, actual message IDs, test account roles, gate/config snapshot and validation result in a separate acceptance record without credentials. Deterministic engineering fixtures live in review-phase-22 and are not substitutes for this live acceptance.
