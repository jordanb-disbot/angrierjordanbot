import type { OnboardingRepository } from './repository.js';
import type { MemberPresence, PunishmentState, RoleSnapshot, SelfRolePanelDefinition, SelfRoleSelection } from './types.js';

const key=(g:string,u:string)=>`${g}:${u}`;
const clonePresence=(x:MemberPresence):MemberPresence=>({...x});
const cloneRole=(x:RoleSnapshot):RoleSnapshot=>({...x,...(x.expiresAt?{expiresAt:new Date(x.expiresAt)}:{}),...(x.metadata?{metadata:{...x.metadata}}:{})});
export class InMemoryOnboardingRepository implements OnboardingRepository {
  readonly members=new Set<string>();
  readonly presences=new Map<string,MemberPresence>();
  readonly snapshots=new Map<string,RoleSnapshot[]>();
  readonly punishments=new Map<string,PunishmentState[]>();
  readonly selections=new Map<string,SelfRoleSelection[]>();
  panel:SelfRolePanelDefinition|null=null;
  async ensureMember(g:string,u:string){this.members.add(key(g,u));if(!this.presences.has(key(g,u)))this.presences.set(key(g,u),{guildId:g,userId:u,needsRulesAck:true,pendingRoleRestore:false});}
  async getPresence(g:string,u:string){const x=this.presences.get(key(g,u));return x?clonePresence(x):null;}
  async markJoined(g:string,u:string,now:Date){await this.ensureMember(g,u);const p=this.presences.get(key(g,u))!;Object.assign(p,{needsRulesAck:true,joinedAt:now});return clonePresence(p);}
  async markLeft(input:{guildId:string;userId:string;nickname?:string;now:Date}){await this.ensureMember(input.guildId,input.userId);const p=this.presences.get(key(input.guildId,input.userId))!;p.leftAt=input.now;p.pendingRoleRestore=true;if(input.nickname!==undefined)p.nickname=input.nickname;return clonePresence(p);}
  async acknowledgeRules(g:string,u:string,now:Date){await this.ensureMember(g,u);const p=this.presences.get(key(g,u))!;p.needsRulesAck=false;p.rulesAcknowledgedAt=now;return clonePresence(p);}
  async setRoleSnapshots(g:string,u:string,roles:readonly RoleSnapshot[],now:Date){this.snapshots.set(key(g,u),roles.map(cloneRole));const p=this.presences.get(key(g,u));if(p)p.roleSnapshotCapturedAt=now;}
  async listRoleSnapshots(g:string,u:string){return (this.snapshots.get(key(g,u))??[]).map(cloneRole);}
  async markRoleRestoreComplete(g:string,u:string){const p=this.presences.get(key(g,u));if(p)p.pendingRoleRestore=false;}
  async pauseActivePunishments(g:string,u:string,now:Date){const list=this.punishments.get(key(g,u))??[];const out=[] as PunishmentState[];for(const p of list){if((p.indefinite||p.endsAt.getTime()>now.getTime())&&!p.pausedAt){if(!p.indefinite)p.pausedRemainingSeconds=Math.max(0,Math.ceil((p.endsAt.getTime()-now.getTime())/1000));p.pausedAt=now;out.push({...p});}}return out;}
  async resumePausedPunishments(g:string,u:string,now:Date){const list=this.punishments.get(key(g,u))??[];const out=[] as PunishmentState[];for(const p of list){if(p.pausedAt){if(!p.indefinite&&p.pausedRemainingSeconds!==undefined&&p.pausedRemainingSeconds>0)p.endsAt=new Date(now.getTime()+p.pausedRemainingSeconds*1000);delete p.pausedAt;delete p.pausedRemainingSeconds;out.push({...p});}}return out;}
  async listActivePunishments(g:string,u:string,now:Date){return (this.punishments.get(key(g,u))??[]).filter(p=>p.indefinite||(p.pausedAt!==undefined)||(p.endsAt.getTime()>now.getTime())).map(p=>({...p}));}
  async getSelfRolePanel(g:string){return this.panel?.guildId===g?structuredClone(this.panel):null;}
  async listSelfRoleSelections(g:string,u:string){return (this.selections.get(key(g,u))??[]).map(x=>({...x}));}
  async replaceSelfRoleCategorySelections(input:{guildId:string;userId:string;categoryKey:string;roleIds:readonly string[];now:Date}){const k=key(input.guildId,input.userId);const existing=this.selections.get(k)??[];const keep=existing.filter(x=>x.categoryKey!==input.categoryKey);const next=input.roleIds.map(roleId=>({guildId:input.guildId,userId:input.userId,roleId,categoryKey:input.categoryKey,active:true,selectedAt:input.now}));this.selections.set(k,[...keep,...next]);return next.map(x=>({...x}));}
}
