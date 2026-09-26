import {sameMusicRecording} from '../../../../packages/features-music/src/resolution.js';
import {musicTrace} from './music-diagnostics.js';
import {normalizeMusicReference,safeMusicArtworkUrl,type MusicPublicProvider} from '../../../../packages/features-music/src/provider-references.js';
import type {MusicResolutionProvider,MusicSearchSource,MusicSearchRequest} from '../../../../packages/features-music/src/resolution.js';
import type {MusicMetadata,MusicTransportFence} from '../../../../packages/features-music/src/interfaces.js';

/** A transport acknowledgement is not a Discord voice/playback observation. */
export interface LavalinkAcknowledgement {accepted:true;}
/** State telemetry only; connected alone does not establish that the current track played. */
export interface LavalinkPlayerObservation {guildId:string;paused:boolean;connected:boolean;positionMs:number;at:number;track:{entryId:string;generation:number}|null;}
/** Opaque, process-local capability. Its encoded track is never enumerable or serializable. */
export interface LavalinkTrackHandle {readonly __lavalinkTrack?:never;}
export interface LavalinkVoiceState {token:string;endpoint:string;sessionId:string;channelId:string;}
export interface LavalinkPlayerPatch {track?:LavalinkTrackHandle|null;entryId?:string;position?:number;paused?:boolean;volume?:number;voice?:LavalinkVoiceState;}
export type LavalinkSourcePolicy={mode:'direct-only'}|{mode:'multi-source';metadataSources?:readonly ('spotify'|'applemusic')[];catalog?:boolean};
export const LAVALINK_REVIEWED_PLUGINS=Object.freeze({'youtube-plugin':'1.18.2','lavasrc-plugin':'4.8.3'});
export interface LavalinkClientOptions {
 sourcePolicy?:LavalinkSourcePolicy;
 endpoint:string;password:string;sessionId:string;fetch:typeof globalThis.fetch;
 resolveCatalogSource?:(catalogId:string)=>Promise<{uri:string}>;
 isCurrent:(fence:MusicTransportFence,operation?:'read'|'write')=>Promise<boolean>;
 timeoutMs?:number;
 /** Operator-only opt-in for an isolated private/test node; never member-controlled. */
 allowInsecureHttp?:boolean;
}
export class LavalinkBoundaryError extends Error {
 constructor(public readonly code:string){super('The music transport request could not be confirmed.');this.name='LavalinkBoundaryError';}
}
const fail=(code:string):never=>{throw new LavalinkBoundaryError(code);};
const object=(value:unknown):Record<string,unknown>|null=>typeof value==='object'&&value!==null&&!Array.isArray(value)?value as Record<string,unknown>:null;
const text=(value:unknown,max:number):value is string=>typeof value==='string'&&value.length>0&&value.length<=max&&!/[\u0000-\u0020\u007f]/.test(value);
const integer=(value:unknown,min:number,max:number):value is number=>typeof value==='number'&&Number.isSafeInteger(value)&&value>=min&&value<=max;
const snowflake=(value:unknown):value is string=>typeof value==='string'&&/^[1-9]\d{16,19}$/.test(value);
const privateHost=(host:string)=>{if(host==='localhost'||host==='[::1]'||host.endsWith('.localhost')||host.endsWith('.internal')||host.endsWith('.local')||/^[a-zA-Z][a-zA-Z0-9-]*$/.test(host))return true;const parts=host.split('.');if(parts.length!==4||parts.some(part=>!/^\d{1,3}$/.test(part)||Number(part)>255))return false;const [a,b]=parts.map(Number);return a===127||a===10||a===192&&b===168||a===172&&b!>=16&&b!<=31;};
const same=(a:MusicTransportFence,b:MusicTransportFence)=>a.generation===b.generation&&a.revision===b.revision;
const ack=():LavalinkAcknowledgement=>({accepted:true});

/**
 * Trusted operator Lavalink v4 transport and bounded public metadata projection.
 * Only the reviewed exact source/plugin set passes preflight for this ready session.
 * Spotify/Apple encoded mirror tracks are discarded; playback requires a fresh public
 * YouTube/SoundCloud identity load or an explicitly enabled trusted catalog resolver.
 * Node operator policy additionally forbids cookies/token scraping, remote cipher and
 * yt-dlp. /info attests loaded managers/plugins, not private plugin configuration.
 * Catalog DNS/redirect/egress restrictions belong to the trusted node deployment.
 * One client owns a ready session; multi-process use also requires the durable lease.
 */
export class LavalinkRestClient implements MusicResolutionProvider {
 #origin:string;#password:string;#sessionId:string;#fetch:typeof globalThis.fetch;
 #resolve:LavalinkClientOptions['resolveCatalogSource'];#isCurrent:LavalinkClientOptions['isCurrent'];#timeout:number;
 #tracks=new WeakMap<LavalinkTrackHandle,{encoded:string;seekable:boolean;length:number}>();
 #nodeReady:Promise<void>|null=null;#sources=new Set<string>();#plugins=new Map<string,string>();#catalog=false;
 #tails=new Map<string,Promise<unknown>>();#latest=new Map<string,MusicTransportFence>();#uncertain=new Set<string>();
 constructor(options:LavalinkClientOptions){
  let endpoint:URL;try{endpoint=new URL(options.endpoint);}catch{fail('LAVALINK_CONFIG');}
  if(!text(options.endpoint,2048)||endpoint!.username||endpoint!.password||endpoint!.search||endpoint!.hash||endpoint!.pathname!=='/'||!(endpoint!.protocol==='https:'||options.allowInsecureHttp===true&&endpoint!.protocol==='http:'))fail('LAVALINK_CONFIG');
  if(endpoint!.protocol==='http:'&&!privateHost(endpoint!.hostname))fail('LAVALINK_CONFIG');
  if(!text(options.password,1024)||!text(options.sessionId,128)||!/^[a-zA-Z0-9_-]+$/.test(options.sessionId)||typeof options.fetch!=='function'||options.resolveCatalogSource!==undefined&&typeof options.resolveCatalogSource!=='function'||typeof options.isCurrent!=='function')fail('LAVALINK_CONFIG');
  const policy=options.sourcePolicy??{mode:'multi-source'};
  if(!object(policy)||!['direct-only','multi-source'].includes(policy.mode))fail('LAVALINK_CONFIG');
  if(policy.mode==='direct-only'){if(Object.keys(policy).some(key=>key!=='mode'))fail('LAVALINK_CONFIG');this.#catalog=true;this.#sources.add('http');}
  else{
   if(Object.keys(policy).some(key=>!['mode','metadataSources','catalog'].includes(key))||policy.catalog!==undefined&&typeof policy.catalog!=='boolean')fail('LAVALINK_CONFIG');
   const metadata=policy.metadataSources??[];if(!Array.isArray(metadata)||metadata.length>2||new Set(metadata).size!==metadata.length||metadata.some(source=>!['spotify','applemusic'].includes(source)))fail('LAVALINK_CONFIG');
   this.#sources=new Set(['youtube','soundcloud',...metadata]);this.#plugins.set('youtube-plugin',LAVALINK_REVIEWED_PLUGINS['youtube-plugin']);
   if(metadata.length)this.#plugins.set('lavasrc-plugin',LAVALINK_REVIEWED_PLUGINS['lavasrc-plugin']);
   if(policy.catalog===true){this.#catalog=true;this.#sources.add('http');}
  }
  if(this.#catalog&&typeof options.resolveCatalogSource!=='function')fail('LAVALINK_CONFIG');
  const timeout=options.timeoutMs??10000;if(!integer(timeout,1,60000))fail('LAVALINK_CONFIG');
  this.#origin=endpoint!.origin;this.#password=options.password;this.#sessionId=options.sessionId;this.#fetch=options.fetch;this.#resolve=options.resolveCatalogSource;this.#isCurrent=options.isCurrent;this.#timeout=timeout;
 }
 async #request(method:'GET'|'PATCH'|'DELETE',path:string,body:unknown,signal?:AbortSignal):Promise<unknown>{
  if(signal?.aborted)fail('LAVALINK_ABORTED');
  const controller=new AbortController(),abort=()=>controller.abort();signal?.addEventListener('abort',abort,{once:true});
  let rejectAbort:(reason:unknown)=>void=()=>{};
  const interrupted=new Promise<never>((_,reject)=>{rejectAbort=reject;});
  const onAbort=()=>rejectAbort(new LavalinkBoundaryError('LAVALINK_TRANSPORT'));
  controller.signal.addEventListener('abort',onAbort,{once:true});
  const timer=setTimeout(()=>controller.abort(),this.#timeout);
  try{
   return await Promise.race([interrupted,(async()=>{
    const response=await this.#fetch(this.#origin+path,{method,headers:{Authorization:this.#password,Accept:'application/json',...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)}),redirect:'error',signal:controller.signal});
    if(/^\/v4\/sessions\/[^/]+\/players\//.test(path))musicTrace('player.http.response',{status:response.status});
    if(response.redirected||response.status>=300&&response.status<400)fail('LAVALINK_REDIRECT');
    if(!response.ok)fail(response.status>=500?'LAVALINK_TRANSPORT':'LAVALINK_HTTP');
    if(method==='DELETE'){if(response.status!==204)fail('LAVALINK_RESPONSE');return null;}
    const contentType=response.headers.get('content-type')??'';if(!/^application\/json(?:\s*;|$)/i.test(contentType))fail('LAVALINK_RESPONSE');
    const size=response.headers.get('content-length');if(size!==null&&(!/^\d+$/.test(size)||Number(size)>131072))fail('LAVALINK_RESPONSE');
    if(!response.body)fail('LAVALINK_RESPONSE');const reader=response.body!.getReader(),chunks:Uint8Array[]=[];let total=0;
    try{while(true){const row=await reader.read();if(row.done)break;total+=row.value.length;if(total>131072){await reader.cancel().catch(()=>{});fail('LAVALINK_RESPONSE');}chunks.push(row.value);}}finally{reader.releaseLock();}
    const bytes=new Uint8Array(total);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
    try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)) as unknown;}catch{fail('LAVALINK_RESPONSE');}
   })()]);
  }catch(error){if(error instanceof LavalinkBoundaryError)throw error;fail('LAVALINK_TRANSPORT');}
  finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);controller.signal.removeEventListener('abort',onAbort);}
 }
 async #verifyNode():Promise<void>{
  if(!this.#nodeReady){
   const pending=this.#request('GET','/v4/info',undefined).then(value=>{
    const info=object(value),version=object(info?.version);
    if(version?.major!==4||!Array.isArray(info?.sourceManagers)||info.sourceManagers.length!==this.#sources.size||new Set(info.sourceManagers).size!==this.#sources.size||info.sourceManagers.some(source=>typeof source!=='string'||!this.#sources.has(source))||!Array.isArray(info.plugins)||info.plugins.length!==this.#plugins.size)fail('LAVALINK_NODE_POLICY');
    const names=new Set<string>();for(const raw of info!.plugins as unknown[]){const plugin=object(raw);if(typeof plugin?.name!=='string'||names.has(plugin.name)||!this.#plugins.has(plugin.name)||plugin.version!==this.#plugins.get(plugin.name))fail('LAVALINK_NODE_POLICY');names.add(plugin!.name as string);}
   });
   this.#nodeReady=pending;
   // A transient failure or corrected node configuration can be checked again. Only
   // verified success is retained; simultaneous loads share the same bounded request.
   void pending.catch(()=>{if(this.#nodeReady===pending)this.#nodeReady=null;});
  }
  await this.#nodeReady;
 }
 async loadCatalogTrack(catalogId:string,signal?:AbortSignal):Promise<LavalinkTrackHandle>{
  if(!this.#catalog)fail('LAVALINK_SOURCE_DISABLED');
  if(!text(catalogId,128)||!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(catalogId))fail('LAVALINK_CATALOG');
  if(signal?.aborted)fail('LAVALINK_ABORTED');
  await this.#verifyNode();
  if(signal?.aborted)fail('LAVALINK_ABORTED');
  let source:{uri:string};try{source=await this.#resolve!(catalogId);}catch{fail('LAVALINK_SOURCE');}
  let uri:URL;try{if(!text(source!.uri,4096))throw Error();uri=new URL(source!.uri);if(!['https:','http:'].includes(uri.protocol)||uri.username||uri.password||uri.hash)throw Error();}catch{fail('LAVALINK_SOURCE');}
  const result=object(await this.#request('GET','/v4/loadtracks?identifier='+encodeURIComponent(uri!.href),undefined,signal)),data=object(result?.data),info=object(data?.info);
  if(result?.loadType!=='track'||!text(data?.encoded,65536)||info?.sourceName!=='http'||typeof info.isSeekable!=='boolean'||!integer(info.length,0,604800000))fail('LAVALINK_SOURCE');
  const handle=Object.freeze({});this.#tracks.set(handle,{encoded:data!.encoded as string,seekable:info!.isSeekable as boolean,length:info!.length as number});return handle;
 }
 /** Search prefixes are selected here, never accepted from member input. */
 async search(source:MusicSearchSource,query:MusicSearchRequest,limit:number,signal:AbortSignal):Promise<MusicMetadata[]>{
  if(!['youtube_music','youtube','soundcloud'].includes(source)||!integer(limit,1,25)||!object(query)||typeof query.text!=='string'||!query.text.trim()||query.text.length>300||/[\u0000-\u001f\u007f]/.test(query.text)||query.isrc!==undefined&&!/^[A-Z]{2}[A-Z0-9]{3}\d{7}$/.test(query.isrc))fail('LAVALINK_INPUT');
  this.#enabled(source);if(signal.aborted)fail('LAVALINK_ABORTED');await this.#verifyNode();
  const prefix={youtube_music:'ytmsearch:',youtube:'ytsearch:',soundcloud:'scsearch:'}[source],term=query.isrc?'"'+query.isrc+'"':query.text.trim();
  const result=object(await this.#request('GET','/v4/loadtracks?identifier='+encodeURIComponent(prefix+term),undefined,signal));
  if(result?.loadType==='empty')return[];
  if(result?.loadType!=='search'||!Array.isArray(result.data))fail('LAVALINK_SOURCE');
  return this.#rows(result!.data as unknown[],source,limit);
 }
 async resolve(reference:string,limit:number,signal:AbortSignal):Promise<{tracks:MusicMetadata[];truncated:boolean}>{
  const parsed=normalizeMusicReference(reference);if(!parsed||!integer(limit,1,1000))fail('LAVALINK_INPUT');
  this.#enabled(parsed!.provider);if(signal.aborted)fail('LAVALINK_ABORTED');await this.#verifyNode();
  const result=object(await this.#request('GET','/v4/loadtracks?identifier='+encodeURIComponent(parsed!.reference),undefined,signal));
  if(result?.loadType==='empty')return{tracks:[],truncated:false};
  if(result?.loadType==='track'&&parsed!.kind==='track'){
   musicTrace('provider.load.result',{reference:parsed!.reference,loadType:result.loadType as string});const row=this.#metadata(result.data,parsed!.provider);if(!row||row.reference!==parsed!.reference)fail('LAVALINK_SOURCE');return{tracks:[row!],truncated:false};
  }
  if(result?.loadType!=='playlist'||parsed!.kind!=='collection')fail('LAVALINK_SOURCE');
  const data=object(result!.data);if(!Array.isArray(data?.tracks))fail('LAVALINK_SOURCE');
  const raw=data!.tracks as unknown[],tracks=this.#rows(raw,parsed!.provider,limit),total=object(data!.pluginInfo)?.totalTracks;
  // A provider may impose an upstream playlist page limit without totalTracks. Be
  // conservative: collections without a verified total are visibly partial.
  return{tracks,truncated:tracks.length<raw.length||!integer(total,0,1000000)||total>raw.length};
 }
 #enabled(provider:MusicPublicProvider){if(!this.#sources.has(provider==='youtube_music'?'youtube':provider))fail('LAVALINK_SOURCE_DISABLED');}
 #rows(raw:unknown[],provider:MusicPublicProvider,limit:number):MusicMetadata[]{const result:MusicMetadata[]=[],seen=new Set<string>();for(const data of raw){const row=this.#metadata(data,provider);if(row&&!seen.has(row.reference)){result.push(row);seen.add(row.reference);if(result.length===limit)break;}}return result;}
 #metadata(raw:unknown,provider:MusicPublicProvider):MusicMetadata|null {
  const data=object(raw),info=object(data?.info),plugin=object(data?.pluginInfo);
  if(!info||info.sourceName!==(provider==='youtube_music'?'youtube':provider)||typeof info.title!=='string'||typeof info.author!=='string'||typeof info.isSeekable!=='boolean'||typeof info.isStream!=='boolean'||!integer(info.length,0,604800000))return null;
  let ref=typeof info.uri==='string'?normalizeMusicReference(info.uri):null;if(!ref||ref.kind!=='track')return null;
  if((provider==='youtube'||provider==='youtube_music')&&(ref.provider==='youtube'||ref.provider==='youtube_music'))ref=normalizeMusicReference(ref.reference.replace(/^https:\/\/(?:www|music)\.youtube\.com/,provider==='youtube_music'?'https://music.youtube.com':'https://www.youtube.com'));
  if(ref?.provider!==provider)return null;
  const label=(input:string,max:number)=>input.normalize('NFKC').replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,max),title=label(info.title,300),artist=label(info.author,300);if(!title||!artist)return null;
  const isrc=typeof info.isrc==='string'&&/^[A-Z]{2}[A-Z0-9]{3}\d{7}$/.test(info.isrc)?info.isrc:null;
  return{provider,reference:ref.reference,title,artist,album:typeof plugin?.albumName==='string'?label(plugin.albumName,300):null,durationMs:info.isStream||info.length===0?null:info.length as number,artworkUrl:safeMusicArtworkUrl(info.artworkUrl),seekable:info.isSeekable&&!info.isStream,isrc,...(typeof plugin?.explicit==='boolean'?{explicit:plugin.explicit}:{})};
 }
 /** Only the selected public recording identity may create a private playback capability. */
 async loadPlayableTrack(track:MusicMetadata,signal?:AbortSignal):Promise<LavalinkTrackHandle>{
  const parsed=normalizeMusicReference(track?.reference);if(!parsed||parsed.kind!=='track'||!['youtube','youtube_music','soundcloud'].includes(parsed.provider)||track.provider!==parsed.provider)fail('LAVALINK_SOURCE');
  this.#enabled(parsed!.provider);if(signal?.aborted)fail('LAVALINK_ABORTED');await this.#verifyNode();
  const result=object(await this.#request('GET','/v4/loadtracks?identifier='+encodeURIComponent(parsed!.reference),undefined,signal)),data=object(result?.data),metadata=this.#metadata(data,parsed!.provider);
  musicTrace('provider.load.result',{reference:parsed!.reference,loadType:result?.loadType as string});
  if(result?.loadType!=='track'||!metadata||metadata.reference!==parsed!.reference||!text(data?.encoded,65536))fail('LAVALINK_SOURCE');
  if(['youtube','youtube_music'].includes(track.provider)&&!sameMusicRecording(track,metadata!))fail('LAVALINK_TRACK_CHANGED');
  const handle=Object.freeze({});this.#tracks.set(handle,{encoded:data!.encoded as string,seekable:metadata!.seekable,length:metadata!.durationMs??0});return handle;
 }
 async updateSession(options:{resuming:boolean;timeout:number},signal?:AbortSignal):Promise<LavalinkAcknowledgement>{
  if(typeof options.resuming!=='boolean'||!integer(options.timeout,0,3600))fail('LAVALINK_INPUT');
  const body={resuming:options.resuming,timeout:options.timeout};
  // Session settings are also ordered; no player revision applies to these global settings.
  return this.#serial('$session',async()=>{if(this.#uncertain.has('$session'))fail('LAVALINK_UNCERTAIN');try{const result=object(await this.#request('PATCH','/v4/sessions/'+this.#sessionId,body,signal));if(typeof result?.resuming!=='boolean'||!integer(result.timeout,0,3600))fail('LAVALINK_RESPONSE');return ack();}catch(error){if(!(error instanceof LavalinkBoundaryError)||!['LAVALINK_HTTP','LAVALINK_ABORTED'].includes(error.code))this.#uncertain.add('$session');throw error;}});
 }
 #serial<T>(key:string,work:()=>Promise<T>):Promise<T>{const operation=(this.#tails.get(key)??Promise.resolve()).catch(()=>{}).then(work);this.#tails.set(key,operation);void operation.finally(()=>{if(this.#tails.get(key)===operation)this.#tails.delete(key);}).catch(()=>{});return operation;}
 #fence(input:MusicTransportFence):MusicTransportFence {if(!snowflake(input.guildId)||!integer(input.revision,0,Number.MAX_SAFE_INTEGER)||!integer(input.generation,0,Number.MAX_SAFE_INTEGER))fail('LAVALINK_FENCE');return{guildId:input.guildId,revision:input.revision,generation:input.generation};}
 async #current(fence:MusicTransportFence,allowUncertain=false){
  if(!allowUncertain&&this.#uncertain.has(fence.guildId))fail('LAVALINK_UNCERTAIN');
  let current=false;try{current=await this.#isCurrent({...fence},allowUncertain?'read':'write');}catch{fail('LAVALINK_FENCE');}
  if(current!==true||!same(this.#latest.get(fence.guildId)!,fence))fail('LAVALINK_STALE');
 }
 #mutate(fenceInput:MusicTransportFence,work:()=>Promise<void>,signal?:AbortSignal):Promise<LavalinkAcknowledgement>{
  const fence=this.#fence(fenceInput),prior=this.#latest.get(fence.guildId);
  if(prior&&(fence.revision<prior.revision||fence.generation<prior.generation||fence.revision===prior.revision&&fence.generation!==prior.generation))return Promise.reject(new LavalinkBoundaryError('LAVALINK_STALE'));
  this.#latest.set(fence.guildId,fence);
  return this.#serial(fence.guildId,async()=>{
   await this.#current(fence);if(signal?.aborted)fail('LAVALINK_ABORTED');
   try{await work();}catch(error){if(!(error instanceof LavalinkBoundaryError)||!['LAVALINK_HTTP','LAVALINK_ABORTED'].includes(error.code))this.#uncertain.add(fence.guildId);throw error;}
   await this.#current(fence);return ack();
  });
 }
 updatePlayer(fenceInput:MusicTransportFence,patch:LavalinkPlayerPatch,signal?:AbortSignal):Promise<LavalinkAcknowledgement>{
  const fence=this.#fence(fenceInput),body:Record<string,unknown>={};
  // Reject unknown transport fields instead of allowing raw identifier/plugin/filter bypasses.
  if(!object(patch)||Object.keys(patch).some(key=>!['track','entryId','position','paused','volume','voice'].includes(key)))fail('LAVALINK_INPUT');
  if(patch.entryId!==undefined&&(!text(patch.entryId,100)||!/^[-a-zA-Z0-9_]+$/.test(patch.entryId)||!patch.track))fail('LAVALINK_INPUT');
  if(patch.track!==undefined){const track=patch.track===null?null:this.#tracks.get(patch.track);if(patch.track!==null&&!track)fail('LAVALINK_TRACK');body.track={encoded:track?.encoded??null,...(patch.entryId?{userData:{ajMusic:{entryId:patch.entryId,generation:fence.generation}}}:{})};if(patch.position!==undefined&&patch.position>0&&(!track?.seekable||patch.position>=track.length))fail('LAVALINK_POSITION');}
  if(patch.position!==undefined){if(!integer(patch.position,0,604800000))fail('LAVALINK_POSITION');body.position=patch.position;}
  if(patch.paused!==undefined){if(typeof patch.paused!=='boolean')fail('LAVALINK_INPUT');body.paused=patch.paused;}
  if(patch.volume!==undefined){if(!integer(patch.volume,1,100))fail('LAVALINK_VOLUME');body.volume=patch.volume;}
  if(patch.voice!==undefined){const voice=patch.voice;if(!object(voice)||!text(voice.token,2048)||!text(voice.sessionId,256)||!snowflake(voice.channelId)||!text(voice.endpoint,255)||!/^[a-zA-Z0-9.-]+(?::\d{1,5})?$/.test(voice.endpoint))fail('LAVALINK_VOICE');body.voice={token:voice.token,endpoint:voice.endpoint,sessionId:voice.sessionId,channelId:voice.channelId};}
  if(!Object.keys(body).length)fail('LAVALINK_INPUT');
  musicTrace('player.update.start',{guildId:fence.guildId,hasTrack:patch.track!==undefined&&patch.track!==null,voiceReady:patch.voice!==undefined});
  return this.#mutate(fence,async()=>{const response=object(await this.#request('PATCH','/v4/sessions/'+this.#sessionId+'/players/'+fence.guildId+'?noReplace=false',body,signal));if(response?.guildId!==fence.guildId)fail('LAVALINK_RESPONSE');},signal);
 }
 destroyPlayer(fenceInput:MusicTransportFence,signal?:AbortSignal):Promise<LavalinkAcknowledgement>{const fence=this.#fence(fenceInput);return this.#mutate(fence,async()=>{await this.#request('DELETE','/v4/sessions/'+this.#sessionId+'/players/'+fence.guildId,undefined,signal);},signal);}
 /**
  * Pause/resume do not emit dedicated WebSocket events. The worker may combine this
  * projection with a confirmed TrackStart binding for the same entry and generation.
  * Reads may inspect an uncertain player for recovery, but NEVER clear the write block.
  */
 readPlayer(fenceInput:MusicTransportFence,signal?:AbortSignal):Promise<LavalinkPlayerObservation>{
  const fence=this.#fence(fenceInput),prior=this.#latest.get(fence.guildId);
  if(prior&&(fence.revision<prior.revision||fence.generation<prior.generation||fence.revision===prior.revision&&fence.generation!==prior.generation))return Promise.reject(new LavalinkBoundaryError('LAVALINK_STALE'));
  this.#latest.set(fence.guildId,fence);
  return this.#serial(fence.guildId,async()=>{
   await this.#current(fence,true);
   const response=object(await this.#request('GET','/v4/sessions/'+this.#sessionId+'/players/'+fence.guildId,undefined,signal)),state=object(response?.state);
   if(response?.guildId!==fence.guildId||typeof response.paused!=='boolean'||!state||typeof state.connected!=='boolean'||!integer(state.position,0,604800000)||!integer(state.time,0,8640000000000000))fail('LAVALINK_RESPONSE');
   let track:LavalinkPlayerObservation['track']=null;
   if(response!.track!==null){const data=object(object(response!.track)?.userData),correlation=object(data?.ajMusic);if(!correlation||!text(correlation.entryId,100)||!/^[-a-zA-Z0-9_]+$/.test(correlation.entryId)||!integer(correlation.generation,0,Number.MAX_SAFE_INTEGER))fail('LAVALINK_RESPONSE');track={entryId:correlation!.entryId as string,generation:correlation!.generation as number};}
   await this.#current(fence,true);
   musicTrace('player.observed',{guildId:fence.guildId,connected:state!.connected as boolean,hasTrack:track!==null});
   return{guildId:fence.guildId,paused:response!.paused as boolean,connected:state!.connected as boolean,positionMs:state!.position as number,at:state!.time as number,track};
  });
 }
}
