# Gate C — remaining work and first owner action

Music presentation is APPROVED at `f98de3c` on 2026-09-26. Gate C is not fully passed: real provider/Discord behavior has not been observed. Production Music and deployment remain unauthorized.

## Completed offline

- Player/controller integration, durable delivery recovery, queue/playlist/selection persistence and permission checks.
- Provider search/matching, stale-session fencing, reconnect, disable watchdog and autoplay coverage using mocks.
- 285 runtime and 368 adapter tests passed at the visual revision; 24 PostgreSQL tests passed at the integration checkpoint. No new playback logic is introduced by this approval record.
- Approved Music source-of-truth recorded and 46 images plus gallery/control metadata hash-locked. Existing Gate A/B locks preserved.
- Reviewed test-node template, private credential boundaries, 14 live acceptance cases and a blank evidence ledger prepared. No real pass has been inferred from a fixture.

There is no known remaining implementation task that can establish real audio delivery offline. Concrete defects found during live acceptance will be fixed and regression-tested before continuing.

## What requires an owner or external environment

| Remaining step | Codex can do after access exists | Owner/external requirement |
| --- | --- | --- |
| Local Lavalink test node | Prepare pinned configuration, verify authenticated source/plugin preflight, collect sanitized diagnostics | Java runtime installation, or access to an existing suitable test node |
| Controlled Discord run | Prepare isolated disposable test persistence, wire test-only environment, start/stop controlled worker and record machine-observable results | Confirm test server/voice channel and test bot access; private test credentials/IDs if unavailable; authorize that live test |
| Real playback and controls | Exercise search, resolution, queue, controller, restart and concurrency scenarios | Join voice, listen and confirm intended audio; review actual desktop/mobile Discord behavior |
| Permissions/voting | Check requester/DJ/member controls and stale interactions | Owner supplies the required test members/roles and voice participation |
| Spotify/Apple cases | Configure the approved adapter once authorized credentials exist; test matching and attribution | Authorized provider application credentials for those integrations, kept privately; no subscriptions selected automatically |
| Gate C completion | Consolidate C01–C14 evidence, remaining defects and accepted limitations | Owner functional/live acceptance decision |

Direct audio is optional. No private song catalog is required. No production Discord secrets or production database is needed. The existing disposable PostgreSQL service stays test-only, with credentials read from ignored `.env.test.local` as `TEST_DATABASE_URL`.

## First owner action — install Java only

The current terminal cannot find Java or Docker. Start with Java; there is no need to configure every live-test requirement at once.

1. Open [Microsoft's OpenJDK downloads](https://learn.microsoft.com/en-us/java/openjdk/download#openjdk-21).
2. Under **OpenJDK 21**, choose **Windows / x64 / MSI** and run the installer. Enable the option to add Java to **PATH** if offered. Complete any Windows approval prompt yourself.
3. Open a **new PowerShell window** and run `java -version`.
4. Tell Codex **“Java installed”**. If the command cannot be found, report that message; no credentials are needed for this step.

After this, Codex can prepare/check the local test node and then guide the controlled Discord setup. Installing Java does not launch the bot, register commands, enable Music or deploy production. Do not manually turn on Music yet.

Use [the full acceptance matrix](GATE_C_MUSIC_ACCEPTANCE.md) and [the live evidence ledger](../testing/music-node/music-live-acceptance.json) during the subsequent controlled run. Visual approval must remain separate from functional/live evidence.
