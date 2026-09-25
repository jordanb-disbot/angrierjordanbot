const key = (g, u) => `${g}:${u}`;
const cloneSentence = (s) => ({ ...s, startedAt: new Date(s.startedAt), endsAt: new Date(s.endsAt), ...(s.endedAt ? { endedAt: new Date(s.endedAt) } : {}), ...(s.pausedAt ? { pausedAt: new Date(s.pausedAt) } : {}), restoration: { suspendedRoleIds: [...s.restoration.suspendedRoleIds] } });
const cloneCase = (c) => ({ ...c, createdAt: new Date(c.createdAt), ...(c.metadata ? { metadata: structuredClone(c.metadata) } : {}) });
export class InMemoryJailRepository {
    members = new Set();
    sentences = new Map();
    cases = [];
    appeals = [];
    expiryJobs = new Map();
    sentenceSeq = 0;
    caseSeq = 0;
    appealSeq = 0;
    async ensureMember(g, u) { this.members.add(key(g, u)); }
    async createModerationSentence(input) {
        await this.ensureMember(input.guildId, input.userId);
        const id = `jail-${++this.sentenceSeq}`;
        const caseId = ++this.caseSeq;
        const sentence = { id, guildId: input.guildId, userId: input.userId, type: 'MODERATION', caseId, reason: input.reason, startedAt: new Date(input.startedAt), endsAt: new Date(input.endsAt), active: true, indefinite: input.indefinite, restoration: { suspendedRoleIds: [...input.restoration.suspendedRoleIds] } };
        const caseRecord = { id: caseId, guildId: input.guildId, subjectUserId: input.userId, actionType: 'JAIL', reason: input.reason, actorUserId: input.actorUserId, actorType: 'STAFF', ...(input.indefinite ? {} : { durationSeconds: Math.max(0, Math.round((input.endsAt.getTime() - input.startedAt.getTime()) / 1000)) }), status: 'ACTIVE', metadata: { sentenceId: id }, createdAt: new Date(input.startedAt) };
        this.sentences.set(id, sentence);
        this.cases.push(caseRecord);
        return { sentence: cloneSentence(sentence), caseRecord: cloneCase(caseRecord) };
    }
    async getSentence(id) { const s = this.sentences.get(id); return s ? cloneSentence(s) : null; }
    async getActiveModerationSentence(g, u) { return [...this.sentences.values()].filter(s => s.guildId === g && s.userId === u && s.type === 'MODERATION' && s.active).sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime()).map(cloneSentence)[0] ?? null; }
    async listActiveSentences(g, u) { return [...this.sentences.values()].filter(s => s.guildId === g && s.active && (u === undefined || s.userId === u)).map(cloneSentence); }
    async listActiveModerationSentences(g) { return [...this.sentences.values()].filter(s => s.active && s.type === 'MODERATION' && (g === undefined || s.guildId === g)).map(cloneSentence); }
    async changeSentence(input) { const s = this.sentences.get(input.sentenceId); if (!s)
        throw new Error('sentence missing'); s.endsAt = new Date(input.endsAt); const c = { id: ++this.caseSeq, guildId: s.guildId, subjectUserId: s.userId, actionType: input.actionType, reason: input.reason, actorUserId: input.actorUserId, actorType: 'STAFF', durationSeconds: input.durationSeconds, status: 'ACTIVE', metadata: { sentenceId: s.id, rootCaseId: s.caseId }, createdAt: new Date(input.now) }; this.cases.push(c); return { sentence: cloneSentence(s), caseRecord: cloneCase(c) }; }
    async releaseSentence(input) { const s = this.sentences.get(input.sentenceId); if (!s)
        throw new Error('sentence missing'); s.active = false; s.endedAt = new Date(input.now); s.releaseReason = input.reason; s.releasedByUserId = input.actorUserId; const action = input.actionType ?? 'JAIL_RELEASE'; const c = { id: ++this.caseSeq, guildId: s.guildId, subjectUserId: s.userId, actionType: action, reason: input.reason, actorUserId: input.actorUserId, actorType: action === 'JAIL_EXPIRE' ? 'SYSTEM' : 'STAFF', status: 'EXPIRED', metadata: { sentenceId: s.id, rootCaseId: s.caseId }, createdAt: new Date(input.now) }; this.cases.push(c); return { sentence: cloneSentence(s), caseRecord: cloneCase(c) }; }
    async listHistory(g, u, limit = 20) { return [...this.sentences.values()].filter(s => s.guildId === g && s.userId === u && s.type === 'MODERATION').sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime()).slice(0, limit).map(s => ({ sentence: cloneSentence(s), cases: this.cases.filter(c => c.metadata?.sentenceId === s.id).map(cloneCase) })); }
    async requestReview(input) { const s = this.sentences.get(input.sentenceId); if (!s?.caseId)
        throw new Error('sentence missing case'); const id = `appeal-${++this.appealSeq}`; this.appeals.push({ id, caseId: s.caseId, userId: input.userId, ...(input.text ? { text: input.text } : {}), createdAt: new Date(input.now) }); return { appealId: id, caseId: s.caseId }; }
    async upsertExpiryJob(sentence) { if (sentence.indefinite || sentence.pausedAt || !sentence.active) {
        this.expiryJobs.delete(sentence.id);
        return;
    } this.expiryJobs.set(sentence.id, { dueAt: new Date(sentence.endsAt), status: 'PENDING' }); }
    async cancelExpiryJob(sentenceId) { this.expiryJobs.delete(sentenceId); }
}
//# sourceMappingURL=in-memory.js.map