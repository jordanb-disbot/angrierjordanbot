import type { AuditService, Clock } from '../../core/src/index.js';
import type { JailRepository } from './repository.js';
import type { JailChangeResult, JailHistoryEntry, JailReleaseResult, JailSendResult, JailSentenceRecord, ParsedJailDuration } from './types.js';
export declare const parseJailDuration: (raw: string) => ParsedJailDuration;
export declare const formatSeconds: (seconds: number) => string;
export declare class JailService {
    private readonly repository;
    private readonly audit;
    private readonly clock;
    constructor(repository: JailRepository, audit: AuditService, clock: Clock);
    send(input: {
        guildId: string;
        userId: string;
        actorUserId: string;
        duration: string;
        reason: string;
        suspendedRoleIds?: readonly string[];
    }): Promise<JailSendResult>;
    extend(input: {
        guildId: string;
        userId: string;
        actorUserId: string;
        duration: string;
        reason: string;
    }): Promise<JailChangeResult>;
    reduce(input: {
        guildId: string;
        userId: string;
        actorUserId: string;
        duration: string;
        reason: string;
    }): Promise<JailChangeResult>;
    private change;
    release(input: {
        guildId: string;
        userId: string;
        actorUserId: string;
        reason: string;
    }): Promise<JailReleaseResult>;
    expireSentence(sentenceId: string): Promise<JailReleaseResult | null>;
    reconcileExpirySchedules(guildId?: string): Promise<number>;
    reconcileMember(guildId: string, userId: string): Promise<number>;
    status(guildId: string, userId: string): Promise<JailSentenceRecord[]>;
    roster(guildId: string, type?: 'all' | 'crime' | 'moderation'): Promise<JailSentenceRecord[]>;
    history(guildId: string, userId: string, limit?: number): Promise<JailHistoryEntry[]>;
    reason(guildId: string, userId: string): Promise<JailSentenceRecord>;
    requestReview(sentenceId: string, userId: string, text?: string): Promise<{
        appealId: string;
        caseId: number;
    }>;
    activeModeration(guildId: string, userId: string): Promise<JailSentenceRecord | null>;
    getSentence(sentenceId: string): Promise<JailSentenceRecord | null>;
    hasOtherActivePunishment(guildId: string, userId: string, excludingSentenceId: string): Promise<boolean>;
    private requireActive;
}
