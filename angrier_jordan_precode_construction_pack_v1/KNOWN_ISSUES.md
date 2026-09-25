# Known issues

- Live Discord smoke tests have not run. Review Gate A uses actual production-adapter output with explicit fixture members and desktop/mobile host review frames. Do not represent it as live Discord validation or production readiness.
- Gate A is fully approved. The current Line/Race/Fight/standard-window presentation is frozen as permanent visual infrastructure. Earlier rejected artwork remains historical.
- All unfinished/unaccepted production feature flags remain off. Phases 13–18, shared wallet holds, dashboard foundations and Railway packaging are implemented and tested; Family and Community are progressing independently. Preparation does not authorize production deployment.
- Docker is absent locally. GitHub CI must validate Linux image build and native renderer smoke before release; no container PASS is claimed yet.
- Real Discord update latency and client animation handling still require live acceptance. Review timeline playback is explicitly distinct from Discord message refresh cadence.
- Five previously identified transitive advisories remain in the Prisma CLI configuration and dashboard CSS toolchain (1 moderate, 4 high); further remediation is pending.
