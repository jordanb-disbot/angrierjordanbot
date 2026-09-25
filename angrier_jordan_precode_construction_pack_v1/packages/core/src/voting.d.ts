export interface Ballot {
    voterUserId: string;
    questionKey: string;
    choiceKey: string;
    updatedAt: Date;
}
export interface VotePolicy {
    anonymous: boolean;
    editable: boolean;
    hiddenUntilClose: boolean;
    eligibleChoices: readonly string[];
}
export declare class VotingEngine {
    readonly policy: VotePolicy;
    private ballots;
    constructor(policy: VotePolicy);
    cast(voterUserId: string, choiceKey: string, now?: Date, questionKey?: string): Ballot;
    hasVoted(voterUserId: string, questionKey?: string): boolean;
    results(questionKey?: string): Record<string, number>;
    publicBallots(): never[] | Ballot[];
    snapshotForPersistence(): Ballot[];
}
