import {randomUUID} from 'node:crypto';
import {PermissionFlagsBits,Status,type Client} from 'discord.js';
import type {DiscordVoiceGateway,VoiceGatewayEvent,VoiceGatewayPacket,VoiceGatewaySnapshot} from './discord-voice.js';
import {musicTrace} from './music-diagnostics.js';

export class DiscordVoiceGatewayError extends Error {
 constructor(readonly code:'VOICE_GATEWAY'|'VOICE_PERMISSIONS'='VOICE_GATEWAY'){super('The Discord voice gateway is unavailable.');this.name='DiscordVoiceGatewayError';}
}
const unavailable=():never=>{throw new DiscordVoiceGatewayError();};
const object=(value:unknown):Record<string,unknown>|null=>typeof value==='object'&&value!==null&&!Array.isArray(value)?value as Record<string,unknown>:null;
const integer=(value:unknown):value is number=>typeof value==='number'&&Number.isSafeInteger(value)&&value>=0;
const snowflake=(value:unknown):value is string=>typeof value==='string'&&/^[1-9]\d{16,19}$/.test(value);
const text=(value:unknown,max:number):value is string=>typeof value==='string'&&value.length>0&&value.length<=max&&!/[\u0000-\u0020\u007f]/.test(value);
interface SafeVoiceFields {guildId:string;userId?:string;channelId?:string|null;sessionId?:string;token?:string;endpoint?:string|null;}
/** Internal getters supply the handshake; default logging/JSON never exposes credentials. */
class VoiceDispatchData {
 #fields:SafeVoiceFields;
 constructor(fields:SafeVoiceFields){this.#fields={...fields};Object.freeze(this);}
 get guild_id(){return this.#fields.guildId;}get user_id(){return this.#fields.userId;}get channel_id(){return this.#fields.channelId;}
 get session_id(){return this.#fields.sessionId;}get token(){return this.#fields.token;}get endpoint(){return this.#fields.endpoint;}
 toJSON(){return{guild_id:this.#fields.guildId,...(this.#fields.userId?{user_id:this.#fields.userId}:{}),...(this.#fields.channelId!==undefined?{channel_id:this.#fields.channelId}:{})};}
}
interface ShardState {epoch:string;sequence:number;ready:boolean;}

/**
 * Installed discord.js WebSocketManager emits Client raw(dispatch, shardId) before
 * handling packets. Public shardReady/shardResume open a new usable epoch; reconnect,
 * disconnect and error invalidate it. Replayed dispatches during resume are discarded.
 * No raw dispatch, voice token, endpoint or session is logged or retained in this bridge.
 * guild.shard.send synchronously accepts a packet, but the SDK may internally queue it:
 * abort prevents NEW enqueue only, not retraction. The handshake's uncertain-attempt
 * quarantine remains mandatory, including after a transport timeout or reconnect.
 */
export class DiscordJsVoiceGateway implements DiscordVoiceGateway {
 #client:Client;#closed=false;#shards=new Map<number,ShardState>();
 #subscriptions=new Map<string,Set<(event:VoiceGatewayEvent)=>void>>();
 #handlers:{event:string;callback:(...args:any[])=>void}[]=[];
 constructor(client:Client){
  this.#client=client;
  for(const [id,shard]of client.ws.shards)this.#shards.set(id,{epoch:randomUUID(),sequence:0,ready:shard.status===Status.Ready});
  this.#listen('raw',(packet:unknown,id:unknown)=>this.#raw(packet,id));
  this.#listen('shardReconnecting',(id:unknown)=>this.#invalidate(id));
  this.#listen('shardDisconnect',(_event:unknown,id:unknown)=>this.#invalidate(id));
  this.#listen('shardError',(_error:unknown,id:unknown)=>this.#invalidate(id));
  this.#listen('shardReady',(id:unknown)=>this.#ready(id));
  this.#listen('shardResume',(id:unknown)=>this.#ready(id));
 }
 toJSON(){return{};}
 #listen(event:string,callback:(...args:any[])=>void){this.#client.on(event,callback);this.#handlers.push({event,callback});}
 #emit(guildId:string,event:VoiceGatewayEvent){for(const listener of this.#subscriptions.get(guildId)??[]){try{const result=(listener as (value:VoiceGatewayEvent)=>unknown)(event);if(result&&typeof(result as PromiseLike<unknown>).then==='function')void Promise.resolve(result).catch(()=>{});}catch{/* Never forward callback errors or credential-bearing messages. */}}}
 #invalidate(id:unknown){
  if(this.#closed||!integer(id))return;const prior=this.#shards.get(id);
  this.#shards.set(id,{epoch:randomUUID(),sequence:0,ready:false});
  if(prior)for(const guildId of this.#subscriptions.keys())if(this.#client.guilds.cache.get(guildId)?.shardId===id)this.#emit(guildId,Object.freeze({kind:'disconnected',epoch:prior.epoch}));
 }
 #ready(id:unknown){if(this.#closed||!integer(id)||this.#client.ws.shards.get(id)?.status!==Status.Ready)return;const state=this.#shards.get(id);if(state)state.ready=true;else this.#shards.set(id,{epoch:randomUUID(),sequence:0,ready:true});}
 #guild(guildId:string){
  if(this.#closed||!snowflake(guildId)||!this.#client.user)return unavailable();
  const guild=this.#client.guilds.cache.get(guildId);if(!guild||guild.available===false)return unavailable();
  const state=this.#shards.get(guild.shardId);if(!state?.ready||guild.shard?.status!==Status.Ready)return unavailable();
  return{guild,state};
 }
 snapshot(guildId:string):VoiceGatewaySnapshot {try{const {state}=this.#guild(guildId);return{epoch:state.epoch,sequence:state.sequence};}catch{return unavailable();}}
 subscribe(guildId:string,listener:(event:VoiceGatewayEvent)=>void):()=>void {
  this.#guild(guildId);if(typeof listener!=='function')return unavailable();
  let set=this.#subscriptions.get(guildId);if(!set){set=new Set();this.#subscriptions.set(guildId,set);}set.add(listener);
  return()=>{set!.delete(listener);if(!set!.size&&this.#subscriptions.get(guildId)===set)this.#subscriptions.delete(guildId);};
 }
 async send(guildId:string,packet:VoiceGatewayPacket,signal:AbortSignal,beforeSend?:()=>Promise<void>):Promise<void>{
  let targetChannel:string|undefined;
  try{
   const {guild,state}=this.#guild(guildId),epoch=state.epoch,shard=guild.shard,data=object(packet?.d);
   if(signal.aborted||packet?.op!==4||!data||data.guild_id!==guildId||data.self_mute!==false||data.self_deaf!==true||data.channel_id!==null&&!snowflake(data.channel_id))return unavailable();
   const channelId=data.channel_id as string|null;
   targetChannel=channelId??undefined;
   if(channelId!==null){
    const botId=this.#client.user!.id;
    const [channel,bot]=await Promise.all([guild.channels.fetch(channelId,{force:true}),guild.members.fetch({user:botId,force:true})]);
    if(!channel?.isVoiceBased()||channel.id!==channelId||channel.guild.id!==guildId||bot.id!==botId||bot.guild.id!==guildId)return unavailable();
    const required=PermissionFlagsBits.ViewChannel|PermissionFlagsBits.Connect|PermissionFlagsBits.Speak;
    if(!channel.permissionsFor(bot)?.has(required))throw new DiscordVoiceGatewayError('VOICE_PERMISSIONS');
   }
   if(signal.aborted)return unavailable();
   await beforeSend?.();
   const current=this.#guild(guildId);
   if(signal.aborted||current.guild!==guild||current.state.epoch!==epoch||current.guild.shard!==shard)return unavailable();
   // Project a fixed opcode shape. No caller-supplied extra fields reach Discord.
   shard.send({op:4,d:{guild_id:guildId,channel_id:channelId,self_mute:false,self_deaf:true}});
  }catch(error){
   if(error instanceof DiscordVoiceGatewayError&&error.code==='VOICE_PERMISSIONS'){
    const denied=new DiscordVoiceGatewayError('VOICE_PERMISSIONS');musicTrace('voice.join.failure',{guildId,channelId:targetChannel,error:denied});throw denied;
   }
   return unavailable();
  }
 }
 #raw(input:unknown,shardId:unknown){
  if(this.#closed||!integer(shardId))return;const packet=object(input);if(!packet||packet.op!==0||!integer(packet.s)||typeof packet.t!=='string')return;
  // READY means a new session; invalidate even if a lifecycle event was missed.
  if(packet.t==='READY'){this.#invalidate(shardId);const state=this.#shards.get(shardId);if(state)state.sequence=packet.s;return;}
  const state=this.#shards.get(shardId);if(!state||packet.s<=state.sequence)return;state.sequence=packet.s;
  if(!state.ready||this.#client.ws.shards.get(shardId)?.status!==Status.Ready||!['VOICE_STATE_UPDATE','VOICE_SERVER_UPDATE'].includes(packet.t))return;
  const data=object(packet.d);if(!data||!snowflake(data.guild_id))return;
  const guild=this.#client.guilds.cache.get(data.guild_id);if(!guild||guild.shardId!==shardId||guild.available===false)return;
  let fields:SafeVoiceFields;
  if(packet.t==='VOICE_STATE_UPDATE'){
   if(data.user_id!==this.#client.user?.id||data.channel_id!==null&&!snowflake(data.channel_id)||data.channel_id!==null&&!text(data.session_id,256))return;
   fields={guildId:data.guild_id,userId:data.user_id as string,channelId:data.channel_id as string|null,...(data.channel_id!==null?{sessionId:data.session_id as string}:{})};
   musicTrace('voice.state.received',{guildId:data.guild_id,...(data.channel_id!==null?{channelId:data.channel_id as string}:{})});
  }else{
   if(data.endpoint!==null&&(!text(data.endpoint,255)||!text(data.token,2048)))return;
   fields={guildId:data.guild_id,endpoint:data.endpoint as string|null,...(data.endpoint!==null?{token:data.token as string}:{})};
   musicTrace('voice.server.received',{guildId:data.guild_id});
  }
  this.#emit(data.guild_id,Object.freeze({kind:'dispatch',epoch:state.epoch,sequence:packet.s,type:packet.t,data:new VoiceDispatchData(fields)}));
 }
 shutdown(){
  if(this.#closed)return;
  for(const id of [...this.#shards.keys()])this.#invalidate(id);
  this.#closed=true;for(const {event,callback}of this.#handlers)this.#client.off(event,callback);
  this.#handlers=[];this.#subscriptions.clear();this.#shards.clear();
 }
}
