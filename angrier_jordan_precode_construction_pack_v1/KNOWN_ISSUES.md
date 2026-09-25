# Known issues

- Live Discord smoke tests have not run. Review Gate A uses actual production-adapter output with explicit fixture members and desktop/mobile host review frames. Do not represent it as live Discord validation or production readiness.
- All feature flags remain off pending acceptance/review. Railway readiness and further event work are queued after Gate A approval.
- Race/Fight revision 02 replaces the older ornate assets with deterministic lounge artwork; visual approval remains pending. Historical art remains in the library for other modules.
- Animated attachment generation measured about 1.5–1.9 seconds on this machine; real Discord update latency and client animation handling still require live acceptance. Review timeline playback is explicitly distinct from Discord message refresh cadence.
- Five previously identified transitive advisories remain in the Prisma CLI configuration and dashboard CSS toolchain (1 moderate, 4 high); further remediation is pending.
