import type { AuditEvent, AuditSink } from './audit.js';
import type { ConfigRecord, ConfigRepository, ConfigRevisionRecord } from './config-service.js';
import { DomainError } from './errors.js';
import type { JobRepository, ScheduledJob } from './scheduler.js';

const configKey=(guildId:string,key:string)=>`${guildId}::${key}`;
const cloneConfig=(row:ConfigRecord):ConfigRecord=>({...row,updatedAt:new Date(row.updatedAt)});
const cloneRevision=(row:ConfigRevisionRecord):ConfigRevisionRecord=>({...row,createdAt:new Date(row.createdAt)});

export class InMemoryConfigRepository implements ConfigRepository {
  private readonly values=new Map<string,ConfigRecord>();
  private readonly history=new Map<string,ConfigRevisionRecord[]>();
  async get(guildId:string,key:string):Promise<ConfigRecord|null>{
    const row=this.values.get(configKey(guildId,key));return row?cloneConfig(row):null;
  }
  async set(input:{guildId:string;key:string;value:unknown;source:string;actorUserId?:string;expectedVersion?:number;rollbackSafe:boolean}):Promise<ConfigRecord>{
    const k=configKey(input.guildId,input.key);const current=this.values.get(k);const version=current?.version??0;
    if(input.expectedVersion!==undefined&&input.expectedVersion!==version)throw new DomainError('CONFIG_CONFLICT',`Expected ${input.expectedVersion}, got ${version}.`);
    const row:ConfigRecord={guildId:input.guildId,key:input.key,value:input.value,source:input.source,version:version+1,updatedAt:new Date(),...(input.actorUserId===undefined?{}:{updatedBy:input.actorUserId})};
    this.values.set(k,row);
    const revision:ConfigRevisionRecord={guildId:input.guildId,key:input.key,version:row.version,value:input.value,source:input.source,rollbackSafe:input.rollbackSafe,createdAt:new Date(),...(input.actorUserId===undefined?{}:{actorUserId:input.actorUserId})};
    const list=this.history.get(k)??[];list.push(revision);this.history.set(k,list);
    return cloneConfig(row);
  }
  async revisions(guildId:string,key:string,limit=50):Promise<ConfigRevisionRecord[]>{return (this.history.get(configKey(guildId,key))??[]).slice(-limit).reverse().map(cloneRevision);}
}

export class InMemoryAuditSink implements AuditSink {
  readonly events:AuditEvent[]=[];
  async write(event:AuditEvent):Promise<void>{this.events.push({...event,createdAt:new Date(event.createdAt)});}
}

const cloneJob=(job:ScheduledJob):ScheduledJob=>({...job,dueAt:new Date(job.dueAt)});
export class InMemoryJobRepository implements JobRepository {
  private readonly jobs=new Map<string,ScheduledJob>();
  constructor(seed:readonly ScheduledJob[]=[]){for(const job of seed)this.jobs.set(job.id,cloneJob(job));}
  add(job:ScheduledJob):void{this.jobs.set(job.id,cloneJob(job));}
  get(id:string):ScheduledJob|undefined{const job=this.jobs.get(id);return job?cloneJob(job):undefined;}
  async claimDue(now:Date,limit:number):Promise<ScheduledJob[]>{
    const due=[...this.jobs.values()].filter(j=>j.status==='PENDING'&&j.dueAt<=now).sort((a,b)=>a.dueAt.getTime()-b.dueAt.getTime()).slice(0,limit);
    return due.map(job=>{const next={...job,status:'RUNNING' as const,attempts:job.attempts+1};this.jobs.set(job.id,next);return cloneJob(next);});
  }
  async complete(id:string):Promise<void>{const job=this.jobs.get(id);if(job)this.jobs.set(id,{...job,status:'COMPLETED'});}
  async fail(id:string,_error:string):Promise<void>{const job=this.jobs.get(id);if(job)this.jobs.set(id,{...job,status:'FAILED'});}
  async wasExecuted(executionKey:string):Promise<boolean>{return [...this.jobs.values()].some(j=>j.executionKey===executionKey&&j.status==='COMPLETED');}
}
