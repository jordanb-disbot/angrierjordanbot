import {randomUUID} from 'node:crypto';
import {Prisma,type PrismaClient} from '@prisma/client';
import {DomainError,SessionEngine,TimerEngine,type LedgerEngine,type Session} from '../../core/src/index.js';
import {PrismaAtomicOperations,requestFingerprint} from '../../database/src/atomic-operations.js';
import {PrismaWagerEscrow} from '../../database/src/wager-escrow.js';
import {PrismaTransactionSessions} from '../../database/src/transaction-sessions.js';
import {eventPayouts,eventRandom,planRace,raceSnapshot,type Racer,type RacePlan,type EventRandom} from './domain.js';
export interface EventContext {guildId:string;channelId:string;userId:string;requestKey:string;}
export interface EventPolicy {minBet:bigint;maxBet:bigint;}
export interface RaceData {racers:Racer[];plan?:RacePlan;startedAt?:string;winnerId?:string;result?:{pool:string;rake:string;payouts:Record<string,string>;refunded:boolean;settlement:string};cancelReason?:string;}
const json=(value:unknown)=>JSON.parse(JSON.stringify(value)) as Prisma.InputJsonObject;
export class PrismaEventsRepository {
 private readonly atomic:PrismaAtomicOperations;
 constructor(private readonly db:PrismaClient,private readonly rng:EventRandom=eventRandom,private readonly clock:()=>Date=()=>new Date()){this.atomic=new PrismaAtomicOperations(db);}
 async get(id:string){const row=await this.db.gameSession.findUnique({where:{id},include:{wagers:true}});if(!row||row.type!=='race')throw new DomainError('EVENT_MISSING','This event is unavailable.');return{...row,data:row.data as unknown as RaceData};}
 async active(guildId?:string){return this.db.gameSession.findMany({where:{...(guildId?{guildId}:{}),type:'race',state:{in:['OPEN','LOCKED','SETTLING']}}});}
 async linkMessage(id:string,guildId:string,messageId:string){await this.db.gameSession.updateMany({where:{id,guildId,type:'race',messageId:null},data:{messageId}});}
 async startRace(c:EventContext,racer:Omit<Racer,'chair'>){
  if(racer.userId!==c.userId)throw new DomainError('HOST_ID','The starter must occupy Racer 1.');
  const id=randomUUID();return this.atomic.run(c.guildId,'event:start:'+c.requestKey,requestFingerprint({channel:c.channelId,userId:c.userId,type:'race'}),async tx=>{
   if(await tx.gameSession.findFirst({where:{guildId:c.guildId,channelId:c.channelId,type:{in:['race','fight']},state:{in:['OPEN','LOCKED','SETTLING']}}}))throw new DomainError('EVENT_ACTIVE','A Race or Fight is already active here.');
   const now=this.clock(),timer=TimerEngine.create(now,60),data:RaceData={racers:[{...racer,chair:1}]};
   await new PrismaTransactionSessions(tx).create({id,guildId:c.guildId,channelId:c.channelId,ownerUserId:c.userId,type:'race',state:'OPEN',data:json(data),expiresAt:timer.expiresAt,extensionUsed:false,version:0,createdAt:now,updatedAt:now});
   await tx.gameParticipant.create({data:{sessionId:id,userId:c.userId,role:'racer',data:{chair:1}}});
   await tx.scheduledJob.create({data:{guildId:c.guildId,jobType:'events.close_betting',executionKey:'events:close:'+id,dueAt:timer.expiresAt,payload:{guildId:c.guildId,sessionId:id}}});
   return{sessionId:id};
  });
 }
 private async open(tx:Prisma.TransactionClient,c:EventContext,id:string){
  const s=await new PrismaTransactionSessions(tx).get<RaceData>(id);
  if(!s||s.type!=='race'||s.guildId!==c.guildId||s.channelId!==c.channelId)throw new DomainError('EVENT_MISSING','This event is unavailable.');
  if(s.state!=='OPEN'||!s.expiresAt||s.expiresAt<=this.clock())throw new DomainError('BETTING_CLOSED','Entry and betting are closed.');return s;
 }
 async join(c:EventContext,id:string,racer:Omit<Racer,'chair'>){return this.atomic.run(c.guildId,'event:join:'+c.requestKey,requestFingerprint({id,userId:c.userId}),async tx=>{
  const s=await this.open(tx,c,id);if(racer.userId!==c.userId)throw new DomainError('RACER_ID','Join for yourself.');if(s.data.racers.some(r=>r.userId===c.userId))return{sessionId:id};if(s.data.racers.length>=6)throw new DomainError('RACE_FULL','All six racer spots are filled. Betting remains open.');
  const next={...racer,chair:s.data.racers.length+1};await tx.gameParticipant.create({data:{sessionId:id,userId:c.userId,role:'racer',data:{chair:next.chair}}});
  await new SessionEngine(new PrismaTransactionSessions(tx)).transition<RaceData>(id,['OPEN'],'OPEN',s=>({...s,data:{...s.data,racers:[...s.data.racers,next]}}));return{sessionId:id};
 });}
 async extend(c:EventContext,id:string){return this.atomic.run(c.guildId,'event:extend:'+c.requestKey,requestFingerprint({id,userId:c.userId}),async tx=>{
  const s=await this.open(tx,c,id);if(s.ownerUserId!==c.userId)throw new DomainError('HOST_ONLY','Only the host can extend this event.');
  const timer=TimerEngine.extendOnce({openedAt:s.createdAt,expiresAt:s.expiresAt!,extensionUsed:s.extensionUsed},30,this.clock());
  await new SessionEngine(new PrismaTransactionSessions(tx)).transition<RaceData>(id,['OPEN'],'OPEN',s=>({...s,expiresAt:timer.expiresAt,extensionUsed:true}));
  await tx.scheduledJob.update({where:{executionKey:'events:close:'+id},data:{dueAt:timer.expiresAt}});return{sessionId:id};
 });}
 async bet(c:EventContext,id:string,selection:string,amount:bigint,policy:EventPolicy){return this.atomic.run(c.guildId,'event:bet:'+c.requestKey,requestFingerprint({id,userId:c.userId,selection,amount}),async(tx,ledger)=>{
  const s=await this.open(tx,c,id);if(!s.data.racers.some(r=>r.userId===selection))throw new DomainError('RACER_MISSING','Choose a current racer.');
  const previous=await tx.wager.findMany({where:{sessionId:id,userId:c.userId}});if(previous.some(w=>w.selectionKey!==selection))throw new DomainError('SELECTION_LOCKED','Your racer selection is locked for this event.');
  const cumulative=previous.reduce((sum,w)=>sum+w.amount,0n)+amount;if(amount<=0n||cumulative<policy.minBet||cumulative>policy.maxBet)throw new DomainError('BET_LIMIT',`Your total wager must be ${policy.minBet}–${policy.maxBet} Ottomans.`);
  const escrow=await new PrismaWagerEscrow(tx,ledger).reserve({guildId:c.guildId,userId:c.userId,amount,referenceType:'event',referenceId:id,key:'event:bet:'+c.guildId+':'+c.requestKey});
  await tx.wager.create({data:{sessionId:id,userId:c.userId,selectionKey:selection,amount,escrowId:escrow.id}});
  // Shared session version serializes wager placement with the betting-close boundary.
  await new SessionEngine(new PrismaTransactionSessions(tx)).transition<RaceData>(id,['OPEN'],'OPEN');return{sessionId:id,total:cumulative.toString()};
 });}
 async closeBetting(guildId:string,id:string){return this.atomic.run(guildId,'event:close:'+id,id,async(tx,ledger)=>{
  const s=await new PrismaTransactionSessions(tx).get<RaceData>(id);if(!s||s.guildId!==guildId||s.type!=='race')throw new DomainError('EVENT_MISSING','Event unavailable.');
  if(s.state!=='OPEN')return{sessionId:id};if(!s.expiresAt||s.expiresAt>this.clock())throw new DomainError('NOT_DUE','The event window remains open.');
  if(s.data.racers.length<2){await this.cancelInside(tx,ledger,s,'Not enough racers; all wagers refunded.');return{sessionId:id};}
  const plan=planRace(s.data.racers,this.rng),now=this.clock(),expiresAt=new Date(now.getTime()+plan.durationMs),data={...s.data,plan,startedAt:now.toISOString()};
  await new SessionEngine(new PrismaTransactionSessions(tx)).transition<RaceData>(id,['OPEN'],'LOCKED',s=>({...s,data,expiresAt}));
  await tx.scheduledJob.create({data:{guildId,jobType:'events.settle',executionKey:'events:settle:'+id,dueAt:expiresAt,payload:{guildId,sessionId:id}}});return{sessionId:id};
 });}
 async settle(guildId:string,id:string,policy:EventPolicy){return this.atomic.run(guildId,'event:settle:'+id,id,async(tx,ledger)=>{
  const s=await new PrismaTransactionSessions(tx).get<RaceData>(id);if(!s||s.guildId!==guildId||s.type!=='race')throw new DomainError('EVENT_MISSING','Event unavailable.');
  if(s.state==='CLOSED'||s.state==='CANCELLED')return{sessionId:id};if(s.state!=='LOCKED'||!s.expiresAt||s.expiresAt>this.clock()||!s.data.plan)throw new DomainError('NOT_DUE','The race has not finished.');
  const wagers=await tx.wager.findMany({where:{sessionId:id}}),winnerId=s.data.plan.winnerId,result=eventPayouts(wagers,winnerId),escrow=new PrismaWagerEscrow(tx,ledger),engine=new SessionEngine(new PrismaTransactionSessions(tx));
  await engine.transition<RaceData>(id,['LOCKED'],'SETTLING');
  if(result.refund)await escrow.refund(guildId,'event',id,'event:refund:'+id);else{const paid=await escrow.settle(guildId,'event',id,result.payouts,'event:settle:'+id);if(paid.reserved!==result.total)throw new DomainError('ESCROW_TOTAL','Event funding mismatch.');}
  for(const racer of s.data.racers){const won=racer.userId===winnerId;await tx.memberGameStats.upsert({where:{guildId_userId_gameKey:{guildId,userId:racer.userId,gameKey:'race'}},create:{guildId,userId:racer.userId,gameKey:'race',plays:1,wins:Number(won),losses:Number(!won)},update:{plays:{increment:1},wins:{increment:Number(won)},losses:{increment:Number(!won)}}});}
  const data:RaceData={...s.data,winnerId,result:{pool:result.total.toString(),rake:result.rake.toString(),payouts:Object.fromEntries([...result.payouts].map(([u,n])=>[u,n.toString()])),refunded:result.refund,settlement:result.refund?'NO_WINNING_BETS_REFUND':result.total?'PROPORTIONAL_PAYOUT':'NO_WAGERS'}};
  await engine.transition<RaceData>(id,['SETTLING'],'CLOSED',s=>({...s,data}));return{sessionId:id};
 });}
 private async cancelInside(tx:Prisma.TransactionClient,ledger:LedgerEngine,s:Session<RaceData>,reason:string){await new PrismaWagerEscrow(tx,ledger).refund(s.guildId,'event',s.id,'event:cancel:'+s.id);await new SessionEngine(new PrismaTransactionSessions(tx)).transition<RaceData>(s.id,['OPEN','LOCKED'],'CANCELLED',s=>({...s,data:{...s.data,cancelReason:reason}}));}
 async cancel(guildId:string,id:string,reason:string){return this.atomic.run(guildId,'event:cancel:'+id,id,async(tx,ledger)=>{const s=await new PrismaTransactionSessions(tx).get<RaceData>(id);if(!s||s.guildId!==guildId||s.type!=='race')throw new DomainError('EVENT_MISSING','Event unavailable.');if(s.state!=='CLOSED'&&s.state!=='CANCELLED')await this.cancelInside(tx,ledger,s,reason);return{sessionId:id};});}
 async publicView(id:string){const row=await this.get(id),data=row.data;const motion=data.plan&&data.startedAt?raceSnapshot(data.plan,this.clock().getTime()-new Date(data.startedAt).getTime()):undefined;return{id:row.id,guildId:row.guildId,channelId:row.channelId,messageId:row.messageId,ownerId:row.ownerUserId,state:row.state,expiresAt:row.expiresAt,extensionUsed:row.extensionUsed,racers:data.racers,motion,...(row.state==='CLOSED'?{winnerId:data.winnerId,result:data.result}:{}),cancelReason:data.cancelReason,pool:row.wagers.reduce((n,w)=>n+w.amount,0n).toString(),bets:row.wagers.map(w=>({userId:w.userId,selection:w.selectionKey,amount:w.amount.toString()}))};}
}
export type RaceView=Awaited<ReturnType<PrismaEventsRepository['publicView']>>;
