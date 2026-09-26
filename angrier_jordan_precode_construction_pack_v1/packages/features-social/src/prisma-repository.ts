import {randomInt,randomUUID} from 'node:crypto';
import {Prisma,type PrismaClient} from '@prisma/client';
import {DomainError,SessionEngine} from '../../core/src/index.js';
import {PrismaAtomicOperations,requestFingerprint} from '../../database/src/atomic-operations.js';
import {PrismaTransactionSessions} from '../../database/src/transaction-sessions.js';
import {PrismaJobDeliveryRepository} from '../../database/src/job-delivery.js';
import {assertSocialAction,formatSocialResponse,validateSocialPolicy,HAIKU_RESPONSE,NOTMAD_RESPONSE} from './domain.js';
import type {SocialContext,SocialPolicy,SocialJob,RoastBackData} from './interfaces.js';
const json=(value:unknown)=>JSON.parse(JSON.stringify(value)) as Prisma.InputJsonObject;
/** Shared transactions, throttles, sessions and delivery jobs own every consequential social action. */
export class PrismaSocialRepository {
 private readonly atomic:PrismaAtomicOperations;
 constructor(private readonly db:PrismaClient,private readonly clock=()=>new Date(),private readonly rng:(max:number)=>number=randomInt){this.atomic=new PrismaAtomicOperations(db);}
 private async throttle(tx:Prisma.TransactionClient,c:SocialContext,action:string,seconds:number){
  const where={guildId_userId_action:{guildId:c.guildId,userId:c.userId,action}},prior=await tx.economyActionThrottle.findUnique({where});
  if(prior&&prior.nextAllowedAt>this.clock())throw new DomainError('SOCIAL_THROTTLED','Give the lounge a moment before trying again.');
  const nextAllowedAt=new Date(this.clock().getTime()+seconds*1000);
  await tx.economyActionThrottle.upsert({where,create:{guildId:c.guildId,userId:c.userId,action,nextAllowedAt},update:{nextAllowedAt}});
 }
 async roastAllowed(guildId:string,userId:string){return(await this.db.profileState.findUnique({where:{guildId_userId:{guildId,userId}}}))?.roastEnabled!==false;}
 private async privacy(tx:Prisma.TransactionClient,guildId:string,userId:string){if((await tx.profileState.findUnique({where:{guildId_userId:{guildId,userId}}}))?.roastEnabled===false)throw new DomainError('ROAST_PRIVACY','That member has blocked roast targeting.');}
 async exact(c:SocialContext,kind:'haiku'|'notmad',throttleSeconds:number){
  if(!Number.isInteger(throttleSeconds)||throttleSeconds<1||throttleSeconds>30)throw new DomainError('SOCIAL_CONFIG','Social rate limit is unavailable.');
  return this.atomic.run(c.guildId,'social:exact:'+c.requestKey,requestFingerprint({channelId:c.channelId,userId:c.userId,kind}),async tx=>{await this.throttle(tx,c,'social',throttleSeconds);return{content:kind==='haiku'?HAIKU_RESPONSE:NOTMAD_RESPONSE};});
 }
 async queue(c:SocialContext,action:string,targetId:string|null,policy:SocialPolicy,back?:{sessionId:string;messageId:string}){
  validateSocialPolicy(policy);assertSocialAction(action);if(action==='roast'&&!targetId)throw new DomainError('ROAST_TARGET','Choose a member to roast.');
  return this.atomic.run(c.guildId,'social:request:'+c.requestKey,requestFingerprint({channelId:c.channelId,userId:c.userId,action,targetId,back:back??null}),async tx=>{
   if(back){
    if(action!=='roast')throw new DomainError('ROAST_CONTROL','This Roast Back control is unavailable.');
    const s=await new PrismaTransactionSessions(tx).get<RoastBackData>(back.sessionId),raw=await tx.gameSession.findUnique({where:{id:back.sessionId}});
    if(!s||s.type!=='social.roast_back'||s.guildId!==c.guildId||s.channelId!==c.channelId||raw?.messageId!==back.messageId||s.ownerUserId!==c.userId||s.data.targetId!==c.userId||s.data.actorId!==targetId)throw new DomainError('ROAST_CONTROL','Only the targeted member may use the original Roast Back control.');
    if(s.state!=='OPEN'||!s.expiresAt||s.expiresAt<=this.clock())throw new DomainError('ROAST_USED','This Roast Back opportunity has expired or was already used.');
    await this.privacy(tx,c.guildId,targetId!);
    await new SessionEngine(new PrismaTransactionSessions(tx)).transition(back.sessionId,['OPEN'],'CLOSED');
   }else {if(action==='roast')await this.privacy(tx,c.guildId,targetId!);await this.throttle(tx,c,'social',policy.throttleSeconds);}
   const intensity=action==='roast'?['mild','angry','brutal','nuclear'][this.rng(4)]!:null;
   const entries=await tx.contentEntry.findMany({where:{game:action==='roast'?'roast':'social',category:intensity??action,enabled:true},orderBy:{id:'asc'}});
   const entry=entries[this.rng(entries.length||1)],payload=entry?.payload as {text?:unknown}|undefined;
   if(!entry||typeof payload?.text!=='string')throw new DomainError('SOCIAL_CONTENT','This authored response pool is unavailable.');
   const content=formatSocialResponse(action,payload.text,c.userId,targetId),sessionId=action==='roast'&&!back?randomUUID():null;
   const p:SocialJob={guildId:c.guildId,channelId:c.channelId,actorId:c.userId,targetId,action,content,sessionId,deliveryState:'PENDING'};
   const job=await tx.scheduledJob.create({data:{guildId:c.guildId,jobType:'social.publish',executionKey:'social:publish:'+c.guildId+':'+c.requestKey,dueAt:this.clock(),payload:json(p)}});
   if(sessionId){const now=this.clock();await new PrismaTransactionSessions(tx).create({id:sessionId,guildId:c.guildId,channelId:c.channelId,ownerUserId:targetId!,type:'social.roast_back',state:'DRAFT',data:{actorId:c.userId,targetId:targetId!,jobId:job.id},expiresAt:new Date(now.getTime()+policy.roastBackSeconds*1000),extensionUsed:false,version:0,createdAt:now,updatedAt:now});}
   await tx.contentUseHistory.create({data:{guildId:c.guildId,contentId:entry.id,game:entry.game,category:entry.category,usedAt:this.clock()}});
   return{jobId:job.id,sessionId};
  });
 }
 async retaliation(c:SocialContext,sessionId:string,messageId:string){const s=await this.db.gameSession.findUnique({where:{id:sessionId}});if(!s||s.type!=='social.roast_back'||s.guildId!==c.guildId||s.channelId!==c.channelId||s.ownerUserId!==c.userId||s.messageId!==messageId)throw new DomainError('ROAST_CONTROL','Only the targeted member may use the original Roast Back control.');return s.data as unknown as RoastBackData;}
 async queueHaiku(c:SocialContext,cooldownSeconds:number){
  if(!Number.isInteger(cooldownSeconds)||cooldownSeconds<30||cooldownSeconds>3600)throw new DomainError('HAIKU_CONFIG','Haiku rate limit is unavailable.');
  return this.atomic.run(c.guildId,'social:haiku:'+c.requestKey,requestFingerprint({channelId:c.channelId,userId:c.userId}),async tx=>{
   // A server-channel key gives every member the same persisted passive rate limit.
   await this.throttle(tx,{...c,userId:c.channelId},'haiku.channel',cooldownSeconds);
   const entries=await tx.contentEntry.findMany({where:{game:'haiku',category:'complaint',enabled:true},orderBy:{id:'asc'}}),entry=entries[this.rng(entries.length||1)],payload=entry?.payload as {text?:unknown}|undefined;
   if(!entry||typeof payload?.text!=='string')throw new DomainError('SOCIAL_CONTENT','Haiku complaint content is unavailable.');
   const p:SocialJob={guildId:c.guildId,channelId:c.channelId,actorId:c.userId,targetId:null,action:'haiku.passive',content:payload.text,sessionId:null,deliveryState:'PENDING'};
   const job=await tx.scheduledJob.create({data:{guildId:c.guildId,jobType:'social.publish',executionKey:'social:haiku:publish:'+c.guildId+':'+c.requestKey,dueAt:this.clock(),payload:json(p)}});
   return{jobId:job.id};
  });
 }
 async job(id:string){const job=await this.db.scheduledJob.findUniqueOrThrow({where:{id}});if(job.jobType!=='social.publish')throw new DomainError('SOCIAL_JOB','Invalid social delivery.');return{...job,payload:job.payload as unknown as SocialJob};}
 delivery(id:string){return new PrismaJobDeliveryRepository(this.db,id);}
 async finalize(id:string,messageId:string){const job=await this.job(id);return this.atomic.run(job.guildId,'social:finalize:'+id,requestFingerprint({id,messageId}),async tx=>{
  const fresh=await tx.scheduledJob.findUniqueOrThrow({where:{id}}),p=fresh.payload as unknown as SocialJob;
  if(p.deliveryState!=='SENT'||p.deliveryMessageId!==messageId)throw new DomainError('SOCIAL_UNCONFIRMED','Social publication is not confirmed.');
  if(p.sessionId){const s=await new PrismaTransactionSessions(tx).get<RoastBackData>(p.sessionId);if(s?.state==='DRAFT'){await tx.gameSession.updateMany({where:{id:p.sessionId,guildId:job.guildId,messageId:null},data:{messageId}});await new SessionEngine(new PrismaTransactionSessions(tx)).transition(p.sessionId,['DRAFT'],'OPEN');}}
  return{messageId};
 });}
 async cancel(id:string){const job=await this.job(id);await this.atomic.run(job.guildId,'social:cancel:'+id,id,async tx=>{const fresh=await tx.scheduledJob.findUniqueOrThrow({where:{id}}),p=fresh.payload as unknown as SocialJob;if(p.deliveryState!=='PENDING')throw new DomainError('DELIVERY_UNCERTAIN','Reconcile social delivery before cancellation.');if((await tx.scheduledJob.updateMany({where:{id,payload:{equals:fresh.payload!}},data:{payload:json({...p,cancelled:true})}})).count!==1)throw new DomainError('SESSION_CONFLICT','Social publication changed; retry safely.');if(p.sessionId){const s=await new PrismaTransactionSessions(tx).get(p.sessionId);if(s?.state==='DRAFT')await new SessionEngine(new PrismaTransactionSessions(tx)).transition(p.sessionId,['DRAFT'],'CANCELLED');}return{cancelled:true};});}
}
