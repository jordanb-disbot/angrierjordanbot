import { DomainError } from './errors.js';
const configKey = (guildId, key) => `${guildId}::${key}`;
const cloneConfig = (row) => ({ ...row, updatedAt: new Date(row.updatedAt) });
const cloneRevision = (row) => ({ ...row, createdAt: new Date(row.createdAt) });
export class InMemoryConfigRepository {
    values = new Map();
    history = new Map();
    async get(guildId, key) {
        const row = this.values.get(configKey(guildId, key));
        return row ? cloneConfig(row) : null;
    }
    async set(input) {
        const k = configKey(input.guildId, input.key);
        const current = this.values.get(k);
        const version = current?.version ?? 0;
        if (input.expectedVersion !== undefined && input.expectedVersion !== version)
            throw new DomainError('CONFIG_CONFLICT', `Expected ${input.expectedVersion}, got ${version}.`);
        const row = { guildId: input.guildId, key: input.key, value: input.value, source: input.source, version: version + 1, updatedAt: new Date(), ...(input.actorUserId === undefined ? {} : { updatedBy: input.actorUserId }) };
        this.values.set(k, row);
        const revision = { guildId: input.guildId, key: input.key, version: row.version, value: input.value, source: input.source, rollbackSafe: input.rollbackSafe, createdAt: new Date(), ...(input.actorUserId === undefined ? {} : { actorUserId: input.actorUserId }) };
        const list = this.history.get(k) ?? [];
        list.push(revision);
        this.history.set(k, list);
        return cloneConfig(row);
    }
    async revisions(guildId, key, limit = 50) { return (this.history.get(configKey(guildId, key)) ?? []).slice(-limit).reverse().map(cloneRevision); }
}
export class InMemoryAuditSink {
    events = [];
    async write(event) { this.events.push({ ...event, createdAt: new Date(event.createdAt) }); }
}
const cloneJob = (job) => ({ ...job, dueAt: new Date(job.dueAt) });
export class InMemoryJobRepository {
    jobs = new Map();
    constructor(seed = []) { for (const job of seed)
        this.jobs.set(job.id, cloneJob(job)); }
    add(job) { this.jobs.set(job.id, cloneJob(job)); }
    get(id) { const job = this.jobs.get(id); return job ? cloneJob(job) : undefined; }
    async claimDue(now, limit) {
        const due = [...this.jobs.values()].filter(j => j.status === 'PENDING' && j.dueAt <= now).sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime()).slice(0, limit);
        return due.map(job => { const next = { ...job, status: 'RUNNING', attempts: job.attempts + 1 }; this.jobs.set(job.id, next); return cloneJob(next); });
    }
    async complete(id) { const job = this.jobs.get(id); if (job)
        this.jobs.set(id, { ...job, status: 'COMPLETED' }); }
    async fail(id, _error) { const job = this.jobs.get(id); if (job)
        this.jobs.set(id, { ...job, status: 'FAILED' }); }
    async wasExecuted(executionKey) { return [...this.jobs.values()].some(j => j.executionKey === executionKey && j.status === 'COMPLETED'); }
}
//# sourceMappingURL=in-memory-foundation.js.map