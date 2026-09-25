# Phase 14 — solo games

Implements `/hangman`, `/wordscramble`, `/mastermind` and `/minesweeper` behind `features.solo_games` and the production coordinator's disabled-by-default smoke gate. This checkpoint does not enable these games or claim live Discord acceptance.

## Canonical contracts and ordinary defaults

The master specification fixes the four games, small below-grind rewards, per-game records and fresh-round Play Again behavior. It explicitly leaves textbook puzzle parameters unspecified. The following are ordinary implementation defaults, not new owner decisions:

| Game | Rules | Recorded results |
| --- | --- | --- |
| Hangman | Lounge word; one letter per guess; six incorrect letters loses; duplicates do not consume a turn | Wins, current/longest streak |
| Word Scramble | Shuffled lounge word; six distinct whole-word guesses | Wins, fastest solve in milliseconds |
| Mastermind | Four digits from 1–6, repeated digits allowed; ten distinct guesses; exact/misplaced feedback counts each secret digit once | Wins, fewest guesses |
| Minesweeper | 4×4 with three mines or 5×5 with five; first revealed cell safe; flags toggle; zero-cell flood reveal; clear all safe cells to win | Wins and fastest clear separately by board size |

All games are free to enter. Defaults are one Ottoman per win and ten Ottomans per member across all solo games in a rolling 24-hour window. Hard bounds are five Ottomans per win and twenty per rolling window; these are intentionally below ordinary economy activity rewards. Reaching the cap still records wins. Loss, quit and expiration pay nothing and reset the relevant win streak. The standard round timeout is 600 seconds, configurable from 60–3600 seconds. Public game results never reveal the live solution; closed results may show the answer.

One active solo puzzle per member per server prevents parallel puzzle farming. A finished round is immutable. Play Again creates a new session/result, preserves only valid board size and generates a new word/code/board order. Invalid carried settings reject instead of silently substituting. Payouts and timeout policy are captured at round creation; replays revalidate current policy.

## Persistence and shared engines

No new Prisma model or migration is needed. `GameSession` stores secret puzzle state, deadline, version, reward policy and final payout. `GameParticipant` stores the player. `PrismaAtomicOperations` provides serializable transactions and request receipts. `SessionEngine` supplies optimistic transitions. `TimerEngine` computes deadlines and `ScheduledJob` persists `solo.expire` work. `LedgerEngine` posts balanced exactly-once rewards; no direct wallet writes are used. Final result, payout, stats and record-observation job commit together.

Every move validates server, channel, owner, session version and deadline inside the transaction. Concurrent requests cannot both finalize a puzzle, double-pay it or acquire the same member's active slot. Persisted mine order, placed mines, guesses and deadline survive restarts. Expiration is idempotent and does not silently generate another puzzle.

`MemberGameStats` keys are `hangman`, `wordscramble`, `mastermind`, `minesweeper.4` and `minesweeper.5`; metadata stores `streak`, `longestStreak`, `fastestMs` and `fewestGuesses` as applicable. Record observation keys are `solo.<gameKey>.wins`, `solo.hangman.longest_streak`, `solo.wordscramble.fastest_ms`, `solo.mastermind.fewest_guesses` and `solo.minesweeper.<size>.fastest_ms`. Wins/streak use maximum comparison; fastest/fewest require minimum comparison in the shared record engine.

## Integration contract

`PrismaSoloRepository(db, clock?, rng?)` exposes `start(context, game, options, policy)`, `act(context,id,version,action)`, `replay(context,id,policy)`, `expire(guildId,id)`, `view(id)`, `active()`, `stats(guildId,userId)` and `linkMessage(id,guildId,userId,messageId)`. Context contains server/channel/member IDs and request key. Policy contains `enabled`, bigint `reward`, bigint `dailyRewardCap` and integer `timeoutSeconds`. Options contain optional Minesweeper `boardSize:4|5`. Actions are guess, reveal, flag or quit.

`DiscordSoloCoordinator(repo,config,eligible)` exposes `handle(interaction)`, `payload(id)`, `refresh(client,id)` and `recover(client)`. Route `SOLO_COMMANDS` and `solo:` component/modal IDs only when the runtime gate is enabled. The shared eligibility/capability callback must reject restricted members. The coordinator also validates feature enablement, configured bot channel and control ownership. Minesweeper uses numbered cells with reveal/flag modals, so both sizes remain within Discord component limits. Guess modals update the original message; Play Again posts a new message, retaining the prior completed result.

Required shared integration: `features.solo_games=false`; `solo.reward=1`; `solo.daily_reward_cap=10`; `solo.timeout_seconds=600`; `ENABLE_SOLO_SMOKE=false`; `/minesweeper size` integer choices 4/5; capability, registry/help/tutorial and production presentation mapping entries; `solo.expire` scheduler handler followed by refresh; startup recovery; shared records min-direction definitions; compile/test runner inclusion. The feature package has no extra content/assets to copy. Rendering imports the approved event `shell`, `heading`, `panel`, `text` and palette helpers, uses the same lounge asset and Inter/Space Grotesk system, and adds no AI-generated art or independent frame.

## Validation scope

Runtime tests cover deterministic generation, duplicate/invalid guesses, Hangman and Scramble wins/losses, duplicate-peg feedback, first-click safety, flag handling, mine reveal/win, secret-safe projection and bounded policy. Adapter tests cover cell parsing, shared visual inheritance, secret-free live rendering and fail-closed coordinator gates. PostgreSQL tests cover concurrent starts, ownership/channel/version isolation, replay receipts, exactly-once payout, reward cap, immutable replay, restart and concurrent expiry. PostgreSQL tests read only ignored `.env.test.local` and isolate all data in a disposable random schema.

Run these through the integrated workspace build/preflight/PostgreSQL runner after shared integration. Live Discord behavior, approved enablement and full visual gate review remain pending until actually performed; source completion alone is not acceptance.
