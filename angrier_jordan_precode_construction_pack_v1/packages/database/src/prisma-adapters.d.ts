import type { AuditEvent, AuditSink, ConfigRecord, ConfigRepository, ConfigRevisionRecord, JobRepository, ScheduledJob } from '../../core/src/index.js';
interface ConfigValueRow {
    guildId: string;
    key: string;
    value: unknown;
    source: string;
    version: number;
    updatedBy: string | null;
    updatedAt: Date;
}
interface ConfigRevisionRow {
    guildId: string;
    key: string;
    version: number;
    value: unknown;
    source: string;
    actorUserId: string | null;
    rollbackSafe: boolean;
    createdAt: Date;
}
interface ScheduledJobRow {
    id: string;
    guildId: string;
    jobType: string;
    executionKey: string;
    dueAt: Date;
    status: string;
    payload: unknown;
    attempts: number;
    lastError: string | null;
    completedAt: Date | null;
}
interface UpdateManyResult {
    count: number;
}
interface ConfigTxLike {
    configValue: {
        findUnique(args: unknown): Promise<ConfigValueRow | null>;
        create(args: unknown): Promise<ConfigValueRow>;
        update(args: unknown): Promise<ConfigValueRow>;
    };
    configRevision: {
        create(args: unknown): Promise<unknown>;
    };
}
interface JobTxLike {
    scheduledJob: {
        findMany(args: unknown): Promise<ScheduledJobRow[]>;
        updateMany(args: unknown): Promise<UpdateManyResult>;
        update(args: unknown): Promise<ScheduledJobRow>;
    };
}
export interface FoundationPrismaLike extends ConfigTxLike, JobTxLike {
    configRevision: {
        create(args: unknown): Promise<unknown>;
        findMany(args: unknown): Promise<ConfigRevisionRow[]>;
    };
    auditEvent: {
        create(args: unknown): Promise<unknown>;
    };
    scheduledJob: {
        findMany(args: unknown): Promise<ScheduledJobRow[]>;
        findUnique(args: unknown): Promise<ScheduledJobRow | null>;
        updateMany(args: unknown): Promise<UpdateManyResult>;
        update(args: unknown): Promise<ScheduledJobRow>;
    };
    $transaction<T>(fn: (tx: ConfigTxLike & JobTxLike) => Promise<T>): Promise<T>;
    $queryRawUnsafe?<T = unknown>(query: string): Promise<T>;
}
export declare class PrismaConfigRepository implements ConfigRepository {
    private readonly db;
    constructor(db: FoundationPrismaLike);
    get(guildId: string, key: string): Promise<ConfigRecord | null>;
    set(input: {
        guildId: string;
        key: string;
        value: unknown;
        source: string;
        actorUserId?: string;
        expectedVersion?: number;
        rollbackSafe: boolean;
    }): Promise<ConfigRecord>;
    revisions(guildId: string, key: string, limit?: number): Promise<ConfigRevisionRecord[]>;
}
export declare class PrismaAuditSink implements AuditSink {
    private readonly db;
    constructor(db: FoundationPrismaLike);
    write(event: AuditEvent): Promise<void>;
}
export declare class PrismaJobRepository implements JobRepository {
    private readonly db;
    constructor(db: FoundationPrismaLike);
    claimDue(now: Date, limit: number): Promise<ScheduledJob[]>;
    complete(id: string): Promise<void>;
    fail(id: string, error: string): Promise<void>;
    wasExecuted(executionKey: string): Promise<boolean>;
}
export declare const createPrismaHealthProbe: (db: FoundationPrismaLike) => () => Promise<{
    name: string;
    status: "ok";
    latencyMs: number;
    detail?: never;
} | {
    name: string;
    status: "down";
    latencyMs: number;
    detail: string;
}>;
export {};
