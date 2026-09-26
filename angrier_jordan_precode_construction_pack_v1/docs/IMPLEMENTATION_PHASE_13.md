# Phase 13 — Line and Special Commands

`!line` now has persisted readiness, check-ins, one host extension, entry lock, host cancellation, early start, countdown and completion. `!vc`, `!chess` and dashboard-created Special Commands are notification workflows. Race remains owned by the Phase 12 coordinator. Neither retired slash trigger is restored.

The family remains disabled through `features.special_commands=false`, `features.line=false` and the production `ENABLE_SPECIAL_SMOKE` gate. Existing `special_commands.enabled` continues to control the shared built-in family without changing the previously approved Race default.

## Persistence and concurrency

No new Prisma models are required. `GameSession`, `GameParticipant`, `OperationReceipt` and `ScheduledJob` are reused through shared `SessionEngine`, `TimerEngine`, `PrismaAtomicOperations`, `IdempotentScheduler`, `DeliveryEngine` and `PrismaJobDeliveryRepository`. Migration `0014_special_commands` adds a partial unique index for one active Line per server/channel. Its scope deliberately permits concurrent Race/Fight events in that channel.

| State | Behavior |
| --- | --- |
| OPEN | Host is automatically ready; unlimited members can check in or change readiness for 60 seconds. |
| OPEN, extended | Host-only single +30 second extension; 90 seconds maximum from creation. |
| LOCKED | Existing check-ins remain saved and visible. Check-in changes/new entry reject. Host can start or cancel. |
| SETTLING | Fixed 5 → 4 → 3 → 2 → 1, then 800 ms bounded powder/brief chair debris. No visible zero. |
| CLOSED / CANCELLED | Saved check-ins remain inspectable. No replay, rematch or Play Again. |

Due dates are checked in transactions before the scheduler runs, preventing late-entry races. Concurrent actions serialize with shared receipt/version machinery. A stale prepared countdown cannot commit. Host authorization and original server/channel binding are checked independently inside the repository. The public Discord adapter also checks the originating message for state mutations.

The one-shot sequence is rendered before committing countdown start; a prepared version is rechecked inside the transaction before setting the authoritative 5.8-second timer. That prevents rasterization time consuming the countdown. Pending message edits serialize per session. Restart rendering derives only remaining frames from persisted `startedAt`; an overdue countdown settles without replay. External Discord/network failures remain an acceptance limitation: a disconnected client cannot be guaranteed to see every frame. Saved state and jobs still converge correctly.

Notification intent is created atomically with Line creation. Other Special Commands create one durable job per original message. Shared delivery reconciles an uncertain send using the bot-authored message footer before any resend. Configured notification roles are checked again at actual delivery; only unmanaged roles with zero Discord permissions, distinct from `@everyone`, can be explicitly mentioned. Arbitrary response text cannot add role, member or everyone pings.

## Configuration and dashboard integration

All runtime settings use shared `ConfigService`:

- Existing `special_commands.enabled`, `special_commands.access_roles`, `special_commands.builtin_role_map`, `channels.main_chat` and feature flags.
- `special_commands.custom_commands`: defaults to `[]`. Each entry has exactly `trigger`, `notificationRoleId`, `responsePool`, `enabled`, `allowedRoleIds`.
- `special_commands.builtin_response_pools`: defaults to empty arrays for `!line`, `!race`, `!vc`, `!chess`; Line/VC/Chess empty arrays use packaged finite authored defaults.
- `line.shame_enabled`: boolean, default true. Approved authored shame is selected from the unchanged 120-line source, excluding the previous three selections where possible, and persisted with the session.

Call `validateCustomSpecialCommands` before saving or publishing custom command configuration. It rejects reserved/native triggers, duplicate triggers, malformed role IDs, empty/unbounded response lists, unknown fields and code/handler/cooldown fields. Custom commands never dispatch a native state machine. Dashboard mutations must use the shared audited Config/Draft service; this feature does not provide an alternate configuration write path.

The notification definition is plain data:

```json
{"trigger":"!gather","notificationRoleId":null,"responsePool":["Chairs, gather around."],"enabled":false,"allowedRoleIds":[]}
```

All members may invoke built-ins by default. Explicit allowed-role restrictions are evaluated from a fresh member fetch. Known unauthorized triggers are deleted silently, including wrong-channel attempts. There is no cooldown. `visibleCommands(serverId, roleIds)` exposes only enabled accessible Line/VC/Chess/custom definitions for contextual help; existing Race help is provided by its own registry/adapter.

## Production wiring

Instantiate `PrismaSpecialRepository(db)` and `DiscordSpecialCoordinator(repository, config, eligible)` using the same event containment eligibility service as Race/Fight. Route matching prefix messages to `message()` only under `ENABLE_SPECIAL_SMOKE`; route `line:` buttons to `handle()`. No slash command registration is added.

Register shared scheduler handlers:

```ts
'special.callout': job => special.deliver(client, job.id),
'special.line_lock': job => special.advance(client, payload.guildId, payload.sessionId, false),
'special.line_complete': job => special.advance(client, payload.guildId, payload.sessionId, true),
```

For the last two handlers, validate/extract `payload` from `job.payload` using the production scheduler's existing convention. Call `sweep(client)` at startup and approximately once per second; stop that interval on shutdown. Durable jobs also recover publication and terminal updates independently.

Include `packages/features-special/src/**/*.ts` in domain compilation. Copy `packages/features-special/content`, `packages/features-special/assets` and `production/theme` into compiled runtime/test trees. Exported source methods are the integration contract; no schema fragment is necessary.

## Approved visual provenance

Runtime rendering applies the immutable approved Line composition from `review-concepts/aj-window-study-v1/render-line-states.mjs`: stable 650×996 lounge frame, purple feature accent, emerald readiness, gold attention, inset panels, Space Grotesk headings and Inter text from `production/theme/brand.json`. `assets/lounge.png` is an unchanged copy of the approved concept background. The source shame pool is copied unchanged from `reference/acceleration/content/line_shame_120.json`.

The renderer substitutes real saved member names, counts, statuses, host, time and shame text. Names are escaped as XML. The visible eight-member sample does not cap participation; paginated private Check-ins shows every persisted participant. No production runtime AI art or fixture identities are used. Native Discord controls perform all actions; static card copy directs members to them.

## Validation

Targeted coverage is in `testing/runtime/special.test.mjs`, `testing/adapters/special.test.mjs` and `testing/postgres/special.test.mjs`. The PostgreSQL suite reads only `TEST_DATABASE_URL` from the ignored application-root `.env.test.local`, migrates a randomized disposable schema, and drops that schema in `finally`.

Coverage includes exact countdown boundaries/no zero; custom trigger/code restrictions; safe role notifications; silent deletion; disabled flags; authored fallback; runtime names/roster/controls; concurrent starts/check-ins/extensions; readiness lock without data loss; host authority; stale rendering preview; early start/cancel; persisted shame; restart countdown/settlement; atomic publication; uncertain-delivery reconciliation; and notification replay without cooldown.

Full workspace validation, source registries, generated contracts, help/tutorial integration and production smoke execution are tracked by the parent checkpoint. No live Discord acceptance or production deployment is claimed here.

Targeted execution on 2026-09-25 passed: runtime Special/Solo/runtime-readiness/record-direction 18/18; combined Special/Solo/runtime-health adapters 12/12, then Special alone 9/9 after two additional deadline/pre-render regression tests; disposable PostgreSQL Special/Solo 16/16 including parent suites. Bot TypeScript compilation passed after the final adapter correction. The initial sandboxed database connection failed before migrations; the authorized network-enabled retry passed against the same dedicated TEST source.

Actual runtime review images and a reproducible renderer script are in `packages/features-special/review`. The one-shot GIF was inspected with Sharp: 37 frames, loop 1, 6800 ms including the final hold, 1,049,469 bytes. Readiness/countdown/burst/completion PNGs were visually inspected. Approved lounge SHA-256 is `fd0ed9e0dd3dd928e4111d71630c99e28ecf69657b7285299f95ae6be823c50f`; unchanged authored shame SHA-256 is `0a537b4fc58f858505d6182a8b22a2bede37d3b2d00dfd4a972b352fcf081386`.

Owner event-polish update (2026-09-26): readiness expiry now automatically starts the five-second countdown, followed by a four-second powder finale. Host early start/cancel and the single extension remain. Existing countdowns honor their persisted expiry. Runtime uses a wide gallery window with retained one-shot media; the original approved portrait references remain immutable.
