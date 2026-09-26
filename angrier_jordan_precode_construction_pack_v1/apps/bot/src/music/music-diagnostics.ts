import {createHash} from 'node:crypto';
import {normalizeMusicReference} from '../../../../packages/features-music/src/provider-references.js';
/** Operator diagnostics never include exception messages, URLs, payloads or arbitrary codes. */
export function musicDiagnostic(error:unknown):string {
 const code=error&&typeof error==='object'&&'code' in error?error.code:undefined;
 switch(code){
  case 10003:case 10007:case 10065:case 50001:case 50013:return `DISCORD_${code}: Discord context or permissions could not be confirmed.`;
  case 'P1001':case 'P2003':case 'P2021':case 'P2022':case 'P2025':case 'P2028':return `${code}: Music persistence request failed.`;
  case 'LAVALINK_NODE_POLICY':return 'LAVALINK_NODE_POLICY: node sources/plugins do not match the reviewed configuration.';
  case 'MUSIC_VOICE_REMOVED':return 'MUSIC_VOICE_REMOVED: Discord confirmed the bot left its intended voice channel.';
  case 'MUSIC_SELECTION_CHANGED':return 'MUSIC_SELECTION_CHANGED: selected recording identity failed revalidation.';
  case 'LAVALINK_TRACK_CHANGED':return 'LAVALINK_TRACK_CHANGED: loaded recording differs from the selected recording.';
  case 'LAVALINK_HTTP':return 'LAVALINK_HTTP: node rejected the request.';
  case 'LAVALINK_INPUT':return 'LAVALINK_INPUT: reference is unsupported or malformed.';
  case 'MUSIC_UNAVAILABLE':return 'MUSIC_UNAVAILABLE: recording resolution failed.';
  case 'MUSIC_QUERY':return 'MUSIC_QUERY: unsupported music reference.';
  case 'LAVALINK_SOURCE':return 'LAVALINK_SOURCE: provider response could not be used.';
  case 'LAVALINK_TRANSPORT':return 'LAVALINK_TRANSPORT: node request failed or exceeded its deadline.';
  case 'LAVALINK_SESSION_SETUP':return 'LAVALINK_SESSION_SETUP: node session setup failed.';
  case 'LAVALINK_CONNECTION':case 'LAVALINK_CLOSED':case 'LAVALINK_READY_TIMEOUT':return 'LAVALINK_CONNECTION: node session is unavailable.';
  case 'CommandInteractionOptionNotFound':return 'DISCORD_OPTION_MISSING: registered command option was not available.';
  case 'VOICE_TIMEOUT':case 'VOICE_GATEWAY':case 'VOICE_PERMISSIONS':case 'VOICE_UNCERTAIN':case 'VOICE_GATEWAY_CHANGED':case 'VOICE_GATEWAY_DISCONNECTED':return `${code}: Discord voice handshake could not be confirmed.`;
  case 'MUSIC_SYNC_UNAVAILABLE':case 'MUSIC_SYNC_RECOVERY_REQUIRED':case 'MUSIC_SYNC_STALE':return `${code}: player synchronization could not be confirmed.`;
  default:return error instanceof TypeError?'MUSIC_TYPE_ERROR: adapter operation failed.':'MUSIC_BOUNDARY: music operation could not be completed.';
 }
}

const stages=['interaction.received','context.read','member.voice.detected','selection.read','selection.received','resolution.request','resolution.ready','queue.persisted','interaction.failure','node.session.ready','job.start','job.failure','voice.join.start','voice.join.success','voice.join.failure','voice.state.received','voice.server.received','player.update.start','player.update.success','player.update.failure','track.handoff','playback.started','track.load.start','track.load.success','track.load.failure','playback.exception','playback.ended','player.read.failure','playback.stuck','voice.socket.closed','provider.load.result','player.http.response','player.observed','autocomplete.choice','transport.wait','transport.confirmed','transport.failure'] as const;
export type MusicTraceStage=typeof stages[number];
/** Fixed stages and projected IDs only: never log the supplied object or error itself. */
export function musicTrace(stage:MusicTraceStage,details:{guildId?:string|null|undefined;channelId?:string|null|undefined;error?:unknown;phase?:MusicTraceStage;selectionKind?:'reference'|'text';reference?:string;status?:number;loadType?:string;connected?:boolean;hasTrack?:boolean;voiceReady?:boolean;outcome?:string}={}){
 if(!stages.includes(stage))return;
 const safe:Record<string,string>={};
 for(const key of ['guildId','channelId'] as const)if(typeof details[key]==='string'&&/^[1-9]\d{16,19}$/.test(details[key]!))safe[key]=details[key]!;
 if(details.phase&&stages.includes(details.phase))safe.phase=details.phase;
 if(details.selectionKind==='reference'||details.selectionKind==='text')safe.selectionKind=details.selectionKind;
 if(details.reference){const ref=normalizeMusicReference(details.reference);if(ref?.kind==='track'){safe.provider=ref.provider;safe.identity=createHash('sha256').update(ref.reference).digest('hex').slice(0,16);safe.selectionKind='reference';}}
 if(Number.isInteger(details.status)&&details.status!>=100&&details.status!<=599)safe.status=String(details.status);
 if(['track','playlist','search','empty','error'].includes(details.loadType??''))safe.loadType=details.loadType!;
 for(const key of ['connected','hasTrack','voiceReady'] as const)if(typeof details[key]==='boolean')safe[key]=String(details[key]);
 if(['finished','loadFailed','stopped','replaced','cleanup'].includes(details.outcome??''))safe.outcome=details.outcome!;
 if(details.error!==undefined)safe.failure=musicDiagnostic(details.error);
 console.info('Music trace: '+stage+' '+JSON.stringify(safe));
}
