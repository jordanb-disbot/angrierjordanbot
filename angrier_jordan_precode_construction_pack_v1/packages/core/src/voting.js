import { invariant } from './errors.js';
export class VotingEngine {
    policy;
    ballots = new Map();
    constructor(policy) {
        this.policy = policy;
    }
    cast(voterUserId, choiceKey, now = new Date(), questionKey = 'main') {
        invariant(this.policy.eligibleChoices.includes(choiceKey), 'INVALID_CHOICE', 'That vote choice is not valid.');
        const key = `${questionKey}:${voterUserId}`;
        invariant(this.policy.editable || !this.ballots.has(key), 'VOTE_LOCKED', 'Your vote cannot be changed.');
        const ballot = { voterUserId, questionKey, choiceKey, updatedAt: now };
        this.ballots.set(key, ballot);
        return ballot;
    }
    hasVoted(voterUserId, questionKey = 'main') { return this.ballots.has(`${questionKey}:${voterUserId}`); }
    results(questionKey = 'main') {
        const out = Object.fromEntries(this.policy.eligibleChoices.map(x => [x, 0]));
        for (const b of this.ballots.values())
            if (b.questionKey === questionKey)
                out[b.choiceKey] = (out[b.choiceKey] ?? 0) + 1;
        return out;
    }
    publicBallots() { return this.policy.anonymous ? [] : [...this.ballots.values()]; }
    snapshotForPersistence() { return [...this.ballots.values()]; }
}
//# sourceMappingURL=voting.js.map