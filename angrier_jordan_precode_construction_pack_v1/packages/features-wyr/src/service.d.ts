import { type Clock } from '../../core/src/index.js';
import { type WyrCategoryInput, type WyrChoice, type WyrResults, type WyrRuntimeSession } from './types.js';
import type { WyrPromptRepository, WyrSessionRepository } from './repository.js';
export interface IdGenerator {
    next(prefix: string): string;
}
export interface RandomSource {
    next(): number;
}
export declare const systemRandom: RandomSource;
export interface StartWyrInput {
    guildId: string;
    channelId: string;
    ownerUserId: string;
    category: WyrCategoryInput;
    durationSeconds?: number;
    extensionSeconds?: number;
    enforceSinglePublicRound?: boolean;
}
export interface ClosedWyrRound {
    session: WyrRuntimeSession;
    results: WyrResults;
    svg: string;
}
export declare class WyrService {
    private readonly prompts;
    private readonly sessions;
    private readonly clock;
    private readonly ids;
    private readonly random;
    constructor(prompts: WyrPromptRepository, sessions: WyrSessionRepository, clock: Clock, ids: IdGenerator, random?: RandomSource);
    start(input: StartWyrInput): Promise<WyrRuntimeSession>;
    vote(sessionId: string, userId: string, choice: WyrChoice): Promise<WyrRuntimeSession>;
    extend(sessionId: string, actorUserId: string, isStaff?: boolean): Promise<WyrRuntimeSession>;
    close(sessionId: string): Promise<ClosedWyrRound>;
    replay(sourceSessionId: string, actorUserId: string): Promise<WyrRuntimeSession>;
    attachMessage(sessionId: string, messageId: string): Promise<WyrRuntimeSession>;
    get(sessionId: string): Promise<WyrRuntimeSession>;
    recover(): Promise<{
        active: WyrRuntimeSession[];
        expired: WyrRuntimeSession[];
    }>;
    recoverAndCloseExpired(): Promise<{
        active: WyrRuntimeSession[];
        closed: ClosedWyrRound[];
    }>;
    renderOpen(session: WyrRuntimeSession): string;
    results(session: WyrRuntimeSession): WyrResults;
    private closedView;
    private resolveCategory;
    private updateOpen;
    private clone;
}
