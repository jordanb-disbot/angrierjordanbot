import type { ModerationRepository } from './repository.js';
import type { ModNoteRecord, ModerationCaseEventRecord, ModerationCaseRecord } from './types.js';
type Row = {
    id: number;
    guildId: string;
    subjectUserId: string | null;
    actionType: string;
    reason: string;
    category: string | null;
    actorUserId: string | null;
    actorType: string;
    sourceChannelId: string | null;
    sourceMessageId: string | null;
    durationSeconds: number | null;
    status: string;
    metadata: unknown;
    createdAt: Date;
    updatedAt: Date;
};
type EventRow = {
    id: string;
    caseId: number;
    kind: string;
    actorUserId: string | null;
    before: unknown;
    after: unknown;
    reason: string | null;
    createdAt: Date;
};
type NoteRow = {
    id: string;
    guildId: string;
    subjectUserId: string;
    authorUserId: string;
    text: string;
    createdAt: Date;
};
interface DbLike {
    moderationCase: {
        create(args: any): Promise<Row>;
        findUnique(args: any): Promise<Row | null>;
        findMany(args: any): Promise<Row[]>;
        update(args: any): Promise<Row>;
        updateMany(args: any): Promise<{
            count: number;
        }>;
    };
    moderationCaseEvent: {
        create(args: any): Promise<EventRow>;
        findMany(args: any): Promise<EventRow[]>;
    };
    modNote: {
        create(args: any): Promise<NoteRow>;
        findMany(args: any): Promise<NoteRow[]>;
    };
    scheduledJob: {
        upsert(args: any): Promise<any>;
        updateMany(args: any): Promise<{
            count: number;
        }>;
    };
    appeal: {
        create(args: any): Promise<{
            id: string;
            caseId: number;
        }>;
    };
    $transaction<T>(fn: (tx: DbLike) => Promise<T>): Promise<T>;
}
export declare class PrismaModerationRepository implements ModerationRepository {
    private readonly db;
    constructor(db: DbLike);
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
export {};
