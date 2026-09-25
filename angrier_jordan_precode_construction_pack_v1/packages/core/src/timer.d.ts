export interface TimerState {
    openedAt: Date;
    expiresAt: Date;
    extensionUsed: boolean;
}
export declare class TimerEngine {
    static create(now: Date, seconds: number): TimerState;
    static remainingMs(timer: TimerState, now: Date): number;
    static isExpired(timer: TimerState, now: Date): boolean;
    static extendOnce(timer: TimerState, seconds: number, now: Date): TimerState;
}
