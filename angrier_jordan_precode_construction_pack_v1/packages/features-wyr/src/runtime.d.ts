import type { WyrCategoryInput, WyrChoice, WyrRuntimeSession } from './types.js';
import type { WyrDiscordPort } from './discord-adapter-contract.js';
import type { WyrService } from './service.js';
/**
 * Thin orchestration layer between the Discord adapter and the WYR domain service.
 * It owns no game rules; it only persists message linkage and replays state to Discord
 * after startup/recovery.
 */
export declare class WyrRuntime {
    private readonly service;
    private readonly discord;
    constructor(service: WyrService, discord: WyrDiscordPort);
    launch(input: {
        guildId: string;
        channelId: string;
        userId: string;
        category?: WyrCategoryInput;
        durationSeconds?: number;
        extensionSeconds?: number;
    }): Promise<WyrRuntimeSession>;
    vote(sessionId: string, userId: string, choice: WyrChoice): Promise<void>;
    extend(sessionId: string, actorUserId: string, isStaff?: boolean): Promise<WyrRuntimeSession>;
    close(sessionId: string): Promise<WyrRuntimeSession>;
    playAgain(sourceSessionId: string, userId: string): Promise<WyrRuntimeSession>;
    recover(): Promise<{
        active: number;
        closed: number;
    }>;
}
