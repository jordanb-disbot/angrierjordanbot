import type { ModNoteRecord, ModerationCaseEventRecord, ModerationCaseRecord } from './types.js';
export interface ModerationRepository {
    createPreparedCase(input: {
        guildId: string;
        subjectUserId?: string;
        actorUserId: string;
        actionType: string;
        reason: string;
        sourceChannelId?: string;
        sourceMessageId?: string;
        durationSeconds?: number;
        metadata?: Record<string, unknown>;
        now: Date;
    }): Promise<ModerationCaseRecord>;
    finalizeCase(input: {
        caseId: number;
        status: ModerationCaseRecord['status'];
        actorUserId?: string;
        metadata?: Record<string, unknown>;
        now: Date;
        eventKind: string;
        reason?: string;
    }): Promise<ModerationCaseRecord>;
    failPreparedCase(input: {
        caseId: number;
        actorUserId?: string;
        reason: string;
        error: string;
        now: Date;
    }): Promise<ModerationCaseRecord>;
    getCase(caseId: number): Promise<ModerationCaseRecord | null>;
    listCaseEvents(caseId: number): Promise<ModerationCaseEventRecord[]>;
    editCaseReason(input: {
        caseId: number;
        actorUserId: string;
        reason: string;
        now: Date;
    }): Promise<ModerationCaseRecord>;
    reverseCase(input: {
        caseId: number;
        actorUserId: string;
        reason: string;
        now: Date;
        metadata?: Record<string, unknown>;
    }): Promise<ModerationCaseRecord>;
    expireCase(input: {
        caseId: number;
        reason: string;
        now: Date;
        metadata?: Record<string, unknown>;
    }): Promise<ModerationCaseRecord | null>;
    listHistory(guildId: string, userId: string, limit: number): Promise<ModerationCaseRecord[]>;
    createNote(input: {
        guildId: string;
        subjectUserId: string;
        authorUserId: string;
        text: string;
        now: Date;
    }): Promise<ModNoteRecord>;
    listNotes(guildId: string, userId: string, limit: number): Promise<ModNoteRecord[]>;
    findActiveCases(guildId: string, userId: string, actionTypes: readonly string[]): Promise<ModerationCaseRecord[]>;
    upsertExpiryJob(input: {
        guildId: string;
        caseId: number;
        jobType: 'moderation.timeout_expire' | 'moderation.temp_ban_expire';
        dueAt: Date;
        userId: string;
    }): Promise<void>;
    cancelExpiryJobs(caseId: number): Promise<void>;
    requestReview(input: {
        caseId: number;
        userId: string;
        text?: string;
        now: Date;
    }): Promise<{
        appealId: string;
        caseId: number;
    }>;
}
