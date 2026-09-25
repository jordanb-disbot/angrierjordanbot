import {Prisma,type PrismaClient} from '@prisma/client';
import {createHash} from 'node:crypto';
import {DomainError,LedgerEngine,type LedgerRepository,type LedgerTransaction} from '../../core/src/index.js';

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
      const result=await this.tx.economyAccount.updateMany({where:{guildId:input.guildId,userId,version,wallet:{gte:wallet<0n?-wallet:0n},bank:{gte:bank<0n?-bank:0n}},data:{wallet:{increment:wallet},bank:{increment:bank},version:{increment:1}}});
      if(result.count!==1)throw new DomainError('LEDGER_CONFLICT','Balance changed; retry the operation.');
    }
    await this.tx.ledgerEntry.createMany({data:input.lines.map(l=>({guildId:input.guildId,transactionId:header.id,userId:l.userId??null,bucket:l.bucket,amount:l.amount,reason:l.reason,metadata:l.metadata?JSON.parse(JSON.stringify(l.metadata)):Prisma.JsonNull}))});
    return true;
  }
}

export const requestFingerprint=(input:unknown)=>createHash('sha256').update(JSON.stringify(input,(_,v)=>typeof v==='bigint'?v.toString():v)).digest('hex');

/** Durable receipt, serializable retry, and shared ledger for all consequential feature operations. */
export class PrismaAtomicOperations {
  constructor(private readonly db:PrismaClient){}
  async run<T extends Prisma.InputJsonObject>(guildId:string,key:string,fingerprint:string,operation:(tx:Prisma.TransactionClient,ledger:LedgerEngine)=>Promise<T>):Promise<T>{
    for(let attempt=0;attempt<5;attempt++){
      try{
        return await this.db.$transaction(async tx=>{
          const prior=await tx.operationReceipt.findUnique({where:{guildId_key:{guildId,key}}});
          if(prior){if(prior.fingerprint!==fingerprint)throw new DomainError('REPLAY_MISMATCH','This request key belongs to a different action.');return prior.result as T;}
          const result=await operation(tx,new LedgerEngine(new TransactionLedgerRepository(tx)));
          await tx.operationReceipt.create({data:{guildId,key,fingerprint,result}});
          return result;
        },{isolationLevel:'Serializable',maxWait:10000,timeout:20000});
      }catch(error){
        const code=error&&typeof error==='object'&&'code' in error?error.code:undefined;
        if(attempt===4||!['P2034','P2002','LEDGER_CONFLICT'].includes(String(code)))throw error;
      }
    }
    throw new DomainError('CONCURRENT_OPERATION','The action is busy. Please retry.');
  }
}
