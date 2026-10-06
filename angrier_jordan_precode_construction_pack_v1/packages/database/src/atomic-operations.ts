import {Prisma,type PrismaClient} from '@prisma/client';
import {createHash} from 'node:crypto';
import {DomainError,LedgerEngine,spendableWallet,type LedgerRepository,type LedgerTransaction} from '../../core/src/index.js';

const auditValue=(value:unknown):Prisma.InputJsonValue=>JSON.parse(JSON.stringify(value,(_key,current)=>typeof current==='bigint'?current.toString():current));
const auditAction=(reason:string)=>{
 const normalized=reason.toLowerCase();
 if(normalized.includes('shop purchase'))return'economy.shop_purchase';
 if(normalized.includes('inventory sale'))return'economy.shop_sale';
 if(normalized.includes('tool repair'))return'economy.repair';
 if(normalized.includes('bank deposit'))return'economy.bank_deposit';
 if(normalized.includes('bank withdrawal'))return'economy.bank_withdrawal';
 if(normalized.includes('transfer'))return'economy.transfer';
 if(/casino|lottery|race|fight|wager|payout|jackpot|chair pot/.test(normalized))return'economy.game_settlement';
 return'economy.ledger_settlement';
};

/** Ledger adapter bound to the caller's transaction: item/session changes and money commit together. */
export class TransactionLedgerRepository implements LedgerRepository {
  constructor(private readonly tx:Prisma.TransactionClient){}
  async hasIdempotencyKey(key:string){return Boolean(await this.tx.economyTransaction.findUnique({where:{idempotencyKey:key}}));}
  async getAccount(guildId:string,userId:string){
    await this.tx.member.upsert({where:{guildId_userId:{guildId,userId}},update:{},create:{guildId,userId}});
    return this.tx.economyAccount.upsert({where:{guildId_userId:{guildId,userId}},update:{},create:{guildId,userId}});
  }
  async commit(input:LedgerTransaction,versions:ReadonlyMap<string,number>){
    const header=await this.tx.economyTransaction.create({data:{guildId:input.guildId,idempotencyKey:input.idempotencyKey,kind:'ATOMIC_OPERATION',reason:input.lines[0]?.reason??'Atomic operation'}});
    for(const [userId,version] of [...versions].sort(([a],[b])=>a.localeCompare(b))){
      const delta=(bucket:string)=>input.lines.filter(l=>l.userId===userId&&l.bucket===bucket).reduce((n,l)=>n+l.amount,0n);
      const wallet=delta('wallet'),bank=delta('bank');
      const account=await this.tx.economyAccount.findUnique({where:{guildId_userId:{guildId:input.guildId,userId}}});
      if(!account||account.version!==version)throw new DomainError('LEDGER_CONFLICT','Balance changed; retry the operation.');
      if(spendableWallet(account)+wallet<0n)throw new DomainError('WALLET_FUNDS_HELD','These wallet funds are reserved until the active transaction resolves.');
      const reserved=account.reservedWallet??0n;
      const result=await this.tx.economyAccount.updateMany({where:{guildId:input.guildId,userId,version,wallet:{gte:reserved+(wallet<0n?-wallet:0n)},bank:{gte:bank<0n?-bank:0n}},data:{wallet:{increment:wallet},bank:{increment:bank},version:{increment:1}}});
      if(result.count!==1)throw new DomainError('LEDGER_CONFLICT','Balance changed; retry the operation.');
    }
    await this.tx.ledgerEntry.createMany({data:input.lines.map(l=>({guildId:input.guildId,transactionId:header.id,userId:l.userId??null,bucket:l.bucket,amount:l.amount,reason:l.reason,metadata:l.metadata?JSON.parse(JSON.stringify(l.metadata)):Prisma.JsonNull}))});
    // Item operations write one richer audit row after their inventory save.  All other
    // ledger-backed mutations are audited here, in the same serializable transaction.
    if(!input.idempotencyKey.startsWith('items:')){
      const affectedUserIds=[...new Set(input.lines.flatMap(line=>line.userId?[line.userId]:[]))];
      const actorUserId=input.lines.find(line=>line.userId&&line.amount<0n)?.userId??affectedUserIds[0]??null;
      await this.tx.auditEvent.create({data:{guildId:input.guildId,actorUserId,source:'economy',action:auditAction(input.lines[0]?.reason??'Ledger transaction'),targetType:'economy_transaction',targetId:header.id,reason:input.lines[0]?.reason??'Ledger transaction',requestId:input.idempotencyKey,createdAt:new Date(),after:auditValue({transactionId:header.id,affectedUserIds,lines:input.lines.map(line=>({userId:line.userId??null,bucket:line.bucket,amount:line.amount.toString(),reason:line.reason,metadata:line.metadata??null}))})}});
    }
    return true;
  }
}

export const requestFingerprint=(input:unknown)=>createHash('sha256').update(JSON.stringify(input,(_,v)=>typeof v==='bigint'?v.toString():v)).digest('hex');

/** Some Prisma connector versions surface SQLSTATE deadlocks as an unknown request error. */
export function isRetryableAtomicError(error:unknown){
  if(!error||typeof error!=='object')return false;
  const e=error as {code?:unknown;name?:unknown;message?:unknown;meta?:{code?:unknown}};
  if(['P2034','P2002','LEDGER_CONFLICT','SESSION_CONFLICT','40P01','40001'].includes(String(e.code)))return true;
  if(e.code==='P2010'&&['40P01','40001'].includes(String(e.meta?.code)))return true;
  return e.name==='PrismaClientUnknownRequestError'&&typeof e.message==='string'&&/PostgresError\s*\{\s*code:\s*"(?:40P01|40001)"/.test(e.message);
}

/** Durable receipt, serializable retry, and shared ledger for all consequential feature operations. */
export interface AtomicRetryRuntime {now():number;pause(milliseconds:number):Promise<void>;random():number;}
const retryRuntime:AtomicRetryRuntime={now:()=>performance.now(),pause:milliseconds=>new Promise(resolve=>setTimeout(resolve,milliseconds)),random:()=>Math.random()};
const maxAtomicAttempts=12,atomicBudgetMs=30_000;
export class PrismaAtomicOperations {
  constructor(private readonly db:PrismaClient,private readonly retry:AtomicRetryRuntime=retryRuntime){}
  async run<T extends Prisma.InputJsonObject>(guildId:string,key:string,fingerprint:string,operation:(tx:Prisma.TransactionClient,ledger:LedgerEngine)=>Promise<T>,beforeCommit?:()=>void):Promise<T>{
    const deadline=this.retry.now()+atomicBudgetMs;
    for(let attempt=0;attempt<maxAtomicAttempts;attempt++){
      const remaining=Math.floor(deadline-this.retry.now());if(remaining<3)break;
      const maxWait=Math.min(10000,Math.floor(remaining/3)),timeout=Math.min(20000,remaining-maxWait);
      try{
        return await this.db.$transaction(async tx=>{
          const prior=await tx.operationReceipt.findUnique({where:{guildId_key:{guildId,key}}});
          if(prior){if(prior.fingerprint!==fingerprint)throw new DomainError('REPLAY_MISMATCH','This request key belongs to a different action.');beforeCommit?.();return prior.result as T;}
          const result=await operation(tx,new LedgerEngine(new TransactionLedgerRepository(tx)));
          await tx.operationReceipt.create({data:{guildId,key,fingerprint,result}});
          // Synchronous only: observe events during the receipt write without another await before return.
          // Replay runs the same guard but never re-executes financial work.
          beforeCommit?.();
          return result;
        },{isolationLevel:'Serializable',maxWait,timeout});
      }catch(error){
        if(!isRetryableAtomicError(error))throw error;
        if(attempt===maxAtomicAttempts-1)break;
        // Identical exponential sleeps repeatedly synchronize contending transactions.
        // Equal jitter keeps a nonzero floor while allowing each worker a fresh snapshot.
        const cap=Math.min(1000,25*2**attempt),delay=Math.floor(cap/2+this.retry.random()*cap/2);
        if(this.retry.now()+delay>=deadline)break;
        await this.retry.pause(delay);
      }
    }
    throw new DomainError('CONCURRENT_OPERATION','The action is busy. Please retry.');
  }
}
