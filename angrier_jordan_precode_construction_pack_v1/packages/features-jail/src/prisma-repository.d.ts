import type { JailRepository } from './repository.js';
import type { JailCaseRecord, JailHistoryEntry, JailSentenceRecord } from './types.js';
interface JailRow {
    id: string;
    guildId: string;
    userId: string;
    type: string;
    caseId: number | null;
    reason: string;
    startedAt: Date;
    endsAt: Date;
    endedAt: Date | null;
    active: boolean;
    indefinite: boolean;
    restoration: unknown;
    pausedAt: Date | null;
    pausedRemainingSeconds: number | null;
    releaseReason: string | null;
    releasedByUserId: string | null;
}
interface CaseRow {
    id: number;
    guildId: string;
    subjectUserId: string | null;
    actionType: string;
    reason: string;
    actorUserId: string | null;
    actorType: string;
    durationSeconds: number | null;
    status: string;
    metadata: unknown;
    createdAt: Date;
}
interface AppealRow {
    id: string;
    caseId: number;
    requesterUserId: string;
}
interface TxLike {
    member: {
        upsert(args: unknown): Promise<unknown>;
    };
    moderationCase: {
        create(args: unknown): Promise<CaseRow>;
        findMany(args: unknown): Promise<CaseRow[]>;
        updateMany(args: unknown): Promise<{
            count: number;
        }>;
    };
    jailSentence: {
        create(args: unknown): Promise<JailRow>;
        findUnique(args: unknown): Promise<JailRow | null>;
        findFirst(args: unknown): Promise<JailRow | null>;
        findMany(args: unknown): Promise<JailRow[]>;
        update(args: unknown): Promise<JailRow>;
    };
    appeal: {
        create(args: unknown): Promise<AppealRow>;
    };
    scheduledJob: {
        upsert(args: unknown): Promise<unknown>;
        updateMany(args: unknown): Promise<{
            count: number;
        }>;
    };
}
export interface JailPrismaLike extends TxLike {
    $transaction<T>(fn: (tx: TxLike) => Promise<T>): Promise<T>;
}
export declare class PrismaJailRepository implements JailRepository {
    private readonly db;
    constructor(db: JailPrismaLike);
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
    upsertExpiryJob(s: JailSentenceRecord): Promise<void>;
    cancelExpiryJob(sentenceId: string): Promise<void>;
}
export {};
