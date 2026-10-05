/** Snapshot accounting helpers. Inputs must be classified by their durable owner. */
export interface SnapshotAccount {userId:string;wallet:bigint;reservedWallet?:bigint;bank:bigint;}
export interface EscrowBalance {ownerUserId?:string;amount:bigint;state:'ACTIVE'|'SETTLED'|'REFUNDED';}
export interface CommunalPot {key:string;amount:bigint;}
export interface ReconciliationInput {accounts:readonly SnapshotAccount[];escrow:readonly EscrowBalance[];pots:readonly CommunalPot[];}
export interface ReconciliationResult {memberWallet:bigint;memberBank:bigint;memberEscrow:bigint;communalPots:bigint;totalSupply:bigint;memberWealth:ReadonlyMap<string,bigint>;}

/**
 * An active escrow amount has exactly one owner and is included in both that
 * member's wealth and supply. Pots are communal currency and are never added
 * to a member balance. Settled/refunded escrow is already represented by the
 * ledger/account and must not be counted again.
 */
export function reconcileEconomy(input:ReconciliationInput):ReconciliationResult {
  const wealth=new Map<string,bigint>();let wallet=0n,bank=0n,escrow=0n,pots=0n;
  for(const account of input.accounts){const reserved=account.reservedWallet??0n;if(account.wallet<0n||account.bank<0n||reserved<0n||reserved>account.wallet)throw new Error('Invalid account balance in snapshot.');const available=account.wallet-reserved;wallet+=available;bank+=account.bank;wealth.set(account.userId,(wealth.get(account.userId)??0n)+available+account.bank);}
  for(const hold of input.escrow){if(hold.state!=='ACTIVE')continue;if(hold.amount<0n||!hold.ownerUserId)throw new Error('Active escrow requires one nonnegative member owner.');escrow+=hold.amount;wealth.set(hold.ownerUserId,(wealth.get(hold.ownerUserId)??0n)+hold.amount);}
  for(const pot of input.pots){if(pot.amount<0n)throw new Error('Negative communal pot in snapshot.');pots+=pot.amount;}
  return{memberWallet:wallet,memberBank:bank,memberEscrow:escrow,communalPots:pots,totalSupply:wallet+bank+escrow+pots,memberWealth:wealth};
}

/** Reconcile a completed 4 AM interval against the prior persisted supply.
 * System-ledger debits mint currency; system-ledger credits burn it. Internal
 * wallet/bank/escrow movements have no system leg and must not move supply. */
export const supplyReconciles=(previousSupply:bigint|undefined,currentSupply:bigint,netSystemIssuance:bigint)=>previousSupply===undefined||currentSupply===previousSupply+netSystemIssuance;

export const percentile=(values:readonly bigint[],p:number)=>{const sorted=[...values].sort((a,b)=>a<b?-1:a>b?1:0);if(!sorted.length)return 0n;const rank=Math.max(0,Math.min(sorted.length-1,Math.ceil(p*sorted.length)-1));return sorted[rank]!;};
export const ledgerSource=(reason:string)=>{const r=reason.toLowerCase();if(r.includes('starter'))return'starter';if(r.includes('daily')||r.includes('weekly')||r.includes('grind')||r.includes('activity'))return'activity';if(r.includes('casino')||r.includes('lottery')||r.includes('slot'))return'gambling';if(r.includes('manual')||r.includes('grant'))return'manual';if(r.includes('shop')||r.includes('repair')||r.includes('upgrade'))return'spending';return'other';};
