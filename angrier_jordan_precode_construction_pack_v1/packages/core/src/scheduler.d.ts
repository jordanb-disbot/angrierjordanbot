export interface ScheduledJob {
    id: string;
    guildId: string;
    jobType: string;
    executionKey: string;
    dueAt: Date;
    status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
    payload?: unknown;
    attempts: number;
}
export interface JobRepository {
    claimDue(now: Date, limit: number): Promise<ScheduledJob[]>;
    complete(id: string): Promise<void>;
    fail(id: string, error: string): Promise<void>;
    wasExecuted(executionKey: string): Promise<boolean>;
}
export type JobHandler = (job: ScheduledJob) => Promise<void>;
export declare class IdempotentScheduler {
    private readonly repo;
    private readonly handlers;
    constructor(repo: JobRepository, handlers: Record<string, JobHandler>);
    tick(now?: Date, limit?: number): Promise<void>;
}
