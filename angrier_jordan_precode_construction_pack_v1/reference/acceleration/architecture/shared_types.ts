export type Snowflake = string;
export type RoleKey = 'member'|'recliner'|'chaise_lounge'|'throne';
export type SessionState = 'DRAFT'|'OPEN'|'LOCKED'|'SETTLING'|'CLOSED'|'CANCELLED';
export type EscrowState = 'RESERVED'|'SETTLED'|'REFUNDED'|'FORFEITED';
export type AuditSource = 'discord'|'dashboard'|'scheduler'|'migration'|'system';

export interface CommandOptionDef { name:string; type:string; required:boolean; description:string; choices?:string[]; min?:number; max?:number; }
export interface CommandDef { id:string; command:string; type:'slash'|'legacy_text'|'special_text'|'context'; module:string; permissions:RoleKey[]; channels:string[]; options:CommandOptionDef[]; handler:string; feature_flag:string; help_id:string; tutorial_id?:string|null; }
export interface SettingDef<T=unknown> { key:string; section:string; type:string; default:T; editable_by:RoleKey[]; min?:number; max?:number; choices?:string[]; restart_required:boolean; risk:string; }
export interface SessionRecord { id:string; type:string; guildId:Snowflake; channelId:Snowflake; messageId?:Snowflake; ownerId?:Snowflake; state:SessionState; data:unknown; expiresAt?:Date; version:number; }
export interface AuditEvent { id:string; guildId:Snowflake; actorId?:Snowflake; source:AuditSource; action:string; targetType?:string; targetId?:string; before?:unknown; after?:unknown; reason?:string; requestId:string; createdAt:Date; }
