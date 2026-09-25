# Angrier Jordan — Implementation Checkpoint 03

Date: 2026-09-21
Status: PASS

## Scope completed

This checkpoint implements the onboarding/rejoin/self-role foundation against the locked 2026-09-21 product contract.

### Rules gate and access restoration
- Every guild join/rejoin resets the rules-acknowledgment gate.
- `/rules` is wired to an ephemeral Discord Components V2 acknowledgment surface.
- Acknowledgment grants the configured `roles.member_access` role only when no active punishment must be resumed.
- Optional next steps remain `/roles`, `/lore`, `/introduce`, and `/tutorial`; none of them block onboarding.

### Leave/rejoin persistence
- Leaving does not delete member/account state.
- On leave, the bot snapshots eligible Discord role state and nickname.
- Self-selected and eligible non-staff manual/custom roles are restorable after rules acknowledgment.
- Staff-capability roles are classified conservatively and are never auto-restored.
- Managed/booster roles are not snapshotted for restoration; Discord remains authoritative for boost state.
- Temporary role snapshots preserve their wall-clock expiry and restore only if still valid.
- Missing/unmanageable roles and nickname failures do not block rejoin and are audit logged.

### Punishment persistence
- Active jail sentences gain persisted pause fields.
- Leaving pauses the remaining sentence duration.
- Rules acknowledgment on return resumes the remaining duration from the new return time.
- A punished returning member receives the Jailed state instead of normal member access.
- Normal access/role restoration can be invoked after the punishment has ended through the post-punishment restore plan.

### `/roles`
- `/roles` remains member-facing only and ephemeral.
- The panel is driven by the database-backed `SelfRolePanel` config.
- Categories are shown in one Components V2 panel/message, using multiple containers when needed.
- Single-choice categories support replacement and clearing.
- Multi-select categories have no product cap; options are segmented into Discord-safe groups of 25 while preserving selections in other segments.
- Changes apply immediately and are persisted.
- A self-select role must exist, be editable by Angrier Jordan, be unmanaged, and have zero Discord permissions before assignment.
- The seed creates the seven locked initial categories with no invented options: Gender, Age, Regions, Vices, Personalities, Pings, DM Status.

## Database changes
Migration `0003_onboarding_rejoin_roles` adds:
- `MemberPresenceState`
- `SelfRoleSelection`
- `MemberRoleSnapshot`
- `JailSentence.pausedAt`
- `JailSentence.pausedRemainingSeconds`

Schema version is now `0003_onboarding_rejoin_roles`.

## Production wiring
- Added `DiscordOnboardingCoordinator`.
- Added `GuildMembers` gateway intent for join/remove snapshots.
- Added `/rules`, `/roles`, rules acknowledgment button, and role select routing behind `ENABLE_ONBOARDING_SMOKE=true`.
- WYR remains independently gated by `ENABLE_WYR_SMOKE=true`.
- Live Discord/PostgreSQL smoke execution still requires real credentials and the Discord Server Members privileged intent to be enabled for the application.

## Verification
- Registry validation: PASS — 192 conceptual interactions / 167 settings.
- Discord registration generation: PASS — 65 application-command definitions.
- Production visual manifest: PASS — 348 assets/templates.
- Domain TypeScript typecheck: PASS.
- Runtime/domain tests: PASS — 23/23.
- Full preflight: PASS.
- Production wiring validation: PASS.

## Next checkpoint
Implement moderation/jail execution around the persisted foundation: jail send/release/extend/reduce, role suspension/restoration, Hotseat permissions/reconciliation, case linkage, restart-safe sentence expiry, and post-punishment access restoration.
