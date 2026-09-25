import { DomainError } from '../../core/src/index.js';
const MIN_SECONDS = 5 * 60;
const MAX_SECONDS = 30 * 24 * 60 * 60;
const FAR_FUTURE = new Date('9999-12-31T23:59:59.000Z');
const units = { s: 1, sec: 1, secs: 1, second: 1, seconds: 1, m: 60, min: 60, mins: 60, minute: 60, minutes: 60, h: 3600, hr: 3600, hrs: 3600, hour: 3600, hours: 3600, d: 86400, day: 86400, days: 86400, w: 604800, week: 604800, weeks: 604800 };
export const parseJailDuration = (raw) => {
    const value = raw.trim().toLowerCase();
    if (value === 'indefinite' || value === 'manual' || value === 'until release')
        return { indefinite: true, label: 'Indefinite' };
    const compact = value.replace(/,/g, ' ');
    const re = /(\d+)\s*(seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w)\b/g;
    let total = 0;
    let matched = '';
    for (const m of compact.matchAll(re)) {
        const n = Number(m[1]);
        const unit = m[2] ?? '';
        total += n * (units[unit] ?? 0);
        matched += m[0];
    }
    if (!matched) {
        const simple = /^(\d+)\s*([smhdw])$/.exec(value);
        if (simple)
            total = Number(simple[1]) * (units[simple[2] ?? ''] ?? 0);
    }
    if (!Number.isFinite(total) || total < MIN_SECONDS || total > MAX_SECONDS)
        throw new DomainError('INVALID_JAIL_DURATION', 'Jail duration must be between 5 minutes and 30 days, or `indefinite`.');
    return { indefinite: false, seconds: total, label: formatSeconds(total) };
};
export const formatSeconds = (seconds) => { let remaining = Math.max(0, Math.round(seconds)); const parts = []; for (const [label, size] of [['d', 86400], ['h', 3600], ['m', 60]]) {
    const n = Math.floor(remaining / size);
    if (n) {
        parts.push(`${n}${label}`);
        remaining -= n * size;
    }
} if (remaining && parts.length < 2)
    parts.push(`${remaining}s`); return parts.join(' ') || '0m'; };
export class JailService {
    repository;
    audit;
    clock;
    constructor(repository, audit, clock) {
        this.repository = repository;
        this.audit = audit;
        this.clock = clock;
    }
    async send(input) {
        if (input.actorUserId === input.userId)
            throw new DomainError('SELF_JAIL_BLOCKED', 'You cannot place yourself in Hotseat.');
        if (!input.reason.trim())
            throw new DomainError('JAIL_REASON_REQUIRED', 'A moderation reason is required.');
        if (await this.repository.getActiveModerationSentence(input.guildId, input.userId))
            throw new DomainError('JAIL_ALREADY_ACTIVE', 'That member already has an active moderation Hotseat sentence.');
        const parsed = parseJailDuration(input.duration);
        const now = this.clock.now();
        const endsAt = parsed.indefinite ? FAR_FUTURE : new Date(now.getTime() + (parsed.seconds ?? 0) * 1000);
        const result = await this.repository.createModerationSentence({ guildId: input.guildId, userId: input.userId, actorUserId: input.actorUserId, reason: input.reason.trim(), startedAt: now, endsAt, indefinite: parsed.indefinite, restoration: { suspendedRoleIds: [...(input.suspendedRoleIds ?? [])] } });
        await this.repository.upsertExpiryJob(result.sentence);
        await this.audit.record({ guildId: input.guildId, actorUserId: input.actorUserId, source: 'discord', action: 'jail.send', targetType: 'member', targetId: input.userId, after: { sentenceId: result.sentence.id, caseId: result.caseRecord.id, duration: parsed.label, indefinite: parsed.indefinite, suspendedRoleIds: [...(input.suspendedRoleIds ?? [])] }, reason: input.reason.trim(), requestId: `jail-send:${result.sentence.id}`, createdAt: now });
        return result;
    }
    async extend(input) { return this.change({ ...input, kind: 'extend' }); }
    async reduce(input) { return this.change({ ...input, kind: 'reduce' }); }
    async change(input) {
        const sentence = await this.requireActive(input.guildId, input.userId);
        if (sentence.indefinite)
            throw new DomainError('INDEFINITE_JAIL_CHANGE', 'An indefinite sentence must be released manually rather than extended/reduced.');
        const parsed = parseJailDuration(input.duration);
        if (parsed.indefinite)
            throw new DomainError('INVALID_JAIL_CHANGE', 'Extend/reduce requires a finite duration.');
        const seconds = parsed.seconds ?? 0;
        const now = this.clock.now();
        const baseline = sentence.pausedAt && sentence.pausedRemainingSeconds !== undefined ? new Date(now.getTime() + sentence.pausedRemainingSeconds * 1000) : sentence.endsAt;
        const next = new Date(baseline.getTime() + (input.kind === 'extend' ? seconds : -seconds) * 1000);
        if (input.kind === 'extend' && next.getTime() - now.getTime() > MAX_SECONDS * 1000)
            throw new DomainError('JAIL_MAX_DURATION', 'A moderation Hotseat sentence cannot extend beyond 30 days from now.');
        if (input.kind === 'reduce' && next.getTime() <= now.getTime() + MIN_SECONDS * 1000)
            throw new DomainError('JAIL_REDUCTION_TOO_LARGE', 'That reduction would effectively end the sentence. Use `/jail release` instead.');
        const result = await this.repository.changeSentence({ sentenceId: sentence.id, actorUserId: input.actorUserId, actionType: input.kind === 'extend' ? 'JAIL_EXTEND' : 'JAIL_REDUCE', reason: input.reason.trim(), now, endsAt: next, durationSeconds: seconds });
        await this.repository.upsertExpiryJob(result.sentence);
        await this.audit.record({ guildId: input.guildId, actorUserId: input.actorUserId, source: 'discord', action: `jail.${input.kind}`, targetType: 'member', targetId: input.userId, before: { endsAt: sentence.endsAt }, after: { endsAt: result.sentence.endsAt, caseId: result.caseRecord.id }, reason: input.reason.trim(), requestId: `jail-${input.kind}:${result.sentence.id}:${result.caseRecord.id}`, createdAt: now });
        return { ...result, released: false };
    }
    async release(input) { const sentence = await this.requireActive(input.guildId, input.userId); const now = this.clock.now(); const result = await this.repository.releaseSentence({ sentenceId: sentence.id, actorUserId: input.actorUserId, reason: input.reason.trim() || 'Released by staff.', now }); await this.repository.cancelExpiryJob(sentence.id); await this.audit.record({ guildId: input.guildId, actorUserId: input.actorUserId, source: 'discord', action: 'jail.release', targetType: 'member', targetId: input.userId, before: { sentenceId: sentence.id, active: true }, after: { sentenceId: sentence.id, active: false, caseId: result.caseRecord.id }, reason: input.reason.trim(), requestId: `jail-release:${sentence.id}:${result.caseRecord.id}`, createdAt: now }); return result; }
    async expireSentence(sentenceId) { const sentence = await this.repository.getSentence(sentenceId); if (!sentence || !sentence.active || sentence.type !== 'MODERATION' || sentence.indefinite || sentence.pausedAt)
        return null; const now = this.clock.now(); if (sentence.endsAt.getTime() > now.getTime()) {
        await this.repository.upsertExpiryJob(sentence);
        return null;
    } const result = await this.repository.releaseSentence({ sentenceId, actorUserId: 'system', reason: 'Sentence expired.', now, actionType: 'JAIL_EXPIRE' }); await this.repository.cancelExpiryJob(sentenceId); await this.audit.record({ guildId: sentence.guildId, source: 'scheduler', action: 'jail.expire', targetType: 'member', targetId: sentence.userId, before: { sentenceId, active: true }, after: { sentenceId, active: false, caseId: result.caseRecord.id }, reason: 'Sentence expired.', requestId: `jail-expire:${sentenceId}`, createdAt: now }); return result; }
    async reconcileExpirySchedules(guildId) { const active = await this.repository.listActiveModerationSentences(guildId); let count = 0; for (const sentence of active) {
        if (!sentence.indefinite && !sentence.pausedAt) {
            await this.repository.upsertExpiryJob(sentence);
            count++;
        }
    } return count; }
    async reconcileMember(guildId, userId) { const active = await this.repository.listActiveSentences(guildId, userId); let count = 0; for (const sentence of active) {
        if (sentence.type === 'MODERATION' && !sentence.indefinite && !sentence.pausedAt) {
            await this.repository.upsertExpiryJob(sentence);
            count++;
        }
    } return count; }
    async status(guildId, userId) { return this.repository.listActiveSentences(guildId, userId); }
    async roster(guildId, type = 'all') { const rows = await this.repository.listActiveSentences(guildId); return rows.filter(s => type === 'all' || s.type === type.toUpperCase()); }
    async history(guildId, userId, limit = 20) { return this.repository.listHistory(guildId, userId, limit); }
    async reason(guildId, userId) { return this.requireActive(guildId, userId); }
    async requestReview(sentenceId, userId, text) { const sentence = await this.repository.getSentence(sentenceId); if (!sentence || sentence.userId !== userId || !sentence.caseId)
        throw new DomainError('REVIEW_NOT_ALLOWED', 'You can only request review of your own moderation Hotseat sentence.'); return this.repository.requestReview({ sentenceId, userId, ...(text ? { text } : {}), now: this.clock.now() }); }
    async activeModeration(guildId, userId) { return this.repository.getActiveModerationSentence(guildId, userId); }
    async getSentence(sentenceId) { return this.repository.getSentence(sentenceId); }
    async hasOtherActivePunishment(guildId, userId, excludingSentenceId) { return (await this.repository.listActiveSentences(guildId, userId)).some(s => s.id !== excludingSentenceId && s.active); }
    async requireActive(guildId, userId) { const sentence = await this.repository.getActiveModerationSentence(guildId, userId); if (!sentence)
        throw new DomainError('JAIL_NOT_ACTIVE', 'That member does not have an active moderation Hotseat sentence.'); return sentence; }
}
//# sourceMappingURL=service.js.map