import {DomainError} from '../../core/src/errors.js';
export type MusicInput={kind:'search';query:string}|{kind:'reference';provider:'spotify'|'apple_music'|'youtube'|'soundcloud'|'direct';reference:string};
/** Classification is not a network permission check. Resolvers must validate DNS and every redirect. */
export function classifyMusicInput(value:string,directAudioHosts:readonly string[]=[]):MusicInput {
 const query=value.trim();if(!query||query.length>2048||/[\u0000-\u001f]/.test(query))throw new DomainError('MUSIC_QUERY','Enter a track search or supported HTTPS link.');
 if(!/^[a-z][a-z0-9+.-]*:/i.test(query)&&!query.startsWith('//'))return{kind:'search',query};
 let url:URL;try{url=new URL(query);}catch{throw new DomainError('MUSIC_URL','Use a supported HTTPS music link.');}
 if(url.protocol!=='https:'||url.username||url.password||url.port||url.hash)throw new DomainError('MUSIC_URL','Use an HTTPS music link without credentials, a custom port or a fragment.');
 const host=url.hostname.toLowerCase();let provider:Extract<MusicInput,{kind:'reference'}>['provider'];
 if(host==='open.spotify.com')provider='spotify';else if(host==='music.apple.com')provider='apple_music';else if(['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com','youtu.be'].includes(host))provider='youtube';else if(['soundcloud.com','www.soundcloud.com','on.soundcloud.com'].includes(host))provider='soundcloud';else if(directAudioHosts.some(h=>h===host)&&host!=='localhost'&&!/^[\d.:\[\]]+$/.test(host)&&!host.endsWith('.localhost')&&!host.endsWith('.local'))provider='direct';else throw new DomainError('MUSIC_PROVIDER','This source is not configured. Use an accepted music reference or an approved direct-audio host.');
 return{kind:'reference',provider,reference:url.href};
}
