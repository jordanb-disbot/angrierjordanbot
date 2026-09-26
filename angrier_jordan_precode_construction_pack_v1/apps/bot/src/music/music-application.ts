import fs from 'node:fs/promises';
import path from 'node:path';
import type {Client,Guild,GuildMember} from 'discord.js';
import type {PrismaClient} from '@prisma/client';
import {DomainError,type ConfigService,type ScheduledJob} from '../../../../packages/core/src/index.js';
import {PrismaJobDeliveryRepository} from '../../../../packages/database/src/job-delivery.js';
import {PrismaMusicRepository} from '../../../../packages/features-music/src/prisma-repository.js';
import {AuthorizedMusicCatalog,parseAuthorizedCatalogDocument} from '../../../../packages/features-music/src/catalog.js';
import {MusicResolutionService} from '../../../../packages/features-music/src/resolution.js';
import {musicEntry} from '../../../../packages/features-music/src/domain.js';
import {DiscordMusicCoordinator} from '../discord/music-coordinator.js';
import {DiscordMusicPublication} from '../discord/music-publication.js';
import {LavalinkConnection,type LavalinkConnectionOptions} from './lavalink-connection.js';
import {DiscordJsVoiceGateway} from './discord-voice-gateway.js';
import {DiscordVoiceHandshake,type DiscordVoiceGateway,type DiscordVoiceHandshakeOptions} from './discord-voice.js';
import {MusicPlayerSynchronizer} from './player-synchronizer.js';
import {MusicRuntime} from './music-runtime.js';
import {musicDiagnostic,musicTrace} from './music-diagnostics.js';

export interface MusicApplicationOptions {
 client:Client;db:PrismaClient;config:ConfigService;guildId:string;
 endpoint:string;password:string;allowInsecureHttp:boolean;
 metadataSources:('spotify'|'applemusic')[];directAudio:boolean;
 access:(guild:Guild,member:GuildMember)=>Promise<{eligible:boolean;isDj:boolean}>;
}
type NodeConnection=Pick<LavalinkConnection,'start'|'client'|'close'|'ready'|'socketEpoch'>;
type VoiceConnection=Pick<DiscordVoiceHandshake,'join'|'disconnect'|'shutdown'>;
type VoiceGateway=DiscordVoiceGateway&{shutdown():void};
type Publication=Pick<DiscordMusicPublication,'ensure'|'publish'|'refresh'|'cleanup'>;
/** Test seams replace boundaries, never logical queue/session state. */
export interface MusicApplicationDependencies {
 repository?:PrismaMusicRepository;publication?:Publication;
 createNode?:(options:LavalinkConnectionOptions)=>NodeConnection;
 createGateway?:(client:Client)=>VoiceGateway;
 createVoice?:(options:DiscordVoiceHandshakeOptions)=>VoiceConnection;
 loadCatalog?:()=>Promise<AuthorizedMusicCatalog>;
 fetch?:typeof globalThis.fetch;now?:()=>number;
 timers?:{set(callback:()=>void,milliseconds:number):ReturnType<typeof setTimeout>;clear(handle:ReturnType<typeof setTimeout>):void};
}
/** Composition only: persistence, provider, voice, presentation and delivery remain separate. */
export class MusicApplication {
 readonly coordinator:DiscordMusicCoordinator;readonly publication:Publication;
 #repo:PrismaMusicRepository;#options:MusicApplicationOptions;#dependencies:MusicApplicationDependencies;#node:NodeConnection|undefined;
 #voice:VoiceConnection|undefined;#gateway:VoiceGateway|undefined;#runtime:MusicRuntime|undefined;#sync:MusicPlayerSynchronizer|undefined;
 #starting:Promise<void>|undefined;#closed=false;#ready=false;
 #service:MusicResolutionService;#voiceSequence=0;#departedAtRevision:number|undefined;
 #lastDiagnostic:string|undefined;
 #reconnect:ReturnType<typeof setTimeout>|undefined;#refreshRetry:ReturnType<typeof setTimeout>|undefined;#watchdog:ReturnType<typeof setTimeout>|undefined;#retryDelay=1000;#readySince:number|undefined;
 constructor(options:MusicApplicationOptions,dependencies:MusicApplicationDependencies={}){
  this.#options=options;this.#dependencies=dependencies;this.#repo=dependencies.repository??new PrismaMusicRepository(options.db);
  const service=new MusicResolutionService({
   search:async(...args)=>{try{await this.start();const result=await this.#node!.client().search(...args);this.#lastDiagnostic=undefined;return result;}catch(error){this.#diagnose(error);throw error;}},
   resolve:async(reference,limit,signal)=>{if(reference.startsWith('catalog:')&&options.directAudio){const found=(await this.#catalog()).resolve(reference);return{tracks:found.status==='available'?[found.track.metadata]:[],truncated:false};}try{await this.start();const result=await this.#node!.client().resolve(reference,limit,signal);this.#lastDiagnostic=undefined;return result;}catch(error){this.#diagnose(error);throw error;}}
  });
  this.#service=service;
  this.coordinator=new DiscordMusicCoordinator(this.#repo,options.config,options.directAudio?()=>this.#catalog():null,options.access,dependencies.now??Date.now,service);
  this.publication=dependencies.publication??new DiscordMusicPublication(this.#repo,id=>new PrismaJobDeliveryRepository(options.db,id),this.coordinator.payload.bind(this.coordinator),g=>this.#enabled(g));
 }
 get ready(){return this.#ready&&!this.#closed&&this.#node?.ready===true;}
 toJSON(){return{ready:this.ready};}
 #diagnose(error:unknown){const diagnostic=musicDiagnostic(error);if(diagnostic!==this.#lastDiagnostic){this.#lastDiagnostic=diagnostic;console.warn('Music diagnostic: '+diagnostic);}}
 async #enabled(guildId:string){return!this.#closed&&guildId===this.#options.guildId&&await this.#options.config.get(guildId,'music.enabled')===true;}
 async #catalog(){
  if(!this.#options.directAudio)return new AuthorizedMusicCatalog([]);
  try{if(this.#dependencies.loadCatalog)return await this.#dependencies.loadCatalog();const file=path.resolve(process.cwd(),'.music.catalog.local.json');if((await fs.stat(file)).size>16*1024*1024)throw Error();return parseAuthorizedCatalogDocument(await fs.readFile(file,'utf8'));}catch{throw new DomainError('MUSIC_CATALOG','Optional direct audio is unavailable.');}
 }
 #setTimer(callback:()=>void,milliseconds:number){return this.#dependencies.timers?.set(callback,milliseconds)??setTimeout(callback,milliseconds);}
 #clearTimer(handle:ReturnType<typeof setTimeout>|undefined){if(handle===undefined)return;if(this.#dependencies.timers)this.#dependencies.timers.clear(handle);else clearTimeout(handle);}
 #scheduleReconnect(){if(this.#closed||this.#reconnect!==undefined)return;if(this.#readySince!==undefined&&(this.#dependencies.now??Date.now)()-this.#readySince>=60000)this.#retryDelay=1000;this.#readySince=undefined;const delay=this.#retryDelay;this.#retryDelay=Math.min(60000,this.#retryDelay*2);this.#reconnect=this.#setTimer(()=>{this.#reconnect=undefined;void(async()=>{if(this.#closed||!await this.#enabled(this.#options.guildId))return;try{await this.start();}catch{this.#scheduleReconnect();}})().catch(()=>this.#scheduleReconnect());},delay);}
 async #deferRefresh(guildId:string){if(this.#closed)return;try{await this.#repo.requestControllerRefresh(guildId);}catch{if(this.#closed||this.#refreshRetry!==undefined)return;this.#refreshRetry=this.#setTimer(()=>{this.#refreshRetry=undefined;void this.#deferRefresh(guildId);},5000);}}
 #watchEnabled(node:NodeConnection){if(this.#closed||this.#node!==node||this.#watchdog!==undefined)return;this.#watchdog=this.#setTimer(()=>{this.#watchdog=undefined;void(async()=>{const enabled=await this.#enabled(this.#options.guildId).catch(()=>false);if(this.#closed||this.#node!==node)return;if(!enabled){this.#clearTimer(this.#reconnect);this.#reconnect=undefined;this.#retire();return;}this.#watchEnabled(node);})();},5000);}
 start():Promise<void>{
  if(this.#closed)return Promise.reject(new DomainError('MUSIC_CLOSED','Music is unavailable.'));
  if(this.ready)return Promise.resolve();if(this.#starting)return this.#starting;
  this.#clearTimer(this.#reconnect);this.#reconnect=undefined;const starting=this.#start().catch(error=>{this.#retire();if(!(error instanceof DomainError&&['MUSIC_DISABLED','MUSIC_CLOSED'].includes(error.code)))this.#scheduleReconnect();throw error instanceof DomainError?error:new DomainError('MUSIC_NODE','The music node is unavailable. Try again shortly.');}).finally(()=>{if(this.#starting===starting)this.#starting=undefined;});this.#starting=starting;return starting;
 }
 async #start(){
  this.#retire();const o=this.#options;if(!o.client.user||!await this.#enabled(o.guildId)||this.#closed)throw new DomainError('MUSIC_DISABLED','Music is unavailable.');
  const gateway=this.#dependencies.createGateway?.(o.client)??new DiscordJsVoiceGateway(o.client);this.#gateway=gateway;
  let runtime:MusicRuntime|undefined;
  const voiceOptions:DiscordVoiceHandshakeOptions={botId:o.client.user.id,gateway,isCurrent:f=>runtime?.isCurrent(f)??Promise.resolve(false)};
  const voice=this.#dependencies.createVoice?.(voiceOptions)??new DiscordVoiceHandshake(voiceOptions);this.#voice=voice;
  const nodeOptions:LavalinkConnectionOptions={endpoint:o.endpoint,password:o.password,botId:o.client.user.id,fetch:this.#dependencies.fetch??globalThis.fetch,allowInsecureHttp:o.allowInsecureHttp,sourcePolicy:{mode:'multi-source',metadataSources:o.metadataSources,catalog:o.directAudio},...(o.directAudio?{resolveCatalogSource:async(reference:string)=>({uri:(await this.#catalog()).authorizedLocation(reference).readUriForTransport()})}:{}),isCurrent:(f,operation)=>runtime?.isCurrent(f,operation)??Promise.resolve(false),onEvent:async(event,context)=>{if(this.#node!==node||this.#closed)return;await runtime?.event(event,context);},onUnavailable:()=>{if(this.#node!==node||this.#closed)return;this.#retire();this.#scheduleReconnect();}};
  const node=this.#dependencies.createNode?.(nodeOptions)??new LavalinkConnection(nodeOptions);this.#node=node;
  try{
   await node.start();if(this.#closed)throw Error();musicTrace('node.session.ready',{guildId:o.guildId});
   const rest=node.client(),sync=new MusicPlayerSynchronizer(rest,voice,f=>runtime!.isCurrent(f),async(track,signal)=>track.provider==='authorized_catalog'?rest.loadCatalogTrack(track.reference.slice(8),signal):rest.loadPlayableTrack(track,signal));this.#sync=sync;
   runtime=new MusicRuntime({repository:this.#repo,socketEpoch:node.socketEpoch,synchronize:(state,signal)=>sync.synchronize(state,signal),readPlayer:f=>rest.readPlayer(f),enabled:g=>this.#enabled(g),refreshController:g=>this.#deferRefresh(g),now:this.#dependencies.now??Date.now});this.#runtime=runtime;
   if(this.#departedAtRevision===undefined)await runtime.recover(o.guildId);if(this.#closed||!node.ready||this.#node!==node)throw Error();this.#ready=true;this.#readySince=(this.#dependencies.now??Date.now)();this.#watchEnabled(node);
  }catch{if(this.#node===node)this.#retire();this.#scheduleReconnect();throw new DomainError('MUSIC_NODE','The music node is unavailable. Try again shortly.');}
 }
 async reconcile(job:ScheduledJob){musicTrace('job.start',{guildId:job.guildId});if(this.#departedAtRevision!==undefined){const intent=await this.#repo.intent(job.id);if(intent.obsolete)return;if(intent.state.revision<=this.#departedAtRevision||!intent.payload.effects.some(effect=>effect.kind==='connect'))throw new DomainError('MUSIC_VOICE_REMOVED','The bot left its voice channel. Use /music join to resume.');this.#departedAtRevision=undefined;}await this.start().catch(error=>{musicTrace('job.failure',{guildId:job.guildId,error});throw error;});try{await this.#runtime!.reconcile(job);await this.#recommend(job);}catch(error){musicTrace('job.failure',{guildId:job.guildId,error});const code=error&&typeof error==='object'&&'code'in error?error.code:null;if(['MUSIC_SYNC_RECOVERY_REQUIRED','VOICE_UNCERTAIN','LAVALINK_UNCERTAIN','VOICE_GATEWAY_CHANGED','VOICE_GATEWAY_DISCONNECTED','LAVALINK_NOT_READY'].includes(String(code))){this.#retire();this.#scheduleReconnect();}throw error;}}
 async #recommend(job:ScheduledJob){if(this.#closed||!this.ready)return;const intent=await this.#repo.intent(job.id),state=intent.state,effect=intent.payload.effects.find(effect=>effect.kind==='recommend');if(intent.obsolete||!effect||effect.kind!=='recommend'||!state.autoplay||state.current||state.queue.length||state.desiredStatus!=='IDLE')return;const fence={guildId:state.guildId,revision:state.revision,generation:state.generation};if(!job.leaseToken||!await this.#repo.ownsIntentLease(job.id,job.leaseToken,fence))throw new DomainError('MUSIC_LEASE','Music worker authority expired.');const node=this.#node,excluded=[effect.after.reference,...state.history.map(entry=>entry.track.reference)],candidates=await this.#service.recommendations(effect.after,excluded,AbortSignal.timeout(10000));if(this.#closed||this.#node!==node||!this.ready)return;const latest=await this.#repo.read(job.guildId);if(!latest||latest.state.revision!==state.revision||latest.state.generation!==state.generation||!latest.state.autoplay||latest.state.current||latest.state.queue.length||!candidates.length)return;if(!await this.#repo.ownsIntentLease(job.id,job.leaseToken,fence))throw new DomainError('MUSIC_LEASE','Music worker authority expired.');await this.#repo.recommendation(job.guildId,'autoplay-'+job.id,state.generation,musicEntry('music-auto-'+job.id,null,candidates[0]!));}
 // Publication itself blocks new disabled sends but may reconcile durable SENDING/SENT
 // receipts. Retiring an obsolete controller remains safe while Music is disabled.
 async publish(job:ScheduledJob){if(this.#closed||job.guildId!==this.#options.guildId)throw new DomainError('MUSIC_DISABLED','Music is unavailable.');await this.publication.publish(this.#options.client,job.id);}
 async cleanup(job:ScheduledJob){if(this.#closed||job.guildId!==this.#options.guildId)throw new DomainError('MUSIC_DISABLED','Music is unavailable.');await this.publication.cleanup(this.#options.client,job.id);}
 async refresh(job:ScheduledJob){if(!await this.#enabled(job.guildId))throw new DomainError('MUSIC_DISABLED','Music is unavailable.');await this.publication.refresh(this.#options.client,job.guildId);}
 /** Fresh gateway state, not the possibly stale VoiceStateUpdate arguments, is authority. */
 async voiceChanged(guildId:string,userId:string){
  if(!await this.#enabled(guildId))return;
  if(userId!==this.#options.client.user?.id){if(await this.#repo.read(guildId))await this.#deferRefresh(guildId);return;}
  const guild=await this.#options.client.guilds.fetch({guild:guildId,force:true}),voice=await guild.voiceStates.fetch(userId,{force:true});
  // A DJ may have changed the intended channel while the gateway fetch was pending.
  const saved=await this.#repo.read(guildId);if(!saved||this.#closed||voice.channelId===saved.state.voiceChannelId||saved.state.desiredStatus==='DISCONNECTED')return;
  const state=saved.state,fence={guildId,revision:state.revision,generation:state.generation};if(await this.#runtime?.isCurrent(fence))return;
  const node=this.#node,epoch=node?.socketEpoch??'voice';
  try{const applied=await this.#repo.applyTransportEvent({...fence,socketEpoch:epoch+'_voice',sequence:++this.#voiceSequence,expectedRevision:state.revision,entryId:state.current?.id??null},{kind:'observation',status:'FAILED',positionMs:state.positionMs,at:(this.#dependencies.now??Date.now)()});if(applied.ignored)return;}
  catch(error){if(error instanceof DomainError&&error.code==='MUSIC_STALE')return;throw error;}
  // A retired epoch cannot close its replacement after an awaited database write.
  if(this.#closed||this.#node!==node)return;
  // This is process-local quarantine; restart still follows the persisted desired state.
  this.#departedAtRevision=state.revision;this.#clearTimer(this.#reconnect);this.#reconnect=undefined;this.#retire();await this.#deferRefresh(guildId);
 }
 #retire(){this.#ready=false;this.#clearTimer(this.#watchdog);this.#watchdog=undefined;const runtime=this.#runtime,sync=this.#sync,voice=this.#voice,gateway=this.#gateway,node=this.#node;this.#runtime=undefined;this.#sync=undefined;this.#voice=undefined;this.#gateway=undefined;this.#node=undefined;for(const retire of [()=>runtime?.close(),()=>sync?.close(),()=>voice?.shutdown(),()=>gateway?.shutdown(),()=>node?.close()]){try{retire();}catch{/* Retire every boundary without logging private adapter diagnostics. */}}}
 close(){if(this.#closed)return;this.#closed=true;this.#clearTimer(this.#reconnect);this.#reconnect=undefined;this.#clearTimer(this.#refreshRetry);this.#refreshRetry=undefined;this.#retire();}
}
