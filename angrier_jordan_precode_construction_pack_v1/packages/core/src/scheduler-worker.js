export class SchedulerWorker {
    scheduler;
    intervalMs;
    timer;
    running = false;
    constructor(scheduler, intervalMs = 5_000) {
        this.scheduler = scheduler;
        this.intervalMs = intervalMs;
    }
    start() {
        if (this.timer)
            return;
        this.timer = setInterval(() => { void this.runOnce(); }, this.intervalMs);
    }
    stop() { if (this.timer) {
        clearInterval(this.timer);
        this.timer = undefined;
    } }
    async runOnce(now = new Date()) {
        if (this.running)
            return;
        this.running = true;
        try {
            await this.scheduler.tick(now);
        }
        finally {
            this.running = false;
        }
    }
}
//# sourceMappingURL=scheduler-worker.js.map