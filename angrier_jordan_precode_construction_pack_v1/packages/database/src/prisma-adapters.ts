import {randomUUID} from 'node:crypto';
import type { AuditEvent, AuditSink, ConfigRecord, ConfigRepository, ConfigRevisionRecord, JobRepository, ScheduledJob } from '../../core/src/index.js';
import { DomainError } from '../../core/src/index.js';

interface ConfigValueRow { guildId:string;key:string;value:unknown;source:string;version:number;updatedBy:string|null;updatedAt:Date; }
interface ConfigRevisionRow { guildId:string;key:string;version:number;value:unknown;source:string;actorUserId:string|null;rollbackSafe:boolean;createdAt:Date; }
interface ScheduledJobRow { leaseToken?:string|null;leaseUntil?:Date|null;retryAt?:Date|null; id:string;guildId:string;jobType:string;executionKey:string;dueAt:Date;status:string;payload:unknown;attempts:number;lastError:string|null;completedAt:Date|null; }
interface UpdateManyResult { count:number; }

interface ConfigTxLike {
  configValue:{
    findUnique(args:unknown):Promise<ConfigValueRow|null>;
    create(args:unknown):Promise<ConfigValueRow>;
    update(args:unknown):Promise<ConfigValueRow>;
  };
  configRevision:{create(args:unknown):Promise<unknown>};
}

interface JobTxLike {
  scheduledJob:{
    findMany(args:unknown):Promise<ScheduledJobRow[]>;
    updateMany(args:unknown):Promise<UpdateManyResult>;
    update(args:unknown):Promise<ScheduledJobRow>;
  };
}

export interface FoundationPrismaLike extends ConfigTxLike,JobTxLike {
  configRevision:{create(args:unknown):Promise<unknown>;findMany(args:unknown):Promise<ConfigRevisionRow[]>};
  auditEvent:{create(args:unknown):Promise<unknown>};
  scheduledJob:{
    findMany(args:unknown):Promise<ScheduledJobRow[]>;
    findUnique(args:unknown):Promise<ScheduledJobRow|null>;
    updateMany(args:unknown):Promise<UpdateManyResult>;
    update(args:unknown):Promise<ScheduledJobRow>;
  };
  $transaction<T>(fn:(tx:ConfigTxLike&JobTxLike)=>Promise<T>):Promise<T>;
  $queryRawUnsafe?<T=unknown>(query:string):Promise<T>;
}

const configRecord=(row:ConfigValueRow):ConfigRecord=>({
  guildId:row.guildId,key:row.key,value:row.value,source:row.source,version:row.version,
  ...(row.updatedBy===null?{}:{updatedBy:row.updatedBy}),updatedAt:row.updatedAt,
});

export class PrismaConfigRepository implements ConfigRepository {
  constructor(private readonly db:FoundationPrismaLike){}
  async get(guildId:string,key:string):Promise<ConfigRecord|null>{
    const row=await this.db.configValue.findUnique({where:{guildId_key:{guildId,key}}});
    return row?configRecord(row):null;
  }
  async set(input:{guildId:string;key:string;value:unknown;source:string;actorUserId?:string;expectedVersion?:number;rollbackSafe:boolean}):Promise<ConfigRecord>{
    return this.db.$transaction(async tx=>{
      const current=await tx.configValue.findUnique({where:{guildId_key:{guildId:input.guildId,key:input.key}}});
      const actualVersion=current?.version??0;
      if(input.expectedVersion!==undefined&&input.expectedVersion!==actualVersion){
        throw new DomainError('CONFIG_CONFLICT',`Setting ${input.key} changed from version ${input.expectedVersion} to ${actualVersion}.`);
      }
      const nextVersion=actualVersion+1;
      const data={value:input.value,source:input.source,version:nextVersion,updatedBy:input.actorUserId??null};
      const next=current
        ?await tx.configValue.update({where:{guildId_key:{guildId:input.guildId,key:input.key}},data})
        :await tx.configValue.create({data:{guildId:input.guildId,key:input.key,...data}});
      await tx.configRevision.create({data:{
        guildId:input.guildId,key:input.key,version:nextVersion,value:input.value,source:input.source,
        actorUserId:input.actorUserId??null,rollbackSafe:input.rollbackSafe,
      }});
      return configRecord(next);
    });
  }
  async revisions(guildId:string,key:string,limit=50):Promise<ConfigRevisionRecord[]>{
    const rows=await this.db.configRevision.findMany({where:{guildId,key},orderBy:{version:'desc'},take:limit});
    return rows.map(row=>({
      guildId:row.guildId,key:row.key,version:row.version,value:row.value,source:row.source,
      ...(row.actorUserId===null?{}:{actorUserId:row.actorUserId}),rollbackSafe:row.rollbackSafe,createdAt:row.createdAt,
    }));
  }
}

export class PrismaAuditSink implements AuditSink {
  constructor(private readonly db:FoundationPrismaLike){}
  async write(event:AuditEvent):Promise<void>{
    await this.db.auditEvent.create({data:{
      guildId:event.guildId,actorUserId:event.actorUserId??null,source:event.source,action:event.action,
      targetType:event.targetType??null,targetId:event.targetId??null,before:event.before??null,after:event.after??null,
      reason:event.reason??null,requestId:event.requestId,createdAt:event.createdAt,
    }});
  }
}

const scheduledJob=(row:ScheduledJobRow):ScheduledJob=>({
  id:row.id,guildId:row.guildId,jobType:row.jobType,executionKey:row.executionKey,dueAt:row.dueAt,
  ...(row.leaseToken?{leaseToken:row.leaseToken}:{}),status:row.status as ScheduledJob['status'],...(row.payload===null?{}:{payload:row.payload}),attempts:row.attempts,
});

export class PrismaJobRepository implements JobRepository {
  constructor(private readonly db:FoundationPrismaLike){}
  async claimDue(now:Date,limit:number):Promise<ScheduledJob[]>{
    return this.db.$transaction(async tx=>{
      const available={OR:[{status:'PENDING',dueAt:{lte:now}},{status:'FAILED',retryAt:{lte:now}},{status:'RUNNING',OR:[{leaseUntil:{lte:now}},{leaseUntil:null}]}]};
      const due=await tx.scheduledJob.findMany({where:available,orderBy:{dueAt:'asc'},take:limit});
      const claimed:ScheduledJob[]=[];
      for(const row of due){
        const leaseToken=randomUUID();
        const result=await tx.scheduledJob.updateMany({where:{id:row.id,status:row.status,leaseToken:row.leaseToken??null,...available},data:{status:'RUNNING',attempts:{increment:1},leaseToken,leaseUntil:new Date(now.getTime()+120_000)}});
        if(result.count===1)claimed.push(scheduledJob({...row,status:'RUNNING',attempts:row.attempts+1,leaseToken}));
      }
      return claimed;
    });
  }
  async renew(id:string,leaseToken:string):Promise<boolean>{return(await this.db.scheduledJob.updateMany({where:{id,status:'RUNNING',leaseToken},data:{leaseUntil:new Date(Date.now()+120_000)}})).count===1;}
  async complete(id:string,leaseToken?:string):Promise<void>{
    await this.db.scheduledJob.updateMany({where:{id,...(leaseToken?{leaseToken}:{})},data:{status:'COMPLETED',completedAt:new Date(),lastError:null,leaseToken:null,leaseUntil:null,retryAt:null}});
  }
  async fail(id:string,error:string,leaseToken?:string):Promise<void>{
    const row=await this.db.scheduledJob.findUnique({where:{id}});if(!row)return;
    const delay=Math.min(3600,5*2**Math.min(10,row.attempts))*1000;
    await this.db.scheduledJob.updateMany({where:{id,...(leaseToken?{leaseToken}:{})},data:{status:'FAILED',lastError:error,leaseToken:null,leaseUntil:null,retryAt:new Date(Date.now()+delay)}});
  }
  async wasExecuted(executionKey:string):Promise<boolean>{
    const row=await this.db.scheduledJob.findUnique({where:{executionKey}});
    return row?.status==='COMPLETED';
  }
}

export const createPrismaHealthProbe=(db:FoundationPrismaLike)=>async()=>{
  const started=Date.now();
  try{
    if(db.$queryRawUnsafe)await db.$queryRawUnsafe('SELECT 1');
    else await db.scheduledJob.findMany({take:1});
    return {name:'postgres',status:'ok' as const,latencyMs:Date.now()-started};
  }catch(error){
    return {name:'postgres',status:'down' as const,latencyMs:Date.now()-started,detail:error instanceof Error?error.message:String(error)};
  }
};
