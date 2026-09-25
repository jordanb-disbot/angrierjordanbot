import { DomainError, TimerEngine, invariant } from '../../core/src/index.js';
import { renderWyrOpen, renderWyrResults } from './render.js';
import { WYR_CATEGORIES } from './types.js';
export const systemRandom = { next: () => Math.random() };
export class WyrService {
    prompts;
    sessions;
    clock;
    ids;
    random;
    constructor(prompts, sessions, clock, ids, random = systemRandom) {
        this.prompts = prompts;
        this.sessions = sessions;
        this.clock = clock;
        this.ids = ids;
        this.random = random;
    }
    async start(input) {
        const duration = input.durationSeconds ?? 60;
        const extension = input.extensionSeconds ?? 30;
        invariant(duration > 0, 'INVALID_DURATION', 'WYR duration must be positive.');
        invariant(extension >= 0, 'INVALID_EXTENSION', 'WYR extension cannot be negative.');
        if (input.enforceSinglePublicRound ?? true) {
            const existing = await this.sessions.listOpen(input.guildId, input.channelId);
            invariant(existing.length === 0, 'PARTY_ROUND_ACTIVE', 'A public party-game round is already active in this channel.');
        }
        const category = this.resolveCategory(input.category);
        const recent = await this.prompts.recent(input.guildId, category, 100);
        const prompt = await this.prompts.pick(category, recent);
        const now = this.clock.now();
        const timer = TimerEngine.create(now, duration);
        const session = {
            id: this.ids.next('wyr'), guildId: input.guildId, channelId: input.channelId, ownerUserId: input.ownerUserId, state: 'OPEN',
            data: { promptId: prompt.id, category, question: prompt.text, optionA: prompt.optionA, optionB: prompt.optionB, durationSeconds: duration, extensionSeconds: extension },
            openedAt: now, expiresAt: timer.expiresAt, extensionUsed: false, votes: [], version: 0,
        };
        await this.sessions.create(session);
        await this.prompts.rememberUsed(input.guildId, prompt.id, category);
        return session;
    }
    async vote(sessionId, userId, choice) {
        invariant(choice === 'A' || choice === 'B', 'INVALID_CHOICE', 'Choose A or B.');
        return this.updateOpen(sessionId, s => {
            invariant(this.clock.now() < s.expiresAt, 'ROUND_EXPIRED', 'Voting has ended.');
            const now = this.clock.now();
            const existing = s.votes.find(v => v.userId === userId);
            if (existing) {
                existing.choice = choice;
                existing.updatedAt = now;
            }
            else {
                s.votes.push({ userId, choice, updatedAt: now });
            }
            return s;
        });
    }
    async extend(sessionId, actorUserId, isStaff = false) {
        return this.updateOpen(sessionId, s => {
            invariant(actorUserId === s.ownerUserId || isStaff, 'NOT_ALLOWED', 'Only the starter or staff may extend the round.');
            invariant(s.data.extensionSeconds > 0, 'EXTENSION_DISABLED', 'This round does not allow an extension.');
            const t = TimerEngine.extendOnce({ openedAt: s.openedAt, expiresAt: s.expiresAt, extensionUsed: s.extensionUsed }, s.data.extensionSeconds, this.clock.now());
            s.expiresAt = t.expiresAt;
            s.extensionUsed = t.extensionUsed;
            return s;
        });
    }
    async close(sessionId) {
        for (let attempt = 0; attempt < 4; attempt += 1) {
            const current = await this.sessions.get(sessionId);
            if (!current)
                throw new DomainError('SESSION_NOT_FOUND', 'WYR session not found.');
            if (current.state === 'CLOSED')
                return this.closedView(current);
            invariant(current.state === 'OPEN', 'ROUND_CLOSED', 'This WYR round is not open.');
            const next = this.clone(current);
            next.state = 'CLOSED';
            next.version = current.version + 1;
            if (await this.sessions.compareAndSwap(sessionId, current.version, next))
                return this.closedView(next);
        }
        throw new DomainError('SESSION_CONFLICT', 'WYR round changed concurrently. Retry the operation.');
    }
    async replay(sourceSessionId, actorUserId) {
        const source = await this.sessions.get(sourceSessionId);
        if (!source)
            throw new DomainError('SESSION_NOT_FOUND', 'WYR session not found.');
        invariant(source.state === 'CLOSED', 'ROUND_NOT_COMPLETE', 'Play Again is available after results close.');
        return this.start({
            guildId: source.guildId, channelId: source.channelId, ownerUserId: actorUserId, category: source.data.category,
            durationSeconds: source.data.durationSeconds, extensionSeconds: source.data.extensionSeconds, enforceSinglePublicRound: true,
        });
    }
    async attachMessage(sessionId, messageId) {
        invariant(messageId.trim().length > 0, 'INVALID_MESSAGE_ID', 'Discord message ID is required.');
        await this.sessions.attachMessage(sessionId, messageId);
        return this.get(sessionId);
    }
    async get(sessionId) {
        const session = await this.sessions.get(sessionId);
        if (!session)
            throw new DomainError('SESSION_NOT_FOUND', 'WYR session not found.');
        return session;
    }
    async recover() {
        const open = await this.sessions.listOpen();
        const now = this.clock.now();
        return { active: open.filter(s => s.expiresAt > now), expired: open.filter(s => s.expiresAt <= now) };
    }
    async recoverAndCloseExpired() {
        const recovered = await this.recover();
        const closed = [];
        for (const session of recovered.expired)
            closed.push(await this.close(session.id));
        return { active: recovered.active, closed };
    }
    renderOpen(session) {
        invariant(session.state === 'OPEN', 'ROUND_CLOSED', 'Only an open WYR round can render as open.');
        const remaining = Math.max(0, Math.ceil((session.expiresAt.getTime() - this.clock.now().getTime()) / 1000));
        return renderWyrOpen(session, remaining);
    }
    results(session) {
        const A = session.votes.filter(v => v.choice === 'A').length;
        const B = session.votes.filter(v => v.choice === 'B').length;
        const total = A + B;
        return { A, B, total, winner: total === 0 ? 'NONE' : A === B ? 'TIE' : A > B ? 'A' : 'B' };
    }
    closedView(session) {
        const results = this.results(session);
        const svg = renderWyrResults(session, results);
        return { session, results, svg };
    }
    resolveCategory(input) {
        if (input !== 'Random')
            return input;
        const raw = this.random.next();
        const safe = Number.isFinite(raw) ? Math.max(0, Math.min(0.999999999, raw)) : 0;
        return WYR_CATEGORIES[Math.floor(safe * WYR_CATEGORIES.length)];
    }
    async updateOpen(sessionId, mutate) {
        for (let attempt = 0; attempt < 4; attempt += 1) {
            const current = await this.sessions.get(sessionId);
            if (!current)
                throw new DomainError('SESSION_NOT_FOUND', 'WYR session not found.');
            invariant(current.state === 'OPEN', 'ROUND_CLOSED', 'This WYR round is closed.');
            const next = mutate(this.clone(current));
            next.version = current.version + 1;
            if (await this.sessions.compareAndSwap(sessionId, current.version, next))
                return next;
        }
        throw new DomainError('SESSION_CONFLICT', 'WYR round changed concurrently. Retry the operation.');
    }
    clone(session) {
        return { ...session, data: { ...session.data }, openedAt: new Date(session.openedAt), expiresAt: new Date(session.expiresAt), votes: session.votes.map(v => ({ ...v, updatedAt: new Date(v.updatedAt) })) };
    }
}
//# sourceMappingURL=service.js.map