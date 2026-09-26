import {DomainError} from '../../core/src/index.js';
import {validateMusicMetadata} from './domain.js';
import type {MusicMetadata} from './interfaces.js';
import {normalizeMusicReference,safeMusicArtworkUrl} from './provider-references.js';

export function publicMusicMetadata(input:MusicMetadata):MusicMetadata {
 const track=validateMusicMetadata(input);
 if(track.provider==='authorized_catalog'){
  if(!/^catalog:[A-Za-z0-9][A-Za-z0-9._-]*$/.test(track.reference))throw new DomainError('MUSIC_METADATA','Invalid direct-audio reference.');
  return{...track,artworkUrl:safeMusicArtworkUrl(track.artworkUrl)};
 }
 const ref=normalizeMusicReference(track.reference);
 if(!ref||ref.kind!=='track'||ref.provider!==track.provider&&!(['youtube','youtube_music'].includes(ref.provider)&&['youtube','youtube_music'].includes(track.provider)))throw new DomainError('MUSIC_METADATA','Invalid public recording reference.');
 return{...track,reference:ref.reference,artworkUrl:safeMusicArtworkUrl(track.artworkUrl)};
}

export const MUSIC_SEARCH_ORDER=['youtube_music','youtube','soundcloud'] as const;
export type MusicSearchSource=typeof MUSIC_SEARCH_ORDER[number];
export interface MusicSearchRequest {text:string;isrc?:string;}
/** Adapter returns public metadata only. No encoded tracks, transient URIs or plugin objects. */
export interface MusicResolutionProvider {
 search(source:MusicSearchSource,query:MusicSearchRequest,limit:number,signal:AbortSignal):Promise<MusicMetadata[]>;
 resolve(reference:string,limit:number,signal:AbortSignal):Promise<{tracks:MusicMetadata[];truncated:boolean}>;
}
export interface MusicMatch {track:MusicMetadata;score:number;automatic:boolean;reason:string;}
export type MusicPlaybackResolution=
 |{kind:'matched';requested:MusicMetadata;playable:MusicMetadata;method:'isrc'|'metadata'|'direct'}
 |{kind:'choices';requested:MusicMetadata;choices:MusicMatch[]}
 |{kind:'unavailable';requested:MusicMetadata};
const normalize=(value:string)=>value.normalize('NFKC').toLowerCase().replace(/\b(?:official (?:music )?(?:video|audio)|lyrics? video)\b/g,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const artist=(value:string)=>normalize(value.replace(/\s*-\s*topic$/i,''));
function variants(value:string){const s=normalize(value),result:string[]=[];for(const [key,pattern] of [['live',/\blive\b/],['remix',/\bremix(?:ed)?\b/],['cover',/\bcover\b/],['karaoke',/\bkaraoke\b/],['instrumental',/\binstrumental\b/],['sped',/\bsped up\b|\bnightcore\b/],['slowed',/\bslowed\b/],['acoustic',/\bacoustic\b/],['remaster',/\bremaster(?:ed)?\b/],['clean',/\bclean\b/]] as const)if(pattern.test(s))result.push(key);return result.join('|');}
const key=(track:MusicMetadata)=>JSON.stringify([track.provider,track.reference]);
const playable=(track:MusicMetadata)=>['youtube','youtube_music','soundcloud','authorized_catalog'].includes(track.provider);
/** Conservative identity matching; search relevance alone is never proof of a recording match. */
export function scoreMusicMatch(request:MusicMetadata,candidate:MusicMetadata):MusicMatch {
 const wanted=validateMusicMetadata(request),track=validateMusicMetadata(candidate);
 const reject=(reason:string):MusicMatch=>({track,score:0,automatic:false,reason});
 if(!playable(track))return reject('not-playable');
 if(wanted.isrc&&track.isrc&&wanted.isrc!==track.isrc)return reject('different-isrc');
 if(variants(wanted.title)!==variants(track.title))return reject('different-version');
 if(wanted.explicit!=null&&track.explicit!=null&&wanted.explicit!==track.explicit)return reject('different-explicit-version');
 const durationKnown=wanted.durationMs!==null&&track.durationMs!==null;
 if(durationKnown&&Math.abs(wanted.durationMs!-track.durationMs!)>Math.max(5000,wanted.durationMs!*.03))return reject('different-duration');
 const sameIsrc=Boolean(wanted.isrc&&wanted.isrc===track.isrc),title=normalize(wanted.title)===normalize(track.title),sameArtist=artist(wanted.artist)===artist(track.artist),album=Boolean(wanted.album&&track.album&&normalize(wanted.album)===normalize(track.album));
 // ISRC is strongest, but contradictory titles/artists or missing duration still need review.
 const automatic=durationKnown&&title&&sameArtist;
 const score=(sameIsrc?50:0)+(title?25:0)+(sameArtist?20:0)+(durationKnown?10:0)+(album?5:0);
 return{track,score,automatic,reason:sameIsrc?'isrc':automatic?'metadata':'needs-selection'};
}
export class MusicResolutionService {
 constructor(private provider:MusicResolutionProvider){}
 /** Deliberate autoplay: same artist, compatible version, no recent recording repeats. */
 async recommendations(after:MusicMetadata,excludedRefs:readonly string[],signal:AbortSignal):Promise<MusicMetadata[]>{
  const seed=publicMusicMetadata(after),excluded=new Set([...excludedRefs,seed.reference]);
  const rows=await this.search(seed.artist,25,signal);
  return rows.filter(track=>!excluded.has(track.reference)&&track.durationMs!==null&&artist(track.artist)===artist(seed.artist)&&variants(track.title)===variants(seed.title)&&(seed.explicit==null||track.explicit==null||seed.explicit===track.explicit)&&normalize(track.title)!==normalize(seed.title)).slice(0,5);
 }
 async resolveReference(reference:string,limit:number,signal:AbortSignal):Promise<{tracks:MusicMetadata[];truncated:boolean}>{
  if(!Number.isSafeInteger(limit)||limit<1||limit>1000||reference.length>2048||/[\u0000-\u001f]/.test(reference))throw new DomainError('MUSIC_QUERY','Choose a supported music reference.');
  if(signal.aborted)throw new DomainError('MUSIC_CANCELLED','The request was cancelled.');
  try{const result=await this.provider.resolve(reference,limit,signal);if(signal.aborted)throw new Error();return{tracks:result.tracks.slice(0,limit).map(publicMusicMetadata),truncated:result.truncated||result.tracks.length>limit};}catch{throw new DomainError(signal.aborted?'MUSIC_CANCELLED':'MUSIC_UNAVAILABLE',signal.aborted?'The request was cancelled.':'This music reference is unavailable.');}
 }
 async search(text:string,limit:number,signal:AbortSignal):Promise<MusicMetadata[]>{
  if(!text.trim()||text.length>300||/[\u0000-\u001f]/.test(text)||!Number.isSafeInteger(limit)||limit<1||limit>25)throw new DomainError('MUSIC_QUERY','Enter a song or artist name.');
  const found=new Map<string,MusicMetadata>();
  for(const source of MUSIC_SEARCH_ORDER){
   // Autocomplete can exhaust its deadline while filling remaining result slots.
   // Keep prior validated choices on a timeout; explicit cancellation still wins.
   if(signal.aborted){if(found.size>0&&signal.reason?.name==='TimeoutError')break;throw new DomainError('MUSIC_CANCELLED','The search was cancelled.');}
   let rows:MusicMetadata[];try{rows=await this.provider.search(source,{text:text.trim()},limit,signal);}catch{if(signal.aborted){if(found.size>0&&signal.reason?.name==='TimeoutError')break;throw new DomainError('MUSIC_CANCELLED','The search was cancelled.');}continue;}
   for(const row of rows.slice(0,limit)){try{const track=publicMusicMetadata(row);if(playable(track)&&!found.has(key(track)))found.set(key(track),track);}catch{}}
   if(found.size>=limit)break;
  }
  return[...found.values()].slice(0,limit);
 }
 async resolvePlayback(input:MusicMetadata,signal:AbortSignal):Promise<MusicPlaybackResolution>{
  const requested=publicMusicMetadata(input);
  if(signal.aborted)throw new DomainError('MUSIC_CANCELLED','The request was cancelled.');
  if(playable(requested))return{kind:'matched',requested,playable:requested,method:'direct'};
  if(!['spotify','applemusic'].includes(requested.provider))return{kind:'unavailable',requested};
  const matches=new Map<string,MusicMatch>();
  const queries:MusicSearchRequest[]=[...(requested.isrc?[{text:requested.isrc,isrc:requested.isrc}]:[]),{text:requested.title+' '+requested.artist}];
  for(const query of queries)for(const source of MUSIC_SEARCH_ORDER){
   if(signal.aborted)throw new DomainError('MUSIC_CANCELLED','The request was cancelled.');
   let rows:MusicMetadata[];try{rows=await this.provider.search(source,query,10,signal);}catch{if(signal.aborted)throw new DomainError('MUSIC_CANCELLED','The request was cancelled.');continue;}
   for(const row of rows.slice(0,10)){try{const match=scoreMusicMatch(requested,publicMusicMetadata(row));if(match.score>0){const prior=matches.get(key(match.track));if(!prior||match.score>prior.score)matches.set(key(match.track),match);}}catch{}}
  }
  // Stable insertion order preserves provider preference only after identity scoring.
  const ranked=[...matches.values()].sort((a,b)=>b.score-a.score).slice(0,25),best=ranked[0];
  if(!best)return{kind:'unavailable',requested};
  const runner=ranked[1];
  if(best.automatic&&(!runner||best.score-runner.score>=10))return{kind:'matched',requested,playable:best.track,method:best.reason==='isrc'?'isrc':'metadata'};
  return{kind:'choices',requested,choices:ranked};
 }
}
