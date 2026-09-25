import type {SecurityRepository} from './repository.js';
import type {BehaviorEventRecord,SecurityEventRecord,SecurityStateRecord,VerificationStateRecord} from './types.js';
export class InMemorySecurityRepository implements SecurityRepository {
  readonly behavior:BehaviorEventRecord[]=[];readonly verification=new Map<string,VerificationStateRecord>();readonly states=new Map<string,SecurityStateRecord>();readonly events:SecurityEventRecord[]=[];readonly expiryJobs=new Map<string,{dueAt:Date;mode:string;status:string}>();
  private seq=0;
  async createBehaviorEvent(i:any){const r:BehaviorEventRecord={id:`behavior-${++this.seq}`,guildId:i.guildId,userId:i.userId,category:i.category,weight:i.weight,...(i.expiresAt?{expiresAt:new Date(i.expiresAt)}:{}),...(i.sourceCaseId?{sourceCaseId:i.sourceCaseId}:{}),createdAt:new Date(i.now)};this.behavior.push(r);return structuredClone(r);}
  async listBehaviorEvents(g:string,u:string,s:Date){return this.behavior.filter(x=>x.guildId===g&&x.userId===u&&x.createdAt>=s).map(x=>structuredClone(x));}
  async upsertVerification(i:any){const r:VerificationStateRecord={guildId:i.guildId,userId:i.userId,status:i.status,...(i.reason?{reason:i.reason}:{}),updatedAt:new Date(i.now)};this.verification.set(`${i.guildId}:${i.userId}`,r);return structuredClone(r);}
  async getVerification(g:string,u:string){const r=this.verification.get(`${g}:${u}`);return r?structuredClone(r):null;}
  async upsertSecurityState(i:any){const r:SecurityStateRecord={guildId:i.guildId,mode:i.mode,...(i.reason?{reason:i.reason}:{}),source:i.source,...(i.updatedBy?{updatedBy:i.updatedBy}:{}),panicActive:i.panicActive,...(i.snapshot?{snapshot:structuredClone(i.snapshot)}:{}),...(i.expiresAt?{expiresAt:new Date(i.expiresAt)}:{}),updatedAt:new Date(i.now)};this.states.set(i.guildId,r);return structuredClone(r);}
  async getSecurityState(g:string){const r=this.states.get(g);return r?structuredClone(r):null;}
  async createSecurityEvent(i:any){const r:SecurityEventRecord={id:`security-${++this.seq}`,guildId:i.guildId,...(i.userId?{userId:i.userId}:{}),...(i.actorUserId?{actorUserId:i.actorUserId}:{}),kind:i.kind,severity:i.severity,...(i.metadata?{metadata:structuredClone(i.metadata)}:{}),createdAt:new Date(i.now)};this.events.push(r);return structuredClone(r);}
  async listSecurityEvents(g:string,s:Date,k?:string,a?:string){return this.events.filter(x=>x.guildId===g&&x.createdAt>=s&&(!k||x.kind===k)&&(!a||x.actorUserId===a)).map(x=>structuredClone(x));}
  async upsertSecurityExpiryJob(i:any){this.expiryJobs.set(i.guildId,{dueAt:new Date(i.dueAt),mode:i.mode,status:'PENDING'});}
  async cancelSecurityExpiryJob(g:string){this.expiryJobs.delete(g);}
}
