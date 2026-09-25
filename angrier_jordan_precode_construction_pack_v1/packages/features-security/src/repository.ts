import type {BehaviorEventRecord,SecurityEventRecord,SecurityStateRecord,VerificationStateRecord,VerificationStatus} from './types.js';
export interface SecurityRepository {
  createBehaviorEvent(input:{guildId:string;userId:string;category:string;weight:number;expiresAt?:Date;sourceCaseId?:number;now:Date}):Promise<BehaviorEventRecord>;
  listBehaviorEvents(guildId:string,userId:string,since:Date):Promise<BehaviorEventRecord[]>;
  upsertVerification(input:{guildId:string;userId:string;status:VerificationStatus;reason?:string;now:Date}):Promise<VerificationStateRecord>;
  getVerification(guildId:string,userId:string):Promise<VerificationStateRecord|null>;
  upsertSecurityState(input:{guildId:string;mode:SecurityStateRecord['mode'];reason?:string;source:string;updatedBy?:string;panicActive:boolean;snapshot?:Record<string,unknown>;expiresAt?:Date;now:Date}):Promise<SecurityStateRecord>;
  getSecurityState(guildId:string):Promise<SecurityStateRecord|null>;
  createSecurityEvent(input:{guildId:string;userId?:string;actorUserId?:string;kind:string;severity:number;metadata?:Record<string,unknown>;now:Date}):Promise<SecurityEventRecord>;
  listSecurityEvents(guildId:string,since:Date,kind?:string,actorUserId?:string):Promise<SecurityEventRecord[]>;
  upsertSecurityExpiryJob(input:{guildId:string;dueAt:Date;mode:SecurityStateRecord['mode']}):Promise<void>;
  cancelSecurityExpiryJob(guildId:string):Promise<void>;
}
