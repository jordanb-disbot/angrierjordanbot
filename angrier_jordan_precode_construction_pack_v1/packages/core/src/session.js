import { invariant } from './errors.js';
export class SessionEngine {
    repo;
    constructor(repo) {
        this.repo = repo;
    }
    async transition(id, allowed, nextState, mutate) {
        const current = await this.repo.get(id);
        invariant(current, 'SESSION_NOT_FOUND', 'Session not found.');
        invariant(allowed.includes(current.state), 'INVALID_SESSION_STATE', `Cannot transition from ${current.state} to ${nextState}.`);
        const base = { ...current, state: nextState, version: current.version + 1, updatedAt: new Date() };
        const next = mutate ? mutate(base) : base;
        const ok = await this.repo.compareAndSwap(id, current.version, next);
        invariant(ok, 'SESSION_CONFLICT', 'Session changed concurrently. Retry the operation.');
        return next;
    }
}
//# sourceMappingURL=session.js.map