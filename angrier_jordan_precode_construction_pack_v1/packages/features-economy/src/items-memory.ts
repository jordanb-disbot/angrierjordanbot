import {DomainError,LedgerEngine,spendableWallet,type LedgerRepository} from '../../core/src/index.js';
import type {ItemContext,ItemOutcome,ItemRepository,ItemState,ItemUnit} from './items-types.js';
/** Transactional test double. State/receipts may be passed to a new repository to simulate restart. */
export class MemoryItemRepository implements ItemRepository {
 private tail=Promise.resolve();
 constructor(public state:ItemState,public receipts=new Map<string,{fingerprint:string;result:ItemOutcome}>()){}
 async read(g:string,userIds:string[]){if(g!==this.state.guildId)throw new Error('Server mismatch');const s=structuredClone(this.state);s.members=s.members.filter(m=>userIds.includes(m.userId));return s;}
 async transact(c:ItemContext,input:unknown,userIds:string[],operation:(unit:ItemUnit)=>Promise<ItemOutcome>){
  let release!:()=>void;const previous=this.tail;this.tail=new Promise<void>(r=>release=r);await previous;
  try{
   const fingerprint=JSON.stringify(input),key=`${c.guildId}:${c.requestKey}`,prior=this.receipts.get(key);if(prior){if(prior.fingerprint!==fingerprint)throw new DomainError('REPLAY_MISMATCH','Request changed.');return structuredClone(prior.result);}
   const draft=structuredClone(this.state),applied=new Set<string>();let n=0;
   const repo:LedgerRepository={hasIdempotencyKey:async k=>applied.has(k),getAccount:async(g,u)=>{const m=draft.members.find(m=>m.userId===u)!;return{guildId:g,userId:u,wallet:m.wallet,reservedWallet:m.reservedWallet??0n,bank:m.bank,version:0};},commit:async tx=>{for(const l of tx.lines)if(l.userId){const m=draft.members.find(m=>m.userId===l.userId)!;if(l.bucket==='wallet')m.wallet+=l.amount;if(l.bucket==='bank')m.bank+=l.amount;}applied.add(tx.idempotencyKey);return true;}};
   const ledger=new LedgerEngine(repo),move=async(u:string,amount:bigint,reason:string)=>{const m=draft.members.find(m=>m.userId===u)!;const wallet=amount>=0n?amount:spendableWallet(m)>=-amount?amount:-spendableWallet(m),bank=amount-wallet;await ledger.apply({guildId:c.guildId,idempotencyKey:`${key}:${n++}`,lines:[{userId:u,bucket:'wallet',amount:wallet,reason},{userId:u,bucket:'bank',amount:bank,reason},{bucket:'system',amount:-amount,reason}]});};
   const result=await operation({state:draft,spend:(u,n,r)=>move(u,-n,r),reward:move,gift:()=>{}});
   this.state=draft;this.receipts.set(key,{fingerprint,result:structuredClone(result)});return result;
  }finally{release();}
 }
}
