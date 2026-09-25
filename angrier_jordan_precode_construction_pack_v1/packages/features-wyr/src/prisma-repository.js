import { DomainError } from '../../core/src/index.js';
const asObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value) ? value : {};
const asString = (value, key) => { if (typeof value !== 'string' || value.trim() === '')
    throw new DomainError('INVALID_CONTENT', `WYR content is missing ${key}.`); return value; };
export class PrismaWyrPromptRepository {
    db;
    random;
    constructor(db, random = () => Math.random()) {
        this.db = db;
        this.random = random;
    }
    async pick(category, excludedIds) {
        const base = { game: 'wyr', category, enabled: true };
        let rows = await this.db.contentEntry.findMany({ where: { ...base, ...(excludedIds.length ? { id: { notIn: [...excludedIds] } } : {}) }, orderBy: { id: 'asc' } });
        if (rows.length === 0 && excludedIds.length)
            rows = await this.db.contentEntry.findMany({ where: base, orderBy: { id: 'asc' } });
        if (rows.length === 0)
            throw new DomainError('NO_WYR_PROMPTS', `No enabled WYR prompts exist for ${category}.`);
        const raw = this.random();
        const index = Math.floor(Math.max(0, Math.min(0.999999999, Number.isFinite(raw) ? raw : 0)) * rows.length);
        const row = rows[index];
        const payload = asObject(row.payload);
        return { id: row.id, category, text: asString(payload.text, 'text'), optionA: asString(payload.optionA, 'optionA'), optionB: asString(payload.optionB, 'optionB'), enabled: row.enabled };
    }
    async rememberUsed(guildId, promptId, category) {
        await this.db.contentUseHistory.create({ data: { guildId, contentId: promptId, game: 'wyr', category } });
        await this.db.contentEntry.update({ where: { id: promptId }, data: { useCount: { increment: 1 }, lastUsedAt: new Date() } });
    }
    async recent(guildId, category, limit) {
        const rows = await this.db.contentUseHistory.findMany({ where: { guildId, game: 'wyr', category }, orderBy: { usedAt: 'desc' }, take: Math.max(0, limit) });
        return rows.map(r => r.contentId);
    }
}
export class PrismaWyrSessionRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    async create(session) {
        await this.db.gameSession.create({ data: {
                id: session.id, guildId: session.guildId, type: 'wyr', channelId: session.channelId, ownerUserId: session.ownerUserId, ...(session.messageId === undefined ? {} : { messageId: session.messageId }), state: session.state,
                data: { ...session.data, openedAt: session.openedAt.toISOString() }, expiresAt: session.expiresAt, extensionUsed: session.extensionUsed, version: session.version,
            } });
    }
    async get(id) {
        const row = await this.db.gameSession.findUnique({ where: { id }, include: { votes: { where: { questionKey: 'main' }, orderBy: { updatedAt: 'asc' } } } });
        return row ? this.map(row) : null;
    }
    async compareAndSwap(id, expectedVersion, next) {
        return this.db.$transaction(async (tx) => {
            const updated = await tx.gameSession.updateMany({ where: { id, version: expectedVersion }, data: { state: next.state, data: { ...next.data, openedAt: next.openedAt.toISOString() }, expiresAt: next.expiresAt, extensionUsed: next.extensionUsed, version: next.version } });
            if (updated.count !== 1)
                return false;
            for (const vote of next.votes) {
                await tx.vote.upsert({ where: { sessionId_voterUserId_questionKey: { sessionId: id, voterUserId: vote.userId, questionKey: 'main' } }, create: { sessionId: id, voterUserId: vote.userId, questionKey: 'main', choiceKey: vote.choice, anonymous: true, updatedAt: vote.updatedAt }, update: { choiceKey: vote.choice, anonymous: true, updatedAt: vote.updatedAt } });
            }
            return true;
        });
    }
    async attachMessage(id, messageId) {
        const result = await this.db.gameSession.updateMany({ where: { id, type: 'wyr' }, data: { messageId, version: { increment: 1 } } });
        if (result.count !== 1)
            throw new DomainError('SESSION_NOT_FOUND', 'WYR session not found.');
    }
    async listOpen(guildId, channelId) {
        const rows = await this.db.gameSession.findMany({ where: { type: 'wyr', state: 'OPEN', ...(guildId === undefined ? {} : { guildId }), ...(channelId === undefined ? {} : { channelId }) }, include: { votes: { where: { questionKey: 'main' }, orderBy: { updatedAt: 'asc' } } }, orderBy: { createdAt: 'asc' } });
        return rows.map(r => this.map(r));
    }
    map(row) {
        const data = asObject(row.data);
        const openedRaw = data.openedAt;
        const openedAt = typeof openedRaw === 'string' ? new Date(openedRaw) : row.createdAt;
        const expiresAt = row.expiresAt ?? openedAt;
        const votes = (row.votes ?? []).filter(v => v.choiceKey === 'A' || v.choiceKey === 'B').map(v => ({ userId: v.voterUserId, choice: v.choiceKey, updatedAt: new Date(v.updatedAt) }));
        const category = asString(data.category, 'category');
        return { id: row.id, guildId: row.guildId, channelId: row.channelId, ownerUserId: row.ownerUserId ?? '', ...(row.messageId === null ? {} : { messageId: row.messageId }), state: row.state === 'CLOSED' ? 'CLOSED' : row.state === 'CANCELLED' ? 'CANCELLED' : 'OPEN', data: { promptId: asString(data.promptId, 'promptId'), category, question: asString(data.question, 'question'), optionA: asString(data.optionA, 'optionA'), optionB: asString(data.optionB, 'optionB'), durationSeconds: Number(data.durationSeconds ?? 60), extensionSeconds: Number(data.extensionSeconds ?? 30) }, openedAt, expiresAt: new Date(expiresAt), extensionUsed: row.extensionUsed, votes, version: row.version };
    }
}
//# sourceMappingURL=prisma-repository.js.map