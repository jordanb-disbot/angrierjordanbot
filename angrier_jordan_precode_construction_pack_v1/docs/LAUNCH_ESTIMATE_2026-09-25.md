# Remaining launch estimate — after Gate A approval

Repository assessment: approximately 40% of the full launch scope is complete. Remaining work is about 45–80 active development hours, or 1–2½ weeks at 6–8 active hours/day, excluding owner waits. This is a range, not a delivery commitment. The short observed implementation history makes a narrower forecast unjustified.

Evidence: Checkpoint 08 foundation; implemented item, profile, casino and Race/Fight packages through migration 0013; recorded 106 domain, 27 adapter and 50 PostgreSQL tests passing. Dashboard page explicitly remains a scaffold. Later feature families lack runtime packages. Live Discord acceptance has not run. Commands, content or schema stubs do not count as completed runtime functionality. Completed implementation is excluded from this estimate; later integration/live QA is included.

| Checkpoint | Active hours including its verification/docs |
|---|---:|
| Railway readiness now | 2–4 |
| 13 Line / Special Commands | 2–3 |
| 14 Solo games | 2–4 |
| 15 PvP games | 3–5 |
| 16 Party/social voting | 2–4 |
| 17 Persistent channel games | 1–2 |
| 18 Crime | 3–5 |
| 19 Family / auctions / estates / Gate B | 4–7 |
| 20 Community | 2–3 |
| 21 Chairisms | 1–2 |
| 22 Lore / introductions / tutorials / summaries | 2–4 |
| 23 Music / Gate C | 4–7 |
| 24 Dashboard / Gate D | 5–9 |
| 25 Visual-system reconciliation / Gate E | 2–4 |
| 26 Integration / reliability / security | 4–7 |
| 27 Production configuration / controlled release | 1–2 |
| 28 Live Discord acceptance / fixes | 2–4 |

Alternative activity breakdown, not additional work: implementation 21–36h; visuals 4–7h; testing/QA 8–14h; dashboard 5–9h; Railway/deployment 3–6h; live acceptance 2–4h. Phase totals 42–79h and activity totals 43–76h are rounded to the working 45–80h range.

Critical path: remaining durable workflows → family/auction acceptance → music/dashboard → cross-feature QA → live acceptance. Largest risks/work items: family/estates/auctions; voice/music provider integration; authenticated dashboard with shared drafts and publish safeguards; remaining game families; integration/security/recovery QA.

Autonomous: implementation, test-only migrations, acceptance/concurrency tests, locked visual-system application, CI/deployment configuration and documentation. Owner dependent: meaningful review gates B–E, production credentials/account settings/Discord IDs and hierarchy/intents, production deployment approval, live Discord acceptance. Music-provider restrictions, Discord API/client behavior, dependency remediation, product contradictions or new scope can materially increase the range. Re-estimate after Gate B using actual implementation and defect rates.
