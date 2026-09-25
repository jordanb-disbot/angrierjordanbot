# Phase 16 — persisted party games and WYR reconciliation

Status: implementation published; feature remains disabled pending the coordinated test run and integration. Bot TypeScript `--noEmit` passes. This document will record the final targeted test results when that run finishes.

## Authority and content

Canonical build spec sections 23–25 and the corresponding Feature Flow Book govern the interactions. Gate A's approved visual system remains the visual authority: the renderer reuses the existing event visual helpers, lounge art, Space Grotesk headings and Inter body. Rendering is deterministic and uses the current public state. User text is escaped. Long contributions and complete story text remain available through the Details attachment.

The existing authored banks are copied into `packages/features-party/content` without rewriting their content:

| Runtime game | Authored source | Entries |
| --- | --- | ---: |
| truth | Core prompt pack `truth_1500.json` | 1,500 |
| dare | Core prompt pack `dare_1200.json` | 1,200 |
| wwyd | Core prompt pack `wwyd_1500.json` | 1,500 |
| finishsentence | Acceleration content `finish_sentence_500.json` | 500 |
| wyr | Core prompt pack `wyr_continuation_WYR-0461_to_2000.json` | 1,540 |

`seedPartyContent(db)` inserts 6,240 source records in batches with `skipDuplicates`. Existing dashboard edits and disabled records are preserved. WYR's existing original sample records remain in place; this source supplies the continuation rather than claiming a complete original 2,000-entry bank. Prompt selection excludes the recent history when possible and never reuses the immediately replayed prompt. No generated substitute pool is introduced.

## Persistence and behavior

The new party repository uses existing `GameSession`, `GameParticipant`, `Vote`, `ContentEntry`, `ContentUseHistory`, `ScheduledJob`, `OperationReceipt` and `MemberGameStats` records. It reuses shared Session, Timer, Voting, atomic operation and Delivery engines. No Prisma model additions are required. Migration `0016_party_exclusivity` enforces one active public WYR/Truth or Dare/WWYD/Finish the Sentence/One Word Story round per guild/channel. FMK private drafts and their independent audience votes do not occupy that slot: a fresh FMK trio may be drawn while the earlier assignment's vote stays open.

All interactive entry points require `features.party_games=true`, the configured `channels.games_channel`, the shared member capability, and the injected containment/eligibility check. Public controls bind to their original guild, channel and message. Private FMK controls additionally bind to the chooser. Mentions are suppressed. Eligibility checks fetch current human members; FMK rechecks every selected subject before making choices public. No FMK opt-out is added.

Truth or Dare immediately names its optional target (self by default), without acceptance. Only that target chooses Truth/Dare, answers through a modal, or skips. The answer is named in the card. Replay retains the eligible target and draws a fresh prompt after the target chooses again.

WWYD uses the authored options, a 60-second hidden vote and one host-only 30-second extension. Finish the Sentence begins with the host's Random/Custom choice, accepts one private editable submission per member for 60 seconds plus one host extension, then exposes the locked entries for voting. Custom replay requires new modal text. One Word Story accepts 10–200 words (default 50), forbids consecutive turns by the same member, and opens a 60-second vote at the target length. Creative entries reject self-votes, use a 30-second runoff on a positive-vote tie, and explicitly disclose a deterministic seeded tie resolution if the runoff ties again. An initially empty ballot produces no winner; an empty runoff still resolves the already-established tie with the saved seed and explicit disclosure.

FMK privately selects three distinct eligible members. The chooser assigns Fuck, then Marry; the remaining member becomes Kill. Only Submit makes the assignments public and increments subject counters and chooser plays. The assignment card has an independent anonymous/editable Agree/Disagree vote for 180 seconds plus one host-only 30-second extension. The chooser cannot vote. Exact ties are Split Decision, with no runoff, winner or win statistic. Play Again draws three members excluding the previous trio and leaves its assignments and vote intact. A server needs three other eligible members for that replay.

Votes are editable, anonymous publicly, and hidden until close. Ballots are persisted under `round:<n>` so runoff votes preserve the previous ballots. Deadline checks happen on every mutation, independently of scheduler timing. Atomic operation receipts make retries idempotent. Publication intent is committed alongside each newly public party round; the shared delivery marker reconciles publication retries.

## Integration contract

Production wiring is owned by the integration agent:

- Include `packages/features-party/src` in runtime test compilation and copy `packages/features-party/content` to both compiled output trees. Existing event art/theme runtime copies remain required.
- Call `seedPartyContent(db)` during test/smoke bootstrap before enabling party games.
- Keep `features.party_games` default false and the production `ENABLE_PARTY_SMOKE` gate false. `games.one_active_public_party_round` must remain the canonical invariant, consistent with the database index.
- Construct `new PrismaPartyRepository(db)` and `new DiscordPartyCoordinator(repo, config, eligible)`. Route the five `PARTY_COMMANDS` plus `party:` button/modal/select controls to `handle`.
- Register `party.publish` with `party.publish(client, job.id)`. Its payload contains `guildId`, `channelId`, `sessionId`.
- Register `party.advance` with `party.advance(client, guildId, sessionId, round)`. Its payload contains those identifiers. `sweep(client)` repairs due phases and refreshes saved active messages after restart.
- Construct the existing WYR coordinator with `(wyrService, config, eligible, new PrismaWyrPublicationRepository(db))`, preserving its existing smoke gate as well. Register `wyr.close` with `wyr.advance(client, sessionId)` and `wyr.publish` with `wyr.publish(client, sessionId)`. WYR persists the original deferred interaction message ID, close job and publish job in the same creation transaction, and updates the close job due date on host extension.
- Add `party` to the redacted dedicated-TEST PostgreSQL runner. No credentials are printed or read from production environment files.

WYR remains the existing package and accepted flow. Reconciliation adds shared Voting behavior, host-only extension, deadline enforcement, fresh replay prompt exclusion, server/channel/message/containment binding and the durable close job. Initial publication uses shared Delivery receipts and the saved original interaction message. After an uncertain edit or process restart, recovery safely edits that same bot-owned message, rather than sending another card. A send fallback for sessions created without an interaction uses the usual marker reconciliation. Its old authored layout is retained with the current approved fonts.

## Stats projection

Creative winners increment both the specific game record and the `party_games` aggregate. Generic total wins must exclude that aggregate when also summing specific game wins, to avoid double counting. Participants record a played round even when nobody votes; no Ottomans are awarded.

FMK subjects use `MemberGameStats(gameKey='fmk_subject').metadata` with `fucked`, `married`, `killed`. Choosers use `gameKey='fmk'`, `plays`, and metadata `agreementRounds`, `agreementSum`, `averageAgreement`, `highestAgreement`, `lowestAgreement`. Agreement summaries include completed audience votes with at least one ballot. Subject counters are snapshotted onto the published assignment card. FMK never increments wins. Profile and leaderboard projection of these fields belongs to the integration layer.

## Validation

Authored tests cover pure voting/story/FM​K rules, escaped actual-state rendering, disabled/channel/containment guards, message binding, concurrency, deadline enforcement, anonymous edits, replay, persisted runoff, restart reconstruction, source seed preservation, creative win accounting and private FMK publication/counters. PostgreSQL tests create an isolated schema from the ignored `.env.test.local` `TEST_DATABASE_URL`, migrate it and drop it in `finally`.

Pending coordinated execution: party/WYR runtime tests, party adapter tests, and the redacted party PostgreSQL suite. Features remain off throughout.
