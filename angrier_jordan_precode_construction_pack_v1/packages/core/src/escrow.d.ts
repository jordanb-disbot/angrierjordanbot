export type EscrowState = 'RESERVED' | 'SETTLED' | 'REFUNDED' | 'FORFEITED';
export interface EscrowRecord {
    id: string;
    ownerUserId?: string;
    amount?: bigint;
    itemRef?: string;
    state: EscrowState;
    referenceType: string;
    referenceId: string;
    idempotencyKey: string;
}
export declare class EscrowStateMachine {
    static settle(e: EscrowRecord): EscrowRecord;
    static refund(e: EscrowRecord): EscrowRecord;
    static forfeit(e: EscrowRecord): EscrowRecord;
}
