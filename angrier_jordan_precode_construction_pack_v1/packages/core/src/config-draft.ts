import { createHash } from 'node:crypto';
import type { AuditService } from './audit.js';
import { ConfigValidator, type SettingDefinition } from './config.js';
import type { ConfigRepository, ConfigService } from './config-service.js';
import { DomainError } from './errors.js';
import type { PermissionEngine } from './permissions.js';

export const DRAFT_LOCK_MS = 15 * 60 * 1000;
export interface DashboardActor { userId:string;isGuildOwner:boolean;administrator:boolean; }
export interface DraftContext { guildId:string;actor:DashboardActor;requestId:string; }
export interface DraftChange { value:unknown;baseVersion:number;rollbackVersion?:number; }
export interface DraftPreview {
  fingerprint:string;draftVersion:number;valid:boolean;errors:string[];
  changes:Array<{key:string;section:string;risk:string;before:unknown;after:unknown;baseVersion:number;currentVersion:number;rollbackVersion?:number}>;
  dependencies:Array<{key:string;value:unknown;version:number}>;
  references:Record<string,unknown>;
}
export interface ConfigDraft {
  version:number;editorId:string|null;lastActivityAt:number|null;changes:Record<string,DraftChange>;preview:DraftPreview|null;
}
export const emptyDraft = ():ConfigDraft => ({version:0,editorId:null,lastActivityAt:null,changes:{},preview:null});
export interface DraftTransaction {
  config:ConfigService;configRepository:ConfigRepository;audit:AuditService;
  draft():Promise<ConfigDraft>;saveDraft(draft:ConfigDraft):Promise<void>;
  receipt(key:string):Promise<{fingerprint:string;result:unknown}|null>;
  saveReceipt(key:string,fingerprint:string,result:unknown):Promise<void>;
}
export interface ConfigDraftRepository { run<T>(guildId:string,work:(tx:DraftTransaction)=>Promise<T>):Promise<T>; }
/** Resolver must fail closed when current Discord objects cannot be verified. */
export type ReferenceVerifier=(guildId:string,definitions:readonly SettingDefinition[],values:Record<string,unknown>)=>Promise<{errors:string[];references:Record<string,unknown>}>;
/** Return false for unsupported complex settings; throw a domain error for invalid supported values. */
export type ComplexSettingValidator=(key:string,value:unknown)=>boolean;
export type DraftCommand =
  | {action:'acquire'|'takeover'|'discard'|'preview';expectedVersion:number}
  | {action:'stage';expectedVersion:number;key:string;value:unknown;baseVersion:number}
  | {action:'rollback';expectedVersion:number;key:string;toVersion:number;baseVersion:number}
  | {action:'remove';expectedVersion:number;key:string}
  | {action:'publish';expectedVersion:number;fingerprint:string}
  | {action:'save';key:string;value:unknown;baseVersion:number};

function canonical(value:unknown):unknown {
  if(Array.isArray(value))return value.map(canonical);
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>[key,canonical(item)]));
  return value;
}
export const configFingerprint=(value:unknown):string=>createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
function reject(code:string,message:string):never {throw new DomainError(code,message);}

export class ConfigDraftService {
  private readonly byKey:Map<string,SettingDefinition>;
  private readonly validator:ConfigValidator;
  constructor(private readonly definitions:readonly SettingDefinition[],private readonly repository:ConfigDraftRepository,
    private readonly permissions:PermissionEngine,private readonly verifyReferences?:ReferenceVerifier,private readonly now:()=>number=Date.now,
    private readonly validateComplex?:ComplexSettingValidator){
    this.byKey=new Map(definitions.map(item=>[item.key,item]));this.validator=new ConfigValidator(definitions);
  }
  private authorize(actor:DashboardActor):void {
    if(!actor.userId||!this.permissions.canDashboard(actor,'dashboard.access'))reject('DASHBOARD_FORBIDDEN','Current server owner or Administrator access is required.');
  }
  private definition(key:string):SettingDefinition {
    const definition=this.byKey.get(key);if(!definition)return reject('UNKNOWN_SETTING','Unknown setting.');return definition;
  }
  private validate(key:string,value:unknown):void {
    const definition=this.definition(key);
    if(!definition.mutable||definition.dashboard_write==='blocked'||definition.risk==='locked')reject('IMMUTABLE_SETTING','This setting cannot be changed in the dashboard.');
    // Complex editors and object lifecycle operations need their own shared validator/impact adapter.
    if(definition.type==='json'){
      if(this.validateComplex?.(key,value)!==true)reject('COMPLEX_EDITOR_REQUIRED','This setting requires its specialized editor and validation.');
      return;
    }
    if(!['boolean','integer','choice','string','discord_channel','discord_role'].includes(definition.type))reject('UNSUPPORTED_SETTING','No supported validator exists for this setting.');
    const result=this.validator.validate(key,value);if(!result.ok)reject(result.error??'INVALID_SETTING','The setting value is invalid.');
    if(definition.type==='choice'&&typeof value!=='string')reject('EXPECTED_STRING','Choose a listed value.');
    if(typeof value==='string'&&value.length>4000)reject('VALUE_TOO_LONG','The setting exceeds the supported text length.');
    if(['discord_channel','discord_role'].includes(definition.type)&&value!==null&&(typeof value!=='string'||!/^\d{17,20}$/.test(value)))reject('INVALID_DISCORD_ID','Choose a valid Discord object.');
    if(key==='server.timezone'){try{new Intl.DateTimeFormat('en-US',{timeZone:String(value)});}catch{reject('INVALID_TIMEZONE','Choose an IANA timezone.');}}
  }
  private hasLock(draft:ConfigDraft,actor:DashboardActor):void {
    if(draft.editorId!==actor.userId||draft.lastActivityAt===null||this.now()-draft.lastActivityAt>=DRAFT_LOCK_MS)reject('DRAFT_LOCK_REQUIRED','Acquire the draft edit lock before editing.');
  }
  async view(guildId:string,actor:DashboardActor):Promise<ConfigDraft>{
    this.authorize(actor);return this.repository.run(guildId,tx=>tx.draft());
  }
  async history(guildId:string,actor:DashboardActor,key:string){
    this.authorize(actor);this.definition(key);
    return this.repository.run(guildId,async tx=>(await tx.configRepository.revisions(guildId,key,100)).filter(row=>row.createdAt.getTime()>=this.now()-365*86400000));
  }
  async execute(context:DraftContext,command:DraftCommand):Promise<ConfigDraft|{key:string;version:number;value:unknown}> {
    this.authorize(context.actor);
    if(!command||!['acquire','takeover','discard','preview','stage','rollback','remove','publish','save'].includes(command.action))reject('INVALID_OPERATION','Choose a supported manual dashboard operation.');
    const expectedKeys:Record<string,string[]>={acquire:['expectedVersion'],takeover:['expectedVersion'],discard:['expectedVersion'],preview:['expectedVersion'],stage:['expectedVersion','key','value','baseVersion'],rollback:['expectedVersion','key','toVersion','baseVersion'],remove:['expectedVersion','key'],publish:['expectedVersion','fingerprint'],save:['key','value','baseVersion']};
    if(Object.keys(command).some(key=>key!=='action'&&!expectedKeys[command.action]!.includes(key)))reject('INVALID_OPERATION','Unexpected operation fields are not supported.');
    if(command.action!=='save'&&(!Number.isSafeInteger(command.expectedVersion)||command.expectedVersion<0))reject('INVALID_VERSION','A current draft version is required.');
    if('key' in command&&(typeof command.key!=='string'||!command.key))reject('UNKNOWN_SETTING','A setting key is required.');
    if((command.action==='save'||command.action==='stage'||command.action==='rollback')&&(!Number.isSafeInteger(command.baseVersion)||command.baseVersion<0))reject('INVALID_VERSION','A current setting version is required.');
    if((command.action==='save'||command.action==='stage')&&!Object.hasOwn(command,'value'))reject('INVALID_SETTING','A setting value is required.');
    if(command.action==='rollback'&&(!Number.isSafeInteger(command.toVersion)||command.toVersion<1))reject('INVALID_VERSION','A retained revision is required.');
    if(!/^[A-Za-z0-9_-]{16,100}$/.test(context.requestId))reject('INVALID_REQUEST_ID','A unique request ID is required.');
    const operationHash=configFingerprint({actor:context.actor.userId,command});
    return this.repository.run(context.guildId,async tx=>{
      const receiptKey=`dashboard:${context.requestId}`,receipt=await tx.receipt(receiptKey);
      if(receipt){if(receipt.fingerprint!==operationHash)reject('REPLAY_MISMATCH','This request ID belongs to a different operation.');return receipt.result as ConfigDraft|{key:string;version:number;value:unknown};}
      if(command.action==='save'){
        this.validate(command.key,command.value);
        const definition=this.definition(command.key);
        if(definition.dashboard_write!=='live'||definition.risk!=='normal'||!['boolean','integer','choice','string'].includes(definition.type)||(definition.depends_on?.length??0)>0||this.definitions.some(item=>item.depends_on?.includes(command.key)))reject('DRAFT_REQUIRED','This change requires Draft, Preview and Publish.');
        const row=await tx.config.set({guildId:context.guildId,key:command.key,value:command.value,actorUserId:context.actor.userId,expectedVersion:command.baseVersion,source:'dashboard.live',requestId:context.requestId});
        const result={key:row.key,version:row.version,value:row.value};await tx.saveReceipt(receiptKey,operationHash,result);return result;
      }
      const draft=await tx.draft(),before=structuredClone(draft);
      if(command.expectedVersion!==draft.version)reject('DRAFT_CONFLICT','The shared draft changed. Reload it before continuing.');
      switch(command.action){
        case 'acquire': {
          if(draft.editorId&&draft.editorId!==context.actor.userId&&draft.lastActivityAt!==null&&this.now()-draft.lastActivityAt<DRAFT_LOCK_MS)reject('DRAFT_LOCKED','Another Administrator is editing the shared draft.');
          draft.editorId=context.actor.userId;draft.lastActivityAt=this.now();break;
        }
        case 'takeover': {
          if(!this.permissions.canDashboard(context.actor,'dashboard.force_draft_unlock'))reject('OWNER_REQUIRED','Only the server owner may take over the draft.');
          draft.editorId=context.actor.userId;draft.lastActivityAt=this.now();break;
        }
        case 'stage': {
          this.hasLock(draft,context.actor);this.validate(command.key,command.value);
          const current=await tx.config.getWithMetadata(context.guildId,command.key);
          if(current.version!==command.baseVersion)reject('CONFIG_CONFLICT','The live setting changed. Reload before staging.');
          draft.changes[command.key]={value:command.value,baseVersion:command.baseVersion};draft.lastActivityAt=this.now();break;
        }
        case 'rollback': {
          this.hasLock(draft,context.actor);this.definition(command.key);
          const revision=(await tx.configRepository.revisions(context.guildId,command.key,100)).find(row=>row.version===command.toVersion);
          if(!revision||!revision.rollbackSafe||revision.createdAt.getTime()<this.now()-365*86400000)reject('ROLLBACK_UNSAFE','The requested retained revision cannot be safely restored.');
          this.validate(command.key,revision.value);
          const current=await tx.config.getWithMetadata(context.guildId,command.key);
          if(current.version!==command.baseVersion)reject('CONFIG_CONFLICT','The live setting changed. Reload before staging rollback.');
          draft.changes[command.key]={value:revision.value,baseVersion:command.baseVersion,rollbackVersion:command.toVersion};draft.lastActivityAt=this.now();break;
        }
        case 'remove':this.hasLock(draft,context.actor);delete draft.changes[command.key];draft.lastActivityAt=this.now();break;
        case 'discard':this.hasLock(draft,context.actor);draft.changes={};draft.editorId=null;draft.lastActivityAt=null;break;
        case 'preview': {
          this.hasLock(draft,context.actor);draft.lastActivityAt=this.now();
          draft.version++;draft.preview=await this.makePreview(context.guildId,draft,tx);break;
        }
        case 'publish': {
          if(!draft.preview||!draft.preview.valid||draft.preview.fingerprint!==command.fingerprint)reject('PREVIEW_REQUIRED','Review a valid current preview before publishing.');
          const current=await this.makePreview(context.guildId,draft,tx);
          if(!current.valid)reject('DRAFT_INVALID',current.errors.join(' '));
          if(current.fingerprint!==command.fingerprint)reject('PREVIEW_STALE','Live settings or direct dependencies changed. Generate a new preview.');
          for(const row of current.changes)await tx.config.set({guildId:context.guildId,key:row.key,value:row.after,actorUserId:context.actor.userId,expectedVersion:row.baseVersion,
            source:row.rollbackVersion===undefined?'dashboard.publish':'dashboard.rollback',requestId:context.requestId,rollbackSafe:true});
          draft.changes={};draft.editorId=null;draft.lastActivityAt=null;break;
        }
      }
      if(command.action!=='preview'){draft.version++;draft.preview=null;}
      await tx.saveDraft(draft);
      await tx.audit.record({guildId:context.guildId,actorUserId:context.actor.userId,source:'dashboard',action:`dashboard.draft.${command.action}`,
        targetType:'config_draft',targetId:context.guildId,before,after:draft,requestId:context.requestId,createdAt:new Date(this.now())});
      await tx.saveReceipt(receiptKey,operationHash,draft);return draft;
    });
  }
  private async makePreview(guildId:string,draft:ConfigDraft,tx:DraftTransaction):Promise<DraftPreview>{
    const errors:string[]=[],changed=Object.keys(draft.changes).sort(),related=new Set(changed);
    for(const key of changed)for(const dependency of this.definition(key).depends_on??[])related.add(dependency);
    for(const definition of this.definitions)if(definition.depends_on?.some(key=>changed.includes(key)))related.add(definition.key);
    const values:Record<string,unknown>={},dependencies:DraftPreview['dependencies']=[];
    for(const key of [...related].sort()){
      if(!this.byKey.has(key)){errors.push(`${key}: unknown direct dependency.`);continue;}
      const current=await tx.config.getWithMetadata(guildId,key);values[key]=Object.hasOwn(draft.changes,key)?draft.changes[key]!.value:current.value;
      dependencies.push({key,value:current.value,version:current.version});
    }
    const changes:DraftPreview['changes']=[];
    for(const key of changed){
      const change=draft.changes[key]!,definition=this.definition(key),current=dependencies.find(item=>item.key===key)!;
      try{this.validate(key,change.value);}catch(error){errors.push(`${key}: ${error instanceof DomainError?error.code:'INVALID_SETTING'}`);}
      if(current.version!==change.baseVersion)errors.push(`${key}: live version changed; restage this setting.`);
      changes.push({key,section:definition.section??'server',risk:definition.risk??'high',before:current.value,after:change.value,baseVersion:change.baseVersion,currentVersion:current.version,
        ...(change.rollbackVersion===undefined?{}:{rollbackVersion:change.rollbackVersion})});
    }
    if(!changed.length)errors.push('The draft has no changes.');
    for(const tier of ['cheap','standard','premium']){
      const min=values[`crafting.repair.${tier}_restore_min`],max=values[`crafting.repair.${tier}_restore_max`];
      if(typeof min==='number'&&typeof max==='number'&&min>max)errors.push(`crafting.repair.${tier}: minimum restoration must not exceed maximum.`);
    }
    const start=values['spotlight.learned_post_window_start_hour'],end=values['spotlight.learned_post_window_end_hour'];
    if(typeof start==='number'&&typeof end==='number'&&start>=end)errors.push('spotlight: the posting window must end after it starts.');
    const reward=values['solo.reward'],cap=values['solo.daily_reward_cap'];
    if(typeof reward==='number'&&typeof cap==='number'&&reward>cap)errors.push('solo: the reward must not exceed the daily reward cap.');
    for(const [minimum,maximum] of [['pvp.min_wager','pvp.max_wager'],['crime.theft_min_bp','crime.theft_max_bp'],['crime.catch_base_bp','crime.catch_cap_bp'],['giveaway.min_duration_minutes','giveaway.max_duration_minutes'],['family.auction_min_hours','family.auction_max_hours'],['family.cooldown_base_seconds','family.cooldown_max_seconds']]){
      const low=values[minimum!],high=values[maximum!];if(typeof low==='number'&&typeof high==='number'&&low>high)errors.push(`${minimum}: must not exceed ${maximum}.`);
    }
    const relevant=[...related].map(key=>this.byKey.get(key)).filter((item):item is SettingDefinition=>!!item);
    for(const definition of relevant){
      if(!definition.key.startsWith('features.')||values[definition.key]!==true)continue;
      for(const key of definition.depends_on??[]){
        if(!Object.hasOwn(values,key))continue; // Do not traverse beyond direct relationships.
        const dependency=this.definition(key),value=values[key];
        if(dependency.type==='boolean'&&value!==true)errors.push(`${definition.key}: ${key} must be enabled.`);
        if(['discord_channel','discord_role'].includes(dependency.type)&&value===null)errors.push(`${definition.key}: ${key} must be configured.`);
        if(dependency.type==='json'){
          try{if(this.validateComplex?.(key,value)!==true)errors.push(`${definition.key}: ${key} requires its specialized dependency validator before enabling.`);}
          catch(error){errors.push(`${key}: ${error instanceof DomainError?error.code:'INVALID_SETTING'}`);}
        }
      }
    }
    let references:Record<string,unknown>={};
    if(relevant.some(item=>(['discord_channel','discord_role'].includes(item.type)&&values[item.key]!==null)||item.type==='json')){
      if(!this.verifyReferences)errors.push('Current Discord channel/role references cannot be verified.');
      else{const result=await this.verifyReferences(guildId,relevant,values);errors.push(...result.errors);references=result.references;}
    }
    const contents={draftVersion:draft.version,changes,dependencies,references,definitions:relevant};
    return {fingerprint:configFingerprint(contents),draftVersion:draft.version,valid:errors.length===0,errors,changes,dependencies,references};
  }
}
