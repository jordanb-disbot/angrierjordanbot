import { DomainError } from '../../core/src/index.js';
const configRecord = (row) => ({
    guildId: row.guildId, key: row.key, value: row.value, source: row.source, version: row.version,
    ...(row.updatedBy === null ? {} : { updatedBy: row.updatedBy }), updatedAt: row.updatedAt,
});
export class PrismaConfigRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    async get(guildId, key) {
        const row = await this.db.configValue.findUnique({ where: { guildId_key: { guildId, key } } });
        return row ? configRecord(row) : null;
    }
    async set(input) {
        return this.db.$transaction(async (tx) => {
            const current = await tx.configValue.findUnique({ where: { guildId_key: { guildId: input.guildId, key: input.key } } });
            const actualVersion = current?.version ?? 0;
            if (input.expectedVersion !== undefined && input.expectedVersion !== actualVersion) {
                throw new DomainError('CONFIG_CONFLICT', `Setting ${input.key} changed from version ${input.expectedVersion} to ${actualVersion}.`);
            }
            const nextVersion = actualVersion + 1;
            const data = { value: input.value, source: input.source, version: nextVersion, updatedBy: input.actorUserId ?? null };
            const next = current
                ? await tx.configValue.update({ where: { guildId_key: { guildId: input.guildId, key: input.key } }, data })
                : await tx.configValue.create({ data: { guildId: input.guildId, key: input.key, ...data } });
            await tx.configRevision.create({ data: {
                    guildId: input.guildId, key: input.key, version: nextVersion, value: input.value, source: input.source,
                    actorUserId: input.actorUserId ?? null, rollbackSafe: input.rollbackSafe,
                } });
            return configRecord(next);
        });
    }
    async revisions(guildId, key, limit = 50) {
        const rows = await this.db.configRevision.findMany({ where: { guildId, key }, orderBy: { version: 'desc' }, take: limit });
        return rows.map(row => ({
            guildId: row.guildId, key: row.key, version: row.version, value: row.value, source: row.source,
            ...(row.actorUserId === null ? {} : { actorUserId: row.actorUserId }), rollbackSafe: row.rollbackSafe, createdAt: row.createdAt,
        }));
    }
}
export class PrismaAuditSink {
    db;
    constructor(db) {
        this.db = db;
    }
    async write(event) {
        await this.db.auditEvent.create({ data: {
                guildId: event.guildId, actorUserId: event.actorUserId ?? null, source: event.source, action: event.action,
                targetType: event.targetType ?? null, targetId: event.targetId ?? null, before: event.before ?? null, after: event.after ?? null,
                reason: event.reason ?? null, requestId: event.requestId, createdAt: event.createdAt,
            } });
    }
}
const scheduledJob = (row) => ({
    id: row.id, guildId: row.guildId, jobType: row.jobType, executionKey: row.executionKey, dueAt: row.dueAt,
    status: row.status, ...(row.payload === null ? {} : { payload: row.payload }), attempts: row.attempts,
});
export class PrismaJobRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    async claimDue(now, limit) {
        return this.db.$transaction(async (tx) => {
            const due = await tx.scheduledJob.findMany({ where: { status: 'PENDING', dueAt: { lte: now } }, orderBy: { dueAt: 'asc' }, take: limit });
            const claimed = [];
            for (const row of due) {
                const result = await tx.scheduledJob.updateMany({ where: { id: row.id, status: 'PENDING' }, data: { status: 'RUNNING', attempts: { increment: 1 } } });
                if (result.count === 1)
                    claimed.push(scheduledJob({ ...row, status: 'RUNNING', attempts: row.attempts + 1 }));
            }
            return claimed;
        });
    }
    async complete(id) {
        await this.db.scheduledJob.update({ where: { id }, data: { status: 'COMPLETED', completedAt: new Date(), lastError: null } });
    }
    async fail(id, error) {
        await this.db.scheduledJob.update({ where: { id }, data: { status: 'FAILED', lastError: error } });
    }
    async wasExecuted(executionKey) {
        const row = await this.db.scheduledJob.findUnique({ where: { executionKey } });
        return row?.status === 'COMPLETED';
    }
}
export const createPrismaHealthProbe = (db) => async () => {
    const started = Date.now();
    try {
        if (db.$queryRawUnsafe)
            await db.$queryRawUnsafe('SELECT 1');
        else
            await db.scheduledJob.findMany({ take: 1 });
        return { name: 'postgres', status: 'ok', latencyMs: Date.now() - started };
    }
    catch (error) {
        return { name: 'postgres', status: 'down', latencyMs: Date.now() - started, detail: error instanceof Error ? error.message : String(error) };
    }
};
//# sourceMappingURL=prisma-adapters.js.map