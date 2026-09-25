export class IdempotentScheduler {
    repo;
    handlers;
    constructor(repo, handlers) {
        this.repo = repo;
        this.handlers = handlers;
    }
    async tick(now = new Date(), limit = 25) {
        for (const job of await this.repo.claimDue(now, limit)) {
            try {
                if (!(await this.repo.wasExecuted(job.executionKey))) {
                    const h = this.handlers[job.jobType];
                    if (!h)
                        throw new Error(`No handler for ${job.jobType}`);
                    await h(job);
                }
                await this.repo.complete(job.id);
            }
            catch (e) {
                await this.repo.fail(job.id, e instanceof Error ? e.message : String(e));
            }
        }
    }
}
//# sourceMappingURL=scheduler.js.map