import type { MemberPresence, PunishmentState, RoleSnapshot, SelfRolePanelDefinition, SelfRoleSelection } from './types.js';

export interface OnboardingRepository {
  ensureMember(guildId:string,userId:string):Promise<void>;
  getPresence(guildId:string,userId:string):Promise<MemberPresence|null>;
  markJoined(guildId:string,userId:string,now:Date):Promise<MemberPresence>;
  markLeft(input:{guildId:string;userId:string;nickname?:string;now:Date}):Promise<MemberPresence>;
  acknowledgeRules(guildId:string,userId:string,now:Date):Promise<MemberPresence>;
  setRoleSnapshots(guildId:string,userId:string,roles:readonly RoleSnapshot[],now:Date):Promise<void>;
  listRoleSnapshots(guildId:string,userId:string):Promise<RoleSnapshot[]>;
  markRoleRestoreComplete(guildId:string,userId:string):Promise<void>;
  pauseActivePunishments(guildId:string,userId:string,now:Date):Promise<PunishmentState[]>;
  resumePausedPunishments(guildId:string,userId:string,now:Date):Promise<PunishmentState[]>;
  listActivePunishments(guildId:string,userId:string,now:Date):Promise<PunishmentState[]>;
  getSelfRolePanel(guildId:string):Promise<SelfRolePanelDefinition|null>;
  listSelfRoleSelections(guildId:string,userId:string):Promise<SelfRoleSelection[]>;
  replaceSelfRoleCategorySelections(input:{guildId:string;userId:string;categoryKey:string;roleIds:readonly string[];now:Date}):Promise<SelfRoleSelection[]>;
  getRoleSelectionCard(guildId:string,userId:string):Promise<{channelId:string;messageId:string}|null>;
  saveRoleSelectionCard(input:{guildId:string;userId:string;channelId:string;messageId:string}):Promise<void>;
}
