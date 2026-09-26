import type {MusicTransportFence} from '../../../../packages/features-music/src/interfaces.js';

/** A transport acknowledgement is not a Discord voice/playback observation. */
export interface LavalinkAcknowledgement {accepted:true;}
/** Opaque, process-local capability. Its encoded track is never enumerable or serializable. */
export interface LavalinkTrackHandle {readonly __lavalinkTrack?:never;}
export interface LavalinkVoiceState {token:string;endpoint:string;sessionId:string;channelId:string;}
export interface LavalinkPlayerPatch {track?:LavalinkTrackHandle|null;entryId?:string;position?:number;paused?:boolean;volume?:number;voice?:LavalinkVoiceState;}
export interface LavalinkClientOptions {
 endpoint:string;password:string;sessionId:string;fetch:typeof globalThis.fetch;
 resolveCatalogSource:(catalogId:string)=>Promise<{uri:string}>;
 isCurrent:(fence:MusicTransportFence)=>Promise<boolean>;
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
 * Lavalink v4 REST only: no gateway connection, audio extraction, or search endpoints.
 * The resolver is trusted operator catalog code, not an adapter around member URLs.
 * The node deployment MUST restrict HTTP-source DNS, redirects and egress to authorized
 * catalog origins (including rebinding/private-address protection). REST redirect:error
 * controls the node API request only, not Lavalink's later source fetches.
 * One client owns a ready session. Multi-process execution additionally needs the shared
 * durable worker lease. Uncertain mutations fail closed until node/session reconciliation.
 */
export class LavalinkRestClient {
 #origin:string;#password:string;#sessionId:string;#fetch:typeof globalThis.fetch;
 #resolve:LavalinkClientOptions['resolveCatalogSource'];#isCurrent:LavalinkClientOptions['isCurrent'];#timeout:number;
 #tracks=new WeakMap<LavalinkTrackHandle,{encoded:string;seekable:boolean;length:number}>();
 #tails=new Map<string,Promise<unknown>>();#latest=new Map<string,MusicTransportFence>();#uncertain=new Set<string>();
 constructor(options:LavalinkClientOptions){
  let endpoint:URL;try{endpoint=new URL(options.endpoint);}catch{fail('LAVALINK_CONFIG');}
  if(!text(options.endpoint,2048)||endpoint!.username||endpoint!.password||endpoint!.search||endpoint!.hash||endpoint!.pathname!=='/'||!(endpoint!.protocol==='https:'||options.allowInsecureHttp===true&&endpoint!.protocol==='http:'))fail('LAVALINK_CONFIG');
  if(endpoint!.protocol==='http:'&&!privateHost(endpoint!.hostname))fail('LAVALINK_CONFIG');
  if(!text(options.password,1024)||!text(options.sessionId,128)||!/^[a-zA-Z0-9_-]+$/.test(options.sessionId)||typeof options.fetch!=='function'||typeof options.resolveCatalogSource!=='function'||typeof options.isCurrent!=='function')fail('LAVALINK_CONFIG');
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
 async loadCatalogTrack(catalogId:string,signal?:AbortSignal):Promise<LavalinkTrackHandle>{
  if(!text(catalogId,128)||!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(catalogId))fail('LAVALINK_CATALOG');
  if(signal?.aborted)fail('LAVALINK_ABORTED');
  let source:{uri:string};try{source=await this.#resolve(catalogId);}catch{fail('LAVALINK_SOURCE');}
  let uri:URL;try{if(!text(source!.uri,4096))throw Error();uri=new URL(source!.uri);if(!['https:','http:'].includes(uri.protocol)||uri.username||uri.password||uri.hash)throw Error();}catch{fail('LAVALINK_SOURCE');}
  const result=object(await this.#request('GET','/v4/loadtracks?identifier='+encodeURIComponent(uri!.href),undefined,signal)),data=object(result?.data),info=object(data?.info);
  if(result?.loadType!=='track'||!text(data?.encoded,65536)||info?.sourceName!=='http'||typeof info.isSeekable!=='boolean'||!integer(info.length,0,604800000))fail('LAVALINK_SOURCE');
  const handle=Object.freeze({});this.#tracks.set(handle,{encoded:data!.encoded as string,seekable:info!.isSeekable as boolean,length:info!.length as number});return handle;
 }
 async updateSession(options:{resuming:boolean;timeout:number},signal?:AbortSignal):Promise<LavalinkAcknowledgement>{
  if(typeof options.resuming!=='boolean'||!integer(options.timeout,0,3600))fail('LAVALINK_INPUT');
  const body={resuming:options.resuming,timeout:options.timeout};
  // Session settings are also ordered; no player revision applies to these global settings.
  return this.#serial('$session',async()=>{if(this.#uncertain.has('$session'))fail('LAVALINK_UNCERTAIN');try{const result=object(await this.#request('PATCH','/v4/sessions/'+this.#sessionId,body,signal));if(typeof result?.resuming!=='boolean'||!integer(result.timeout,0,3600))fail('LAVALINK_RESPONSE');return ack();}catch(error){if(!(error instanceof LavalinkBoundaryError)||!['LAVALINK_HTTP','LAVALINK_ABORTED'].includes(error.code))this.#uncertain.add('$session');throw error;}});
 }
 #serial<T>(key:string,work:()=>Promise<T>):Promise<T>{const operation=(this.#tails.get(key)??Promise.resolve()).catch(()=>{}).then(work);this.#tails.set(key,operation);void operation.finally(()=>{if(this.#tails.get(key)===operation)this.#tails.delete(key);}).catch(()=>{});return operation;}
 #fence(input:MusicTransportFence):MusicTransportFence {if(!snowflake(input.guildId)||!integer(input.revision,0,Number.MAX_SAFE_INTEGER)||!integer(input.generation,0,Number.MAX_SAFE_INTEGER))fail('LAVALINK_FENCE');return{guildId:input.guildId,revision:input.revision,generation:input.generation};}
 async #current(fence:MusicTransportFence){
  if(this.#uncertain.has(fence.guildId))fail('LAVALINK_UNCERTAIN');
  let current=false;try{current=await this.#isCurrent({...fence});}catch{fail('LAVALINK_FENCE');}
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
  return this.#mutate(fence,async()=>{const response=object(await this.#request('PATCH','/v4/sessions/'+this.#sessionId+'/players/'+fence.guildId+'?noReplace=false',body,signal));if(response?.guildId!==fence.guildId)fail('LAVALINK_RESPONSE');},signal);
 }
 destroyPlayer(fenceInput:MusicTransportFence,signal?:AbortSignal):Promise<LavalinkAcknowledgement>{const fence=this.#fence(fenceInput);return this.#mutate(fence,async()=>{await this.#request('DELETE','/v4/sessions/'+this.#sessionId+'/players/'+fence.guildId,undefined,signal);},signal);}
}
