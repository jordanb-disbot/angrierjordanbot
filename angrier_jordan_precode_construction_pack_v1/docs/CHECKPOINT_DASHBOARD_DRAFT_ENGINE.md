# Dashboard shared draft and configuration transaction increment

The previous foundation exposed authenticated read-only settings. This increment adds the durable shared draft engine and generated controls while retaining the disabled production acceptance gate.

Changes:

- Prisma ConfigService now writes configuration, its revision and its audit atomically; explicit null settings remain null when read.
- A server-scoped transaction lock serializes live writes and draft publishing. DashboardDraft migration 0015 stores one versioned draft across all dashboard sections. Existing OperationReceipt storage binds idempotent operations to their actor and exact command.
- Shared engine implements one editor, 15-minute inactivity expiry, explicit renewal, audited owner takeover, stage/remove/discard, version-bound preview, manual atomic publish by any current Admin, safe retained-history rollback and direct dependency checks.
- Preview fingerprints include live setting versions/values, schema metadata, direct dependencies and current channel/role references. Any stale/invalid item blocks all publishing. Complex editors remain blocked until their dedicated validators and object-impact handlers exist.
- Canonical `dashboard_write` metadata allows an explicit low-risk primitive subset to save live. High-impact changes cannot use that path. No schedule or automatic dependency repair is implemented.
- Generated dashboard controls expose live-save eligibility, staging, shared-draft lock state, grouped before/after preview, rollback history and retry with the same operation ID after an interrupted response. Auth/CSRF/current-owner/Admin checks apply server-side to every request.
- Next resolves emitted `.js` imports in shared TypeScript sources using extensionAlias; normal typechecks remain enabled.

Tests are provided in `testing/runtime/config-draft.test.mjs`, `testing/postgres/dashboard.test.mjs` and the existing dashboard security suite. The PostgreSQL suite creates a uniquely named disposable schema, injects audit failures to verify complete rollback, and never reads DATABASE_URL as a test credential. Root integration records actual execution results.

Still pending: complete Phase 24 editors/pages, complex/destructive Discord object operations, audit views/export/rolling cleanup, authenticated live-browser/OAuth acceptance and Gate D walkthrough. No new owner gate is requested by this bounded increment; `AJ_DASHBOARD_ACCEPTED` stays false.
