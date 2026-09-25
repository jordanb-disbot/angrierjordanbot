import type {Prisma} from '@prisma/client';
import {DomainError,spendableWallet} from '../../core/src/index.js';

export interface WalletHoldReference {guildId:string;userId:string;referenceType:string;referenceId:string;}

/** Transaction-scoped holds never move money. Credit/reserve and release/restitution share the caller's transaction. */
export class PrismaWalletHolds {
  constructor(private readonly tx:Prisma.TransactionClient){
    if(typeof (tx as unknown as {$transaction?:unknown}).$transaction==='function')throw new DomainError('WALLET_HOLD_TRANSACTION_REQUIRED','Wallet holds require a caller-owned database transaction.');
  }
  private where(input:WalletHoldReference){
    if([input.guildId,input.userId,input.referenceType,input.referenceId].some(value=>typeof value!=='string'||!value||value.length>200))throw new DomainError('WALLET_HOLD_REFERENCE','A bounded server, member and reference are required.');
    return {guildId_userId_referenceType_referenceId:{guildId:input.guildId,userId:input.userId,referenceType:input.referenceType,referenceId:input.referenceId}};
  }
  async reserve(input:WalletHoldReference&{amount:bigint}){
    const where=this.where({guildId:input.guildId,userId:input.userId,referenceType:input.referenceType,referenceId:input.referenceId});
    if(typeof input.amount!=='bigint'||input.amount<=0n)throw new DomainError('WALLET_HOLD_AMOUNT','A wallet hold must reserve a positive amount.');
    const prior=await this.tx.walletHold.findUnique({where});
    if(prior){if(prior.amount!==input.amount)throw new DomainError('WALLET_HOLD_MISMATCH','This hold reference belongs to a different amount.');return prior;}
    const account=await this.tx.economyAccount.findUnique({where:{guildId_userId:{guildId:input.guildId,userId:input.userId}}});
    if(!account||spendableWallet(account)<input.amount)throw new DomainError('INSUFFICIENT_WALLET','The wallet does not have enough available Ottomans for this hold.');
    const updated=await this.tx.economyAccount.updateMany({where:{guildId:input.guildId,userId:input.userId,version:account.version,wallet:{gte:account.reservedWallet+input.amount}},data:{reservedWallet:{increment:input.amount},version:{increment:1}}});
    if(updated.count!==1)throw new DomainError('LEDGER_CONFLICT','The wallet changed; retry the hold operation.');
    return this.tx.walletHold.create({data:{guildId:input.guildId,userId:input.userId,referenceType:input.referenceType,referenceId:input.referenceId,amount:input.amount}});
  }
  async release(input:WalletHoldReference){
    const where=this.where(input),hold=await this.tx.walletHold.findUnique({where});
    if(!hold)throw new DomainError('WALLET_HOLD_NOT_FOUND','The referenced wallet hold does not exist for this server and member.');
    if(hold.state==='RELEASED')return hold;
    if(hold.state!=='ACTIVE')throw new DomainError('WALLET_HOLD_STATE','This wallet hold cannot be released.');
    const account=await this.tx.economyAccount.findUnique({where:{guildId_userId:{guildId:input.guildId,userId:input.userId}}});
    if(!account||account.reservedWallet<hold.amount)throw new DomainError('WALLET_HOLD_INVARIANT','The wallet hold aggregate is inconsistent.');
    const releasedAt=new Date();
    const changed=await this.tx.walletHold.updateMany({where:{id:hold.id,state:'ACTIVE'},data:{state:'RELEASED',releasedAt}});
    if(changed.count!==1)throw new DomainError('LEDGER_CONFLICT','The wallet hold changed; retry the operation.');
    const updated=await this.tx.economyAccount.updateMany({where:{guildId:input.guildId,userId:input.userId,version:account.version,reservedWallet:{gte:hold.amount}},data:{reservedWallet:{decrement:hold.amount},version:{increment:1}}});
    if(updated.count!==1)throw new DomainError('LEDGER_CONFLICT','The wallet changed; retry the release.');
    return {...hold,state:'RELEASED',releasedAt};
  }
}
