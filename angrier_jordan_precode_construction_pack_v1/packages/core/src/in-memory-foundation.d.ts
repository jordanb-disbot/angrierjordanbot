import type { AuditEvent, AuditSink } from './audit.js';
import type { ConfigRecord, ConfigRepository, ConfigRevisionRecord } from './config-service.js';
import type { JobRepository, ScheduledJob } from './scheduler.js';
export declare class InMemoryConfigRepository implements ConfigRepository {
    private readonly values;
    private readonly history;
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
export declare class InMemoryAuditSink implements AuditSink {
    readonly events: AuditEvent[];
    write(event: AuditEvent): Promise<void>;
}
export declare class InMemoryJobRepository implements JobRepository {
    private readonly jobs;
    constructor(seed?: readonly ScheduledJob[]);
    add(job: ScheduledJob): void;
    get(id: string): ScheduledJob | undefined;
    claimDue(now: Date, limit: number): Promise<ScheduledJob[]>;
    complete(id: string): Promise<void>;
    fail(id: string, _error: string): Promise<void>;
    wasExecuted(executionKey: string): Promise<boolean>;
}
