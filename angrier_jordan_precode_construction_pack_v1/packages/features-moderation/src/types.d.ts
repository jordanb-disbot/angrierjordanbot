export type ModerationCaseStatus = 'OPEN' | 'ACTIVE' | 'EXPIRED' | 'REVERSED' | 'APPEALED' | 'UPHELD' | 'MODIFIED';
export type ModerationActionType = 'WARN' | 'TIMEOUT' | 'UNTIMEOUT' | 'KICK' | 'BAN' | 'UNBAN' | 'PURGE' | 'CASE_EDIT' | 'CASE_REVERSE';
export interface ModerationCaseRecord {
    id: number;
    guildId: string;
    subjectUserId?: string;
    actionType: string;
    reason: string;
    category?: string;
    actorUserId?: string;
    actorType: string;
    sourceChannelId?: string;
    sourceMessageId?: string;
    durationSeconds?: number;
    status: ModerationCaseStatus;
    metadata?: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}
export interface ModerationCaseEventRecord {
    id: string;
    caseId: number;
    kind: string;
    actorUserId?: string;
    before?: unknown;
    after?: unknown;
    reason?: string;
    createdAt: Date;
}
export interface ModNoteRecord {
    id: string;
    guildId: string;
    subjectUserId: string;
    authorUserId: string;
    text: string;
    createdAt: Date;
}
export interface ModerationHistory {
    cases: ModerationCaseRecord[];
    notes: ModNoteRecord[];
}
export interface ParsedModerationDuration {
    permanent: boolean;
    seconds?: number;
    label: string;
}
export interface CasePreparationInput {
    guildId: string;
    subjectUserId?: string;
    actorUserId: string;
    actionType: ModerationActionType;
    reason: string;
    sourceChannelId?: string;
    sourceMessageId?: string;
    durationSeconds?: number;
    metadata?: Record<string, unknown>;
}
