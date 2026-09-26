import type {MusicMetadata,MusicState,MusicTransportFence} from '../../../../packages/features-music/src/interfaces.js';
import {LavalinkBoundaryError,type LavalinkPlayerPatch,type LavalinkRestClient,type LavalinkTrackHandle} from './lavalink-client.js';
import type {DiscordVoiceHandshake} from './discord-voice.js';
import {musicTrace} from './music-diagnostics.js';

type PlayerClient=Pick<LavalinkRestClient,'updatePlayer'|'destroyPlayer'>;
type VoiceClient=Pick<DiscordVoiceHandshake,'join'|'disconnect'>;
interface AppliedPlayer {channelId:string;generation:number;entryId:string|null;paused:boolean;volume:number;}
/**
 * One synchronizer per NEW, non-resumed node session. Its cursor records accepted
 * writes, never observed playback. Run it under the shared worker lease; this local
 * lane alone is not a distributed lock. Restart retires this entire instance.
 */
export class MusicPlayerSynchronizer {
 #client:PlayerClient;#voice:VoiceClient;#current:(fence:MusicTransportFence)=>Promise<boolean>;
 #resolve:(track:MusicMetadata,signal?:AbortSignal)=>Promise<LavalinkTrackHandle>;
 #applied=new Map<string,AppliedPlayer>();#tails=new Map<string,Promise<unknown>>();#uncertain=new Set<string>();#closed=false;
 constructor(client:PlayerClient,voice:VoiceClient,isCurrent:(fence:MusicTransportFence)=>Promise<boolean>,resolvePlayable:(track:MusicMetadata,signal?:AbortSignal)=>Promise<LavalinkTrackHandle>){this.#client=client;this.#voice=voice;this.#current=isCurrent;this.#resolve=resolvePlayable;}
 synchronize(state:MusicState,signal?:AbortSignal):Promise<{accepted:true;changed:boolean;voiceDisconnected?:true}>{
  // Snapshot before awaiting: callers may reuse or replace their repository projection.
  const input={guildId:state.guildId,revision:state.revision,generation:state.generation,channelId:state.voiceChannelId,status:state.desiredStatus,volume:state.volume,positionMs:state.positionMs,entry:state.current?{id:state.current.id,track:{...state.current.track}}:null};
  const work=(this.#tails.get(input.guildId)??Promise.resolve()).catch(()=>{}).then(async()=>{
   const fence={guildId:input.guildId,revision:input.revision,generation:input.generation};
   const check=async()=>{if(this.#closed||signal?.aborted)throw new LavalinkBoundaryError('MUSIC_SYNC_CLOSED');if(this.#uncertain.has(input.guildId))throw new LavalinkBoundaryError('MUSIC_SYNC_RECOVERY_REQUIRED');let valid=false;try{valid=await this.#current(fence);}catch{}if(!valid)throw new LavalinkBoundaryError('MUSIC_SYNC_STALE');};
   await check();const prior=this.#applied.get(input.guildId);let mutationStarted=false;
   try{
    if(input.status==='DISCONNECTED'){
     // A fresh, non-resumed node session has no managed players. A previous cursor
     // means this instance created one and must delete it before leaving Discord.
     if(prior){mutationStarted=true;await this.#client.destroyPlayer(fence,signal);}
     await check();mutationStarted=true;await this.#voice.disconnect(fence,signal);await check();this.#applied.delete(input.guildId);return{accepted:true as const,changed:true,voiceDisconnected:true as const};
    }
    if(!['IDLE','PLAYING','PAUSED'].includes(input.status)||Boolean(input.entry)!==['PLAYING','PAUSED'].includes(input.status))throw new LavalinkBoundaryError('MUSIC_SYNC_STATE');
    if(prior&&(input.generation<prior.generation||input.generation===prior.generation&&input.entry?.id!==undefined&&input.entry.id!==prior.entryId))throw new LavalinkBoundaryError('MUSIC_SYNC_STATE');
    const paused=input.status==='PAUSED',patch:LavalinkPlayerPatch={};
    const reconnect=!prior||prior.channelId!==input.channelId;
    const replace=reconnect||prior.generation!==input.generation||prior.entryId!==(input.entry?.id??null);
    let credentials:Awaited<ReturnType<VoiceClient['join']>>|undefined;
    if(reconnect){await check();mutationStarted=true;credentials=await this.#voice.join(fence,input.channelId,signal);}
    if(replace){
     if(input.entry){
      await check();musicTrace('track.load.start',{guildId:input.guildId,channelId:input.channelId});
      try{patch.track=await this.#resolve(input.entry.track,signal);musicTrace('track.load.success',{guildId:input.guildId,channelId:input.channelId});}
      catch(error){musicTrace('track.load.failure',{guildId:input.guildId,channelId:input.channelId,error});throw error;}
      patch.entryId=input.entry.id;patch.position=input.positionMs;
     }
     else patch.track=null;
    }
    if(replace||prior?.paused!==paused)patch.paused=paused;
    if(replace||prior?.volume!==input.volume)patch.volume=input.volume;
    if(!reconnect&&!Object.keys(patch).length)return{accepted:true as const,changed:false};
    await check();
    const update=async(patch:LavalinkPlayerPatch)=>{
     if(patch.track)musicTrace('track.handoff',{guildId:input.guildId,channelId:input.channelId});
     musicTrace('player.update.start',{guildId:input.guildId,channelId:input.channelId});
     try{await this.#client.updatePlayer(fence,patch,signal);musicTrace('player.update.success',{guildId:input.guildId,channelId:input.channelId});}
     catch(error){musicTrace('player.update.failure',{guildId:input.guildId,channelId:input.channelId,error});throw error;}
    };
    if(reconnect){
     await credentials!.consume(async voice=>{await check();await update({...patch,voice});});
    }else{mutationStarted=true;await update(patch);}
    await check();this.#applied.set(input.guildId,{channelId:input.channelId,generation:input.generation,entryId:input.entry?.id??null,paused,volume:input.volume});
    return{accepted:true as const,changed:true};
   }catch(error){
    // Once a network effect began, its outcome may outlive this request. Do not
    // retry an encoded play against this session, even after a revision changes.
    if(mutationStarted)this.#uncertain.add(input.guildId);
    if(error instanceof LavalinkBoundaryError&&['MUSIC_SYNC_STATE','MUSIC_SYNC_SOURCE','MUSIC_SYNC_STALE','MUSIC_SYNC_CLOSED','MUSIC_SYNC_RECOVERY_REQUIRED'].includes(error.code))throw error;
    throw new LavalinkBoundaryError(mutationStarted?'MUSIC_SYNC_RECOVERY_REQUIRED':'MUSIC_SYNC_UNAVAILABLE');
   }
  });
  this.#tails.set(input.guildId,work);void work.finally(()=>{if(this.#tails.get(input.guildId)===work)this.#tails.delete(input.guildId);}).catch(()=>{});return work;
 }
 close(){this.#closed=true;this.#applied.clear();}
 toJSON(){return{};}
}
