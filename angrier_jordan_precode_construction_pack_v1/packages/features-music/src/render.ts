import {musicController} from './domain.js';
import type {MusicState} from './interfaces.js';
import {centeredBlock,centeredHeading,portrait} from '../../features-events/src/gate-b-visual.js';
import {shell,panel,ink} from '../../features-events/src/visual.js';
const providerName=(name:string)=>(({youtube:'YouTube',youtube_music:'YouTube Music',soundcloud:'SoundCloud',spotify:'Spotify',applemusic:'Apple Music',authorized_catalog:'Direct audio'} as Record<string,string>)[name]??name);
const time=(ms:number)=>`${Math.floor(ms/60000)}:${String(Math.floor(ms/1000)%60).padStart(2,'0')}`;
/** Render only confirmed public metadata. Caller supplies validated embedded artwork, never a provider stream URL. */
export function renderMusicController(state:MusicState,now:number,requesterName:string,artworkData?:string,voiceChannelName?:string){
 const view=musicController(state,now),head=centeredHeading('ANGRIER JORDAN · THE JUKEBOX',view.title,view.artist??'Pull up a chair. Stay for the music.');
 let y=head.height,svg=head.svg;
 svg+=portrait('music-artwork',view.title,artworkData,220,y,112);y+=132;
 const copy=['Voice channel · '+(voiceChannelName??view.voiceChannelId),view.album,state.current?null:view.prompt,view.requesterUserId?'Requested by '+requesterName:null,view.requestedProvider&&view.requestedProvider!==view.provider?'Requested via '+providerName(view.requestedProvider):null,view.provider?'Audio source · '+providerName(view.provider):null,view.status==='PENDING'?'Playback request pending confirmation':view.status==='RECOVERING'?'Reconnecting · playback not confirmed':view.status==='FAILED'?'Playback unavailable':view.status,view.durationMs!==null?time(view.positionMs)+' / '+time(view.durationMs):state.current?'Live / duration unavailable':null,view.queueCount+' queued · Volume '+view.volume+'%', 'Loop '+view.loop+' · Autoplay '+(view.autoplay?'on':'off')].filter(Boolean).join('\n');
 const block=centeredBlock(copy,y+32,{width:362,size:16,lineHeight:23,gap:0});svg+=panel(18,y,404,block.height+48,ink.teal)+block.svg;
 return shell(y+block.height+68,svg);
}
