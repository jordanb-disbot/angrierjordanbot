import {isIP} from 'node:net';
import {DomainError} from '../../core/src/errors.js';
import type {MusicMetadata} from './interfaces.js';

export const CATALOG_AUDIO_FORMATS=['mp3','ogg','opus','aac','m4a','flac','wav'] as const;
export type CatalogAudioFormat=typeof CATALOG_AUDIO_FORMATS[number];
export type CatalogProvenanceKind='owner-supplied'|'licensed'|'permission-granted'|'public-domain';
export interface CatalogEntryInput {
 id:string;title:string;artist:string;album?:string|null;durationMs:number;artworkUrl?:string|null;
 authorizedAudioUri:string;format:CatalogAudioFormat;provenance:{kind:CatalogProvenanceKind;reference:string};
 externalMetadataLinks?:readonly string[];enabled:boolean;availability:'available'|'unavailable';seekable?:boolean;
}
export interface PublicCatalogTrack {id:string;metadata:MusicMetadata;sourceLabel:'Owner-supplied catalog';externalMetadataLinks:string[];}
export type CatalogUnavailableReason='unknown-track'|'disabled'|'unavailable'|'no-authorized-match'|'invalid-reference';
export interface CatalogUnavailable {status:'unavailable';reason:CatalogUnavailableReason;notice:{title:'Track unavailable';message:string;};}
export type CatalogMatch={status:'available';track:PublicCatalogTrack}|CatalogUnavailable;
export interface CatalogAutocompleteChoice {name:string;value:string;}
export interface ExternalRecordingReference {key:string;publicUrl:string;}
const inspect=Symbol.for('nodejs.util.inspect.custom');
const fail=(code:string,message:string):never=>{throw new DomainError(code,message);};
const text=(value:unknown,max:number)=>{if(typeof value!=='string'||!value.trim()||value.length>max||/[\u0000-\u001f]/.test(value))fail('MUSIC_CATALOG_METADATA','A catalog field is missing or invalid.');return(value as string).trim();};
const stableId=(value:unknown)=>{if(typeof value!=='string'||!/^[-a-zA-Z0-9_]{1,80}$/.test(value)||['__proto__','constructor','prototype'].includes(value))fail('MUSIC_CATALOG_ID','Each catalog track needs a unique stable ID of 1–80 letters, numbers, underscores or hyphens.');return value as string;};
const unavailableMessages:Record<CatalogUnavailableReason,string>={
 'unknown-track':'This catalog track is not available. Choose a current result from /play.',
 disabled:'This track is disabled in the authorized catalog. Choose another track.',
 unavailable:'This track is temporarily unavailable in the authorized catalog. Choose another track.',
 'no-authorized-match':'This reference has no exact authorized catalog match. Its provider link does not supply playable audio. Choose an available catalog track.',
 'invalid-reference':'This reference could not be matched safely. Choose a catalog result or a supported public recording link.'
};
export function catalogUnavailable(reason:CatalogUnavailableReason):CatalogUnavailable{return{status:'unavailable',reason,notice:{title:'Track unavailable',message:unavailableMessages[reason]}};}
function publicUrl(value:string):URL {let url:URL;try{url=new URL(value);}catch{return fail('MUSIC_CATALOG_REFERENCE','Use a supported public HTTPS recording link.');}if(url.protocol!=='https:'||url.username||url.password||url.port||url.hash||value.length>2048)fail('MUSIC_CATALOG_REFERENCE','Use a supported public HTTPS recording link without private credentials.');return url;}
function safeQuery(url:URL,allowed:readonly string[]){for(const key of url.searchParams.keys())if(!allowed.includes(key.toLowerCase())&&!['si','feature','utm_source','utm_medium','utm_campaign','utm_content','utm_term'].includes(key.toLowerCase()))fail('MUSIC_CATALOG_REFERENCE','This recording link includes unsupported or private parameters.');}
/** Pure exact recording-ID normalization. No search, fetch, redirect following, scraping or audio resolution. */
export function externalRecordingReference(value:string):ExternalRecordingReference {
 const url=publicUrl(value),host=url.hostname.toLowerCase(),path=url.pathname.replace(/\/$/,'');
 if(host==='open.spotify.com'){
  safeQuery(url,[]);const match=/^(?:\/intl-[a-z]{2})?\/track\/([A-Za-z0-9]{22})$/.exec(path);if(!match)fail('MUSIC_CATALOG_REFERENCE','Use a Spotify track reference, not a collection or shortened link.');return{key:'spotify:'+match![1],publicUrl:'https://open.spotify.com/track/'+match![1]};
 }
 if(['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com','youtu.be'].includes(host)){
  safeQuery(url,['v','t']);let id:string|null=null;if(host==='youtu.be'){const m=/^\/([A-Za-z0-9_-]{11})$/.exec(path);id=m?.[1]??null;}else if(path==='/watch'){if(url.searchParams.getAll('v').length!==1)fail('MUSIC_CATALOG_REFERENCE','Choose one public recording reference.');id=url.searchParams.get('v');}else{const m=/^\/(?:shorts|embed)\/([A-Za-z0-9_-]{11})$/.exec(path);id=m?.[1]??null;}
  if(!id||!/^[A-Za-z0-9_-]{11}$/.test(id))fail('MUSIC_CATALOG_REFERENCE','Use a YouTube recording reference, not a collection or shortened link.');return{key:'youtube:'+id,publicUrl:'https://www.youtube.com/watch?v='+id};
 }
 if(host==='music.apple.com'){
  safeQuery(url,['i']);let id:string|null=null;if(url.searchParams.has('i')){if(url.searchParams.getAll('i').length!==1||!/^\/[a-z]{2}\/album\/(?:[^/]+\/)?\d+$/.test(path))fail('MUSIC_CATALOG_REFERENCE','Choose one Apple Music song reference.');id=url.searchParams.get('i');}else{const m=/^\/[a-z]{2}\/song\/(?:[^/]+\/)?(\d+)$/.exec(path);id=m?.[1]??null;}
  if(!id||!/^\d{1,20}$/.test(id))fail('MUSIC_CATALOG_REFERENCE','Use an Apple Music song reference, not an album without a selected song.');return{key:'apple_music:'+id,publicUrl:`https://music.apple.com/${path.split('/')[1]}/song/${id}`};
 }
 if(host==='soundcloud.com'||host==='www.soundcloud.com'){
  safeQuery(url,[]);if(!/^\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+$/.test(path)||/^\/(?:discover|charts|you|stream|search|sets)\//.test(path))fail('MUSIC_CATALOG_REFERENCE','Use a public SoundCloud recording reference, not a collection or shortened link.');return{key:'soundcloud:'+path,publicUrl:'https://soundcloud.com'+path};
 }
 return fail('MUSIC_CATALOG_REFERENCE','This public reference provider is not supported.');
}
function artwork(value:unknown){if(value===undefined||value===null)return null;if(typeof value!=='string')return fail('MUSIC_CATALOG_ARTWORK','Use public HTTPS artwork without private credentials.');const url=publicUrl(value);for(const key of url.searchParams.keys())if(!['w','h','width','height','fit','format','fm','q','auto'].includes(key.toLowerCase()))fail('MUSIC_CATALOG_ARTWORK','Artwork cannot contain signed or private query parameters.');if(localHost(url.hostname))fail('MUSIC_CATALOG_ARTWORK','Artwork must use a public host.');return url.href;}
function localHost(host:string){const normalized=host.replace(/^\[|\]$/g,'').toLowerCase();return normalized==='localhost'||normalized.endsWith('.localhost')||normalized.endsWith('.local')||normalized.endsWith('.internal')||!normalized.includes('.')||isIP(normalized)!==0;}
function privateAudioUri(value:unknown){const uri=text(value,8192);let url:URL;try{url=new URL(uri);}catch{return fail('MUSIC_CATALOG_SOURCE','The authorized audio location is invalid.');}if(!['https:','http:'].includes(url.protocol)||url.username||url.password||url.hash||localHost(url.hostname))fail('MUSIC_CATALOG_SOURCE','Use an authorized public HTTP or HTTPS audio location without URI user credentials.');return url.href;}

/** Private fields resist accidental JSON/string/inspect logging. Only the transport may call readUriForTransport. */
export class AuthorizedCatalogLocation {
 readonly #uri:string;readonly #provenance:{kind:CatalogProvenanceKind;reference:string};
 readonly trackId:string;readonly format:CatalogAudioFormat;readonly durationMs:number;readonly seekable:boolean;
 constructor(trackId:string,uri:string,format:CatalogAudioFormat,durationMs:number,seekable:boolean,provenance:{kind:CatalogProvenanceKind;reference:string}){this.trackId=trackId;this.#uri=uri;this.format=format;this.durationMs=durationMs;this.seekable=seekable;this.#provenance={...provenance};Object.freeze(this);}
 readUriForTransport(){return this.#uri;}
 readProvenanceForAuthorizedAdministration(){return{...this.#provenance};}
 toJSON(){return{trackId:this.trackId,format:this.format,privateSource:'[redacted]'};}
 toString(){return'[Authorized catalog source: redacted]';}
 [inspect](){return this.toString();}
}
interface StoredCatalogTrack {track:PublicCatalogTrack;enabled:boolean;availability:'available'|'unavailable';location:AuthorizedCatalogLocation;}
function copyPublic(value:PublicCatalogTrack):PublicCatalogTrack{return{id:value.id,metadata:{...value.metadata},sourceLabel:'Owner-supplied catalog',externalMetadataLinks:[...value.externalMetadataLinks]};}
/** Owner-approved catalog only. Metadata-provider recognition never grants playable-source authority. */
export class AuthorizedMusicCatalog {
 readonly #entries=new Map<string,StoredCatalogTrack>();readonly #references=new Map<string,string>();
 constructor(input:readonly CatalogEntryInput[]){
  if(!Array.isArray(input)||input.length>10000)fail('MUSIC_CATALOG_LIMIT','The authorized catalog must contain at most 10,000 tracks.');
  for(const raw of input){if(!raw||typeof raw!=='object')fail('MUSIC_CATALOG_METADATA','A catalog entry is invalid.');const id=stableId(raw.id);if(this.#entries.has(id))fail('MUSIC_CATALOG_ID','Catalog track IDs must be unique.');
   const title=text(raw.title,300),artist=text(raw.artist,300),album=raw.album===undefined||raw.album===null?null:text(raw.album,300);if(!Number.isSafeInteger(raw.durationMs)||raw.durationMs<1||raw.durationMs>604800000)fail('MUSIC_CATALOG_DURATION','Catalog duration must be a positive number of milliseconds, at most seven days.');
   if(!CATALOG_AUDIO_FORMATS.includes(raw.format)||typeof raw.enabled!=='boolean'||!['available','unavailable'].includes(raw.availability)||raw.seekable!==undefined&&typeof raw.seekable!=='boolean')fail('MUSIC_CATALOG_METADATA','A catalog entry has an invalid format, availability or control capability.');
   if(!raw.provenance||!['owner-supplied','licensed','permission-granted','public-domain'].includes(raw.provenance.kind))fail('MUSIC_CATALOG_PROVENANCE','Each catalog track needs its declared authorization provenance.');const provenance={kind:raw.provenance.kind,reference:text(raw.provenance.reference,1000)};
   const links=raw.externalMetadataLinks??[];if(!Array.isArray(links)||links.length>20||links.some(link=>typeof link!=='string'))fail('MUSIC_CATALOG_REFERENCE','Use at most 20 public metadata references per track.');const normalized=links.map(externalRecordingReference),seen=new Set<string>();for(const reference of normalized){if(seen.has(reference.key))continue;seen.add(reference.key);if(this.#references.has(reference.key))fail('MUSIC_CATALOG_AMBIGUOUS','A public recording reference cannot select two different catalog tracks.');this.#references.set(reference.key,id);}
   const metadata:MusicMetadata={provider:'authorized_catalog',reference:'catalog:'+id,title,artist,album,durationMs:raw.durationMs,artworkUrl:artwork(raw.artworkUrl),seekable:raw.seekable??false},track:PublicCatalogTrack={id,metadata,sourceLabel:'Owner-supplied catalog',externalMetadataLinks:[...new Set(normalized.map(link=>link.publicUrl))]};
   this.#entries.set(id,{track,enabled:raw.enabled,availability:raw.availability,location:new AuthorizedCatalogLocation(id,privateAudioUri(raw.authorizedAudioUri),raw.format,raw.durationMs,metadata.seekable,provenance)});
  }
 }
 #byId(id:string):CatalogMatch {const value=this.#entries.get(id);if(!value)return catalogUnavailable('unknown-track');if(!value.enabled)return catalogUnavailable('disabled');if(value.availability!=='available')return catalogUnavailable('unavailable');return{status:'available',track:copyPublic(value.track)};}
 resolve(reference:string):CatalogMatch {
  if(typeof reference!=='string'||reference.length>2048)return catalogUnavailable('invalid-reference');const value=reference.trim();if(value.startsWith('catalog:'))return this.#byId(value.slice(8));if(this.#entries.has(value))return this.#byId(value);
  let key:string;try{key=externalRecordingReference(value).key;}catch{return catalogUnavailable('invalid-reference');}const id=this.#references.get(key);return id?this.#byId(id):catalogUnavailable('no-authorized-match');
 }
 /** Search is discovery only. A selected stable ID is required before anything can enter a queue. */
 search(query:string,limit=25):PublicCatalogTrack[] {if(typeof query!=='string'||query.length>300||/[\u0000-\u001f]/.test(query)||!Number.isSafeInteger(limit)||limit<1||limit>25)fail('MUSIC_CATALOG_SEARCH','Use a search of at most 300 characters and up to 25 choices.');const normalized=query.trim().normalize('NFKC').toLowerCase(),tokens=normalized.split(/\s+/).filter(Boolean);return[...this.#entries.values()].filter(value=>value.enabled&&value.availability==='available'&&tokens.every(token=>`${value.track.id} ${value.track.metadata.title} ${value.track.metadata.artist} ${value.track.metadata.album??''}`.normalize('NFKC').toLowerCase().includes(token))).sort((a,b)=>{const exact=(value:StoredCatalogTrack)=>Number(value.track.id.toLowerCase()===normalized||value.track.metadata.title.normalize('NFKC').toLowerCase()===normalized);return exact(b)-exact(a)||a.track.metadata.title.localeCompare(b.track.metadata.title,'en')||a.track.id.localeCompare(b.track.id,'en');}).slice(0,limit).map(value=>copyPublic(value.track));}
 autocomplete(query:string):CatalogAutocompleteChoice[]{return this.search(query,25).map(track=>({name:`${track.metadata.title} — ${track.metadata.artist}`.slice(0,100),value:'catalog:'+track.id}));}
 /** Call only after current catalog availability is rechecked at transport dispatch. */
 authorizedLocation(reference:string):AuthorizedCatalogLocation {const match=this.resolve(reference);if(match.status!=='available')return fail('MUSIC_CATALOG_UNAVAILABLE',match.notice.message);return this.#entries.get(match.track.id)!.location;}
 toJSON(){return{source:'Owner-supplied catalog',trackCount:this.#entries.size,privateSources:'[redacted]'};}
 toString(){return'[Authorized music catalog: private sources redacted]';}
 [inspect](){return this.toString();}
}

/** Local loader boundary. Raw JSON parse diagnostics can contain secret-bearing source snippets. */
export function parseAuthorizedCatalogDocument(input:unknown):AuthorizedMusicCatalog {
 let document:unknown=input;
 if(typeof input==='string'){
  if(input.length>16*1024*1024)fail('MUSIC_CATALOG_DOCUMENT','The local catalog document exceeds the 16 MiB text limit.');
  try{document=JSON.parse(input);}catch{return fail('MUSIC_CATALOG_DOCUMENT','The local catalog document is not valid JSON. No source contents were logged.');}
 }
 if(!document||typeof document!=='object'||Array.isArray(document)||!('schemaVersion'in document)||document.schemaVersion!==1||!('tracks'in document)||!Array.isArray(document.tracks))fail('MUSIC_CATALOG_DOCUMENT','Use a catalog document with schemaVersion 1 and a tracks array.');
 return new AuthorizedMusicCatalog((document as {tracks:CatalogEntryInput[]}).tracks);
}
