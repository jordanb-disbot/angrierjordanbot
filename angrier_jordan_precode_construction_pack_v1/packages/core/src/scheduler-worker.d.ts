import type { IdempotentScheduler } from './scheduler.js';
export declare class SchedulerWorker {
    private readonly scheduler;
    private readonly intervalMs;
    private timer;
    private running;
    constructor(scheduler: IdempotentScheduler, intervalMs?: number);
    start(): void;
    stop(): void;
    runOnce(now?: Date): Promise<void>;
}
