import type {SecurityRepository} from './repository.js';
import type {BehaviorEventRecord,SecurityEventRecord,SecurityStateRecord,VerificationStateRecord} from './types.js';

type BehaviorRow={id:string;guildId:string;userId:string;category:string;weight:number;expiresAt:Date|null;sourceCaseId:number|null;createdAt:Date};
type VerifyRow={guildId:string;userId:string;status:string;reason:string|null;updatedAt:Date};
type StateRow={guildId:string;mode:string;reason:string|null;source:string;updatedBy:string|null;panicActive:boolean;snapshot:unknown;expiresAt:Date|null;updatedAt:Date};
type EventRow={id:string;guildId:string;userId:string|null;actorUserId:string|null;kind:string;severity:number;metadata:unknown;createdAt:Date};
interface DbLike{
 behaviorEvent:{create(args:any):Promise<BehaviorRow>;findMany(args:any):Promise<BehaviorRow[]>};
 verificationState:{upsert(args:any):Promise<VerifyRow>;findUnique(args:any):Promise<VerifyRow|null>};
 securityModeState:{upsert(args:any):Promise<StateRow>;findUnique(args:any):Promise<StateRow|null>};
 securityEvent:{create(args:any):Promise<EventRow>;findMany(args:any):Promise<EventRow[]>};
 scheduledJob:{upsert(args:any):Promise<any>;updateMany(args:any):Promise<{count:number}>};
}
const b=(r:BehaviorRow):BehaviorEventRecord=>({id:r.id,guildId:r.guildId,userId:r.userId,category:r.category,weight:r.weight,...(r.expiresAt?{expiresAt:r.expiresAt}:{}),...(r.sourceCaseId?{sourceCaseId:r.sourceCaseId}:{}),createdAt:r.createdAt});
const v=(r:VerifyRow):VerificationStateRecord=>({guildId:r.guildId,userId:r.userId,status:r.status as VerificationStateRecord['status'],...(r.reason?{reason:r.reason}:{}),updatedAt:r.updatedAt});
const st=(r:StateRow):SecurityStateRecord=>({guildId:r.guildId,mode:r.mode as SecurityStateRecord['mode'],...(r.reason?{reason:r.reason}:{}),source:r.source,...(r.updatedBy?{updatedBy:r.updatedBy}:{}),panicActive:r.panicActive,...(r.snapshot&&typeof r.snapshot==='object'?{snapshot:r.snapshot as Record<string,unknown>} : {}),...(r.expiresAt?{expiresAt:r.expiresAt}:{}),updatedAt:r.updatedAt});
const ev=(r:EventRow):SecurityEventRecord=>({id:r.id,guildId:r.guildId,...(r.userId?{userId:r.userId}:{}),...(r.actorUserId?{actorUserId:r.actorUserId}:{}),kind:r.kind,severity:r.severity,...(r.metadata&&typeof r.metadata==='object'?{metadata:r.metadata as Record<string,unknown>} : {}),createdAt:r.createdAt});
export class PrismaSecurityRepository implements SecurityRepository{
 constructor(private readonly db:DbLike){}
 async createBehaviorEvent(i:any){return b(await this.db.behaviorEvent.create({data:{guildId:i.guildId,userId:i.userId,category:i.category,weight:i.weight,expiresAt:i.expiresAt??null,sourceCaseId:i.sourceCaseId??null,createdAt:i.now}}));}
 async listBehaviorEvents(g:string,u:string,since:Date){return (await this.db.behaviorEvent.findMany({where:{guildId:g,userId:u,createdAt:{gte:since},OR:[{expiresAt:null},{expiresAt:{gt:new Date()}}]},orderBy:{createdAt:'asc'}})).map(b);}
 async upsertVerification(i:any){return v(await this.db.verificationState.upsert({where:{guildId_userId:{guildId:i.guildId,userId:i.userId}},create:{guildId:i.guildId,userId:i.userId,status:i.status,reason:i.reason??null},update:{status:i.status,reason:i.reason??null,updatedAt:i.now}}));}
 async getVerification(g:string,u:string){const r=await this.db.verificationState.findUnique({where:{guildId_userId:{guildId:g,userId:u}}});return r?v(r):null;}
 async upsertSecurityState(i:any){return st(await this.db.securityModeState.upsert({where:{guildId:i.guildId},create:{guildId:i.guildId,mode:i.mode,reason:i.reason??null,source:i.source,updatedBy:i.updatedBy??null,panicActive:i.panicActive,snapshot:i.snapshot??null,expiresAt:i.expiresAt??null,updatedAt:i.now},update:{mode:i.mode,reason:i.reason??null,source:i.source,updatedBy:i.updatedBy??null,panicActive:i.panicActive,snapshot:i.snapshot??null,expiresAt:i.expiresAt??null,updatedAt:i.now}}));}
 async getSecurityState(g:string){const r=await this.db.securityModeState.findUnique({where:{guildId:g}});return r?st(r):null;}
 async createSecurityEvent(i:any){return ev(await this.db.securityEvent.create({data:{guildId:i.guildId,userId:i.userId??null,actorUserId:i.actorUserId??null,kind:i.kind,severity:i.severity,metadata:i.metadata??null,createdAt:i.now}}));}
 async listSecurityEvents(g:string,since:Date,kind?:string,actorUserId?:string){return (await this.db.securityEvent.findMany({where:{guildId:g,createdAt:{gte:since},...(kind?{kind}:{}),...(actorUserId?{actorUserId}:{})},orderBy:{createdAt:'asc'}})).map(ev);}
 async upsertSecurityExpiryJob(i:any){const executionKey=`security.state_expire:${i.guildId}`;await this.db.scheduledJob.upsert({where:{executionKey},create:{guildId:i.guildId,jobType:'security.state_expire',executionKey,dueAt:i.dueAt,status:'PENDING',payload:{guildId:i.guildId,mode:i.mode}},update:{dueAt:i.dueAt,status:'PENDING',payload:{guildId:i.guildId,mode:i.mode},lastError:null,completedAt:null}});}
 async cancelSecurityExpiryJob(g:string){await this.db.scheduledJob.updateMany({where:{executionKey:`security.state_expire:${g}`,status:{in:['PENDING','FAILED','RUNNING']}},data:{status:'CANCELLED'}});}
}
