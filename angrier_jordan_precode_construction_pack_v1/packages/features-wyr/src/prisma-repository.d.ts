import type { WyrCategory, WyrPrompt, WyrRuntimeSession } from './types.js';
import type { WyrPromptRepository, WyrSessionRepository } from './repository.js';
interface ContentRow {
    id: string;
    category: string | null;
    payload: unknown;
    enabled: boolean;
}
interface HistoryRow {
    contentId: string;
}
interface VoteRow {
    voterUserId: string;
    choiceKey: string;
    updatedAt: Date;
}
interface SessionRow {
    id: string;
    guildId: string;
    channelId: string;
    ownerUserId: string | null;
    messageId: string | null;
    state: string;
    data: unknown;
    expiresAt: Date | null;
    extensionUsed: boolean;
    version: number;
    createdAt: Date;
    votes?: VoteRow[];
}
interface UpdateManyResult {
    count: number;
}
interface PrismaTxLike {
    gameSession: {
        updateMany(args: unknown): Promise<UpdateManyResult>;
    };
    vote: {
        upsert(args: unknown): Promise<unknown>;
    };
}
export interface WyrPrismaLike extends PrismaTxLike {
    contentEntry: {
        findMany(args: unknown): Promise<ContentRow[]>;
        update(args: unknown): Promise<unknown>;
    };
    contentUseHistory: {
        findMany(args: unknown): Promise<HistoryRow[]>;
        create(args: unknown): Promise<unknown>;
    };
    gameSession: {
        create(args: unknown): Promise<unknown>;
        findUnique(args: unknown): Promise<SessionRow | null>;
        findMany(args: unknown): Promise<SessionRow[]>;
        updateMany(args: unknown): Promise<UpdateManyResult>;
    };
    vote: {
        upsert(args: unknown): Promise<unknown>;
    };
    $transaction<T>(fn: (tx: PrismaTxLike) => Promise<T>): Promise<T>;
}
export declare class PrismaWyrPromptRepository implements WyrPromptRepository {
    private readonly db;
    private readonly random;
    constructor(db: WyrPrismaLike, random?: () => number);
    pick(category: WyrCategory, excludedIds: readonly string[]): Promise<WyrPrompt>;
    rememberUsed(guildId: string, promptId: string, category: WyrCategory): Promise<void>;
    recent(guildId: string, category: WyrCategory, limit: number): Promise<string[]>;
}
export declare class PrismaWyrSessionRepository implements WyrSessionRepository {
    private readonly db;
    constructor(db: WyrPrismaLike);
    create(session: WyrRuntimeSession): Promise<void>;
    get(id: string): Promise<WyrRuntimeSession | null>;
    compareAndSwap(id: string, expectedVersion: number, next: WyrRuntimeSession): Promise<boolean>;
    attachMessage(id: string, messageId: string): Promise<void>;
    listOpen(guildId?: string, channelId?: string): Promise<WyrRuntimeSession[]>;
    private map;
}
export {};
