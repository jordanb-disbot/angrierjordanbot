import {Prisma,type PrismaClient} from '@prisma/client';
import {AuditService,DomainError} from '../../core/src/index.js';
import {PrismaAtomicOperations,requestFingerprint} from '../../database/src/atomic-operations.js';
import {PrismaJobDeliveryRepository} from '../../database/src/job-delivery.js';
import {validateSnapshot} from './domain.js';
import type {ChairismContext,ChairismSnapshot,ChairismPublished,ChairismBrowseQuery} from './interfaces.js';
export interface ChairismJob {context:ChairismContext;snapshot?:ChairismSnapshot;outputChannelId:string;sourceUserId:string;sourceMessageId?:string;sourceChannelId?:string;deliveryState:'PENDING'|'SENDING'|'SENT';deliveryMessageId?:string;result?:ChairismPublished;}
const json=(value:unknown)=>JSON.parse(JSON.stringify(value)) as Prisma.InputJsonObject;
export class PrismaChairismRepository {
 private atomic:PrismaAtomicOperations;
 constructor(private db:PrismaClient,private clock=()=>new Date()){this.atomic=new PrismaAtomicOperations(db);}
 async enqueue(context:ChairismContext,snapshot:ChairismSnapshot,outputChannelId:string,cooldownSeconds:number){
  validateSnapshot(snapshot);if(!Number.isInteger(cooldownSeconds)||cooldownSeconds<5||cooldownSeconds>3600)throw new DomainError('CHAIRISM_CONFIG','Chairisms rate limit is not configured.');
  const key='chairism:request:'+context.requestKey,source={context,snapshot,outputChannelId};
  return this.atomic.run(context.guildId,key,requestFingerprint(source),async tx=>{
   // Serializable predicate locks make concurrent distinct requests obey the same persisted limit.
   if(await tx.scheduledJob.findFirst({where:{guildId:context.guildId,jobType:'chairism.publish',dueAt:{gt:new Date(this.clock().getTime()-cooldownSeconds*1000)},payload:{path:['context','userId'],equals:context.userId}}}))throw new DomainError('CHAIRISM_COOLDOWN','Please wait before creating another Chairism.');
   const payload:ChairismJob={context,snapshot,outputChannelId,sourceUserId:snapshot.quote.userId,...(snapshot.source?{sourceMessageId:snapshot.source.messageId,sourceChannelId:snapshot.source.channelId}:{}),deliveryState:'PENDING'};
   const job=await tx.scheduledJob.create({data:{guildId:context.guildId,jobType:'chairism.publish',executionKey:key,dueAt:this.clock(),payload:json(payload)}});return{jobId:job.id};
  });
 }
 async job(id:string){const row=await this.db.scheduledJob.findUniqueOrThrow({where:{id}});if(row.jobType!=='chairism.publish')throw new DomainError('CHAIRISM_JOB','Invalid Chairism delivery.');return{...row,payload:row.payload as unknown as ChairismJob};}
 delivery(id:string){return new PrismaJobDeliveryRepository(this.db,id);}
 async finalize(id:string):Promise<ChairismPublished>{const row=await this.job(id),p=row.payload;if(p.deliveryState!=='SENT'||!p.deliveryMessageId)throw new DomainError('CHAIRISM_UNCONFIRMED','Chairism publication has not been confirmed.');
  return this.atomic.run(row.guildId,'chairism:finalize:'+id,requestFingerprint({id,messageId:p.deliveryMessageId}),async tx=>{
   const fresh=await tx.scheduledJob.findUniqueOrThrow({where:{id}}),saved=fresh.payload as unknown as ChairismJob;if(saved.deliveryState!=='SENT'||saved.deliveryMessageId!==p.deliveryMessageId)throw new DomainError('CHAIRISM_UNCONFIRMED','Chairism publication has not been confirmed.');
   const item=await tx.chairism.create({data:{guildId:row.guildId,sourceUserId:p.sourceUserId,createdByUserId:p.context.userId,sourceMessageId:p.sourceMessageId??null,sourceChannelId:p.sourceChannelId??null,outputMessageId:p.deliveryMessageId!}}),result={chairismId:item.id,outputMessageId:item.outputMessageId,outputChannelId:p.outputChannelId};
   // The content snapshot exists only while delivery needs it; archive rows and completed jobs keep metadata.
   const {snapshot:_,...metadata}=saved;await tx.scheduledJob.update({where:{id},data:{payload:json({...metadata,result})}});
   await new AuditService({write:async e=>{await tx.auditEvent.create({data:{guildId:e.guildId,actorUserId:e.actorUserId!,source:e.source,action:e.action,targetType:'chairism',targetId:String(item.id),after:json(result),requestId:e.requestId,createdAt:e.createdAt}});}}).record({guildId:row.guildId,actorUserId:p.context.userId,source:'discord',action:'chairism.published',requestId:p.context.requestKey,createdAt:this.clock(),after:result});return result;
  });
 }
 /** Scan metadata only. Callers filter current output eligibility before selecting pages/random. */
 async metadata(guildId:string,query:ChairismBrowseQuery,beforeId?:number){const cursor=beforeId??query.beforeId;return this.db.chairism.findMany({where:{guildId,...(query.mode==='member'&&query.memberId?{sourceUserId:query.memberId}:{}),...(cursor!==undefined?{id:{lt:cursor}}:{})},orderBy:{id:'desc'},take:100});}
 async publishedOutput(guildId:string,id:number){const job=await this.db.scheduledJob.findFirst({where:{guildId,jobType:'chairism.publish',payload:{path:['result','chairismId'],equals:id}}});const p=job?.payload as unknown as ChairismJob|undefined;return p?.deliveryState==='SENT'?p.result:undefined;}
}
