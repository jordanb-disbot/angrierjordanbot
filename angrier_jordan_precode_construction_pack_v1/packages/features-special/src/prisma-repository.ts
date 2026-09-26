import {randomUUID,randomInt} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {Prisma,type PrismaClient} from '@prisma/client';
import {DomainError,SessionEngine,TimerEngine,type Session} from '../../core/src/index.js';
import {PrismaAtomicOperations,requestFingerprint} from '../../database/src/atomic-operations.js';
import {PrismaTransactionSessions} from '../../database/src/transaction-sessions.js';
import {PrismaJobDeliveryRepository} from '../../database/src/job-delivery.js';
import {LINE_DURATION_MS,lineFrame,safeMemberName,type LineData,type CheckIn} from './domain.js';
const shamePool=JSON.parse(readFileSync(new URL('../content/line_shame_120.json',import.meta.url),'utf8')) as {id:string;text:string;enabled:boolean}[];
const json=(value:unknown)=>JSON.parse(JSON.stringify(value)) as Prisma.InputJsonObject;
export interface LineContext {guildId:string;channelId:string;userId:string;requestKey:string;}
export interface CountdownPreview {version:number;shame?:{id:string;text:string};}
export class PrismaSpecialRepository {
 private readonly atomic:PrismaAtomicOperations;
 constructor(private readonly db:PrismaClient,private readonly clock:()=>Date=()=>new Date(),private readonly rng:(max:number)=>number=randomInt){this.atomic=new PrismaAtomicOperations(db);}
 async get(id:string){const row=await this.db.gameSession.findUnique({where:{id}});if(!row||row.type!=='line')throw new DomainError('LINE_MISSING','This Line is unavailable.');return{...row,data:row.data as unknown as LineData};}
 async active(){return this.db.gameSession.findMany({where:{type:'line',state:{in:['OPEN','LOCKED','SETTLING']}}});}
 async linkMessage(id:string,guildId:string,messageId:string){await this.db.gameSession.updateMany({where:{id,guildId,type:'line',messageId:null},data:{messageId}});}
 async queueCallout(c:LineContext,content:string,notificationRoleId:string|null,sessionId:string|null=null){return this.atomic.run(c.guildId,'special:callout:'+c.requestKey,requestFingerprint({channelId:c.channelId,userId:c.userId,sessionId}),async tx=>{const job=await tx.scheduledJob.create({data:{guildId:c.guildId,jobType:'special.callout',executionKey:'special:callout:'+c.guildId+':'+c.requestKey,dueAt:this.clock(),payload:{guildId:c.guildId,channelId:c.channelId,content,notificationRoleId,sessionId,deliveryState:'PENDING'}}});return{jobId:job.id};});}
 async callout(id:string){const job=await this.db.scheduledJob.findUniqueOrThrow({where:{id}});if(job.jobType!=='special.callout')throw new DomainError('SPECIAL_JOB','Invalid Special Command delivery.');return{job,payload:job.payload as {guildId:string;channelId:string;content:string;notificationRoleId:string|null;sessionId:string|null}};}
 delivery(id:string){return new PrismaJobDeliveryRepository(this.db,id);}
 private async session(tx:Prisma.TransactionClient,c:Pick<LineContext,'guildId'|'channelId'>,id:string){const s=await new PrismaTransactionSessions(tx).get<LineData>(id);if(!s||s.type!=='line'||s.guildId!==c.guildId||s.channelId!==c.channelId)throw new DomainError('LINE_MISSING','Use this Line’s original message.');return s;}
 private host(s:Session<LineData>,userId:string){if(s.ownerUserId!==userId)throw new DomainError('HOST_ONLY','Only the host can do that.');}
 private open(s:Session<LineData>){if(s.state!=='OPEN'||!s.expiresAt||s.expiresAt<=this.clock())throw new DomainError('LINE_LOCKED','Check-ins are locked. The countdown is starting.');}
 async start(c:LineContext,name:string,callout?:{content:string;notificationRoleId:string|null}){const id=randomUUID();return this.atomic.run(c.guildId,'line:start:'+c.requestKey,requestFingerprint({channelId:c.channelId,userId:c.userId}),async tx=>{
  if(await tx.gameSession.findFirst({where:{guildId:c.guildId,channelId:c.channelId,type:'line',state:{in:['OPEN','LOCKED','SETTLING']}}}))throw new DomainError('LINE_ACTIVE','A Line is already active here.');
  const now=this.clock(),timer=TimerEngine.create(now,60),data:LineData={members:[{userId:c.userId,name:safeMemberName(name),status:'ready'}]};
  await new PrismaTransactionSessions(tx).create({id,guildId:c.guildId,channelId:c.channelId,ownerUserId:c.userId,type:'line',state:'OPEN',data:json(data),expiresAt:timer.expiresAt,extensionUsed:false,version:0,createdAt:now,updatedAt:now});
  await tx.gameParticipant.create({data:{sessionId:id,userId:c.userId,role:'ready',data:{name:safeMemberName(name)}}});
  await tx.scheduledJob.create({data:{guildId:c.guildId,jobType:'special.line_lock',executionKey:'line:lock:'+id,dueAt:timer.expiresAt,payload:{guildId:c.guildId,sessionId:id}}});
  const job=callout?await tx.scheduledJob.create({data:{guildId:c.guildId,jobType:'special.callout',executionKey:'special:callout:'+c.guildId+':'+c.requestKey,dueAt:now,payload:{guildId:c.guildId,channelId:c.channelId,content:callout.content,notificationRoleId:callout.notificationRoleId,sessionId:id,deliveryState:'PENDING'}}}):null;return{sessionId:id,jobId:job?.id??null};
 });}
 async checkIn(c:LineContext,id:string,name:string,status:CheckIn){if(!['ready','waiting'].includes(status))throw new DomainError('LINE_STATUS','Choose a check-in status.');return this.atomic.run(c.guildId,'line:check:'+c.requestKey,requestFingerprint({id,userId:c.userId,status}),async tx=>{
  const s=await this.session(tx,c,id);this.open(s);const member={userId:c.userId,name:safeMemberName(name),status},members=s.data.members.filter(m=>m.userId!==c.userId);const at=s.data.members.findIndex(m=>m.userId===c.userId);members.splice(at<0?members.length:at,0,member);
  await tx.gameParticipant.upsert({where:{sessionId_userId:{sessionId:id,userId:c.userId}},create:{sessionId:id,userId:c.userId,role:status,data:{name:member.name}},update:{role:status,data:{name:member.name}}});
  await new SessionEngine(new PrismaTransactionSessions(tx)).transition<LineData>(id,['OPEN'],'OPEN',s=>({...s,data:{...s.data,members}}));return{sessionId:id};
 });}
 async extend(c:LineContext,id:string){return this.atomic.run(c.guildId,'line:extend:'+c.requestKey,requestFingerprint({id,userId:c.userId}),async tx=>{
  const s=await this.session(tx,c,id);this.host(s,c.userId);this.open(s);const timer=TimerEngine.extendOnce({openedAt:s.createdAt,expiresAt:s.expiresAt!,extensionUsed:s.extensionUsed},30,this.clock());
  await new SessionEngine(new PrismaTransactionSessions(tx)).transition<LineData>(id,['OPEN'],'OPEN',s=>({...s,expiresAt:timer.expiresAt,extensionUsed:true}));await tx.scheduledJob.update({where:{executionKey:'line:lock:'+id},data:{dueAt:timer.expiresAt}});return{sessionId:id};
 });}
 // A fresh receipt key lets recovery advance legacy LOCKED sessions whose old lock already committed.
 async lock(guildId:string,id:string,shameEnabled=false){return this.atomic.run(guildId,'line:auto-countdown:'+id,id,async tx=>{
  const s=await new PrismaTransactionSessions(tx).get<LineData>(id);if(!s||s.guildId!==guildId||s.type!=='line')throw new DomainError('LINE_MISSING','Line unavailable.');
  if(!['OPEN','LOCKED'].includes(s.state))return{sessionId:id};if(!s.expiresAt||s.expiresAt>this.clock())throw new DomainError('NOT_DUE','Readiness remains open.');
  await this.beginCountdown(tx,s,shameEnabled);return{sessionId:id};
 });}
 async previewCountdown(c:LineContext,id:string,shameEnabled:boolean):Promise<CountdownPreview>{const s=await this.get(id);if(s.guildId!==c.guildId||s.channelId!==c.channelId)throw new DomainError('LINE_MISSING','Use this Line’s original message.');if(s.ownerUserId!==c.userId)throw new DomainError('HOST_ONLY','Only the host can do that.');if(!['OPEN','LOCKED'].includes(s.state))throw new DomainError('LINE_STARTED','This Line has already started or ended.');const preview:CountdownPreview={version:s.version},waiting=s.data.members.filter(m=>m.status==='waiting');
  if(shameEnabled&&waiting.length){const previous=await this.db.gameSession.findMany({where:{guildId:c.guildId,type:'line',id:{not:id}},orderBy:{createdAt:'desc'},take:3});const recent=new Set(previous.map(row=>(row.data as unknown as LineData).shame?.id)),pool=shamePool.filter(row=>row.enabled&&!recent.has(row.id)),chosen=pool[this.rng(pool.length)];if(chosen)preview.shame={id:chosen.id,text:chosen.text.replaceAll('{user}',waiting[this.rng(waiting.length)]!.name)};}return preview;
 }
 async countdown(c:LineContext,id:string,shameEnabled:boolean,prepared?:CountdownPreview){return this.atomic.run(c.guildId,'line:countdown:'+c.requestKey,requestFingerprint({id,userId:c.userId}),async tx=>{
  const s=await this.session(tx,c,id);this.host(s,c.userId);if(!['OPEN','LOCKED'].includes(s.state))throw new DomainError('LINE_STARTED','This Line has already started or ended.');
  if(prepared&&prepared.version!==s.version)throw new DomainError('LINE_PREVIEW_CHANGED','Check-ins changed while the countdown was prepared. Start Countdown again.');
  await this.beginCountdown(tx,s,shameEnabled,prepared);return{sessionId:id};
 });}
 private async beginCountdown(tx:Prisma.TransactionClient,s:Session<LineData>,shameEnabled:boolean,prepared?:CountdownPreview){
  const id=s.id,guildId=s.guildId,now=this.clock(),expiresAt=new Date(now.getTime()+LINE_DURATION_MS),waiting=s.data.members.filter(m=>m.status==='waiting'),data:LineData={...s.data,startedAt:now.toISOString()};
  if(prepared?.shame&&shameEnabled)data.shame=prepared.shame;
  else if(!prepared&&shameEnabled&&waiting.length){const previous=await tx.gameSession.findMany({where:{guildId,type:'line',id:{not:id}},orderBy:{createdAt:'desc'},take:3});const recent=new Set(previous.map(row=>(row.data as unknown as LineData).shame?.id));const pool=shamePool.filter(s=>s.enabled&&!recent.has(s.id));const chosen=pool[this.rng(pool.length)];if(chosen)data.shame={id:chosen.id,text:chosen.text.replaceAll('{user}',waiting[this.rng(waiting.length)]!.name)};}
  await new SessionEngine(new PrismaTransactionSessions(tx)).transition<LineData>(id,['OPEN','LOCKED'],'SETTLING',s=>({...s,data,expiresAt}));
  await tx.scheduledJob.create({data:{guildId,jobType:'special.line_complete',executionKey:'line:complete:'+id,dueAt:expiresAt,payload:{guildId,sessionId:id}}});
 }
 async complete(guildId:string,id:string){return this.atomic.run(guildId,'line:complete:'+id,id,async tx=>{
  const s=await new PrismaTransactionSessions(tx).get<LineData>(id);if(!s||s.type!=='line'||s.guildId!==guildId)throw new DomainError('LINE_MISSING','Line unavailable.');if(s.state==='CLOSED'||s.state==='CANCELLED')return{sessionId:id};
  if(s.state!=='SETTLING'||!s.expiresAt||s.expiresAt>this.clock())throw new DomainError('NOT_DUE','The countdown has not finished.');await new SessionEngine(new PrismaTransactionSessions(tx)).transition<LineData>(id,['SETTLING'],'CLOSED');return{sessionId:id};
 });}
 async cancel(c:LineContext,id:string,reason='Cancelled by the host.'){return this.atomic.run(c.guildId,'line:cancel:'+c.requestKey,requestFingerprint({id,userId:c.userId}),async tx=>{const s=await this.session(tx,c,id);this.host(s,c.userId);if(s.state==='CANCELLED')return{sessionId:id};if(!['OPEN','LOCKED'].includes(s.state))throw new DomainError('LINE_STARTED','The countdown has already started.');await new SessionEngine(new PrismaTransactionSessions(tx)).transition<LineData>(id,['OPEN','LOCKED'],'CANCELLED',s=>({...s,data:{...s.data,cancelReason:reason}}));return{sessionId:id};});}
 // Persisted deadlines also keep a pre-update 5.8s countdown's render and completion in agreement.
 async publicView(id:string){const row=await this.get(id),startedAt=row.data.startedAt?new Date(row.data.startedAt).getTime():undefined,elapsedMs=startedAt===undefined?0:Math.max(0,this.clock().getTime()-startedAt),durationMs=startedAt!==undefined&&row.expiresAt?row.expiresAt.getTime()-startedAt:LINE_DURATION_MS;return{id:row.id,guildId:row.guildId,channelId:row.channelId,messageId:row.messageId,ownerId:row.ownerUserId,state:row.state==='OPEN'&&row.expiresAt&&row.expiresAt<=this.clock()?'LOCKED' as const:row.state,expiresAt:row.expiresAt,extensionUsed:row.extensionUsed,members:row.data.members,shame:row.data.shame,cancelReason:row.data.cancelReason,remainingMs:Math.max(0,(row.expiresAt?.getTime()??0)-this.clock().getTime()),elapsedMs,durationMs,frame:row.state==='SETTLING'?lineFrame(elapsedMs,durationMs):undefined};}
}
export type LineView=Awaited<ReturnType<PrismaSpecialRepository['publicView']>>;
