export class HealthService {
    probes;
    constructor(probes) {
        this.probes = probes;
    }
    async check() {
        const checks = [];
        for (const probe of this.probes) {
            try {
                checks.push(await probe());
            }
            catch (error) {
                checks.push({ name: 'unknown', status: 'down', detail: error instanceof Error ? error.message : String(error) });
            }
        }
        const status = checks.some(c => c.status === 'down') ? 'down' : checks.some(c => c.status === 'degraded') ? 'degraded' : 'ok';
        return { status, checkedAt: new Date(), checks };
    }
}
export const timedHealthProbe = (name, probe) => async () => {
    const start = Date.now();
    try {
        await probe();
        return { name, status: 'ok', latencyMs: Date.now() - start };
    }
    catch (error) {
        return { name, status: 'down', latencyMs: Date.now() - start, detail: error instanceof Error ? error.message : String(error) };
    }
};
//# sourceMappingURL=health.js.map