import { DomainError } from '../../core/src/index.js';
const cloneSession = (s) => ({
    ...s,
    data: { ...s.data },
    openedAt: new Date(s.openedAt),
    expiresAt: new Date(s.expiresAt),
    votes: s.votes.map(v => ({ ...v, updatedAt: new Date(v.updatedAt) })),
});
export class InMemoryWyrPromptRepository {
    prompts;
    history = [];
    constructor(prompts) {
        this.prompts = prompts;
    }
    async pick(category, excludedIds) {
        const enabled = this.prompts.filter(p => p.enabled && p.category === category);
        if (enabled.length === 0)
            throw new DomainError('NO_WYR_PROMPTS', `No enabled WYR prompts exist for ${category}.`);
        const excluded = new Set(excludedIds);
        return enabled.find(p => !excluded.has(p.id)) ?? enabled[0];
    }
    async rememberUsed(guildId, promptId, category) {
        this.history.push({ guildId, promptId, category, usedAt: Date.now() });
    }
    async recent(guildId, category, limit) {
        return this.history.filter(h => h.guildId === guildId && h.category === category).slice(-Math.max(0, limit)).reverse().map(h => h.promptId);
    }
}
export class InMemoryWyrSessionRepository {
    sessions = new Map();
    async create(session) {
        if (this.sessions.has(session.id))
            throw new DomainError('SESSION_EXISTS', 'WYR session already exists.');
        this.sessions.set(session.id, cloneSession(session));
    }
    async get(id) {
        const s = this.sessions.get(id);
        return s ? cloneSession(s) : null;
    }
    async compareAndSwap(id, expectedVersion, next) {
        const current = this.sessions.get(id);
        if (!current || current.version !== expectedVersion)
            return false;
        this.sessions.set(id, cloneSession(next));
        return true;
    }
    async attachMessage(id, messageId) {
        const current = this.sessions.get(id);
        if (!current)
            throw new DomainError('SESSION_NOT_FOUND', 'WYR session not found.');
        this.sessions.set(id, cloneSession({ ...current, messageId, version: current.version + 1 }));
    }
    async listOpen(guildId, channelId) {
        return [...this.sessions.values()].filter(s => s.state === 'OPEN' && (guildId === undefined || s.guildId === guildId) && (channelId === undefined || s.channelId === channelId)).map(cloneSession);
    }
}
export class SequentialIdGenerator {
    value = 0;
    next(prefix) { this.value += 1; return `${prefix}_${String(this.value).padStart(6, '0')}`; }
}
//# sourceMappingURL=in-memory.js.map