import type { JailCaseRecord, JailHistoryEntry, JailSentenceRecord } from './types.js';
export interface JailRepository {
    ensureMember(guildId: string, userId: string): Promise<void>;
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
    getActiveModerationSentence(guildId: string, userId: string): Promise<JailSentenceRecord | null>;
    listActiveSentences(guildId: string, userId?: string): Promise<JailSentenceRecord[]>;
    listActiveModerationSentences(guildId?: string): Promise<JailSentenceRecord[]>;
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
    listHistory(guildId: string, userId: string, limit?: number): Promise<JailHistoryEntry[]>;
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
