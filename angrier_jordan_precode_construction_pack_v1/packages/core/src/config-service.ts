import type { AuditService } from './audit.js';
import { ConfigValidator, type SettingDefinition } from './config.js';
import { DomainError } from './errors.js';

export interface ConfigRecord {
  guildId:string;
  key:string;
  value:unknown;
  source:string;
  version:number;
  updatedBy?:string;
  updatedAt:Date;
}

export interface ConfigRevisionRecord {
  guildId:string;
  key:string;
  version:number;
  value:unknown;
  source:string;
  actorUserId?:string;
  rollbackSafe:boolean;
  createdAt:Date;
}

export interface ConfigRepository {
  get(guildId:string,key:string):Promise<ConfigRecord|null>;
  set(input:{guildId:string;key:string;value:unknown;source:string;actorUserId?:string;expectedVersion?:number;rollbackSafe:boolean}):Promise<ConfigRecord>;
  revisions(guildId:string,key:string,limit?:number):Promise<ConfigRevisionRecord[]>;
  /** Production adapters commit config, revision and audit as one transaction. */
  setAudited?(input:{guildId:string;key:string;value:unknown;source:string;actorUserId?:string;expectedVersion?:number;rollbackSafe:boolean},audit:(before:ConfigRecord|null,after:ConfigRecord)=>import('./audit.js').AuditEvent):Promise<ConfigRecord>;
}

export interface ConfigSetInput {
  guildId:string;
  key:string;
  value:unknown;
  actorUserId?:string;
  source?:string;
  requestId:string;
  expectedVersion?:number;
  rollbackSafe?:boolean;
}

export class ConfigService {
  private readonly validator:ConfigValidator;
  private readonly definitionsByKey:Map<string,SettingDefinition>;
  constructor(
    definitions:readonly SettingDefinition[],
    private readonly repository:ConfigRepository,
    private readonly audit:AuditService,
  ){
    this.validator=new ConfigValidator(definitions);
    this.definitionsByKey=new Map(definitions.map(d=>[d.key,d]));
  }

  definition(key:string):SettingDefinition|undefined{return this.definitionsByKey.get(key);}

  async get(guildId:string,key:string):Promise<unknown>{
    const definition=this.definition(key);
    if(!definition)throw new DomainError('UNKNOWN_SETTING',`Unknown setting: ${key}`);
    const row=await this.repository.get(guildId,key);
    return row ? row.value : definition.default;
  }

  async getWithMetadata(guildId:string,key:string):Promise<{value:unknown;source:string;version:number;updatedAt?:Date}>{
    const definition=this.definition(key);
    if(!definition)throw new DomainError('UNKNOWN_SETTING',`Unknown setting: ${key}`);
    const row=await this.repository.get(guildId,key);
    if(!row)return {value:definition.default,source:'default',version:0};
    return {value:row.value,source:row.source,version:row.version,updatedAt:row.updatedAt};
  }

  async set(input:ConfigSetInput):Promise<ConfigRecord>{
    const result=this.validator.validate(input.key,input.value);
    if(!result.ok)throw new DomainError(result.error??'INVALID_SETTING',`Invalid value for ${input.key}: ${result.error??'validation failed'}`);
    const write={
      guildId:input.guildId,key:input.key,value:result.value,source:input.source??'dashboard',
      ...(input.actorUserId===undefined?{}:{actorUserId:input.actorUserId}),
      ...(input.expectedVersion===undefined?{}:{expectedVersion:input.expectedVersion}),
      rollbackSafe:input.rollbackSafe??true,
    };
    const event=(before:{value:unknown;source:string;version:number},row:ConfigRecord):import('./audit.js').AuditEvent=>({
      guildId:input.guildId,
      ...(input.actorUserId===undefined?{}:{actorUserId:input.actorUserId}),
      source:input.source??'dashboard',action:'config.set',targetType:'setting',targetId:input.key,
      before:{value:before.value,source:before.source,version:before.version},
      after:{value:row.value,source:row.source,version:row.version},requestId:input.requestId,createdAt:new Date(),
    });
    if(this.repository.setAudited)return this.repository.setAudited(write,(before,row)=>event(before??{value:this.definition(input.key)!.default,source:'default',version:0},row));
    // Compatibility for legacy/in-memory adapters. Dashboard requires the atomic adapter.
    const before=await this.getWithMetadata(input.guildId,input.key);
    const row=await this.repository.set(write);
    await this.audit.record(event(before,row));
    return row;
  }

  async rollback(input:{guildId:string;key:string;toVersion:number;actorUserId?:string;requestId:string}):Promise<ConfigRecord>{
    const history=await this.repository.revisions(input.guildId,input.key,100);
    const revision=history.find(r=>r.version===input.toVersion);
    if(!revision)throw new DomainError('REVISION_NOT_FOUND',`No revision ${input.toVersion} exists for ${input.key}.`);
    if(!revision.rollbackSafe)throw new DomainError('ROLLBACK_UNSAFE',`Revision ${input.toVersion} is not safe to restore automatically.`);
    const current=await this.getWithMetadata(input.guildId,input.key);
    return this.set({
      guildId:input.guildId,key:input.key,value:revision.value,
      ...(input.actorUserId===undefined?{}:{actorUserId:input.actorUserId}),
      source:'rollback',requestId:input.requestId,expectedVersion:current.version,rollbackSafe:true,
    });
  }
}
