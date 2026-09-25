export type ModerationCaseStatus='OPEN'|'ACTIVE'|'EXPIRED'|'REVERSED'|'APPEALED'|'UPHELD'|'MODIFIED';
export type ModerationActionType='WARN'|'TIMEOUT'|'UNTIMEOUT'|'KICK'|'BAN'|'UNBAN'|'PURGE'|'QUARANTINE'|'CHANNEL_LOCK'|'CHANNEL_UNLOCK'|'SLOWMODE'|'CASE_EDIT'|'CASE_REVERSE'|'AUTOMOD'|'ANTI_RAID'|'ANTI_NUKE'|'PANIC';
export type AppealOutcome='UPHELD'|'MODIFIED'|'REVERSED';
export type ChannelSendState='allow'|'deny'|'inherit';

export interface ModerationCaseRecord {
  id:number;
  guildId:string;
  subjectUserId?:string;
  actionType:string;
  reason:string;
  category?:string;
  policyId?:string;
  actorUserId?:string;
  actorType:string;
  sourceChannelId?:string;
  sourceMessageId?:string;
  durationSeconds?:number;
  status:ModerationCaseStatus;
  metadata?:Record<string,unknown>;
  createdAt:Date;
  updatedAt:Date;
}

export interface ModerationCaseEventRecord {
  id:string;
  caseId:number;
  kind:string;
  actorUserId?:string;
  before?:unknown;
  after?:unknown;
  reason?:string;
  createdAt:Date;
}

export interface ModNoteRecord {
  id:string;
  guildId:string;
  subjectUserId:string;
  authorUserId:string;
  text:string;
  createdAt:Date;
}

export interface ModerationEvidenceRecord {
  id:string;
  caseId:number;
  contentCiphertext?:string;
  context?:Record<string,unknown>;
  expiresAt?:Date;
  createdAt:Date;
}

export interface AppealRecord {
  id:string;
  caseId:number;
  requesterUserId:string;
  reviewerUserId?:string;
  status:'PENDING'|AppealOutcome;
  text?:string;
  outcomeReason?:string;
  createdAt:Date;
  resolvedAt?:Date;
}

export interface StaffAlertRecord {
  id:string;
  guildId:string;
  subjectUserId:string;
  actorUserId:string;
  reason:string;
  createdAt:Date;
}

export interface ChannelModerationStateRecord {
  id:string;
  guildId:string;
  channelId:string;
  kind:'LOCK';
  active:boolean;
  snapshot:{sendMessages:ChannelSendState;hadOverwrite:boolean};
  createdBy?:string;
  createdAt:Date;
  updatedAt:Date;
}

export interface ModerationHistory {
  cases:ModerationCaseRecord[];
  notes:ModNoteRecord[];
}

export interface ModerationStats {
  since?:Date;
  totalCases:number;
  activeCases:number;
  appealedCases:number;
  quarantines:number;
  staffAlerts:number;
  actionCounts:Record<string,number>;
  statusCounts:Record<string,number>;
  appealOutcomes:Record<string,number>;
}

export interface ParsedModerationDuration {
  permanent:boolean;
  seconds?:number;
  label:string;
}

export interface CasePreparationInput {
  guildId:string;
  subjectUserId?:string;
  actorUserId?:string;
  actorType?:'STAFF'|'SYSTEM';
  actionType:ModerationActionType;
  reason:string;
  category?:string;
  policyId?:string;
  sourceChannelId?:string;
  sourceMessageId?:string;
  durationSeconds?:number;
  metadata?:Record<string,unknown>;
}
