import type {MusicTransportFence} from '../../../../packages/features-music/src/interfaces.js';
import {musicTrace} from './music-diagnostics.js';

export const LAVALINK_MESSAGE_MAX_BYTES=131072;
export const LAVALINK_MESSAGE_MAX_DEPTH=32;
export type LavalinkEndReason='finished'|'loadFailed'|'stopped'|'replaced'|'cleanup';
export interface LavalinkTrackCorrelation {guildId:string;entryId:string;generation:number;}
export type LavalinkEvent=
 |{kind:'ready';resumed:boolean}
 |{kind:'playerUpdate';guildId:string;positionMs:number;at:number;connected:boolean}
 |({kind:'trackStart'}&LavalinkTrackCorrelation)
 |({kind:'trackEnd';reason:LavalinkEndReason}&LavalinkTrackCorrelation)
 |({kind:'trackException';error:'PLAYABLE_SOURCE_FAILED'}&LavalinkTrackCorrelation);
export interface LavalinkReady {sessionId:string;resumed:boolean;}
export interface MusicEventFence extends MusicTransportFence {entryId:string|null;}
/** Captured from a correlated TrackStart frame on this socket, never a REST acceptance. */
export interface LavalinkPlayerBinding extends LavalinkTrackCorrelation {socketEpoch:string;startSequence:number;}
export interface LavalinkEventContext {
 /** Captured when the handler begins; current must be freshly read from persistence. */
 expected:MusicEventFence;current:MusicEventFence;
 /** Driver-local nonce and monotonic receive counter, captured before async processing. */
 sourceSocketEpoch:string;activeSocketEpoch:string;sourceSequence:number;
 playerBinding?:LavalinkPlayerBinding;
 lastObservedAt?:number;
}
type FencedCorrelation=LavalinkTrackCorrelation&{expectedRevision:number};
export type LavalinkProjection=
 |({kind:'trackStart';binding:LavalinkPlayerBinding}&FencedCorrelation)
 |({kind:'trackEnd';reason:LavalinkEndReason;finishReason:'ended'|'failed'|null}&FencedCorrelation)
 |({kind:'trackException';error:'PLAYABLE_SOURCE_FAILED'}&FencedCorrelation)
 |({kind:'playerUpdate';positionMs:number;at:number;connected:boolean}&FencedCorrelation);

const object=(value:unknown):Record<string,unknown>|null=>typeof value==='object'&&value!==null&&!Array.isArray(value)?value as Record<string,unknown>:null;
const integer=(value:unknown,max=Number.MAX_SAFE_INTEGER):value is number=>typeof value==='number'&&Number.isSafeInteger(value)&&value>=0&&value<=max;
const snowflake=(value:unknown):value is string=>typeof value==='string'&&/^[1-9]\d{16,19}$/.test(value);
const identifier=(value:unknown,max=100):value is string=>typeof value==='string'&&value.length<=max&&/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(value);
const endReason=(value:unknown):value is LavalinkEndReason=>typeof value==='string'&&['finished','loadFailed','stopped','replaced','cleanup'].includes(value);
const validFence=(fence:MusicEventFence)=>snowflake(fence.guildId)&&integer(fence.revision)&&integer(fence.generation)&&(fence.entryId===null||identifier(fence.entryId));

/** Limit before JSON.parse; quoted braces and escaped quotes cannot defeat the depth cap. */
function decode(raw:string|Uint8Array):Record<string,unknown>|null {
 let input:string;
 try{
  if(typeof raw==='string'){if(raw.length>LAVALINK_MESSAGE_MAX_BYTES||new TextEncoder().encode(raw).byteLength>LAVALINK_MESSAGE_MAX_BYTES)return null;input=raw;}
  else if(raw instanceof Uint8Array){if(raw.byteLength>LAVALINK_MESSAGE_MAX_BYTES)return null;input=new TextDecoder('utf-8',{fatal:true}).decode(raw);}
  else return null;
  let depth=0,quoted=false,escaped=false;
  for(const ch of input){if(quoted){if(escaped)escaped=false;else if(ch==='\\')escaped=true;else if(ch==='"')quoted=false;}else if(ch==='"')quoted=true;else if(ch==='{'||ch==='['){if(++depth>LAVALINK_MESSAGE_MAX_DEPTH)return null;}else if(ch==='}'||ch===']'){if(--depth<0)return null;}}
  if(depth!==0||quoted)return null;return object(JSON.parse(input));
 }catch{return null;}
}

/**
 * Only the authenticated operator-node socket may feed this parser. Never log raw frames.
 * Session IDs go solely to the internal ready callback, not the returned safe projection.
 * Stats, unsupported event types, malformed frames and uncorrelated tracks are ignored.
 * Callback failures are contained so an exception cannot disclose ready credentials.
 */
export function parseLavalinkMessage(raw:string|Uint8Array,onReady?:(ready:Readonly<LavalinkReady>)=>void):LavalinkEvent|null {
 const message=decode(raw);if(!message)return null;
 if(message.op==='ready'){
  if(typeof message.resumed!=='boolean'||typeof message.sessionId!=='string'||message.sessionId.length>128||!/^[A-Za-z0-9_-]+$/.test(message.sessionId))return null;
  try{onReady?.(Object.freeze({sessionId:message.sessionId,resumed:message.resumed}));}catch{return null;}
  return Object.freeze({kind:'ready',resumed:message.resumed});
 }
 if(message.op==='stats')return null;
 if(!snowflake(message.guildId))return null;
 if(message.op==='playerUpdate'){
  const state=object(message.state);if(!state||!integer(state.position,604800000)||!integer(state.time,8640000000000000)||typeof state.connected!=='boolean')return null;
  return Object.freeze({kind:'playerUpdate',guildId:message.guildId,positionMs:state.position,at:state.time,connected:state.connected});
 }
 if(message.op!=='event'||typeof message.type!=='string')return null;
 // Diagnostic-only events: never turn an unbound voice close or a stuck report
 // into playback state, and never forward provider reasons, exceptions or tracks.
 if(message.type==='WebSocketClosedEvent'){
  if(integer(message.code,65535)&&typeof message.byRemote==='boolean')musicTrace('voice.socket.closed',{guildId:message.guildId});
  return null;
 }
 if(!['TrackStartEvent','TrackEndEvent','TrackExceptionEvent','TrackStuckEvent'].includes(message.type))return null;
 const track=object(message.track),userData=object(track?.userData),correlation=object(userData?.ajMusic);
 if(!correlation||!identifier(correlation.entryId)||!integer(correlation.generation))return null;
 const base={guildId:message.guildId,entryId:correlation.entryId,generation:correlation.generation};
 if(message.type==='TrackStuckEvent'){
  if(integer(message.thresholdMs,604800000))musicTrace('playback.stuck',{guildId:message.guildId});
  return null;
 }
 if(message.type==='TrackStartEvent')return Object.freeze({kind:'trackStart',...base});
 if(message.type==='TrackEndEvent')return endReason(message.reason)?Object.freeze({kind:'trackEnd',...base,reason:message.reason}):null;
 if(!object(message.exception))return null;
 return Object.freeze({kind:'trackException',...base,error:'PLAYABLE_SOURCE_FAILED'});
}

/**
 * Pure proposals, NOT repository mutations. The caller must atomically recheck the returned
 * expectedRevision + guild/entry/generation before applying, and retain idempotent receipts.
 * Process frames in socket receive order; retire old socket epochs on disconnect/reconnect.
 * Queue-only revisions do not invalidate a track's userData generation, but a handler must
 * retry its projection with a fresh persisted snapshot if expected/current revisions differ.
 * playerUpdate has no track identity or pause state: require the confirmed start binding;
 * connected=true never establishes PLAYING/PAUSED and cannot manufacture playback history.
 */
export function projectLavalinkEvent(event:LavalinkEvent,context:LavalinkEventContext):LavalinkProjection|null {
 const {expected,current}=context;
 if(!validFence(expected)||!validFence(current)||!identifier(context.sourceSocketEpoch,128)||context.sourceSocketEpoch!==context.activeSocketEpoch||!integer(context.sourceSequence))return null;
 if(expected.guildId!==current.guildId||expected.revision!==current.revision||expected.generation!==current.generation||expected.entryId!==current.entryId||!current.entryId||event.kind==='ready'||event.guildId!==current.guildId)return null;
 const base={guildId:current.guildId,entryId:current.entryId,generation:current.generation,expectedRevision:current.revision};
 if(event.kind==='playerUpdate'){
  const binding=context.playerBinding;
  if(!binding||binding.guildId!==current.guildId||binding.entryId!==current.entryId||binding.generation!==current.generation||binding.socketEpoch!==context.sourceSocketEpoch||!integer(binding.startSequence)||binding.startSequence>=context.sourceSequence)return null;
  if(!integer(event.positionMs,604800000)||!integer(event.at,8640000000000000)||typeof event.connected!=='boolean'||context.lastObservedAt!==undefined&&(!integer(context.lastObservedAt,8640000000000000)||event.at<context.lastObservedAt))return null;
  return Object.freeze({kind:'playerUpdate',...base,positionMs:event.positionMs,at:event.at,connected:event.connected});
 }
 if(event.entryId!==current.entryId||event.generation!==current.generation)return null;
 if(event.kind==='trackStart')return Object.freeze({kind:'trackStart',...base,binding:Object.freeze({guildId:current.guildId,entryId:current.entryId,generation:current.generation,socketEpoch:context.sourceSocketEpoch,startSequence:context.sourceSequence})});
 if(event.kind==='trackEnd')return endReason(event.reason)?Object.freeze({kind:'trackEnd',...base,reason:event.reason,finishReason:event.reason==='finished'?'ended':event.reason==='loadFailed'?'failed':null}):null;
 if(event.kind==='trackException')return Object.freeze({kind:'trackException',...base,error:'PLAYABLE_SOURCE_FAILED'});
 return null;
}
