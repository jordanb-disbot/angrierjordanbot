# Gate B integration and owner review — 2026-09-25

Gate B is awaiting owner visual/product approval. This package contains 61 numbered owner-review items, 122 desktop/mobile review images, and two internal estate diagnostics (four images). They are deterministic fictional fixtures, not live Discord captures. Start with [the review gallery](index.html) or [the numbered review document](OWNER_REVIEW.md).

## Engineering corrections

- Family now enforces `family.use`, projects typed reserved/refunded/consumed items, and reads sessions, votes, winner identity and escrow within one read-only RepeatableRead snapshot. A real PostgreSQL barrier regression checks a simultaneous proposal acceptance cannot mix old session state with new escrow state.
- Family adoption, estate and auction cards distinguish pending, canceled, refunded and committed outcomes. Beneficiary messages no longer substitute a raw ID for a name; actual mentions remain in the companion embed. Large Family trees point to the complete text attachment.
- Shared grapheme-safe width handling prevents unbroken names, wide characters and large amounts from overflowing the reviewed panels. Exact financial amounts stay readable instead of shrinking to tiny type. Empty Superlatives no longer claim badges were awarded; custom giveaway results explicitly await fulfillment.
- Disabled Community recovery retains durable work. Disabled Casino/Lottery, Party and Crime new announcements remain retryable rather than publishing. Existing Crime settlement, restitution, wallet release, sentence expiry and existing-message refresh obligations continue safely. Family remains disabled before census/recovery or destructive estate actions; incomplete membership censuses still block execution.
- Disabled Spotlight announcements now retain retry obligations. Three activity-channel exclusion settings and three Spotlight posting settings now affect runtime behavior. The default posting window stays 17–22 Mountain; configured learned windows remain supported. Persisted freeze times do not change after a settings edit or restart.
- Dashboard code generation now uses the actual UI control kinds. Complex JSON controls return to their intended read-only “Specialized editor pending” presentation; blank nullable channel/role values normalize correctly. No new custom editor or dashboard acceptance is implied.
- Profile/record tutorial registry links and help validation are synchronized. Runtime source manifest coverage now includes Casino, Profiles and shared text layout. Hashed source line endings are pinned for Windows/Linux consistency.

## Cross-feature integration evidence

| Contract | Audit result |
| --- | --- |
| Registry → generated commands → routing | 30 Gate B command leaves and all 35 option names, required flags, types, limits and choices matched; coordinator routes reviewed. Race remains `!race`, Line `!line`, Fight `/fight`. No retired command restored. |
| Settings → generated controls → runtime | 244 generated defaults and write policies matched. Control vocabulary and six ignored Profile/Spotlight settings corrected. Fixed Family rules remain locked; editable auction/cooldown values are consumed. Complex editors remain explicitly blocked for later Gate D. |
| Capabilities → enforcement | Family capability corrected; Community administrative controls retain current role checks; Chairisms publication rechecks source access; Casino/Lottery and Profiles use shared capabilities. Dashboard remains owner/current Discord Administrator only. |
| Scheduler → recovery | New-publication gates corrected without dropping jobs or disabling committed financial recovery. Shared delivery claims/markers prevent duplicate public announcements; unresolved sends are not blindly resent. Family census and fresh membership generation guards remain mandatory. |
| Persistence → projections | Typed ITEM quantities remain separate from money. No migration added or rewritten; migrations 0012, 0019 and 0020 preserved. Family snapshot and Spotlight immutable-time regressions added. |
| Help → behavior | Help registry validation includes Profiles plus all existing Family, Community, Chairisms, Casino and event content. Two missing Profile/Record tutorial links filled. General tutorial runtime remains later roadmap scope. |
| Renderers → matrix → manifest | 192 presentation mappings reviewed structurally; current Gate B renderer paths verified. 388 asset/template/source hashes verified. All 38 immutable approved visual files remain unchanged. “COVERED” in the legacy matrix describes mapping coverage, not owner approval. |

## Visual audit

The current lounge shell, packaged art, framing, typography, materials and lighting were compared with the frozen Line/Race/Fight/standard references. No approved reference, brand asset or event behavior was redesigned. Every mobile fixture was visually inspected by its feature workstream; desktop fixtures and boundary cases were sampled centrally. Automated checks verify all 126 image dimensions and hashes, source existence, statuses and unique review IDs. Long names, exact large currency values, empty states, multiple participants, protected actions and financial/destructive outcomes are included explicitly.

Family/Casino/Profile review images are the actual runtime attachment. Their native Discord controls are listed in metadata and the gallery; they are not fabricated into screenshots. Community/Chairisms/Superlative windows are labeled fixture compositions using actual adapter payload/control objects. Full payload transcripts remain available where relevant. Final live Discord layout/permissions require later owner participation.

Owner preferences remain the spacious Family/fixed Community layout, tall maximum-length Chairism and multi-winner Spotlight previews, and public placement/wording of staff-only Community controls. These are review choices, not authorization bypasses. No approval is inferred from engineering completion.

## Local Railway timeout investigation

A bounded read-only probe of the dedicated disposable test database completed successfully in approximately 17 seconds. It used only the ignored `.env.test.local` TEST_DATABASE_URL and emitted no connection details.

| Probe | Measured duration |
| --- | --- |
| Cold connection | 4,642 ms |
| Five warm SELECT 1 queries | 938 / 533 / 342 / 361 / 550 ms |
| Two parallel SELECT 1 queries | 4,705 ms |
| Warm read-only transaction | 2,139 ms |
| Connection-pressure query | 1,166 ms |

The database showed 10 connections out of capacity 100, with one active connection. This does not support pool exhaustion at the sampled moment. Public-network round trips and lazy connection startup are the strongest observed contributors; serial application transactions with many queries can be sensitive to that latency. Resource contention or intermittent timing cannot be conclusively excluded by a bounded sample. Database readiness succeeded. Tests already serialize suites while retaining intentional within-suite concurrency.

No production limit, timeout, assertion or concurrency test was weakened. A warm-up alone does not remove sustained round-trip cost, so no speculative harness workaround was added. Earlier local Family/job runs timed out while the complete previous CI run passed the same assertions and limits. Current implementation CI results are recorded below once complete; local Railway is not claimed green.

## Validation

- Local full workspace/adapters/dashboard build and type checks: PASS.
- Local preflight: PASS — 212 runtime tests, 155 adapter tests; zero failures/skips.
- Generators: 192 commands, 244 settings, 53 capabilities; generated controls/contracts current.
- Content/help/registry/production-wiring/Fight-source/golden validation: PASS. Earlier-phase static wiring checks are supplemented by the semantic audit above; they alone do not prove full Gate B integration.
- Visual manifest: 388 entries PASS. Approved visual lock: 38 immutable files PASS.
- Review package: 61 owner items + two internal diagnostics; 126 PNGs verified.
- Secret/local-file scan: no findings; dedicated test environment remains ignored.
- Current implementation CI at `0409bc7`: [Build and acceptance run 36210640351](https://github.com/jordanb-disbot/angrierjordanbot/actions/runs/36210640351) PASS, acceptance and container jobs both successful. PostgreSQL: **198 passed across 18 suites, zero failures/skips**; this includes the new Family read/accept snapshot regression and Spotlight configured-time/restart regression. Family: 31 tests including suite parent; Profiles: 8 including suite parent. The full ledger/escrow, persisted Line, Race/Fight, Casino, scheduler, Community and Chairisms regression ran under unchanged limits.
- CI runtime/adapters independently repeated **212/155 PASS**; production build, generators and container content/non-root/fail-closed smoke passed. Full dependency audit: **zero vulnerabilities**.
- Browser review smoke: feature/search filters select the intended protected-state item and both image links resolve. No interactive fixture control performs a production action.

## Scope and readiness

Family and all unfinished/unaccepted production flags remain OFF. No production deployment, Discord live acceptance, later gated phase, destructive data migration or owner approval occurred. Later roadmap work includes specialized dashboard workflows/editors, music/provider acceptance and final live checks; they are not reclassified as completed here. No known engineering issue blocks this Gate B handoff. Once the owner approves Gate B, the repository is technically ready to resume the remaining gated roadmap; it is not ready for immediate production launch. The local Railway timing discrepancy remains documented above.

Implementation commits pushed: `48a41f2` (integration/state/settings/recovery fixes), `0409bc7` (portable hashed sources). Review artifacts are committed separately from implementation.
