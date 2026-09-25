import type { AuditService, Clock } from '../../core/src/index.js';
import { DomainError } from '../../core/src/index.js';
import type { OnboardingRepository } from './repository.js';
import type { RestorePlan, RoleSelectionDelta, RoleSnapshot, SelfRolePanelDefinition, SelfRoleSelection } from './types.js';

const allowedRestore=(role:RoleSnapshot,now:Date)=>{
  if(role.kind==='STAFF'||role.kind==='BOOSTER'||role.kind==='SYSTEM')return false;
  if(role.kind==='TEMPORARY'&&role.expiresAt&&role.expiresAt.getTime()<=now.getTime())return false;
  return true;
};

export class OnboardingService {
  constructor(private readonly repository:OnboardingRepository,private readonly audit:AuditService,private readonly clock:Clock){}

  async memberJoined(guildId:string,userId:string):Promise<{needsRulesAck:true}> {
    await this.repository.ensureMember(guildId,userId);
    const now=this.clock.now();
    await this.repository.markJoined(guildId,userId,now);
    await this.audit.record({guildId,actorUserId:userId,source:'discord',action:'member.rejoin_gate',targetType:'member',targetId:userId,after:{needsRulesAck:true},requestId:`join:${guildId}:${userId}:${now.getTime()}`,createdAt:now});
    return {needsRulesAck:true};
  }

  async memberLeft(input:{guildId:string;userId:string;nickname?:string;roles:readonly RoleSnapshot[]}):Promise<{pausedPunishmentIds:string[]}> {
    await this.repository.ensureMember(input.guildId,input.userId);
    const now=this.clock.now();
    await this.repository.setRoleSnapshots(input.guildId,input.userId,input.roles,now);
    await this.repository.markLeft({guildId:input.guildId,userId:input.userId,...(input.nickname===undefined?{}:{nickname:input.nickname}),now});
    const paused=await this.repository.pauseActivePunishments(input.guildId,input.userId,now);
    await this.audit.record({guildId:input.guildId,actorUserId:input.userId,source:'discord',action:'member.leave_snapshot',targetType:'member',targetId:input.userId,after:{roleCount:input.roles.length,pausedPunishmentIds:paused.map(x=>x.id)},requestId:`leave:${input.guildId}:${input.userId}:${now.getTime()}`,createdAt:now});
    return {pausedPunishmentIds:paused.map(x=>x.id)};
  }

  async acknowledgeRules(guildId:string,userId:string):Promise<RestorePlan>{
    await this.repository.ensureMember(guildId,userId);
    const now=this.clock.now();
    await this.repository.acknowledgeRules(guildId,userId,now);
    const resumed=await this.repository.resumePausedPunishments(guildId,userId,now);
    const active=await this.repository.listActivePunishments(guildId,userId,now);
    const punished=active.some(p=>p.kind==='MODERATION');
    const presence=await this.repository.getPresence(guildId,userId);
    const snapshots=await this.repository.listRoleSnapshots(guildId,userId);
    const rolesToRestore=punished?[]:snapshots.filter(role=>allowedRestore(role,now));
    const plan:RestorePlan={
      guildId,userId,grantMemberAccess:!punished,applyJailedRole:punished,crimeCommandRestricted:active.some(p=>p.kind==='CRIME'),rolesToRestore,
      ...(presence?.nickname?{nickname:presence.nickname}:{}),punishmentIds:active.map(x=>x.id),deferredBecausePunished:punished,
    };
    await this.audit.record({guildId,actorUserId:userId,source:'discord',action:'onboarding.rules_acknowledged',targetType:'member',targetId:userId,after:{grantMemberAccess:plan.grantMemberAccess,applyJailedRole:plan.applyJailedRole,crimeCommandRestricted:plan.crimeCommandRestricted,restoreRoleCount:rolesToRestore.length,resumedPunishmentIds:resumed.map(x=>x.id)},requestId:`rules:${guildId}:${userId}:${now.getTime()}`,createdAt:now});
    return plan;
  }

  async buildPostPunishmentRestorePlan(guildId:string,userId:string):Promise<RestorePlan>{
    const now=this.clock.now();
    const active=await this.repository.listActivePunishments(guildId,userId,now);
    if(active.some(p=>p.kind==='MODERATION'))throw new DomainError('PUNISHMENT_ACTIVE','Member still has an active moderation Hotseat sentence.');
    const presence=await this.repository.getPresence(guildId,userId);
    if(!presence||presence.needsRulesAck)throw new DomainError('RULES_ACK_REQUIRED','Rules must be acknowledged before access is restored.');
    const snapshots=await this.repository.listRoleSnapshots(guildId,userId);
    return {guildId,userId,grantMemberAccess:true,applyJailedRole:false,crimeCommandRestricted:active.some(p=>p.kind==='CRIME'),rolesToRestore:snapshots.filter(role=>allowedRestore(role,now)),...(presence.nickname?{nickname:presence.nickname}:{}),punishmentIds:active.map(p=>p.id),deferredBecausePunished:false};
  }

  async completeRoleRestore(guildId:string,userId:string,input:{restoredRoleIds:readonly string[];failed:readonly {roleId:string;reason:string}[];nicknameRestored:boolean;nicknameFailure?:string}):Promise<void>{
    await this.repository.markRoleRestoreComplete(guildId,userId);
    const now=this.clock.now();
    await this.audit.record({guildId,source:'discord',action:'member.restore_complete',targetType:'member',targetId:userId,after:{restoredRoleIds:[...input.restoredRoleIds],failed:[...input.failed],nicknameRestored:input.nicknameRestored,...(input.nicknameFailure?{nicknameFailure:input.nicknameFailure}:{})},requestId:`restore:${guildId}:${userId}:${now.getTime()}`,createdAt:now});
  }

  async rolePanel(guildId:string,userId:string):Promise<{panel:SelfRolePanelDefinition;selections:SelfRoleSelection[]}>{
    await this.repository.ensureMember(guildId,userId);
    const panel=await this.repository.getSelfRolePanel(guildId);
    if(!panel||!panel.enabled)throw new DomainError('ROLE_PANEL_DISABLED','The role panel is not currently available.');
    return {panel,selections:await this.repository.listSelfRoleSelections(guildId,userId)};
  }

  async planRoleCategoryUpdate(input:{guildId:string;userId:string;categoryKey:string;selectedRoleIds:readonly string[]}):Promise<RoleSelectionDelta>{
    const {panel,selections}=await this.rolePanel(input.guildId,input.userId);
    const category=panel.categories.find(c=>c.key===input.categoryKey);
    if(!category)throw new DomainError('ROLE_CATEGORY_NOT_FOUND',`Unknown role category ${input.categoryKey}.`);
    const requested=[...new Set(input.selectedRoleIds)];
    if(category.mode==='single'&&requested.length>1)throw new DomainError('ROLE_CATEGORY_SINGLE_CHOICE',`${category.label} allows at most one selection.`);
    const allowed=new Set(category.options.filter(o=>o.enabled&&!o.archived).map(o=>o.roleId));
    for(const roleId of requested)if(!allowed.has(roleId))throw new DomainError('ROLE_OPTION_NOT_AVAILABLE',`Role ${roleId} is not selectable in ${category.label}.`);
    const before=selections.filter(s=>s.categoryKey===category.key&&s.active).map(s=>s.roleId);
    const beforeSet=new Set(before),afterSet=new Set(requested);
    return {categoryKey:category.key,addRoleIds:requested.filter(x=>!beforeSet.has(x)),removeRoleIds:before.filter(x=>!afterSet.has(x)),selectedRoleIds:requested};
  }

  async updateRoleCategory(input:{guildId:string;userId:string;categoryKey:string;selectedRoleIds:readonly string[]}):Promise<RoleSelectionDelta>{
    const now=this.clock.now();
    const plan=await this.planRoleCategoryUpdate(input);
    const before=await this.repository.listSelfRoleSelections(input.guildId,input.userId);
    const previous=before.filter(s=>s.categoryKey===plan.categoryKey&&s.active).map(s=>s.roleId);
    await this.repository.replaceSelfRoleCategorySelections({guildId:input.guildId,userId:input.userId,categoryKey:plan.categoryKey,roleIds:plan.selectedRoleIds,now});
    await this.audit.record({guildId:input.guildId,actorUserId:input.userId,source:'discord',action:'roles.selection_changed',targetType:'role_category',targetId:plan.categoryKey,before:{roleIds:previous},after:{roleIds:plan.selectedRoleIds},requestId:`roles:${input.guildId}:${input.userId}:${plan.categoryKey}:${now.getTime()}`,createdAt:now});
    return plan;
  }

  async currentRoleSnapshots(guildId:string,userId:string):Promise<RoleSnapshot[]>{return this.repository.listRoleSnapshots(guildId,userId);}
}
