import { DomainError } from '../../core/src/index.js';
const voteButton = (sessionId, choice, label, style) => ({ type: 'button', customId: `wyr:vote:${choice}:${sessionId}`, label, style });
export class WyrController {
    service;
    constructor(service) {
        this.service = service;
    }
    async start(input) {
        const session = await this.service.start({
            guildId: input.guildId, channelId: input.channelId, ownerUserId: input.userId, category: input.category ?? 'Random',
            ...(input.durationSeconds === undefined ? {} : { durationSeconds: input.durationSeconds }),
            ...(input.extensionSeconds === undefined ? {} : { extensionSeconds: input.extensionSeconds }),
        });
        return this.openView(session);
    }
    async vote(input) {
        const session = await this.service.vote(input.sessionId, input.userId, input.choice);
        const label = input.choice === 'A' ? session.data.optionA : session.data.optionB;
        return { ephemeral: true, content: `Vote recorded: ${input.choice} — ${label}. You can change it until voting closes.`, components: [], sessionId: session.id };
    }
    async extend(input) {
        const session = await this.service.extend(input.sessionId, input.userId, input.isStaff ?? false);
        return this.openView(session);
    }
    async close(sessionId) {
        const closed = await this.service.close(sessionId);
        return { ephemeral: false, renderAsset: closed.svg, components: [{ type: 'button', customId: `wyr:play:${closed.session.id}`, label: 'Play Again', style: 'success' }], sessionId: closed.session.id };
    }
    async playAgain(input) {
        const session = await this.service.replay(input.sourceSessionId, input.userId);
        return this.openView(session);
    }
    async handleComponent(customId, userId, isStaff = false) {
        const parts = customId.split(':');
        if (parts[0] !== 'wyr')
            throw new DomainError('UNKNOWN_COMPONENT', 'Unknown WYR component.');
        if (parts[1] === 'vote' && (parts[2] === 'A' || parts[2] === 'B') && parts[3])
            return this.vote({ sessionId: parts[3], userId, choice: parts[2] });
        if (parts[1] === 'extend' && parts[2])
            return this.extend({ sessionId: parts[2], userId, isStaff });
        if (parts[1] === 'play' && parts[2])
            return this.playAgain({ sourceSessionId: parts[2], userId });
        throw new DomainError('UNKNOWN_COMPONENT', 'Unknown WYR component.');
    }
    openView(session) {
        const extensionDisabled = session.extensionUsed || session.data.extensionSeconds === 0;
        return {
            ephemeral: false,
            content: `Voting closes <t:${Math.floor(session.expiresAt.getTime() / 1000)}:R>. Totals stay hidden until close.`,
            renderAsset: this.service.renderOpen(session),
            components: [
                voteButton(session.id, 'A', 'Option A', 'primary'),
                voteButton(session.id, 'B', 'Option B', 'secondary'),
                { type: 'button', customId: `wyr:extend:${session.id}`, label: `+${session.data.extensionSeconds} Seconds`, style: 'secondary', disabled: extensionDisabled },
            ],
            sessionId: session.id,
        };
    }
}
//# sourceMappingURL=controller.js.map