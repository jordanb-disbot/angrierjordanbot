import type {MusicTransportFence} from '../../../../packages/features-music/src/interfaces.js';
import type {LavalinkVoiceState} from './lavalink-client.js';

export interface VoiceGatewaySnapshot {epoch:string;sequence:number;}
export type VoiceGatewayEvent=
 |{kind:'dispatch';epoch:string;sequence:number;type:string;data:unknown}
 |{kind:'disconnected';epoch:string};
export interface VoiceGatewayPacket {op:4;d:{guild_id:string;channel_id:string|null;self_mute:false;self_deaf:true};}
/** Adapter must publish ordered gateway dispatches and retire epochs on reconnect. */
export interface DiscordVoiceGateway {
 snapshot(guildId:string):VoiceGatewaySnapshot;
 subscribe(guildId:string,listener:(event:VoiceGatewayEvent)=>void):()=>void;
 /** Enqueue synchronously/in order; never enqueue a packet after its signal aborts. */
 send(guildId:string,packet:VoiceGatewayPacket,signal:AbortSignal):Promise<void>;
}
export interface DiscordVoiceHandshakeOptions {
 botId:string;gateway:DiscordVoiceGateway;isCurrent:(fence:MusicTransportFence)=>Promise<boolean>;timeoutMs?:number;
}
export class DiscordVoiceBoundaryError extends Error {
 constructor(public readonly code:string){super('The Discord voice handshake could not be confirmed.');this.name='DiscordVoiceBoundaryError';}
}
const fail=(code:string):never=>{throw new DiscordVoiceBoundaryError(code);};
const codes=new Set(['VOICE_CONFIG','VOICE_GATEWAY','VOICE_CHANNEL','VOICE_FENCE','VOICE_STALE','VOICE_GATEWAY_CHANGED','VOICE_SHUTDOWN','VOICE_ABORTED','VOICE_TIMEOUT','VOICE_UNCERTAIN','VOICE_GATEWAY_DISCONNECTED','VOICE_EVENT','VOICE_DISCONNECTED','VOICE_CREDENTIALS_USED','VOICE_HANDOFF']);
const redacted=(error:unknown,fallback:string)=>new DiscordVoiceBoundaryError(error instanceof DiscordVoiceBoundaryError&&codes.has(error.code)?error.code:fallback);
const snowflake=(value:unknown):value is string=>typeof value==='string'&&/^[1-9]\d{16,19}$/.test(value);
const integer=(value:unknown):value is number=>typeof value==='number'&&Number.isSafeInteger(value)&&value>=0;
const text=(value:unknown,max:number):value is string=>typeof value==='string'&&value.length>0&&value.length<=max&&!/[\u0000-\u0020\u007f]/.test(value);
const object=(value:unknown):Record<string,unknown>|null=>typeof value==='object'&&value!==null&&!Array.isArray(value)?value as Record<string,unknown>:null;
const validEpoch=(value:unknown):value is string=>text(value,128)&&/^[a-zA-Z0-9._-]+$/.test(value);
function endpoint(value:unknown):value is string {
 if(!text(value,255))return false;
 const match=/^([a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*)(?::(\d{1,5}))?$/.exec(value);if(!match)return false;
 const host=match[1]!.toLowerCase();return(host.endsWith('.discord.media')||host.endsWith('.discord.gg'))&&(!match[2]||Number(match[2])>=1&&Number(match[2])<=65535);
}
/** One-shot internal handoff. Never persist or log the plain value supplied to consume. */
export class DiscordVoiceCredentials {
 #voice:LavalinkVoiceState|null;#current:()=>Promise<void>;
 constructor(voice:LavalinkVoiceState,current:()=>Promise<void>){this.#voice={...voice};this.#current=current;}
 toJSON(){return{};}
 async consume(consumer:(voice:Readonly<LavalinkVoiceState>)=>Promise<void>):Promise<void>{
  const voice=this.#voice;this.#voice=null;if(!voice)return fail('VOICE_CREDENTIALS_USED');
  try{await this.#current();}catch(error){throw redacted(error,'VOICE_FENCE');}
  try{await consumer(Object.freeze({...voice}));}catch{fail('VOICE_HANDOFF');}
 }
}

/**
 * Acquires fresh gateway credentials only; it does not establish a voice connection.
 * Discord supplies no request nonce on VOICE_SERVER_UPDATE. Serialize attempts and
 * use epoch/receive-sequence barriers. A failed in-flight join quarantines that guild
 * in its gateway epoch until an explicit, confirmed disconnect or a fresh epoch.
 * The gateway adapter must exclude replayed dispatches and preserve receive ordering.
 * Only this boundary may emit voice opcodes for a managed guild during an attempt.
 */
export class DiscordVoiceHandshake {
 #botId:string;#gateway:DiscordVoiceGateway;#isCurrent:DiscordVoiceHandshakeOptions['isCurrent'];#timeout:number;
 #closed=false;#serial=0;#latest=new Map<string,{fence:MusicTransportFence;ticket:number}>();
 #tails=new Map<string,Promise<unknown>>();#active=new Map<string,AbortController>();#quarantined=new Map<string,string>();
 constructor(options:DiscordVoiceHandshakeOptions){
  if(!snowflake(options.botId)||typeof options.isCurrent!=='function'||typeof options.gateway?.snapshot!=='function'||typeof options.gateway.subscribe!=='function'||typeof options.gateway.send!=='function')fail('VOICE_CONFIG');
  const timeout=options.timeoutMs??15000;if(!integer(timeout)||timeout<1||timeout>60000)fail('VOICE_CONFIG');
  this.#botId=options.botId;this.#gateway=options.gateway;this.#isCurrent=options.isCurrent;this.#timeout=timeout;
 }
 #snapshot(guildId:string):VoiceGatewaySnapshot {
  try{const value=this.#gateway.snapshot(guildId);if(!validEpoch(value.epoch)||!integer(value.sequence))fail('VOICE_GATEWAY');return{epoch:value.epoch,sequence:value.sequence};}catch{return fail('VOICE_GATEWAY');}
 }
 async #current(fence:MusicTransportFence,ticket:number,epoch?:string){
  if(this.#closed)fail('VOICE_SHUTDOWN');let approved=false;try{approved=await this.#isCurrent({...fence});}catch{fail('VOICE_FENCE');}
  const latest=this.#latest.get(fence.guildId);
  if(this.#closed)fail('VOICE_SHUTDOWN');if(!approved||latest?.ticket!==ticket)fail('VOICE_STALE');
  if(epoch!==undefined&&this.#snapshot(fence.guildId).epoch!==epoch)fail('VOICE_GATEWAY_CHANGED');
 }
 join(fence:MusicTransportFence,channelId:string,signal?:AbortSignal):Promise<DiscordVoiceCredentials>{if(!snowflake(channelId))return Promise.reject(new DiscordVoiceBoundaryError('VOICE_CHANNEL'));return this.#enqueue(fence,channelId,signal) as Promise<DiscordVoiceCredentials>;}
 disconnect(fence:MusicTransportFence,signal?:AbortSignal):Promise<void>{return this.#enqueue(fence,null,signal) as Promise<void>;}
 #enqueue(input:MusicTransportFence,channelId:string|null,signal?:AbortSignal):Promise<DiscordVoiceCredentials|void>{
  if(this.#closed)return Promise.reject(new DiscordVoiceBoundaryError('VOICE_SHUTDOWN'));
  if(!snowflake(input.guildId)||!integer(input.revision)||!integer(input.generation))return Promise.reject(new DiscordVoiceBoundaryError('VOICE_FENCE'));
  if(signal?.aborted)return Promise.reject(new DiscordVoiceBoundaryError('VOICE_ABORTED'));
  const fence={guildId:input.guildId,revision:input.revision,generation:input.generation},prior=this.#latest.get(input.guildId)?.fence;
  if(prior&&(fence.revision<prior.revision||fence.generation<prior.generation||fence.revision===prior.revision&&fence.generation!==prior.generation))return Promise.reject(new DiscordVoiceBoundaryError('VOICE_STALE'));
  const ticket=++this.#serial;this.#latest.set(fence.guildId,{fence,ticket});
  const operation=(this.#tails.get(fence.guildId)??Promise.resolve()).catch(()=>{}).then(()=>this.#attempt(fence,ticket,channelId,signal));this.#tails.set(fence.guildId,operation);
  void operation.finally(()=>{if(this.#tails.get(fence.guildId)===operation)this.#tails.delete(fence.guildId);}).catch(()=>{});return operation;
 }
 async #attempt(fence:MusicTransportFence,ticket:number,channelId:string|null,signal?:AbortSignal):Promise<DiscordVoiceCredentials|void>{
  const controller=new AbortController();this.#active.set(fence.guildId,controller);
  const cancel=()=>controller.abort('VOICE_ABORTED');signal?.addEventListener('abort',cancel,{once:true});if(signal?.aborted)cancel();
  const timer=setTimeout(()=>controller.abort('VOICE_TIMEOUT'),this.#timeout);
  let unsubscribe:(()=>void)|undefined,sent=false,confirmed=false,epoch:string|undefined;
  const wait=<T>(promise:Promise<T>):Promise<T>=>new Promise((resolve,reject)=>{
   const abort=()=>{cleanup();reject(new DiscordVoiceBoundaryError(typeof controller.signal.reason==='string'?controller.signal.reason:'VOICE_ABORTED'));};
   const cleanup=()=>controller.signal.removeEventListener('abort',abort);
   promise.then(value=>{cleanup();resolve(value);},error=>{cleanup();reject(redacted(error,'VOICE_GATEWAY'));});
   if(controller.signal.aborted){abort();return;}controller.signal.addEventListener('abort',abort,{once:true});
  });
  try{
   // Check persistent authority before subscribing/sending; no credentials are reused.
   await wait(this.#current(fence,ticket));const initial=this.#snapshot(fence.guildId);epoch=initial.epoch;
   if(channelId!==null&&this.#quarantined.get(fence.guildId)===epoch)fail('VOICE_UNCERTAIN');
   let barrier=initial.sequence,lastSequence=barrier,sessionId:string|null=null,server:{token:string;endpoint:string}|null=null,disconnected=false,version=0;
   let wake:(()=>void)|undefined;
   const changed=()=>{version++;const callback=wake;wake=undefined;callback?.();};
   unsubscribe=this.#gateway.subscribe(fence.guildId,event=>{
    if(controller.signal.aborted||!sent||event.epoch!==epoch)return;
    if(event.kind==='disconnected'){controller.abort('VOICE_GATEWAY_DISCONNECTED');return;}
    if(!integer(event.sequence)||event.sequence<=barrier||event.sequence<=lastSequence)return;lastSequence=event.sequence;
    const data=object(event.data);if(!data||data.guild_id!==fence.guildId)return;
    if(event.type==='VOICE_STATE_UPDATE'){
     if(data.user_id!==this.#botId)return;
     if(data.channel_id===null){disconnected=true;sessionId=null;changed();return;}
     if(channelId===null||data.channel_id!==channelId)return;
     if(!text(data.session_id,256)){controller.abort('VOICE_EVENT');return;}
     disconnected=false;sessionId=data.session_id;changed();
    }else if(event.type==='VOICE_SERVER_UPDATE'&&channelId!==null){
     // A null endpoint means Discord is reallocating the server: await a fresh update.
     if(data.endpoint===null){server=null;changed();return;}
     if(!text(data.token,2048)||!endpoint(data.endpoint)){controller.abort('VOICE_EVENT');return;}
     server={token:data.token,endpoint:data.endpoint};changed();
    }
   });
   // Subscription can synchronously flush old events. Capture the outbound barrier last.
   await wait(this.#current(fence,ticket,epoch));const beforeSend=this.#snapshot(fence.guildId);barrier=beforeSend.sequence;lastSequence=barrier;
   if(controller.signal.aborted)fail('VOICE_ABORTED');
   sent=true;await wait(this.#gateway.send(fence.guildId,{op:4,d:{guild_id:fence.guildId,channel_id:channelId,self_mute:false,self_deaf:true}},controller.signal));
   while(true){
    if(disconnected&&channelId!==null)fail('VOICE_DISCONNECTED');
    if(channelId===null?disconnected:sessionId!==null&&server!==null){
     const observedVersion=version;await wait(this.#current(fence,ticket,epoch));if(observedVersion!==version)continue;
     confirmed=true;
     if(channelId===null){this.#quarantined.delete(fence.guildId);return;}
     const voice:LavalinkVoiceState={sessionId:sessionId!,token:server!.token,endpoint:server!.endpoint,channelId};
     return new DiscordVoiceCredentials(voice,()=>this.#current(fence,ticket,epoch));
    }
    await wait(new Promise<void>(resolve=>{wake=resolve;}));
   }
  }catch(error){
   if(sent&&!confirmed&&epoch)this.#quarantined.set(fence.guildId,epoch);
   throw redacted(error,'VOICE_GATEWAY');
  }finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel);try{unsubscribe?.();}catch{/* Never propagate gateway adapter errors or data. */}if(this.#active.get(fence.guildId)===controller)this.#active.delete(fence.guildId);}
 }
 shutdown(){if(this.#closed)return;this.#closed=true;for(const controller of this.#active.values())controller.abort('VOICE_SHUTDOWN');}
}
