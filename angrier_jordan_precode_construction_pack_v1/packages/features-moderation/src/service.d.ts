import type { AuditService, Clock } from '../../core/src/index.js';
import type { ModerationRepository } from './repository.js';
import type { CasePreparationInput, ModerationCaseRecord, ModerationHistory, ParsedModerationDuration } from './types.js';
export declare const parseTimeoutDuration: (raw: string) => ParsedModerationDuration;
export declare const parseBanDuration: (raw?: string | null) => ParsedModerationDuration;
export declare class ModerationService {
    private readonly repository;
    private readonly audit;
    private readonly clock;
    constructor(repository: ModerationRepository, audit: AuditService, clock: Clock);
    prepare(input: CasePreparationInput): Promise<ModerationCaseRecord>;
    finalize(caseId: number, status: ModerationCaseRecord['status'], input?: {
        actorUserId?: string;
        metadata?: Record<string, unknown>;
        reason?: string;
        eventKind?: string;
    }): Promise<ModerationCaseRecord>;
    enforcementFailed(caseId: number, actorUserId: string | undefined, reason: string, error: unknown): Promise<ModerationCaseRecord>;
    scheduleTemporaryCase(c: ModerationCaseRecord, userId: string, seconds: number, jobType: 'moderation.timeout_expire' | 'moderation.temp_ban_expire'): Promise<Date>;
    expire(caseId: number, reason: string, metadata?: Record<string, unknown>): Promise<ModerationCaseRecord | null>;
    editReason(caseId: number, actorUserId: string, reason: string): Promise<ModerationCaseRecord>;
    reverse(caseId: number, actorUserId: string, reason: string, metadata?: Record<string, unknown>): Promise<ModerationCaseRecord>;
    closeActiveCases(guildId: string, userId: string, types: readonly string[], actorUserId: string, reason: string): Promise<ModerationCaseRecord[]>;
    note(guildId: string, userId: string, authorUserId: string, text: string): Promise<import("./types.js").ModNoteRecord>;
    history(guildId: string, userId: string, limit?: number): Promise<ModerationHistory>;
    caseView(caseId: number): Promise<{
        caseRecord: ModerationCaseRecord;
        events: import("./types.js").ModerationCaseEventRecord[];
    }>;
    requestReview(caseId: number, userId: string, text?: string): Promise<{
        appealId: string;
        caseId: number;
    }>;
    requireCase(caseId: number): Promise<ModerationCaseRecord>;
}
