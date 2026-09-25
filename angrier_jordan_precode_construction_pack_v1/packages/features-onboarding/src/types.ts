export type RoleSnapshotKind='SELF'|'MANUAL'|'STAFF'|'TEMPORARY'|'BOOSTER'|'SYSTEM';

export interface RoleSnapshot {
  roleId:string;
  kind:RoleSnapshotKind;
  expiresAt?:Date;
  metadata?:Record<string,unknown>;
}

export interface MemberPresence {
  guildId:string;
  userId:string;
  needsRulesAck:boolean;
  rulesAcknowledgedAt?:Date;
  joinedAt?:Date;
  leftAt?:Date;
  nickname?:string;
  pendingRoleRestore:boolean;
  roleSnapshotCapturedAt?:Date;
}

export interface PunishmentState {
  id:string;
  kind:'CRIME'|'MODERATION'|string;
  reason:string;
  endsAt:Date;
  indefinite?:boolean;
  pausedAt?:Date;
  pausedRemainingSeconds?:number;
}

export interface SelfRoleOption {
  roleId:string;
  label:string;
  emoji?:string;
  enabled:boolean;
  archived?:boolean;
}

export interface SelfRoleCategory {
  key:string;
  label:string;
  mode:'single'|'multi';
  options:SelfRoleOption[];
}

export interface SelfRolePanelDefinition {
  id:string;
  guildId:string;
  name:string;
  enabled:boolean;
  categories:SelfRoleCategory[];
}

export interface SelfRoleSelection {
  guildId:string;
  userId:string;
  roleId:string;
  categoryKey:string;
  active:boolean;
  selectedAt:Date;
  archivedAt?:Date;
}

export interface RestorePlan {
  guildId:string;
  userId:string;
  grantMemberAccess:boolean;
  applyJailedRole:boolean;
  /** Crime confines bot commands, independently of moderation channel/role restrictions. */
  crimeCommandRestricted:boolean;
  rolesToRestore:RoleSnapshot[];
  nickname?:string;
  punishmentIds:string[];
  deferredBecausePunished:boolean;
}

export interface RoleSelectionDelta {
  categoryKey:string;
  addRoleIds:string[];
  removeRoleIds:string[];
  selectedRoleIds:string[];
}
