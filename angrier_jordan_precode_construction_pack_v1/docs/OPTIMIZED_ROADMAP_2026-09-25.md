# Optimized remaining roadmap

New owner instruction allows parallel implementation and explicit Astra model/reasoning selection. Same approved launch scope and quality gates; no reduced testing. Supersedes the serial elapsed-time forecast in LAUNCH_ESTIMATE_2026-09-25.md.

Forecast: 30–50 active elapsed working hours (roughly 45–75 summed agent-hours), approximately 4–8 days at 6–8 active hours/day, excluding owner waits. Overall completion remains about 40%. Parallelism reduces elapsed time, not the work or QA obligations. Railway readiness and Line runtime remain unfinished at this planning point; frozen artwork is not counted as unimplemented design work.

Concurrent lanes: (1) Railway/Docker/CI/release preparation; (2) persisted Line/Special Commands, then independent games/community features; (3) dashboard auth and schema-generated settings, then necessary custom workflows; (4) primary integration, shared runtime hardening, targeted QA, frozen-visual packaging and acceptance fixtures. Use separate worktrees when divergent shared changes justify them; otherwise explicit disjoint file ownership avoids cherry-pick overhead. The primary integrator owns schema, registry/codegen, production wiring, dependency lock and combined validation.

Critical path: durable workflow contracts/migrations → family/auction/estate acceptance → cross-feature integration and owner gates → production/live acceptance. Dashboard security and voice/music/provider behavior are competing risks. Migration application, shared metadata generation, dependent financial workflow acceptance, final release and live Discord acceptance remain ordered. Independent feature development can overlap without executing those dependent steps early.

Use Astra Medium for routine implementation/testing/docs/UI/configuration. Use Astra High for concurrency, migration safety, security, difficult persisted workflows, dashboard draft/publish, family/estate/auction edge cases, integration, complex debugging, or two Medium failures. XHigh/Max only for a genuine unresolved High blocker or unusually critical correctness issue. Do not raise effort for mechanically large work.

Reuse approved visual infrastructure and shared engines. Generate ordinary settings controls from the master schema. Run targeted feature tests immediately; final QA should be regression/integration. Batch visuals and product review at Gates B–E. Prepare deterministic fixtures and live checklists early. Defer unrelated cleanup/refactors.

Owner dependencies: Gates B–E, production credentials/account actions, real Discord IDs/intents/hierarchy, production deployment authorization and live acceptance participation. Flags remain off for unfinished/unaccepted production features. No production resources or secrets are created by readiness work. Commit and push integrated tested checkpoints; never rewrite existing history.
