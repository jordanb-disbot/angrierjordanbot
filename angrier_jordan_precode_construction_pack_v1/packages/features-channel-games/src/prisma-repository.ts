import {Prisma,type PrismaClient} from '@prisma/client';
import {AuditService,DomainError} from '../../core/src/index.js';
import {PrismaAuditSink} from '../../database/src/prisma-adapters.js';
import {PrismaJobDeliveryRepository} from '../../database/src/job-delivery.js';
import {PrismaAtomicOperations,requestFingerprint} from '../../database/src/atomic-operations.js';
import {countingTurn,initialCounting,initialLetter,letterTurn,restoreCounting,type CountingState,type LetterState} from './domain.js';
export interface ChannelContext {guildId:string;channelId:string;userId:string;requestKey:string;}
export interface ChannelAnnouncement {guildId:string;channelId:string;title:string;body:string;art:boolean;version?:number;}
const json=(x:unknown)=>JSON.parse(JSON.stringify(x)) as Prisma.InputJsonObject;
export class PrismaChannelGamesRepository {
 private readonly atomic:PrismaAtomicOperations;
 constructor(private readonly db:PrismaClient){this.atomic=new PrismaAtomicOperations(db);}
 delivery(id:string){return new PrismaJobDeliveryRepository(this.db,id);}
 async announcement(id:string){const job=await this.db.scheduledJob.findUniqueOrThrow({where:{id}});if(job.jobType!=='channelgame.announce')throw new DomainError('CHANNEL_JOB','Invalid channel-game delivery.');return job.payload as unknown as ChannelAnnouncement;}
 private async announce(tx:Prisma.TransactionClient,c:ChannelContext,title:string,body:string,art=false,version?:number){await tx.scheduledJob.create({data:{guildId:c.guildId,jobType:'channelgame.announce',executionKey:'channelgame:'+c.guildId+':'+c.requestKey,dueAt:new Date(),payload:json({guildId:c.guildId,channelId:c.channelId,title,body,art,version,deliveryState:'PENDING'})}});}
 async get(guildId:string,channelId:string,gameKey:string){return this.db.channelGameState.findUnique({where:{guildId_channelId_gameKey:{guildId,channelId,gameKey}}});}
 private async win(tx:Prisma.TransactionClient,c:ChannelContext,gameKey:string){await tx.memberGameStats.upsert({where:{guildId_userId_gameKey:{guildId:c.guildId,userId:c.userId,gameKey}},create:{guildId:c.guildId,userId:c.userId,gameKey,wins:1,plays:1},update:{wins:{increment:1},plays:{increment:1}}});}
 private async points(tx:Prisma.TransactionClient,c:ChannelContext,gameKey:string,delta:number){
  const key={guildId:c.guildId,userId:c.userId,gameKey};
  const previous=await tx.memberGameStats.findUnique({where:{guildId_userId_gameKey:key},select:{metadata:true}});
  const metadata=previous?.metadata&&typeof previous.metadata==='object'&&!Array.isArray(previous.metadata)?previous.metadata as Prisma.JsonObject:{};
  const current=typeof metadata.channelPoints==='number'?metadata.channelPoints:0;
  await tx.memberGameStats.upsert({where:{guildId_userId_gameKey:key},create:{...key,metadata:json({...metadata,channelPoints:current+delta})},update:{metadata:json({...metadata,channelPoints:current+delta})}});
 }
 async counting(c:ChannelContext,input:string){return this.atomic.run(c.guildId,'counting:message:'+c.requestKey,requestFingerprint({...c,input}),async tx=>{
  const row=await tx.channelGameState.upsert({where:{guildId_channelId_gameKey:{guildId:c.guildId,channelId:c.channelId,gameKey:'counting'}},create:{guildId:c.guildId,channelId:c.channelId,gameKey:'counting',state:json(initialCounting())},update:{}}),result=countingTurn(row.state as unknown as CountingState,c.userId,input);
  if(!result)return{ignored:true};
  const changed=await tx.channelGameState.updateMany({where:{guildId:c.guildId,channelId:c.channelId,gameKey:'counting',version:row.version},data:{state:json(result.state),version:{increment:1}}});if(changed.count!==1)throw new DomainError('SESSION_CONFLICT','The count changed; retry.');
  if(result.valid)await this.points(tx,c,'counting',1);
  if(result.milestone){await this.win(tx,c,'counting');await this.announce(tx,c,'Counting milestone',`<@${c.userId}> reached ${result.state.count} and earned +1 Counting Win. Keep counting.`,true);}
  if(!result.valid)await this.announce(tx,c,'Counting reset',`<@${c.userId}> broke the sequence. Previous valid count: ${result.previous}. The next count is 1.`,false,row.version+1);
  return json({...result,version:row.version+1});
 });}
 async restore(c:ChannelContext,version:number,staffAuthorized:boolean){if(!staffAuthorized)throw new DomainError('COUNTING_STAFF','Only Recliner or higher may restore intentional sabotage.');return this.atomic.run(c.guildId,'counting:restore:'+c.requestKey,requestFingerprint({...c,version}),async tx=>{
  const row=await tx.channelGameState.findUnique({where:{guildId_channelId_gameKey:{guildId:c.guildId,channelId:c.channelId,gameKey:'counting'}}});if(!row||row.version!==version)throw new DomainError('COUNTING_CHANGED','The count has moved on. This restoration is stale.');
  const before=row.state as unknown as CountingState,state=restoreCounting(before);await tx.channelGameState.update({where:{guildId_channelId_gameKey:{guildId:c.guildId,channelId:c.channelId,gameKey:'counting'}},data:{state:json(state),version:{increment:1}}});
  await new AuditService(new PrismaAuditSink(tx)).record({guildId:c.guildId,actorUserId:c.userId,source:'channel_games',action:'counting.restore',targetType:'channel',targetId:c.channelId,before,after:state,reason:'Staff-confirmed intentional sabotage',requestId:c.requestKey,createdAt:new Date()});await this.announce(tx,c,'Counting restored',`Staff restored the last valid count to ${state.count}. Next count: ${BigInt(state.count)+1n}.`);return json({state,version:row.version+1});
 });}
 async letter(c:ChannelContext,input:string,known:(word:string)=>boolean){return this.atomic.run(c.guildId,'lastletter:message:'+c.requestKey,requestFingerprint({...c,input}),async tx=>{
  const row=await tx.channelGameState.upsert({where:{guildId_channelId_gameKey:{guildId:c.guildId,channelId:c.channelId,gameKey:'last_letter'}},create:{guildId:c.guildId,channelId:c.channelId,gameKey:'last_letter',state:json(initialLetter())},update:{}}),result=letterTurn(row.state as unknown as LetterState,c.userId,input,known);
  const changed=await tx.channelGameState.updateMany({where:{guildId:c.guildId,channelId:c.channelId,gameKey:'last_letter',version:row.version},data:{state:json(result.state),version:{increment:1}}});if(changed.count!==1)throw new DomainError('SESSION_CONFLICT','The chain changed; retry.');
  await this.points(tx,c,'last_letter',result.points);
  if(result.won)await this.win(tx,c,'last_letter');
  if(result.won||!result.valid)await this.announce(tx,c,result.won?'Last Letter winner':'Word rejected',result.won?`<@${c.userId}> reached ${result.score} and earned +1 Last Letter Win. Round ${result.state.round} starts now; choose any valid word.`:`<@${c.userId}> ${result.points} • Score: ${result.score}. ${result.reason}`,result.won);
  return json({...result,version:row.version+1});
 });}
}
