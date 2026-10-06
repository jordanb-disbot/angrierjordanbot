import type { OnboardingRepository } from './repository.js';
import type { MemberPresence, PunishmentState, RoleSnapshot, SelfRoleCategory, SelfRolePanelDefinition, SelfRoleSelection } from './types.js';

interface RowPresence {guildId:string;userId:string;needsRulesAck:boolean;rulesAcknowledgedAt:Date|null;joinedAt:Date|null;leftAt:Date|null;nickname:string|null;pendingRoleRestore:boolean;roleSnapshotCapturedAt:Date|null;}
interface RowSelection {guildId:string;userId:string;roleId:string;categoryKey:string;active:boolean;selectedAt:Date;archivedAt:Date|null;}
interface RowSnapshot {guildId:string;userId:string;roleId:string;kind:string;expiresAt:Date|null;capturedAt:Date;metadata:unknown;}
interface RowJail {id:string;type:string;reason:string;endsAt:Date;indefinite:boolean;pausedAt:Date|null;pausedRemainingSeconds:number|null;}
interface RowPanel {id:string;guildId:string;name:string;enabled:boolean;config:unknown;}

interface TxLike {
  member:{upsert(args:unknown):Promise<unknown>};
  memberPresenceState:{findUnique(args:unknown):Promise<RowPresence|null>;upsert(args:unknown):Promise<RowPresence>;update(args:unknown):Promise<RowPresence>};
  memberRoleSnapshot:{deleteMany(args:unknown):Promise<unknown>;createMany(args:unknown):Promise<unknown>;findMany(args:unknown):Promise<RowSnapshot[]>};
  jailSentence:{findMany(args:unknown):Promise<RowJail[]>;update(args:unknown):Promise<RowJail>};
  selfRolePanel:{findFirst(args:unknown):Promise<RowPanel|null>};
  selfRoleSelection:{findMany(args:unknown):Promise<RowSelection[]>;deleteMany(args:unknown):Promise<unknown>;upsert(args:unknown):Promise<RowSelection>};
  roleSelectionCard:{findUnique(args:unknown):Promise<{channelId:string;messageId:string}|null>;upsert(args:unknown):Promise<unknown>};
}
export interface OnboardingPrismaLike extends TxLike {$transaction<T>(fn:(tx:TxLike)=>Promise<T>):Promise<T>;}

const presence=(r:RowPresence):MemberPresence=>({guildId:r.guildId,userId:r.userId,needsRulesAck:r.needsRulesAck,pendingRoleRestore:r.pendingRoleRestore,
  ...(r.rulesAcknowledgedAt?{rulesAcknowledgedAt:r.rulesAcknowledgedAt}:{}),...(r.joinedAt?{joinedAt:r.joinedAt}:{}),...(r.leftAt?{leftAt:r.leftAt}:{}),...(r.nickname?{nickname:r.nickname}:{}),...(r.roleSnapshotCapturedAt?{roleSnapshotCapturedAt:r.roleSnapshotCapturedAt}:{})});
const selection=(r:RowSelection):SelfRoleSelection=>({guildId:r.guildId,userId:r.userId,roleId:r.roleId,categoryKey:r.categoryKey,active:r.active,selectedAt:r.selectedAt,...(r.archivedAt?{archivedAt:r.archivedAt}:{})});
const jail=(r:RowJail):PunishmentState=>({id:r.id,kind:r.type,reason:r.reason,endsAt:r.endsAt,...(r.indefinite?{indefinite:true}:{}),...(r.pausedAt?{pausedAt:r.pausedAt}:{}),...(r.pausedRemainingSeconds===null?{}:{pausedRemainingSeconds:r.pausedRemainingSeconds})});

const parsePanel=(row:RowPanel):SelfRolePanelDefinition=>{
  const raw=(row.config&&typeof row.config==='object'?row.config:{}) as {categories?:unknown};
  const categories:Array<SelfRoleCategory>=Array.isArray(raw.categories)?raw.categories.flatMap((value):SelfRoleCategory[]=>{
    if(!value||typeof value!=='object')return [];
    const c=value as Record<string,unknown>;
    const key=typeof c.key==='string'?c.key:(typeof c.label==='string'?c.label.toLowerCase().replace(/[^a-z0-9]+/g,'_'):'');
    const label=typeof c.label==='string'?c.label:key;
    const mode=c.mode==='single'?'single':'multi';
    const options=Array.isArray(c.options)?c.options.flatMap((v)=>{
      if(!v||typeof v!=='object')return [];
      const o=v as Record<string,unknown>;if(typeof o.roleId!=='string'||typeof o.label!=='string')return [];
      return [{roleId:o.roleId,label:o.label,...(typeof o.emoji==='string'?{emoji:o.emoji}:{}),enabled:o.enabled!==false,archived:o.archived===true}];
    }):[];
    return key?[{key,label,mode,options}]:[];
  }):[];
  return {id:row.id,guildId:row.guildId,name:row.name,enabled:row.enabled,categories};
};

export class PrismaOnboardingRepository implements OnboardingRepository {
  constructor(private readonly db:OnboardingPrismaLike){}
  async ensureMember(guildId:string,userId:string):Promise<void>{await this.db.member.upsert({where:{guildId_userId:{guildId,userId}},update:{},create:{guildId,userId}});}
  async getPresence(guildId:string,userId:string){const row=await this.db.memberPresenceState.findUnique({where:{guildId_userId:{guildId,userId}}});return row?presence(row):null;}
  async markJoined(guildId:string,userId:string,now:Date){const row=await this.db.memberPresenceState.upsert({where:{guildId_userId:{guildId,userId}},create:{guildId,userId,needsRulesAck:true,joinedAt:now},update:{needsRulesAck:true,joinedAt:now,leftAt:null}});return presence(row);}
  async markLeft(input:{guildId:string;userId:string;nickname?:string;now:Date}){const data={leftAt:input.now,pendingRoleRestore:true,...(input.nickname===undefined?{}:{nickname:input.nickname})};const row=await this.db.memberPresenceState.upsert({where:{guildId_userId:{guildId:input.guildId,userId:input.userId}},create:{guildId:input.guildId,userId:input.userId,needsRulesAck:true,...data},update:data});return presence(row);}
  async acknowledgeRules(guildId:string,userId:string,now:Date){const row=await this.db.memberPresenceState.upsert({where:{guildId_userId:{guildId,userId}},create:{guildId,userId,needsRulesAck:false,rulesAcknowledgedAt:now,joinedAt:now},update:{needsRulesAck:false,rulesAcknowledgedAt:now}});return presence(row);}
  async setRoleSnapshots(guildId:string,userId:string,roles:readonly RoleSnapshot[],now:Date){await this.db.$transaction(async tx=>{await tx.memberRoleSnapshot.deleteMany({where:{guildId,userId}});if(roles.length)await tx.memberRoleSnapshot.createMany({data:roles.map(r=>({guildId,userId,roleId:r.roleId,kind:r.kind,expiresAt:r.expiresAt??null,capturedAt:now,metadata:r.metadata??null}))});await tx.memberPresenceState.upsert({where:{guildId_userId:{guildId,userId}},create:{guildId,userId,needsRulesAck:true,pendingRoleRestore:true,roleSnapshotCapturedAt:now},update:{pendingRoleRestore:true,roleSnapshotCapturedAt:now}});});}
  async listRoleSnapshots(guildId:string,userId:string){const rows=await this.db.memberRoleSnapshot.findMany({where:{guildId,userId},orderBy:{capturedAt:'asc'}});return rows.map(r=>({roleId:r.roleId,kind:r.kind as RoleSnapshot['kind'],...(r.expiresAt?{expiresAt:r.expiresAt}:{}),...(r.metadata&&typeof r.metadata==='object'?{metadata:r.metadata as Record<string,unknown>}:{})}));}
  async markRoleRestoreComplete(guildId:string,userId:string){await this.db.memberPresenceState.update({where:{guildId_userId:{guildId,userId}},data:{pendingRoleRestore:false}});}
  async pauseActivePunishments(guildId:string,userId:string,now:Date){const rows=await this.db.jailSentence.findMany({where:{guildId,userId,active:true,pausedAt:null,OR:[{indefinite:true},{endsAt:{gt:now}}]}});const out:PunishmentState[]=[];for(const row of rows){const remaining=row.indefinite?null:Math.max(1,Math.ceil((row.endsAt.getTime()-now.getTime())/1000));const updated=await this.db.jailSentence.update({where:{id:row.id},data:{pausedAt:now,pausedRemainingSeconds:remaining}});out.push(jail(updated));}return out;}
  async resumePausedPunishments(guildId:string,userId:string,now:Date){const rows=await this.db.jailSentence.findMany({where:{guildId,userId,active:true,pausedAt:{not:null}}});const out:PunishmentState[]=[];for(const row of rows){const remaining=row.pausedRemainingSeconds??0;const updated=await this.db.jailSentence.update({where:{id:row.id},data:{...(row.indefinite?{}:{endsAt:new Date(now.getTime()+remaining*1000)}),pausedAt:null,pausedRemainingSeconds:null}});out.push(jail(updated));}return out;}
  async listActivePunishments(guildId:string,userId:string,now:Date){const rows=await this.db.jailSentence.findMany({where:{guildId,userId,active:true,OR:[{indefinite:true},{pausedAt:{not:null}},{endsAt:{gt:now}}]}});return rows.map(jail);}
  async getSelfRolePanel(guildId:string){const row=await this.db.selfRolePanel.findFirst({where:{guildId,enabled:true},orderBy:{createdAt:'asc'}});return row?parsePanel(row):null;}
  async listSelfRoleSelections(guildId:string,userId:string){const rows=await this.db.selfRoleSelection.findMany({where:{guildId,userId},orderBy:{selectedAt:'asc'}});return rows.map(selection);}
  async replaceSelfRoleCategorySelections(input:{guildId:string;userId:string;categoryKey:string;roleIds:readonly string[];now:Date}){return this.db.$transaction(async tx=>{await tx.selfRoleSelection.deleteMany({where:{guildId:input.guildId,userId:input.userId,categoryKey:input.categoryKey,active:true}});const out:SelfRoleSelection[]=[];for(const roleId of input.roleIds){const row=await tx.selfRoleSelection.upsert({where:{guildId_userId_roleId:{guildId:input.guildId,userId:input.userId,roleId}},create:{guildId:input.guildId,userId:input.userId,roleId,categoryKey:input.categoryKey,active:true,selectedAt:input.now,archivedAt:null},update:{categoryKey:input.categoryKey,active:true,selectedAt:input.now,archivedAt:null}});out.push(selection(row));}return out;});}
  async getRoleSelectionCard(guildId:string,userId:string){return this.db.roleSelectionCard.findUnique({where:{guildId_userId:{guildId,userId}}});}
  async saveRoleSelectionCard(input:{guildId:string;userId:string;channelId:string;messageId:string}){await this.db.roleSelectionCard.upsert({where:{guildId_userId:{guildId:input.guildId,userId:input.userId}},create:input,update:{channelId:input.channelId,messageId:input.messageId}});}
}
