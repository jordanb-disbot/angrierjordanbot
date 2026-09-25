import { invariant } from './errors.js';
export interface TimerState { openedAt: Date; expiresAt: Date; extensionUsed: boolean; }
export class TimerEngine {
  static create(now: Date, seconds: number): TimerState {
    invariant(seconds > 0, 'INVALID_DURATION', 'Timer duration must be positive.');
    return { openedAt: new Date(now), expiresAt: new Date(now.getTime() + seconds * 1000), extensionUsed: false };
  }
  static remainingMs(timer: TimerState, now: Date): number { return Math.max(0, timer.expiresAt.getTime() - now.getTime()); }
  static isExpired(timer: TimerState, now: Date): boolean { return this.remainingMs(timer, now) === 0; }
  static extendOnce(timer: TimerState, seconds: number, now: Date): TimerState {
    invariant(!timer.extensionUsed, 'EXTENSION_ALREADY_USED', 'This round has already used its extension.');
    invariant(!this.isExpired(timer, now), 'ROUND_EXPIRED', 'The round has already expired.');
    invariant(seconds > 0, 'INVALID_EXTENSION', 'Extension must be positive.');
    return { ...timer, expiresAt: new Date(timer.expiresAt.getTime() + seconds * 1000), extensionUsed: true };
  }
}
