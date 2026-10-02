import {DomainError} from '../../core/src/index.js';

export type RewardGuardrail={enabled:boolean;multiplierBps:number;maxSingleReward:bigint};

export function guardSystemReward(amount:bigint,policy:RewardGuardrail):bigint{
  if(!Number.isInteger(policy.multiplierBps)||policy.multiplierBps<0||policy.multiplierBps>10_000)throw new DomainError('INVALID_REWARD_GUARDRAIL','Reward multiplier must be between 0 and 10,000 basis points.');
  if(policy.maxSingleReward<0n||policy.maxSingleReward>500_000n)throw new DomainError('INVALID_REWARD_GUARDRAIL','Reward cap must be between 0 and 500,000 Ottomans.');
  if(amount<=0n||!policy.enabled)return amount;
  const scaled=amount*BigInt(policy.multiplierBps)/10_000n;
  return scaled>policy.maxSingleReward?policy.maxSingleReward:scaled;
}
