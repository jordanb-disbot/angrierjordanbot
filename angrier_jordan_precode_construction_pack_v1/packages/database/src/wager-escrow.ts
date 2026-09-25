import type {Prisma} from '@prisma/client';
import {DomainError,EscrowStateMachine,spendableWallet,type LedgerEngine} from '../../core/src/index.js';
/** Transaction-scoped shared wager funding; feature state and escrow commit with the ledger. */
export class PrismaWagerEscrow {
 constructor(private readonly tx:Prisma.TransactionClient,private readonly ledger:LedgerEngine){}
 async reserve(input:{guildId:string;userId:string;amount:bigint;referenceType:string;referenceId:string;key:string}){
  if(input.amount<=0n)throw new DomainError('WAGER_AMOUNT','Choose a positive wager.');
  const old=await this.tx.escrow.findUnique({where:{idempotencyKey:input.key}});
  if(old){if(old.guildId!==input.guildId||old.ownerUserId!==input.userId||old.amount!==input.amount||old.referenceType!==input.referenceType||old.referenceId!==input.referenceId)throw new DomainError('REPLAY_MISMATCH','Wager request belongs to another action.');return old;}
  const account=await this.tx.economyAccount.findUnique({where:{guildId_userId:{guildId:input.guildId,userId:input.userId}}});
  if(!account||spendableWallet(account)+account.bank<input.amount)throw new DomainError('INSUFFICIENT_FUNDS','You do not have enough Ottomans.');
  const wallet=spendableWallet(account)<input.amount?spendableWallet(account):input.amount,bank=input.amount-wallet;
  await this.ledger.apply({guildId:input.guildId,idempotencyKey:input.key+':reserve',lines:[{userId:input.userId,bucket:'wallet',amount:-wallet,reason:'Wager reserved'},{userId:input.userId,bucket:'bank',amount:-bank,reason:'Wager reserved'},{bucket:'system',amount:input.amount,reason:'Escrow funding'}]});
  return this.tx.escrow.create({data:{guildId:input.guildId,ownerUserId:input.userId,kind:'OTTOMANS',amount:input.amount,walletAmount:wallet,bankAmount:bank,referenceType:input.referenceType,referenceId:input.referenceId,idempotencyKey:input.key}});
 }
 async settle(guildId:string,referenceType:string,referenceId:string,payouts:ReadonlyMap<string,bigint>,key:string){
  const rows=await this.tx.escrow.findMany({where:{guildId,referenceType,referenceId}});
  if(rows.some(r=>r.state!=='RESERVED'))throw new DomainError('ESCROW_FINAL','This wager has already settled.');
  let total=0n;for(const amount of payouts.values()){if(amount<0n)throw new DomainError('PAYOUT_AMOUNT','Payout cannot be negative.');total+=amount;}
  if(total&&!rows.length)throw new DomainError('ESCROW_MISSING','Settlement requires reserved wagers.');
  if(total)await this.ledger.apply({guildId,idempotencyKey:key+':payout',lines:[...[...payouts].filter(([,amount])=>amount>0n).map(([userId,amount])=>({userId,bucket:'wallet' as const,amount,reason:'Wager payout'})),{bucket:'system',amount:-total,reason:'Escrow and house settlement'}]});
  for(const row of rows){EscrowStateMachine.settle({id:row.id,state:row.state,referenceType,referenceId,idempotencyKey:row.idempotencyKey});await this.tx.escrow.update({where:{id:row.id},data:{state:'SETTLED',settledAt:new Date()}});}
  return{reserved:rows.reduce((sum,r)=>sum+(r.amount??0n),0n),paid:total};
 }
 async refund(guildId:string,referenceType:string,referenceId:string,key:string){
  const rows=await this.tx.escrow.findMany({where:{guildId,referenceType,referenceId}});if(rows.some(r=>r.state!=='RESERVED'))throw new DomainError('ESCROW_FINAL','This wager has already settled.');
  for(const row of rows){if(!row.ownerUserId)throw new DomainError('ESCROW_OWNER','Wager owner is missing.');EscrowStateMachine.refund({id:row.id,state:row.state,referenceType,referenceId,idempotencyKey:row.idempotencyKey});await this.ledger.apply({guildId,idempotencyKey:key+':refund:'+row.id,lines:[{userId:row.ownerUserId,bucket:'wallet',amount:row.walletAmount,reason:'Wager refunded'},{userId:row.ownerUserId,bucket:'bank',amount:row.bankAmount,reason:'Wager refunded'},{bucket:'system',amount:-(row.amount??0n),reason:'Escrow refund'}]});await this.tx.escrow.update({where:{id:row.id},data:{state:'REFUNDED',settledAt:new Date()}});}
 }
}
