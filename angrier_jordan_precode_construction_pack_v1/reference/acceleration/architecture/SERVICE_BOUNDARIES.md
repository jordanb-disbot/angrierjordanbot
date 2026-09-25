# Service Boundaries

- `CommandRegistryService`: loads command registry, registers grouped Discord commands, exposes help metadata.
- `CapabilityService`: role/owner resolution and capability checks.
- `ConfigService`: schema validation, DB live values, cache, audit.
- `AuditService`: append-only administrative/moderation change log.
- `LedgerService`: all Ottoman accounting.
- `EscrowService`: wager/bid/item reservation and settlement.
- `SessionService`: restart-safe interaction state.
- `VotingService`: all ballots and result calculation.
- `SchedulerService`: persistent due work and reconciliation.
- `ContentService`: prompt/response selection and recent-history rules.
- `RenderService`: deterministic card/image creation.
- `ModerationService`: cases, actions, evidence, appeals; invokes Capability/Audit/Scheduler.
- `SecurityService`: Join Gate, raid, anti-nuke, Panic state.
- `MusicService`: queue/session state; provider adapters are replaceable.
- `Dashboard API`: thin server-side facade over the same services; never writes DB domain state directly.

Handlers should be orchestration only. Domain invariants live in services and are testable without Discord.
