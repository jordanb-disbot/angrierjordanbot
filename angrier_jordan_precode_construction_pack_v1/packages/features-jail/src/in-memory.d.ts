import type { JailRepository } from './repository.js';
import type { JailCaseRecord, JailHistoryEntry, JailSentenceRecord } from './types.js';
export declare class InMemoryJailRepository implements JailRepository {
    readonly members: Set<string>;
    readonly sentences: Map<string, JailSentenceRecord>;
    readonly cases: JailCaseRecord[];
    readonly appeals: Array<{
        id: string;
        caseId: number;
        userId: string;
        text?: string;
        createdAt: Date;
    }>;
    readonly expiryJobs: Map<string, {
        dueAt: Date;
        status: string;
    }>;
    private sentenceSeq;
    private caseSeq;
    private appealSeq;
    ensureMember(g: string, u: string): Promise<void>;
    createModerationSentence(input: {
        guildId: string;
        userId: string;
        actorUserId: string;
        reason: string;
        startedAt: Date;
        endsAt: Date;
        indefinite: boolean;
        restoration: {
            suspendedRoleIds: string[];
        };
    }): Promise<{
        sentence: JailSentenceRecord;
        caseRecord: JailCaseRecord;
    }>;
    getSentence(id: string): Promise<JailSentenceRecord | null>;
    getActiveModerationSentence(g: string, u: string): Promise<JailSentenceRecord | null>;
    listActiveSentences(g: string, u?: string): Promise<JailSentenceRecord[]>;
    listActiveModerationSentences(g?: string): Promise<JailSentenceRecord[]>;
    changeSentence(input: {
        sentenceId: string;
        actorUserId: string;
        actionType: 'JAIL_EXTEND' | 'JAIL_REDUCE';
        reason: string;
        now: Date;
        endsAt: Date;
        durationSeconds: number;
    }): Promise<{
        sentence: JailSentenceRecord;
        caseRecord: JailCaseRecord;
    }>;
    releaseSentence(input: {
        sentenceId: string;
        actorUserId: string;
        reason: string;
        now: Date;
        actionType?: 'JAIL_RELEASE' | 'JAIL_EXPIRE';
    }): Promise<{
        sentence: JailSentenceRecord;
        caseRecord: JailCaseRecord;
    }>;
    listHistory(g: string, u: string, limit?: number): Promise<JailHistoryEntry[]>;
    requestReview(input: {
        sentenceId: string;
        userId: string;
        text?: string;
        now: Date;
    }): Promise<{
        appealId: string;
        caseId: number;
    }>;
    upsertExpiryJob(sentence: JailSentenceRecord): Promise<void>;
    cancelExpiryJob(sentenceId: string): Promise<void>;
}
