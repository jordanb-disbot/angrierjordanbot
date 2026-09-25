import { invariant } from './errors.js';
export interface Ballot { voterUserId: string; questionKey: string; choiceKey: string; updatedAt: Date; }
export interface VotePolicy { anonymous: boolean; editable: boolean; hiddenUntilClose: boolean; eligibleChoices: readonly string[]; }
export class VotingEngine {
  private ballots = new Map<string, Ballot>();
  constructor(public readonly policy: VotePolicy) {}
  cast(voterUserId: string, choiceKey: string, now = new Date(), questionKey = 'main'): Ballot {
    invariant(this.policy.eligibleChoices.includes(choiceKey), 'INVALID_CHOICE', 'That vote choice is not valid.');
    const key = `${questionKey}:${voterUserId}`;
    invariant(this.policy.editable || !this.ballots.has(key), 'VOTE_LOCKED', 'Your vote cannot be changed.');
    const ballot = { voterUserId, questionKey, choiceKey, updatedAt: now };
    this.ballots.set(key, ballot); return ballot;
  }
  hasVoted(voterUserId: string, questionKey='main'): boolean { return this.ballots.has(`${questionKey}:${voterUserId}`); }
  results(questionKey='main'): Record<string, number> {
    const out: Record<string, number> = Object.fromEntries(this.policy.eligibleChoices.map(x => [x,0]));
    for (const b of this.ballots.values()) if (b.questionKey===questionKey) out[b.choiceKey]=(out[b.choiceKey]??0)+1;
    return out;
  }
  publicBallots(): never[] | Ballot[] { return this.policy.anonymous ? [] : [...this.ballots.values()]; }
  snapshotForPersistence(): Ballot[] { return [...this.ballots.values()]; }
}
