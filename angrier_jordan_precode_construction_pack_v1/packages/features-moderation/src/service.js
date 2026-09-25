import { DomainError } from '../../core/src/index.js';
const MIN_TIMEOUT_SECONDS = 10;
const MAX_TIMEOUT_SECONDS = 28 * 24 * 60 * 60;
const MAX_TEMP_BAN_SECONDS = 365 * 24 * 60 * 60;
const units = { s: 1, sec: 1, secs: 1, second: 1, seconds: 1, m: 60, min: 60, mins: 60, minute: 60, minutes: 60, h: 3600, hr: 3600, hrs: 3600, hour: 3600, hours: 3600, d: 86400, day: 86400, days: 86400, w: 604800, week: 604800, weeks: 604800 };
const parseSeconds = (raw) => { const value = raw.trim().toLowerCase().replace(/,/g, ' '); let total = 0; let hits = 0; for (const m of value.matchAll(/(\d+)\s*(seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w)\b/g)) {
    total += Number(m[1]) * (units[m[2] ?? ''] ?? 0);
    hits++;
} if (!hits) {
    const simple = /^(\d+)\s*([smhdw])$/.exec(value);
    if (simple)
        total = Number(simple[1]) * (units[simple[2] ?? ''] ?? 0);
} return total; };
const format = (seconds) => { let r = seconds; const parts = []; for (const [label, size] of [['d', 86400], ['h', 3600], ['m', 60], ['s', 1]]) {
    const n = Math.floor(r / size);
    if (n) {
        parts.push(`${n}${label}`);
        r -= n * size;
    }
    if (parts.length === 2)
        break;
} return parts.join(' ') || '0s'; };
export const parseTimeoutDuration = (raw) => { const seconds = parseSeconds(raw); if (seconds < MIN_TIMEOUT_SECONDS || seconds > MAX_TIMEOUT_SECONDS)
    throw new DomainError('INVALID_TIMEOUT_DURATION', 'Timeout duration must be between 10 seconds and 28 days.'); return { permanent: false, seconds, label: format(seconds) }; };
export const parseBanDuration = (raw) => { const value = (raw ?? 'permanent').trim().toLowerCase(); if (!value || value === 'permanent' || value === 'perm' || value === 'forever')
    return { permanent: true, label: 'Permanent' }; const seconds = parseSeconds(value); if (seconds < 60 || seconds > MAX_TEMP_BAN_SECONDS)
    throw new DomainError('INVALID_BAN_DURATION', 'Temporary ban duration must be between 1 minute and 365 days, or `permanent`.'); return { permanent: false, seconds, label: format(seconds) }; };
const reversible = new Set(['WARN', 'TIMEOUT', 'BAN']);
export class ModerationService {
    repository;
    audit;
    clock;
    constructor(repository, audit, clock) {
        this.repository = repository;
        this.audit = audit;
        this.clock = clock;
    }
    async prepare(input) { if (!input.reason.trim())
        throw new DomainError('MOD_REASON_REQUIRED', 'A moderation reason is required.'); const now = this.clock.now(); const c = await this.repository.createPreparedCase({ ...input, reason: input.reason.trim(), now }); await this.audit.record({ guildId: input.guildId, actorUserId: input.actorUserId, source: 'discord', action: 'moderation.prepare', targetType: 'case', targetId: String(c.id), after: { actionType: c.actionType, subjectUserId: c.subjectUserId }, reason: c.reason, requestId: `mod-prepare:${c.id}`, createdAt: now }); return c; }
    async finalize(caseId, status, input = {}) { const now = this.clock.now(); const c = await this.repository.finalizeCase({ caseId, status, ...input, eventKind: input.eventKind ?? 'ENFORCED', now }); await this.audit.record({ guildId: c.guildId, ...(input.actorUserId ? { actorUserId: input.actorUserId } : {}), source: 'discord', action: 'moderation.finalize', targetType: 'case', targetId: String(c.id), after: { status: c.status, metadata: c.metadata }, reason: input.reason ?? c.reason, requestId: `mod-finalize:${c.id}:${now.getTime()}`, createdAt: now }); return c; }
    async enforcementFailed(caseId, actorUserId, reason, error) { const now = this.clock.now(); const message = error instanceof Error ? error.message : String(error); const c = await this.repository.failPreparedCase({ caseId, ...(actorUserId ? { actorUserId } : {}), reason, error: message, now }); await this.audit.record({ guildId: c.guildId, ...(actorUserId ? { actorUserId } : {}), source: 'discord', action: 'moderation.enforcement_failed', targetType: 'case', targetId: String(c.id), after: { error: message }, reason, requestId: `mod-failed:${c.id}:${now.getTime()}`, createdAt: now }); return c; }
    async scheduleTemporaryCase(c, userId, seconds, jobType) { const dueAt = new Date(this.clock.now().getTime() + seconds * 1000); await this.repository.upsertExpiryJob({ guildId: c.guildId, caseId: c.id, jobType, dueAt, userId }); return dueAt; }
    async expire(caseId, reason, metadata) { const now = this.clock.now(); const c = await this.repository.expireCase({ caseId, reason, now, ...(metadata ? { metadata } : {}) }); if (!c)
        return null; await this.audit.record({ guildId: c.guildId, source: 'scheduler', action: 'moderation.expire', targetType: 'case', targetId: String(c.id), after: { status: c.status }, reason, requestId: `mod-expire:${c.id}`, createdAt: now }); return c; }
    async editReason(caseId, actorUserId, reason) { if (!reason.trim())
        throw new DomainError('MOD_REASON_REQUIRED', 'A corrected reason is required.'); const now = this.clock.now(); const c = await this.repository.editCaseReason({ caseId, actorUserId, reason: reason.trim(), now }); await this.audit.record({ guildId: c.guildId, actorUserId, source: 'discord', action: 'moderation.case_edit', targetType: 'case', targetId: String(caseId), after: { reason: c.reason, status: c.status }, reason: c.reason, requestId: `mod-case-edit:${caseId}:${now.getTime()}`, createdAt: now }); return c; }
    async reverse(caseId, actorUserId, reason, metadata) { const current = await this.requireCase(caseId); if (!reversible.has(current.actionType))
        throw new DomainError('CASE_NOT_REVERSIBLE', `${current.actionType} cannot be safely reversed automatically.`); if (current.status === 'REVERSED')
        throw new DomainError('CASE_ALREADY_REVERSED', 'That case has already been reversed.'); const now = this.clock.now(); const c = await this.repository.reverseCase({ caseId, actorUserId, reason: reason.trim() || 'Reversed by staff.', now, ...(metadata ? { metadata } : {}) }); await this.repository.cancelExpiryJobs(caseId); await this.audit.record({ guildId: c.guildId, actorUserId, source: 'discord', action: 'moderation.case_reverse', targetType: 'case', targetId: String(caseId), before: { status: current.status }, after: { status: c.status }, reason, requestId: `mod-case-reverse:${caseId}:${now.getTime()}`, createdAt: now }); return c; }
    async closeActiveCases(guildId, userId, types, actorUserId, reason) { const rows = await this.repository.findActiveCases(guildId, userId, types); const out = []; for (const row of rows) {
        const now = this.clock.now();
        const closed = await this.repository.reverseCase({ caseId: row.id, actorUserId, reason, now, metadata: { closedByAction: true } });
        await this.repository.cancelExpiryJobs(row.id);
        await this.audit.record({ guildId, actorUserId, source: 'discord', action: 'moderation.close_active_case', targetType: 'case', targetId: String(row.id), before: { status: row.status }, after: { status: closed.status }, reason, requestId: `mod-close-active:${row.id}:${now.getTime()}`, createdAt: now });
        out.push(closed);
    } return out; }
    async note(guildId, userId, authorUserId, text) { if (!text.trim())
        throw new DomainError('NOTE_REQUIRED', 'A staff note cannot be empty.'); const now = this.clock.now(); const note = await this.repository.createNote({ guildId, subjectUserId: userId, authorUserId, text: text.trim(), now }); await this.audit.record({ guildId, actorUserId: authorUserId, source: 'discord', action: 'moderation.note', targetType: 'member', targetId: userId, after: { noteId: note.id }, reason: 'Staff note added.', requestId: `mod-note:${note.id}`, createdAt: now }); return note; }
    async history(guildId, userId, limit = 20) { return { cases: await this.repository.listHistory(guildId, userId, limit), notes: await this.repository.listNotes(guildId, userId, limit) }; }
    async caseView(caseId) { const c = await this.requireCase(caseId); return { caseRecord: c, events: await this.repository.listCaseEvents(caseId) }; }
    async requestReview(caseId, userId, text) { const c = await this.requireCase(caseId); if (c.subjectUserId !== userId)
        throw new DomainError('REVIEW_NOT_ALLOWED', 'You can only request review of a moderation action taken against you.'); const result = await this.repository.requestReview({ caseId, userId, ...(text ? { text } : {}), now: this.clock.now() }); await this.audit.record({ guildId: c.guildId, actorUserId: userId, source: 'discord', action: 'moderation.review_request', targetType: 'case', targetId: String(caseId), after: { appealId: result.appealId }, reason: text ?? 'Review requested.', requestId: `mod-review:${caseId}:${result.appealId}`, createdAt: this.clock.now() }); return result; }
    async requireCase(caseId) { const c = await this.repository.getCase(caseId); if (!c)
        throw new DomainError('CASE_NOT_FOUND', `Moderation case #${caseId} was not found.`); return c; }
}
//# sourceMappingURL=service.js.map