const cloneCase = (c) => ({ ...c, createdAt: new Date(c.createdAt), updatedAt: new Date(c.updatedAt), ...(c.metadata ? { metadata: structuredClone(c.metadata) } : {}) });
const cloneEvent = (e) => ({ ...e, createdAt: new Date(e.createdAt), ...(e.before === undefined ? {} : { before: structuredClone(e.before) }), ...(e.after === undefined ? {} : { after: structuredClone(e.after) }) });
const cloneNote = (n) => ({ ...n, createdAt: new Date(n.createdAt) });
export class InMemoryModerationRepository {
    cases = new Map();
    events = [];
    notes = [];
    expiryJobs = new Map();
    appeals = [];
    caseSeq = 0;
    eventSeq = 0;
    noteSeq = 0;
    appealSeq = 0;
    async createPreparedCase(input) {
        const id = ++this.caseSeq;
        const c = { id, guildId: input.guildId, ...(input.subjectUserId ? { subjectUserId: input.subjectUserId } : {}), actionType: input.actionType, reason: input.reason, actorUserId: input.actorUserId, actorType: 'STAFF', ...(input.sourceChannelId ? { sourceChannelId: input.sourceChannelId } : {}), ...(input.sourceMessageId ? { sourceMessageId: input.sourceMessageId } : {}), ...(input.durationSeconds === undefined ? {} : { durationSeconds: input.durationSeconds }), status: 'OPEN', metadata: { ...(input.metadata ?? {}), pending: true }, createdAt: new Date(input.now), updatedAt: new Date(input.now) };
        this.cases.set(id, c);
        this.pushEvent(id, 'PREPARED', input.actorUserId, undefined, { actionType: input.actionType }, input.reason, input.now);
        return cloneCase(c);
    }
    async finalizeCase(input) { const c = this.must(input.caseId); const before = cloneCase(c); c.status = input.status; c.metadata = { ...(c.metadata ?? {}), ...(input.metadata ?? {}), pending: false }; c.updatedAt = new Date(input.now); this.pushEvent(c.id, input.eventKind, input.actorUserId, before, { status: c.status, metadata: c.metadata }, input.reason, input.now); return cloneCase(c); }
    async failPreparedCase(input) { const c = this.must(input.caseId); const before = cloneCase(c); c.status = 'REVERSED'; c.metadata = { ...(c.metadata ?? {}), pending: false, enforcementFailed: true, error: input.error }; c.updatedAt = new Date(input.now); this.pushEvent(c.id, 'ENFORCEMENT_FAILED', input.actorUserId, before, { status: c.status, error: input.error }, input.reason, input.now); return cloneCase(c); }
    async getCase(id) { const c = this.cases.get(id); return c ? cloneCase(c) : null; }
    async listCaseEvents(caseId) { return this.events.filter(e => e.caseId === caseId).map(cloneEvent); }
    async editCaseReason(input) { const c = this.must(input.caseId); const before = { reason: c.reason, status: c.status }; c.reason = input.reason; c.status = 'MODIFIED'; c.updatedAt = new Date(input.now); this.pushEvent(c.id, 'REASON_EDITED', input.actorUserId, before, { reason: c.reason, status: c.status }, input.reason, input.now); return cloneCase(c); }
    async reverseCase(input) { const c = this.must(input.caseId); const before = cloneCase(c); c.status = 'REVERSED'; c.metadata = { ...(c.metadata ?? {}), ...(input.metadata ?? {}), reversedAt: input.now.toISOString(), reversedBy: input.actorUserId }; c.updatedAt = new Date(input.now); this.pushEvent(c.id, 'REVERSED', input.actorUserId, before, { status: 'REVERSED', metadata: c.metadata }, input.reason, input.now); this.expiryJobs.delete(c.id); return cloneCase(c); }
    async expireCase(input) { const c = this.cases.get(input.caseId); if (!c || !['ACTIVE', 'APPEALED'].includes(c.status))
        return null; const before = cloneCase(c); c.status = 'EXPIRED'; c.metadata = { ...(c.metadata ?? {}), ...(input.metadata ?? {}), expiredAt: input.now.toISOString() }; c.updatedAt = new Date(input.now); this.pushEvent(c.id, 'EXPIRED', undefined, before, { status: 'EXPIRED' }, input.reason, input.now); this.expiryJobs.delete(c.id); return cloneCase(c); }
    async listHistory(guildId, userId, limit) { return [...this.cases.values()].filter(c => c.guildId === guildId && c.subjectUserId === userId).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, limit).map(cloneCase); }
    async createNote(input) { const n = { id: `note-${++this.noteSeq}`, ...input, createdAt: new Date(input.now) }; this.notes.push(n); return cloneNote(n); }
    async listNotes(guildId, userId, limit) { return this.notes.filter(n => n.guildId === guildId && n.subjectUserId === userId).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, limit).map(cloneNote); }
    async findActiveCases(guildId, userId, types) { return [...this.cases.values()].filter(c => c.guildId === guildId && c.subjectUserId === userId && ['ACTIVE', 'APPEALED'].includes(c.status) && types.includes(c.actionType)).map(cloneCase); }
    async upsertExpiryJob(input) { this.expiryJobs.set(input.caseId, { guildId: input.guildId, jobType: input.jobType, dueAt: new Date(input.dueAt), userId: input.userId, status: 'PENDING' }); }
    async cancelExpiryJobs(caseId) { this.expiryJobs.delete(caseId); }
    async requestReview(input) { const c = this.must(input.caseId); if (c.subjectUserId !== input.userId)
        throw new Error('Review requester is not case subject.'); const id = `appeal-${++this.appealSeq}`; this.appeals.push({ id, caseId: c.id, userId: input.userId, ...(input.text ? { text: input.text } : {}), createdAt: new Date(input.now) }); c.status = 'APPEALED'; c.updatedAt = new Date(input.now); this.pushEvent(c.id, 'APPEAL_REQUESTED', input.userId, { status: 'ACTIVE' }, { status: 'APPEALED' }, input.text, input.now); return { appealId: id, caseId: c.id }; }
    must(id) { const c = this.cases.get(id); if (!c)
        throw new Error('Moderation case not found.'); return c; }
    pushEvent(caseId, kind, actorUserId, before, after, reason, now) { this.events.push({ id: `event-${++this.eventSeq}`, caseId, kind, ...(actorUserId ? { actorUserId } : {}), ...(before === undefined ? {} : { before }), ...(after === undefined ? {} : { after }), ...(reason ? { reason } : {}), createdAt: new Date(now) }); }
}
//# sourceMappingURL=in-memory.js.map