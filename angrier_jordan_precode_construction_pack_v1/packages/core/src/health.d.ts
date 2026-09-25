export type HealthStatus = 'ok' | 'degraded' | 'down';
export interface HealthCheckResult {
    name: string;
    status: HealthStatus;
    latencyMs?: number;
    detail?: string;
}
export type HealthProbe = () => Promise<HealthCheckResult>;
export interface HealthSnapshot {
    status: HealthStatus;
    checkedAt: Date;
    checks: HealthCheckResult[];
}
export declare class HealthService {
    private readonly probes;
    constructor(probes: readonly HealthProbe[]);
    check(): Promise<HealthSnapshot>;
}
export declare const timedHealthProbe: (name: string, probe: () => Promise<void>) => HealthProbe;
