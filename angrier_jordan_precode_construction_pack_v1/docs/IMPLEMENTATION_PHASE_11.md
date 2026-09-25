# Phase 11 — Escrow / Casino / Lottery

The shared transaction-bound escrow stores wallet/bank contributions, validates financial state transitions, settles through LedgerEngine, and refunds the original funding buckets. Migration 0012 enforces valid funding totals and nonnegative pools/tickets.

Casino uses persisted GameSession and the shared session engine. Instant outcomes and receipts commit with money and statistics. Blackjack supports Hit/Stand/Double/Split and a persisted five-minute automatic-stand deadline. Replays open fresh rounds and revalidate permissions, policy and balance. Slots update/drain Chair Pot inside the same serializable transaction. Records and announcements use persisted jobs; external announcements use the shared delivery-recovery engine.

Lottery persists Friday 8 PM Mountain drawings, enforces 20 tickets/member/week, pays the full ticket-funded pot once, skips empty draws, and schedules subsequent drawings. Already-funded settlements remain recoverable when new-entry flags are disabled.

Settings, dashboard controls, capabilities, help/tutorial, dependency graph, presentation mappings and acceptance matrix are synchronized. No retired command path was added. All feature flags remain off.

The approved Poppins and Cinzel fonts are bundled with licenses and pinned hash/source manifest. The raster worker starts with an explicit font configuration and writable cache, avoiding Windows native-library environment initialization differences. Runtime cards remain deterministic.

Validation: full bot/dashboard build passed; preflight passed (98 domain tests, 16 adapter/render tests). Expanded PostgreSQL concurrency/restart verification is recorded in IMPLEMENTATION_STATUS.json. Live Discord and visual acceptance remain pending.
