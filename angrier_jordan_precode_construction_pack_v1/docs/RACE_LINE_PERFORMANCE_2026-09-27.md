# Race / Line responsiveness and entry refinement

Owner requested this implementation and a push to master. `/race` is restored alongside `!race` by the newer direct instruction; both call the same publication function and Prisma Race repository. Line remains prefix-only. No schema, wager, payout, timer, eligibility, opt-in notification or settlement rules changed.

## Diagnosed cost and changes

- OPEN entry/update cards formerly assembled and encoded up to 61 full-width frames before upload. Race and Line entry states now use a single deterministic PNG with the saved closing deadline. Join/check-in refreshes use this same path. Fight's waiting animation and approved Race/Line live sequences remain unchanged.
- The single serial renderer previously queued static replies behind prepared/live GIFs. Two bounded serial workers isolate static images from animations; at most one animation and one static render run concurrently. Race frame preparation yields to the event loop every 16 frames, and background preparation begins after the foreground card edit/publication.
- Event/Line acknowledgements now precede cold server bootstrap and configuration reads. Slash Race, rules, roster and wager submission defer privately; joins/check-ins/host mutations defer their message update. Betting buttons display only their modal immediately, with all authorization, session and funds validation retained at submit.
- Independent configuration/eligibility reads are parallel. Early routing avoids repeating global jail/crime reads before the coordinators' complete eligibility checks. Security/permission decisions are not cached. Required fresh Discord permission/notification reads remain intact.
- Prefix invocations provide typing feedback. Slash Race publishes the same public image/control payload, with the same safe role mention and channel slot. Concurrent prefix/slash requests share one in-process publication promise; persistent serializable active-session checks still protect cross-worker starts and retries. Existing recovery/receipt logic remains in place.

## Entry visual changes

Race uses a six-lane grid, wheelchair artwork, open-seat placeholders, clear member names, entry deadline, pool and action areas. Line separates host/count, ready and waiting members, deadline/status and host controls. Frames remain 1200×640 with approved lounge art, teal/emerald and brass, Space Grotesk/Inter. No waiting flashes or animation; existing live motion/finales are preserved. Review images: `review-entry-refinement/index.html`. Owner approved this refinement after commit `f98ad10`. Immutable visual references are recorded in `docs/approved_visuals/race-line-entry-2026-09-27.json`. Live production latency remains to be measured.

## Validation and limits

- Bot build, registry, command shapes, help, assets, immutable visual locks and workspace/domain type checks passed.
- Targeted tests cover acknowledgement before blocked bootstrap/DB, prefix/slash collision, single-frame entry/check-in output, isolated renderer queues, current-state refresh/recovery, aliases, visual generation and unchanged live timelines. Updated old waiting-GIF/roster assertions pass.
- PostgreSQL Race/Line acceptance: 23 tests passed using only `.env.test.local` TEST_DATABASE_URL and isolated test schemas, including concurrent starts, joins, wagers, settlement, Line check-ins and recovery.
- Local render-only samples (milliseconds): Race 299 cold / 158 / 146; Line 142 / 136 / 126. These exclude production DB and Discord network latency and are not a live latency guarantee.
- Broad preflight exposed four unrelated pre-existing failures: non-daily restriction mock, Spotlight compact-width expectation in Gate B completeness, Gate B centered bounds, and Spotlight raster width. Their source implementations were not changed in this pass. The Race/Line failures caused by retired waiting-GIF/private-roster expectations were updated and rerun successfully.

Normal worker deployment rebuilds and registers `/race`. No new flags or maintenance run: retain existing `ENABLE_EVENTS_SMOKE=true` and `ENABLE_SPECIAL_SMOKE=true`. Reload Discord if command discovery is stale. Two renderer workers add bounded memory overhead; optional `EVENT_PERF=1` can expose sanitized stage timings during live acceptance but is not required for operation.
