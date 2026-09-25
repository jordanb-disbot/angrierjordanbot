import type { WyrRuntimeSession, WyrResults } from './types.js';
export interface WyrDiscordPort {
    postRound(session: WyrRuntimeSession, svg: string): Promise<{
        messageId: string;
    }>;
    updateRound(session: WyrRuntimeSession, svg: string): Promise<void>;
    postResults(session: WyrRuntimeSession, results: WyrResults, svg: Uint8Array | string): Promise<void>;
    ephemeral(userId: string, message: string): Promise<void>;
}
