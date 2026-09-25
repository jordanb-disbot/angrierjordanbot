export interface AuditEvent {
    guildId: string;
    actorUserId?: string;
    source: string;
    action: string;
    targetType?: string;
    targetId?: string;
    before?: unknown;
    after?: unknown;
    reason?: string;
    requestId: string;
    createdAt: Date;
}
export interface AuditSink {
    write(event: AuditEvent): Promise<void>;
}
export declare class AuditService {
    private readonly sink;
    constructor(sink: AuditSink);
    record(event: AuditEvent): Promise<void>;
}
