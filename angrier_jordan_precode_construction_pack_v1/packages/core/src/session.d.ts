export type SessionState = 'DRAFT' | 'OPEN' | 'LOCKED' | 'SETTLING' | 'CLOSED' | 'CANCELLED';
export interface Session<TData = Record<string, unknown>> {
    id: string;
    guildId: string;
    channelId: string;
    type: string;
    ownerUserId?: string;
    state: SessionState;
    data: TData;
    expiresAt?: Date;
    extensionUsed: boolean;
    version: number;
    createdAt: Date;
    updatedAt: Date;
}
export interface SessionRepository {
    get<T>(id: string): Promise<Session<T> | null>;
    create<T>(session: Session<T>): Promise<Session<T>>;
    compareAndSwap<T>(id: string, expectedVersion: number, next: Session<T>): Promise<boolean>;
    listOpen(type?: string): Promise<Session[]>;
}
export declare class SessionEngine {
    private readonly repo;
    constructor(repo: SessionRepository);
    transition<T>(id: string, allowed: SessionState[], nextState: SessionState, mutate?: (s: Session<T>) => Session<T>): Promise<Session<T>>;
}
