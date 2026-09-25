# Known issues

- Live Discord smoke tests have not run. Review Gate A uses actual production-adapter output with explicit fixture members and desktop/mobile host review frames. Do not represent it as live Discord validation or production readiness.
- All feature flags remain off pending acceptance/review. Railway readiness and further event work are queued after Gate A approval.
- Older ornate/crown-heavy atomic assets remain in the supplied visual library; current Race/Fight runtime renders show those actual assets for owner review.
- Five previously identified transitive advisories remain in the Prisma CLI configuration and dashboard CSS toolchain (1 moderate, 4 high); further remediation is pending.
