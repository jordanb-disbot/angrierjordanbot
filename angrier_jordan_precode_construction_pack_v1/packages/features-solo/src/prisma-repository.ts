import {randomInt,randomUUID} from 'node:crypto';
import {Prisma,type PrismaClient} from '@prisma/client';
import {DomainError,SessionEngine,TimerEngine,type LedgerEngine,type Session} from '../../core/src/index.js';
import {PrismaAtomicOperations,requestFingerprint} from '../../database/src/atomic-operations.js';
import {PrismaTransactionSessions} from '../../database/src/transaction-sessions.js';
import {applyAction,createPuzzle,puzzleView,type SoloGame,type SoloOptions,type SoloAction,type SoloPuzzle,type Rng} from './domain.js';
export interface SoloContext {guildId:string;channelId:string;userId:string;requestKey:string;}
export interface SoloPolicy {enabled:boolean;reward:bigint;dailyRewardCap:bigint;timeoutSeconds:number;}
export interface SoloData {puzzle:SoloPuzzle;reward:string;dailyRewardCap:string;paid:string;finishedAt?:string;elapsedMs?:number;}
const json=(v:unknown)=>JSON.parse(JSON.stringify(v)) as Prisma.InputJsonObject;
export function validateSoloPolicy(p:SoloPolicy){if(p.enabled!==true)throw new DomainError('SOLO_DISABLED','Solo games are not enabled yet.');if(p.reward<0n||p.reward>5n||p.dailyRewardCap<0n||p.dailyRewardCap>20n||p.reward>p.dailyRewardCap||!Number.isInteger(p.timeoutSeconds)||p.timeoutSeconds<60||p.timeoutSeconds>3600)throw new DomainError('SOLO_CONFIG','Solo game settings are invalid.');}
export class PrismaSoloRepository {
 private readonly atomic:PrismaAtomicOperations;
 constructor(private readonly db:PrismaClient,private readonly clock:()=>Date=()=>new Date(),private readonly rng:Rng=randomInt){this.atomic=new PrismaAtomicOperations(db);}
 async get(id:string){const row=await this.db.gameSession.findUnique({where:{id}});if(!row||row.type!=='solo')throw new DomainError('SOLO_MISSING','This solo round is unavailable.');return{...row,data:row.data as unknown as SoloData};}
 async active(){return this.db.gameSession.findMany({where:{type:'solo',state:'OPEN'}});}
 async linkMessage(id:string,guildId:string,userId:string,messageId:string){await this.db.gameSession.updateMany({where:{id,guildId,ownerUserId:userId,type:'solo',messageId:null},data:{messageId}});}
 private async session(tx:Prisma.TransactionClient,c:SoloContext,id:string){const s=await new PrismaTransactionSessions(tx).get<SoloData>(id);if(!s||s.type!=='solo'||s.guildId!==c.guildId||s.channelId!==c.channelId)throw new DomainError('SOLO_MISSING','Use the original solo game message.');if(s.ownerUserId!==c.userId)throw new DomainError('SOLO_OWNER','Only the member who started this puzzle can play it.');return s;}
 async start(c:SoloContext,game:SoloGame,options:SoloOptions,policy:SoloPolicy){validateSoloPolicy(policy);return this.atomic.run(c.guildId,'solo:start:'+c.requestKey,requestFingerprint({userId:c.userId,channelId:c.channelId,game,options}),tx=>this.create(tx,c,game,options,policy));}
 private async create(tx:Prisma.TransactionClient,c:SoloContext,game:SoloGame,options:SoloOptions,policy:SoloPolicy,previous?:SoloPuzzle){
  if(await tx.gameSession.findFirst({where:{guildId:c.guildId,ownerUserId:c.userId,type:'solo',state:'OPEN'}}))throw new DomainError('SOLO_ACTIVE','Finish or quit your active solo puzzle first.');
  const now=this.clock(),id=randomUUID(),expiresAt=TimerEngine.create(now,policy.timeoutSeconds).expiresAt;
  const data:SoloData={puzzle:createPuzzle(game,options,this.rng,previous),reward:policy.reward.toString(),dailyRewardCap:policy.dailyRewardCap.toString(),paid:'0'};
  await new PrismaTransactionSessions(tx).create({id,guildId:c.guildId,channelId:c.channelId,ownerUserId:c.userId,type:'solo',state:'OPEN',data:json(data),expiresAt,extensionUsed:false,version:0,createdAt:now,updatedAt:now});
  await tx.gameParticipant.create({data:{sessionId:id,userId:c.userId,role:'player'}});
  await tx.scheduledJob.create({data:{guildId:c.guildId,jobType:'solo.expire',executionKey:'solo:expire:'+id,dueAt:expiresAt,payload:{guildId:c.guildId,sessionId:id}}});return{sessionId:id};
 }
 async replay(c:SoloContext,id:string,policy:SoloPolicy){validateSoloPolicy(policy);return this.atomic.run(c.guildId,'solo:replay:'+c.requestKey,requestFingerprint({id,userId:c.userId,channelId:c.channelId}),async tx=>{const old=await this.session(tx,c,id);if(old.state!=='CLOSED')throw new DomainError('SOLO_REPLAY','Finish this round before playing again.');return this.create(tx,c,old.data.puzzle.game,old.data.puzzle.options,policy,old.data.puzzle);});}
 async act(c:SoloContext,id:string,version:number,action:SoloAction){return this.atomic.run(c.guildId,'solo:act:'+c.requestKey,requestFingerprint({id,userId:c.userId,channelId:c.channelId,version,action}),async(tx,ledger)=>{
  const s=await this.session(tx,c,id);if(s.state!=='OPEN'||s.version!==version)throw new DomainError('SOLO_CHANGED','This puzzle changed. Use its latest controls.');if(!s.expiresAt||s.expiresAt<=this.clock())throw new DomainError('SOLO_EXPIRED','This puzzle has expired. Its result will appear shortly.');
  const data={...s.data,puzzle:applyAction(s.data.puzzle,action)};if(data.puzzle.outcome==='playing')await new SessionEngine(new PrismaTransactionSessions(tx)).transition<SoloData>(id,['OPEN'],'OPEN',s=>({...s,data}));else await this.finish(tx,ledger,s,data);return{sessionId:id};
 });}
 async expire(guildId:string,id:string){return this.atomic.run(guildId,'solo:expire:'+id,id,async(tx,ledger)=>{const s=await new PrismaTransactionSessions(tx).get<SoloData>(id);if(!s||s.type!=='solo'||s.guildId!==guildId)throw new DomainError('SOLO_MISSING','Solo round unavailable.');if(s.state==='CLOSED')return{sessionId:id};if(!s.expiresAt||s.expiresAt>this.clock())throw new DomainError('NOT_DUE','This puzzle is still active.');await this.finish(tx,ledger,s,{...s.data,puzzle:{...s.data.puzzle,outcome:'expired'}});return{sessionId:id};});}
 private async finish(tx:Prisma.TransactionClient,ledger:LedgerEngine,s:Session<SoloData>,data:SoloData){
  const now=this.clock(),userId=s.ownerUserId!,win=data.puzzle.outcome==='won',elapsedMs=Math.max(0,now.getTime()-s.createdAt.getTime());let paid=0n;
  if(win){const recent=await tx.gameSession.findMany({where:{guildId:s.guildId,ownerUserId:userId,type:'solo',state:'CLOSED',updatedAt:{gte:new Date(now.getTime()-86400000)}}});const total=recent.reduce((sum,r)=>sum+BigInt((r.data as unknown as SoloData).paid),0n),remaining=BigInt(data.dailyRewardCap)-total;paid=remaining>0n?(BigInt(data.reward)<remaining?BigInt(data.reward):remaining):0n;}
  const finished:SoloData={...data,paid:paid.toString(),finishedAt:now.toISOString(),elapsedMs};
  if(paid>0n)await ledger.apply({guildId:s.guildId,idempotencyKey:'solo:payout:'+s.id,lines:[{userId,bucket:'wallet',amount:paid,reason:'Solo puzzle win'},{bucket:'system',amount:-paid,reason:'Bounded solo puzzle reward'}]});
  const gameKey=data.puzzle.game==='minesweeper'?`minesweeper.${data.puzzle.options.boardSize}`:data.puzzle.game,where={guildId_userId_gameKey:{guildId:s.guildId,userId,gameKey}},old=await tx.memberGameStats.findUnique({where}),meta=(old?.metadata??{}) as {streak?:number;longestStreak?:number;fastestMs?:number;fewestGuesses?:number};
  const streak=win?(meta.streak??0)+1:0,next={...meta,streak,longestStreak:Math.max(meta.longestStreak??0,streak)};
  if(win&&(data.puzzle.game==='wordscramble'||data.puzzle.game==='minesweeper'))next.fastestMs=Math.min(meta.fastestMs??Number.MAX_SAFE_INTEGER,elapsedMs);
  if(win&&data.puzzle.game==='mastermind')next.fewestGuesses=Math.min(meta.fewestGuesses??Number.MAX_SAFE_INTEGER,data.puzzle.guesses.length);
  await tx.memberGameStats.upsert({where,create:{guildId:s.guildId,userId,gameKey,wins:Number(win),losses:Number(!win),plays:1,metadata:json(next)},update:{wins:{increment:Number(win)},losses:{increment:Number(!win)},plays:{increment:1},metadata:json(next)}});
  if(win){const prefix='solo.'+gameKey,records:Record<string,string>={[prefix+'.wins']:String((old?.wins??0)+1)};if(data.puzzle.game==='hangman')records[prefix+'.longest_streak']=String(next.longestStreak);if(next.fastestMs!==undefined)records[prefix+'.fastest_ms']=String(next.fastestMs);if(next.fewestGuesses!==undefined)records[prefix+'.fewest_guesses']=String(next.fewestGuesses);await tx.scheduledJob.create({data:{guildId:s.guildId,jobType:'records.observe',executionKey:'solo:records:'+s.id,dueAt:now,payload:{guildId:s.guildId,userId,records,occurredAt:now.toISOString()}}});}
  await new SessionEngine(new PrismaTransactionSessions(tx)).transition<SoloData>(s.id,['OPEN'],'CLOSED',s=>({...s,data:finished,updatedAt:now}));
 }
 async view(id:string){const row=await this.get(id);return{id:row.id,guildId:row.guildId,channelId:row.channelId,messageId:row.messageId,ownerId:row.ownerUserId!,version:row.version,state:row.state,expiresAt:row.expiresAt,paid:row.data.paid,elapsedMs:row.data.elapsedMs,puzzle:puzzleView(row.data.puzzle)};}
 async stats(guildId:string,userId:string){return this.db.memberGameStats.findMany({where:{guildId,userId,gameKey:{in:['hangman','wordscramble','mastermind','minesweeper.4','minesweeper.5']}}});}
}
export type SoloView=Awaited<ReturnType<PrismaSoloRepository['view']>>;
