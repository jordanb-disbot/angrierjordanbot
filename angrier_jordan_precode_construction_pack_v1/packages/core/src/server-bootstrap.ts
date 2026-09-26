import type {AuditEvent} from './audit.js';
import {invariant} from './errors.js';

export type ServerBootstrapSource='bot.startup'|'bot.guild-create'|'bot.event'|'operator.bootstrap';
export interface ServerBootstrapInput {
 guildId:string;
 /** Observed server name, used only if the server record does not exist. */
 name?:string|null;
 source:ServerBootstrapSource;
 actorUserId?:string;
 requestId?:string;
}
export interface ServerBootstrapRecord {id:string;name:string|null;createdAt:Date;}
export interface ServerBootstrapResult {created:boolean;guild:ServerBootstrapRecord;}
export interface ServerBootstrapRepository {
 /** Resolves after server creation and its audit commit together. Existing records are never updated. */
 ensure(input:ServerBootstrapInput):Promise<ServerBootstrapResult>;
}
export interface NormalizedServerBootstrapInput extends ServerBootstrapInput {name:string|null;requestId:string;}
const snowflake=(value:unknown)=>typeof value==='string'&&/^[1-9][0-9]{16,19}$/.test(value);
const sources:readonly string[]=['bot.startup','bot.guild-create','bot.event','operator.bootstrap'];

/** Bootstrap establishes referential integrity only; config defaults stay virtual and features stay unchanged. */
export function normalizeServerBootstrapInput(input:ServerBootstrapInput):NormalizedServerBootstrapInput {
 invariant(input&&typeof input==='object'&&snowflake(input.guildId),'SERVER_BOOTSTRAP_ID','A valid Discord server ID is required.');
 invariant(typeof input.source==='string'&&sources.includes(input.source),'SERVER_BOOTSTRAP_SOURCE','A supported bootstrap source is required.');
 invariant(input.actorUserId===undefined||snowflake(input.actorUserId),'SERVER_BOOTSTRAP_ACTOR','A valid Discord member ID is required.');
 invariant(input.name===undefined||input.name===null||typeof input.name==='string','SERVER_BOOTSTRAP_NAME','The server name must be text.');
 const name=input.name==null?null:input.name.trim();
 invariant(name===null||(name.length>=1&&name.length<=100&&!/[\u0000-\u001f\u007f]/.test(name)),'SERVER_BOOTSTRAP_NAME','The server name must contain 1–100 characters without control characters.');
 const requestId=input.requestId??`server-bootstrap:${input.guildId}`;
 invariant(typeof requestId==='string'&&/^[a-zA-Z0-9:._-]{1,160}$/.test(requestId),'SERVER_BOOTSTRAP_REQUEST','A bounded bootstrap request identifier is required.');
 return{guildId:input.guildId,name,source:input.source,requestId,...(input.actorUserId===undefined?{}:{actorUserId:input.actorUserId})};
}

/** Called only for an actual insertion, inside the same transaction as the server row. */
export function serverBootstrapAudit(input:NormalizedServerBootstrapInput,guild:ServerBootstrapRecord):AuditEvent {
 return{guildId:guild.id,source:input.source,action:'server.bootstrap.created',targetType:'server',targetId:guild.id,
  after:{id:guild.id,name:guild.name},requestId:input.requestId,createdAt:new Date(guild.createdAt),
  ...(input.actorUserId===undefined?{}:{actorUserId:input.actorUserId})};
}
