export type BalanceBucket = 'wallet' | 'bank';
export interface LedgerAccount {
    guildId: string;
    userId: string;
    wallet: bigint;
    bank: bigint;
    version: number;
}
export interface LedgerLine {
    userId?: string;
    bucket: BalanceBucket | 'system';
    amount: bigint;
    reason: string;
    metadata?: Record<string, unknown>;
}
export interface LedgerTransaction {
    idempotencyKey: string;
    guildId: string;
    lines: readonly LedgerLine[];
}
export interface LedgerRepository {
    hasIdempotencyKey(key: string): Promise<boolean>;
    getAccount(guildId: string, userId: string): Promise<LedgerAccount>;
    commit(tx: LedgerTransaction, expectedVersions: ReadonlyMap<string, number>): Promise<boolean>;
}
export declare class LedgerEngine {
    private readonly repo;
    constructor(repo: LedgerRepository);
    apply(tx: LedgerTransaction): Promise<'applied' | 'duplicate'>;
}
