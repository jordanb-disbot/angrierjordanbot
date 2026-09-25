export type JailKind='CRIME'|'MODERATION';

export interface JailRestorationState {
  suspendedRoleIds:string[];
}

export interface JailSentenceRecord {
  id:string;
  guildId:string;
  userId:string;
  type:JailKind;
  caseId?:number;
  reason:string;
  startedAt:Date;
  endsAt:Date;
  endedAt?:Date;
  active:boolean;
  indefinite:boolean;
  restoration:JailRestorationState;
  pausedAt?:Date;
  pausedRemainingSeconds?:number;
  releaseReason?:string;
  releasedByUserId?:string;
}

export interface JailCaseRecord {
  id:number;
  guildId:string;
  subjectUserId?:string;
  actionType:string;
  reason:string;
  actorUserId?:string;
  actorType:string;
  durationSeconds?:number;
  status:string;
  metadata?:Record<string,unknown>;
  createdAt:Date;
}

export interface JailHistoryEntry {
  sentence:JailSentenceRecord;
  cases:JailCaseRecord[];
}

export interface ParsedJailDuration {
  indefinite:boolean;
  seconds?:number;
  label:string;
}

export interface JailSendResult {sentence:JailSentenceRecord;caseRecord:JailCaseRecord;}
export interface JailChangeResult {sentence:JailSentenceRecord;caseRecord:JailCaseRecord;released:boolean;}
export interface JailReleaseResult {sentence:JailSentenceRecord;caseRecord:JailCaseRecord;}
