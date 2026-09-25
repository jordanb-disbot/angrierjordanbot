import type { WyrCategoryInput, WyrChoice } from './types.js';
import type { WyrService } from './service.js';
export type WyrButtonStyle = 'primary' | 'secondary' | 'success';
export interface WyrButton {
    type: 'button';
    customId: string;
    label: string;
    style: WyrButtonStyle;
    disabled?: boolean;
}
export interface WyrView {
    ephemeral: boolean;
    content?: string;
    renderAsset?: string;
    components: WyrButton[];
    sessionId?: string;
}
export declare class WyrController {
    private readonly service;
    constructor(service: WyrService);
    start(input: {
        guildId: string;
        channelId: string;
        userId: string;
        category?: WyrCategoryInput;
        durationSeconds?: number;
        extensionSeconds?: number;
    }): Promise<WyrView>;
    vote(input: {
        sessionId: string;
        userId: string;
        choice: WyrChoice;
    }): Promise<WyrView>;
    extend(input: {
        sessionId: string;
        userId: string;
        isStaff?: boolean;
    }): Promise<WyrView>;
    close(sessionId: string): Promise<WyrView>;
    playAgain(input: {
        sourceSessionId: string;
        userId: string;
    }): Promise<WyrView>;
    handleComponent(customId: string, userId: string, isStaff?: boolean): Promise<WyrView>;
    private openView;
}
