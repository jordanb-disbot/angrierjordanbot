# Approved visual release — 2026-09-27

Owner explicitly requested pushing all approvals to production. This authorizes deployment of the approved Chairisms, Profile and Race/Line presentation revisions, superseding the deployment restriction attached to their original visual-only approvals. It does not enable unfinished feature families.

Included: Chairisms member portraits and centered typography; Profile avatar, approved palette and aligned tables; six wheelchair racers; smooth 20fps Race/Line sequences with shared artwork and bounded rendering memory. Earlier approved Gate A/B and Music artwork remain in the repository; Music stays disabled pending functional acceptance.

Verified production target: Railway `impartial-nature`, production environment, main service `angrierjordanbot`, repository `jordanb-disbot/angrierjordanbot`, guild `1524964384642957432`. Existing worker flags include Chairisms, Events, Profiles, Introductions and Learning. Special/Line is not enabled in the inspected worker variables. No feature flags or database settings were changed by this release.

Operator steps after the main worker deploys the release commit:

1. Reload Discord with Ctrl+R. Verify a new Chairism, `/profile`, and `!race` in the configured main chat. Existing posted images do not automatically regenerate.
2. Profiles already has its worker flag. If the command reports disabled configuration, run `node scripts/enable-production-profiles.mjs` once through maintenance and require `PASS: features.spotlight=false.`, `PASS: features.profiles=true.`, and `PASS: features.activity=true.` in its logs. This deliberately leaves Spotlight off.
3. Line requires a dedicated guarded production configuration script before activation: verify main-chat permissions, the opt-in Line Ping mapping and applicable command permissions, then audit/verify `features.special_commands`, `special_commands.enabled`, and `features.line`. After configuration PASS, set `ENABLE_SPECIAL_SMOKE=true` on the main worker and redeploy it. This shared flag also exposes enabled Special Commands, so inspect their definitions before enabling. Do not copy test role IDs or use the local notification script against production.
4. Keep Onboarding/Roles pending production access-gate verification; keep the old role bot until live `/roles` succeeds. Keep Jail/Moderation pending production permission, evidence-key and live acceptance checks. Keep Music disabled pending provider and functional acceptance.

Validation before push: bot TypeScript build; 80 affected adapter tests; asset and immutable approval validators. No schema migration is introduced by this release. Rollback: redeploy the preceding worker commit `6684259b986a3252816a25421a76a4c118f45946`; no configuration reversal is required for this visual-only release.
