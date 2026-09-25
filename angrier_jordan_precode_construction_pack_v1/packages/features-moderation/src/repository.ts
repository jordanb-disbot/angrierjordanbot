import type {AppealOutcome,AppealRecord,ChannelModerationStateRecord,ModNoteRecord,ModerationCaseEventRecord,ModerationCaseRecord,ModerationEvidenceRecord,ModerationStats,StaffAlertRecord} from './types.js';

export interface ModerationRepository {
  createPreparedCase(input:{guildId:string;subjectUserId?:string;actorUserId?:string;actorType?:'STAFF'|'SYSTEM';actionType:string;reason:string;category?:string;policyId?:string;sourceChannelId?:string;sourceMessageId?:string;durationSeconds?:number;metadata?:Record<string,unknown>;now:Date}):Promise<ModerationCaseRecord>;
  finalizeCase(input:{caseId:number;status:ModerationCaseRecord['status'];actorUserId?:string;metadata?:Record<string,unknown>;now:Date;eventKind:string;reason?:string}):Promise<ModerationCaseRecord>;
  failPreparedCase(input:{caseId:number;actorUserId?:string;reason:string;error:string;now:Date}):Promise<ModerationCaseRecord>;
  getCase(caseId:number):Promise<ModerationCaseRecord|null>;
  listCaseEvents(caseId:number):Promise<ModerationCaseEventRecord[]>;
  editCaseReason(input:{caseId:number;actorUserId:string;reason:string;now:Date}):Promise<ModerationCaseRecord>;
  reverseCase(input:{caseId:number;actorUserId:string;reason:string;now:Date;metadata?:Record<string,unknown>}):Promise<ModerationCaseRecord>;
  modifyCase(input:{caseId:number;actorUserId:string;reason:string;now:Date;durationSeconds?:number|null;metadata?:Record<string,unknown>}):Promise<ModerationCaseRecord>;
  expireCase(input:{caseId:number;reason:string;now:Date;metadata?:Record<string,unknown>}):Promise<ModerationCaseRecord|null>;
  listHistory(guildId:string,userId:string,limit:number):Promise<ModerationCaseRecord[]>;
  createNote(input:{guildId:string;subjectUserId:string;authorUserId:string;text:string;now:Date}):Promise<ModNoteRecord>;
  listNotes(guildId:string,userId:string,limit:number):Promise<ModNoteRecord[]>;
  findActiveCases(guildId:string,userId:string,actionTypes:readonly string[]):Promise<ModerationCaseRecord[]>;
  upsertExpiryJob(input:{guildId:string;caseId:number;jobType:'moderation.timeout_expire'|'moderation.temp_ban_expire';dueAt:Date;userId:string}):Promise<void>;
  cancelExpiryJobs(caseId:number):Promise<void>;
  requestReview(input:{caseId:number;userId:string;text?:string;now:Date}):Promise<{appealId:string;caseId:number;existing:boolean}>;
  getAppeal(appealId:string):Promise<AppealRecord|null>;
  listAppealsForCase(caseId:number):Promise<AppealRecord[]>;
  resolveAppeal(input:{appealId:string;reviewerUserId:string;outcome:AppealOutcome;reason:string;now:Date;caseStatus:ModerationCaseRecord['status'];caseMetadata?:Record<string,unknown>;durationSeconds?:number|null}):Promise<{appeal:AppealRecord;caseRecord:ModerationCaseRecord}>;
  createEvidence(input:{caseId:number;contentCiphertext:string;context:Record<string,unknown>;expiresAt:Date;now:Date}):Promise<ModerationEvidenceRecord>;
  listEvidence(caseId:number):Promise<ModerationEvidenceRecord[]>;
  purgeEvidenceContent(evidenceId:string,now:Date):Promise<boolean>;
  upsertEvidenceExpiryJob(input:{guildId:string;caseId:number;evidenceId:string;dueAt:Date}):Promise<void>;
  saveChannelLockState(input:{guildId:string;channelId:string;sendMessages:'allow'|'deny'|'inherit';hadOverwrite:boolean;createdBy:string;now:Date}):Promise<ChannelModerationStateRecord>;
  getActiveChannelLockState(guildId:string,channelId:string):Promise<ChannelModerationStateRecord|null>;
  clearChannelLockState(guildId:string,channelId:string,now:Date):Promise<void>;
  createStaffAlert(input:{guildId:string;subjectUserId:string;actorUserId:string;reason:string;now:Date}):Promise<StaffAlertRecord>;
  getStats(guildId:string,since?:Date):Promise<ModerationStats>;
}
