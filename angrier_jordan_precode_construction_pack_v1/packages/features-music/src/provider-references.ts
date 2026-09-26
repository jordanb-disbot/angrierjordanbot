export type MusicPublicProvider='youtube'|'youtube_music'|'soundcloud'|'spotify'|'applemusic';
export interface MusicPublicReference {provider:MusicPublicProvider;reference:string;kind:'track'|'collection';}
/** Public stable identities only. Redirect/share shorteners, signatures and private links are not references. */
export function normalizeMusicReference(input:string):MusicPublicReference|null {
 if(typeof input!=='string'||input.length>2048||/[\u0000-\u0020\u007f\\]/.test(input))return null;
 let url:URL;try{url=new URL(input);}catch{return null;}
 if(url.protocol!=='https:'||url.username||url.password||url.port||url.hash||/%/.test(url.pathname))return null;
 for(const key of url.searchParams.keys())if(/token|secret|signature|^sig$|auth|credential|policy|expires|^key$|^s$/i.test(key))return null;
 const host=url.hostname,path=url.pathname.replace(/\/$/,''),yt=/^[-a-zA-Z0-9_]{11}$/,list=/^[-a-zA-Z0-9_]{10,100}$/;
 if(['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com','youtu.be'].includes(host)){
  const provider=host==='music.youtube.com'?'youtube_music':'youtube',base=provider==='youtube_music'?'https://music.youtube.com':'https://www.youtube.com';
  const video=host==='youtu.be'?path.slice(1):path==='/watch'?url.searchParams.get('v'):/^\/(?:shorts|live)\/[-a-zA-Z0-9_]{11}$/.test(path)?path.split('/')[2]:null;
  if(video&&yt.test(video)&&url.searchParams.getAll('v').length<=1&&(!host.endsWith('youtu.be')||path==='/'+video))return{provider,reference:base+'/watch?v='+video,kind:'track'};
  const playlist=url.searchParams.get('list');if(host!=='youtu.be'&&path==='/playlist'&&playlist&&list.test(playlist)&&url.searchParams.getAll('list').length===1)return{provider,reference:base+'/playlist?list='+playlist,kind:'collection'};
  return null;
 }
 if(host==='soundcloud.com'||host==='www.soundcloud.com'){
  if(/^\/[a-zA-Z0-9_-]{1,100}\/[a-zA-Z0-9_-]{1,200}$/.test(path)&&!/^\/(?:search|discover|you|stations)\//.test(path)&&!path.endsWith('/sets'))return{provider:'soundcloud',reference:'https://soundcloud.com'+path,kind:'track'};
  if(/^\/[a-zA-Z0-9_-]{1,100}\/sets\/[a-zA-Z0-9_-]{1,200}$/.test(path))return{provider:'soundcloud',reference:'https://soundcloud.com'+path,kind:'collection'};
  return null;
 }
 if(host==='open.spotify.com'){
  const match=/^\/(?:intl-[a-z]{2}\/)?(track|album|playlist)\/([a-zA-Z0-9]{22})$/.exec(path);
  return match?{provider:'spotify',reference:'https://open.spotify.com/'+match[1]+'/'+match[2],kind:match[1]==='track'?'track':'collection'}:null;
 }
 if(host==='music.apple.com'){
  const match=/^\/([a-z]{2})\/(song|album|playlist)\/(?:[a-zA-Z0-9_-]+\/)?([0-9]{1,20}|pl\.[a-zA-Z0-9-]{1,100})$/.exec(path);
  if(!match)return null;const [,country,type,id]=match,trackId=url.searchParams.get('i');
  if(type==='playlist'&&!id!.startsWith('pl.')||type!=='playlist'&&!/^\d+$/.test(id!))return null;
  if(trackId!==null){if(type!=='album'||!/^\d{1,20}$/.test(trackId)||url.searchParams.getAll('i').length!==1)return null;return{provider:'applemusic',reference:`https://music.apple.com/${country}/song/${trackId}`,kind:'track'};}
  return{provider:'applemusic',reference:`https://music.apple.com/${country}/${type}/${id}`,kind:type==='song'?'track':'collection'};
 }
 return null;
}
/** Artwork is optional and never an arbitrary member URL or signed CDN capability. */
export function safeMusicArtworkUrl(input:unknown):string|null {
 if(typeof input!=='string'||input.length>2048||/[\u0000-\u0020\u007f\\]/.test(input))return null;
 try{const url=new URL(input);if(url.protocol!=='https:'||url.username||url.password||url.port||url.search||url.hash)return null;
  if(!/^(?:i\.ytimg\.com|img\.youtube\.com|yt3\.ggpht\.com|i[1-4]\.sndcdn\.com|i\.scdn\.co|is[1-5]-ssl\.mzstatic\.com)$/.test(url.hostname))return null;
  return url.href;
 }catch{return null;}
}
