import type { WyrCategory, WyrPrompt, WyrRuntimeSession } from './types.js';
import type { WyrPromptRepository, WyrSessionRepository } from './repository.js';
export declare class InMemoryWyrPromptRepository implements WyrPromptRepository {
    private readonly prompts;
    private readonly history;
    constructor(prompts: readonly WyrPrompt[]);
    pick(category: WyrCategory, excludedIds: readonly string[]): Promise<WyrPrompt>;
    rememberUsed(guildId: string, promptId: string, category: WyrCategory): Promise<void>;
    recent(guildId: string, category: WyrCategory, limit: number): Promise<string[]>;
}
export declare class InMemoryWyrSessionRepository implements WyrSessionRepository {
    private readonly sessions;
    create(session: WyrRuntimeSession): Promise<void>;
    get(id: string): Promise<WyrRuntimeSession | null>;
    compareAndSwap(id: string, expectedVersion: number, next: WyrRuntimeSession): Promise<boolean>;
    attachMessage(id: string, messageId: string): Promise<void>;
    listOpen(guildId?: string, channelId?: string): Promise<WyrRuntimeSession[]>;
}
export declare class SequentialIdGenerator {
    private value;
    next(prefix: string): string;
}
