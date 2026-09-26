import {DomainError,type ScheduledJob} from '../../../../packages/core/src/index.js';
import type {PrismaMusicRepository,MusicTransportEvent} from '../../../../packages/features-music/src/prisma-repository.js';
import type {MusicState,MusicTransportFence} from '../../../../packages/features-music/src/interfaces.js';
import {projectLavalinkEvent,type LavalinkEvent,type LavalinkPlayerBinding} from './lavalink-events.js';
import type {LavalinkPlayerObservation} from './lavalink-client.js';

type Repository=Pick<PrismaMusicRepository,'read'|'intent'|'ownsIntentLease'|'applyTransportEvent'|'recover'|'reserveController'>;
export interface MusicRuntimeOptions {
 repository:Repository;socketEpoch:string;
 synchronize:(state:MusicState,signal:AbortSignal)=>Promise<unknown>;
 readPlayer:(fence:MusicTransportFence)=>Promise<LavalinkPlayerObservation>;
 enabled:(guildId:string)=>Promise<boolean>;
 refreshController:(guildId:string)=>Promise<void>;
 now?:()=>number;
}
/**
 * All reconciliation and node events share a per-server lane. v1 runs one bot
 * replica. Mutations additionally require the shared scheduler's live job lease.
 * This driver never completes jobs itself and never equates REST ack with audio.
 */
export class MusicRuntime {
 #options:MusicRuntimeOptions;#tails=new Map<string,Promise<unknown>>();#active=new Map<string,ScheduledJob>();
 #bindings=new Map<string,LavalinkPlayerBinding>();#abort=new AbortController();#pollSequence=0;
 constructor(options:MusicRuntimeOptions){this.#options=options;}
 #lane<T>(guildId:string,work:()=>Promise<T>):Promise<T>{const task=(this.#tails.get(guildId)??Promise.resolve()).catch(()=>{}).then(work);this.#tails.set(guildId,task);void task.finally(()=>{if(this.#tails.get(guildId)===task)this.#tails.delete(guildId);}).catch(()=>{});return task;}
 async isCurrent(fence:MusicTransportFence,operation:'read'|'write'='write'){
  if(this.#abort.signal.aborted||!await this.#options.enabled(fence.guildId))return false;
  if(operation==='write'){const job=this.#active.get(fence.guildId);return Boolean(job?.leaseToken&&await this.#options.repository.ownsIntentLease(job.id,job.leaseToken,fence));}
  const row=await this.#options.repository.read(fence.guildId);return row?.state.revision===fence.revision&&row.state.generation===fence.generation;
 }
 async recover(guildId:string){return this.#lane(guildId,async()=>{if(this.#abort.signal.aborted)return;this.#bindings.delete(guildId);if(await this.#options.repository.read(guildId))await this.#options.repository.recover(guildId,'node-'+this.#options.socketEpoch);});}
 async reconcile(job:ScheduledJob){return this.#lane(job.guildId,async()=>{
  if(this.#abort.signal.aborted||!await this.#options.enabled(job.guildId))throw new DomainError('MUSIC_DISABLED','Music is unavailable.');
  const intent=await this.#options.repository.intent(job.id);if(intent.obsolete)return;
  this.#active.set(job.guildId,job);
  try{
   const state=intent.state,fence={guildId:state.guildId,revision:state.revision,generation:state.generation};
   if(!await this.isCurrent(fence))throw new DomainError('MUSIC_LEASE','Music worker authority expired.');
   const synchronized=await this.#options.synchronize(state,this.#abort.signal);
   if(!await this.isCurrent(fence))throw new DomainError('MUSIC_LEASE','Music worker authority changed.');
   // Controller reservation is durable and shared across revisions, never a direct send.
   await this.#options.repository.reserveController(job.guildId,state.revision);
   if(state.desiredStatus!=='DISCONNECTED')await this.#poll(state);
   else if(synchronized&&typeof synchronized==='object'&&'voiceDisconnected' in synchronized&&synchronized.voiceDisconnected===true)await this.#apply(state,this.#options.socketEpoch+'_poll',++this.#pollSequence,{kind:'observation',status:'DISCONNECTED',positionMs:0,at:(this.#options.now??Date.now)()});
   await this.#options.refreshController(job.guildId);
  }finally{this.#active.delete(job.guildId);}
 });}
 async #apply(state:MusicState,epoch:string,sequence:number,event:MusicTransportEvent){
  for(let retry=0;retry<3;retry++){
   try{return await this.#options.repository.applyTransportEvent({guildId:state.guildId,socketEpoch:epoch,sequence,expectedRevision:state.revision,generation:state.generation,entryId:state.current?.id??null},event);}
   catch(error){if(!(error instanceof DomainError)||error.code!=='MUSIC_STALE')throw error;const latest=await this.#options.repository.read(state.guildId);if(!latest||latest.state.generation!==state.generation||latest.state.current?.id!==state.current?.id)return{ignored:true,needsControllerRefresh:false};state=latest.state;}
  }
  throw new DomainError('MUSIC_STALE','The player is changing; retry its observation.');
 }
 async #poll(state:MusicState){
  const fence={guildId:state.guildId,revision:state.revision,generation:state.generation};let observation:LavalinkPlayerObservation;
  try{observation=await this.#options.readPlayer(fence);}catch{return;}
  if(this.#abort.signal.aborted||!await this.isCurrent(fence,'read'))return;
  const binding=this.#bindings.get(state.guildId);
  if(state.current&&(!binding||binding.socketEpoch!==this.#options.socketEpoch||binding.generation!==state.generation||binding.entryId!==state.current.id||observation.track?.entryId!==state.current.id||observation.track.generation!==state.generation))return;
  if(!state.current&&observation.track!==null)return;
  const status=!observation.connected?'FAILED':state.current?(observation.paused?'PAUSED':'PLAYING'):'IDLE';
  await this.#apply(state,this.#options.socketEpoch+'_poll',++this.#pollSequence,{kind:'observation',status,positionMs:observation.positionMs,at:observation.at});
 }
 async event(event:Exclude<LavalinkEvent,{kind:'ready'}>,context:{socketEpoch:string;sequence:number}){return this.#lane(event.guildId,async()=>{
  if(this.#abort.signal.aborted||context.socketEpoch!==this.#options.socketEpoch||!await this.#options.enabled(event.guildId))return;
  const saved=await this.#options.repository.read(event.guildId);if(!saved)return;const state=saved.state;
  const fence={guildId:state.guildId,revision:state.revision,generation:state.generation,entryId:state.current?.id??null};
  const projected=projectLavalinkEvent(event,{expected:fence,current:fence,sourceSocketEpoch:context.socketEpoch,activeSocketEpoch:this.#options.socketEpoch,sourceSequence:context.sequence,...(this.#bindings.has(event.guildId)?{playerBinding:this.#bindings.get(event.guildId)!}:{}),...(state.observedAt===null?{}:{lastObservedAt:state.observedAt})});if(!projected)return;
  if(projected.kind==='playerUpdate'){await this.#poll(state);await this.#options.refreshController(event.guildId);return;}
  const mutation:MusicTransportEvent=projected.kind==='trackStart'?{kind:'track-start',at:(this.#options.now??Date.now)(),positionMs:state.positionMs}:projected.kind==='trackEnd'?{kind:'track-end',reason:projected.reason}:{kind:'observation',status:'FAILED',at:(this.#options.now??Date.now)(),positionMs:state.positionMs};
  const applied=await this.#apply(state,context.socketEpoch,context.sequence,mutation);
  if(!applied.ignored&&projected.kind==='trackStart'){this.#bindings.set(event.guildId,projected.binding);await this.#poll(state);}
  if(!applied.ignored&&projected.kind==='trackEnd')this.#bindings.delete(event.guildId);
  if(applied.needsControllerRefresh)await this.#options.refreshController(event.guildId);
 });}
 close(){this.#abort.abort();this.#bindings.clear();}
}
