export type SecurityMode='NORMAL'|'ALERT'|'RESTRICTED'|'LOCKDOWN';
export type VerificationStatus='NONE'|'REQUIRED'|'VERIFIED'|'REJECTED';
export type AutoModAction='ALLOW'|'LOG'|'WARN'|'DELETE'|'QUARANTINE'|'TIMEOUT'|'REVIEW';

export interface BehaviorEventRecord {id:string;guildId:string;userId:string;category:string;weight:number;expiresAt?:Date;sourceCaseId?:number;createdAt:Date;}
export interface VerificationStateRecord {guildId:string;userId:string;status:VerificationStatus;reason?:string;updatedAt:Date;}
export interface SecurityStateRecord {guildId:string;mode:SecurityMode;reason?:string;source:string;updatedBy?:string;panicActive:boolean;snapshot?:Record<string,unknown>;expiresAt?:Date;updatedAt:Date;}
export interface SecurityEventRecord {id:string;guildId:string;userId?:string;actorUserId?:string;kind:string;severity:number;metadata?:Record<string,unknown>;createdAt:Date;}

export interface HeatPolicy {decayHours:number;warningThreshold:number;shortTimeoutThreshold:number;longTimeoutThreshold:number;reviewThreshold:number;shortTimeoutSeconds:number;longTimeoutSeconds:number;}
export interface HeatSnapshot {score:number;rawWeight:number;similarRecent:number;events:number;categories:Record<string,number>;}
export interface MessageObservation {guildId:string;userId:string;content:string;mentionCount:number;attachmentCount:number;stickerCount:number;recentMessageCount:number;recentSameCount:number;recentAttachmentCount:number;trustedDomains?:readonly string[];bannedPhrases?:readonly string[];ordinaryExempt?:boolean;}
export interface AutoModSignal {category:string;weight:number;severity:1|2|3|4;reason:string;}
export interface AutoModDecision {action:AutoModAction;reason?:string;signals:AutoModSignal[];heat?:HeatSnapshot;timeoutSeconds?:number;}

export interface JoinPolicy {enabled:boolean;verificationEnabled:boolean;minimumAccountAgeHours:number;joinVelocityPerMinute:number;restrictedModeAutoDeescalateMinutes:number;trustedBotIds?:readonly string[];}
export interface JoinObservation {guildId:string;userId:string;createdAt:Date;isBot:boolean;username:string;priorCaseCount:number;currentMode:SecurityMode;}
export interface JoinGateDecision {action:'ALLOW'|'FLAG'|'VERIFY'|'RESTRICT'|'KICK';riskScore:number;reasons:string[];recentJoinCount:number;}

export interface RaidPolicy {enabled:boolean;joinVelocityPerMinute:number;autoDeescalateMinutes:number;}
export interface RaidDecision {mode:SecurityMode;changed:boolean;reason:string;recentJoins:number;recentSeriousEvents:number;}

export interface AntiNukePolicy {enabled:boolean;eventsPerMinute:number;lockdownEventsPerMinute:number;trustedUserIds?:readonly string[];}
export interface PrivilegedObservation {guildId:string;actorUserId?:string;kind:string;targetId?:string;severity:1|2|3|4;metadata?:Record<string,unknown>;}
export interface AntiNukeDecision {action:'LOG'|'ALERT'|'CONTAIN'|'LOCKDOWN';count:number;score:number;reason:string;trusted:boolean;}
