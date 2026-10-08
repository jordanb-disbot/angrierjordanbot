import {DomainError} from './errors.js';

/** Transaction-scoped persistence contract for one-shot member effects. */
export interface ActiveEffectTransaction {
  findActiveEffect(input:{guildId:string;userId:string;effect:string}):Promise<{id:string;remaining:number;claimKey:string|null}|null>;
  claimActiveEffect(input:{id:string;claimKey:string}):Promise<boolean>;
}

export interface ActiveEffectClaim {applied:boolean;effect:string;}

/**
 * Claims exactly one armed effect inside the caller's existing database
 * transaction. The adapter must implement a compare-and-set on claimKey (or
 * remaining quantity), so retries/concurrent settlements cannot consume twice.
 */
export async function claimActiveEffect(tx:ActiveEffectTransaction,input:{guildId:string;userId:string;effect:string;requestKey:string}):Promise<ActiveEffectClaim>{
  if(!/^[\w.-]{1,80}$/.test(input.effect)||!input.requestKey)throw new DomainError('ACTIVE_EFFECT_INPUT','Invalid active effect claim.');
  const row=await tx.findActiveEffect(input);if(!row||row.remaining<1)return{applied:false,effect:input.effect};
  const applied=await tx.claimActiveEffect({id:row.id,claimKey:input.requestKey});
  return{applied,effect:input.effect};
}
