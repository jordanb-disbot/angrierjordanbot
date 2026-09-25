export declare const WYR_CATEGORIES: readonly ["Casual", "Friends", "Dating", "Married", "Spicy", "Unhinged"];
export type WyrCategory = typeof WYR_CATEGORIES[number];
export type WyrCategoryInput = WyrCategory | 'Random';
export type WyrChoice = 'A' | 'B';
export interface WyrPrompt {
    id: string;
    category: WyrCategory;
    text: string;
    optionA: string;
    optionB: string;
    enabled: boolean;
}
export interface WyrSessionData {
    promptId: string;
    category: WyrCategory;
    question: string;
    optionA: string;
    optionB: string;
    durationSeconds: number;
    extensionSeconds: number;
}
export interface WyrVote {
    userId: string;
    choice: WyrChoice;
    updatedAt: Date;
}
export interface WyrRuntimeSession {
    id: string;
    guildId: string;
    channelId: string;
    ownerUserId: string;
    messageId?: string;
    state: 'OPEN' | 'CLOSED' | 'CANCELLED';
    data: WyrSessionData;
    openedAt: Date;
    expiresAt: Date;
    extensionUsed: boolean;
    votes: WyrVote[];
    version: number;
}
export interface WyrResults {
    A: number;
    B: number;
    total: number;
    winner: WyrChoice | 'TIE' | 'NONE';
}
