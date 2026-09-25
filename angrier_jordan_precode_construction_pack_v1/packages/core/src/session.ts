import { invariant } from './errors.js';
export type SessionState = 'DRAFT'|'OPEN'|'LOCKED'|'SETTLING'|'CLOSED'|'CANCELLED';
export interface Session<TData = Record<string, unknown>> {
  id: string; guildId: string; channelId: string; type: string; ownerUserId?: string;
  state: SessionState; data: TData; expiresAt?: Date; extensionUsed: boolean; version: number;
  createdAt: Date; updatedAt: Date;
}
export interface SessionRepository {
  get<T>(id: string): Promise<Session<T> | null>;
  create<T>(session: Session<T>): Promise<Session<T>>;
  compareAndSwap<T>(id: string, expectedVersion: number, next: Session<T>): Promise<boolean>;
  listOpen(type?: string): Promise<Session[]>;
}
export class SessionEngine {
  constructor(private readonly repo: SessionRepository) {}
  async transition<T>(id: string, allowed: SessionState[], nextState: SessionState, mutate?: (s: Session<T>) => Session<T>): Promise<Session<T>> {
    const current = await this.repo.get<T>(id);
    invariant(current, 'SESSION_NOT_FOUND', 'Session not found.');
    invariant(allowed.includes(current.state), 'INVALID_SESSION_STATE', `Cannot transition from ${current.state} to ${nextState}.`);
    const base: Session<T> = { ...current, state: nextState, version: current.version + 1, updatedAt: new Date() };
    const next = mutate ? mutate(base) : base;
    const ok = await this.repo.compareAndSwap(id, current.version, next);
    invariant(ok, 'SESSION_CONFLICT', 'Session changed concurrently. Retry the operation.');
    return next;
  }
}
