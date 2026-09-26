import {musicController} from './domain.js';
import type {MusicState} from './interfaces.js';
import {portrait} from '../../features-events/src/gate-b-visual.js';
import {shell,panel,ink,text} from '../../features-events/src/visual.js';
import {truncateText,wrapText} from '../../renderer/src/text-layout.js';

const providerName=(name:string)=>(({youtube:'YouTube',youtube_music:'YouTube Music',soundcloud:'SoundCloud',spotify:'Spotify',applemusic:'Apple Music',apple_music:'Apple Music',authorized_catalog:'Direct audio'} as Record<string,string>)[name]??name);
// Layout is bounded independently of provider validation, including imported playlist names.
const clean=(value:string,max=1200)=>value.slice(0,max).replace(/[\u0000-\u001f\u007f]/g,' ').trim();
const time=(ms:number)=>{const seconds=Math.floor(Math.max(0,Number.isFinite(ms)?ms:0)/1000);return seconds>=3600?`${Math.floor(seconds/3600)}:${String(Math.floor(seconds/60)%60).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`:`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;};
const embedded=(value:string|undefined)=>!!value&&value.length<=1_400_000&&/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value);
function copy(value:string,x:number,y:number,width:number,size=16,maxLines=2,color:string=ink.white,center=false,heading=false){
 const all=wrapText(clean(value),width,size),rows=all.slice(0,maxLines);
 if(all.length>maxLines)rows[maxLines-1]=truncateText(rows[maxLines-1]+'…',width,size);
 const lineHeight=Math.ceil(size*1.32);
 return{svg:rows.map((row,n)=>text(x,y+n*lineHeight,row,size,color,`${center?'text-anchor="middle" ':''}${heading?'font-family="Space Grotesk" font-weight="600"':''}`)).join(''),height:rows.length*lineHeight};
}
function label(value:string,x:number,y:number,color:string=ink.gold,center=false){return text(x,y,value,12,color,`${center?'text-anchor="middle" ':''}font-family="Space Grotesk" font-weight="600" letter-spacing="1.1"`);}
function header(){return label('ANGRIER JORDAN · MUSIC',220,29,ink.teal,true)+text(220,57,'The Jukebox',25,ink.white,'text-anchor="middle" font-family="Space Grotesk" font-weight="700"');}
/** No external media requests: missing or rejected artwork becomes a deterministic brass record. */
function artwork(id:string,data:string|undefined,x:number,y:number,size:number){
 if(embedded(data))return portrait(id,'',data,x+size/2,y,size);
 const cx=x+size/2,cy=y+size/2,r=size*.37;
 return `<g data-music-art="record">${panel(x,y,size,size,ink.gold)}<circle cx="${cx}" cy="${cy}" r="${r}" fill="#06151d" stroke="#9D8247" stroke-width="1.4"/>`+
 [1,.82,.66].map(n=>`<circle cx="${cx}" cy="${cy}" r="${r*n}" fill="none" stroke="#6E8984" stroke-opacity=".28"/>`).join('')+
 `<path d="M${cx-r*.76} ${cy-r*.4}A${r*.86} ${r*.86} 0 0 1 ${cx-r*.3} ${cy-r*.8}" fill="none" stroke="#FFE29A" stroke-opacity=".5" stroke-width="2"/><circle cx="${cx}" cy="${cy}" r="${r*.29}" fill="#17483F" stroke="url(#gold)"/><circle cx="${cx}" cy="${cy}" r="${Math.max(2,size*.024)}" fill="#FFE29A"/></g>`;
}
type View=ReturnType<typeof musicController>;
function status(view:View){
 if(view.status==='FAILED')return{title:'Unavailable',detail:'Playback unavailable',color:ink.gold};
 if(view.status==='RECOVERING')return{title:'Reconnecting',detail:'Playback not confirmed',color:ink.gold};
 if(view.status==='PENDING')return{title:'Connecting',detail:'Awaiting playback confirmation',color:ink.gold};
 if(view.status==='PLAYING')return{title:'Now playing',detail:'Settle into the sound.',color:ink.emerald};
 if(view.status==='PAUSED')return{title:'Paused',detail:'Right where you left it.',color:ink.gold};
 return{title:view.status==='DISCONNECTED'?'Disconnected':'Ready when you are',detail:'Your next track belongs here.',color:ink.teal};
}
function progress(view:View,x:number,y:number,width:number){
 const duration=view.durationMs,ratio=duration!==null&&duration>0?Math.min(1,Math.max(0,view.positionMs/duration)):0;
 const timeline=duration!==null?`${time(view.positionMs)} / ${time(duration)}`:'Live / duration unavailable';
 return `<rect x="${x}" y="${y}" width="${width}" height="5" rx="2.5" fill="#04141b" stroke="#42605E" stroke-opacity=".6"/><rect data-music-progress="${ratio}" x="${x}" y="${y}" width="${width*ratio}" height="5" rx="2.5" fill="${view.status==='PLAYING'?ink.emerald:ink.gold}"/>`+
 copy(timeline,x+width/2,y+26,width,14,1,ink.muted,true).svg;
}
function context(state:MusicState,view:View,y:number,requesterName:string,avatar:string|undefined){
 const name=view.requesterUserId?requesterName:state.current?'Autoplay':'The lounge is listening';
 const nameRows=copy(name,94,y+45,292,17,2,ink.white,false,true);
 let svg=portrait('music-requester',clean(name,100),avatar,59,y+18,44)+label(view.requesterUserId?'REQUESTED BY':state.current?'CURATED BY':'PULL UP A CHAIR',94,y+24,ink.teal)+nameRows.svg;
 let cursor=y+51+nameRows.height;
 if(view.provider){const source=copy('Audio source · '+providerName(view.provider),38,cursor,364,14,2,ink.muted);svg+=source.svg;cursor+=source.height;}
 if(view.requestedProvider&&view.requestedProvider!==view.provider){const requested=copy('Requested via '+providerName(view.requestedProvider),38,cursor,364,14,2,ink.muted);svg+=requested.svg;cursor+=requested.height;}
 const height=cursor-y+10;
 return{svg:panel(18,y,404,height,ink.teal)+svg,height};
}

/** Confirmed public metadata only. Artwork/avatar inputs must be embedded raster media, never stream URLs. */
export function renderMusicController(state:MusicState,now:number,requesterName:string,artworkData?:string,voiceChannelName?:string,requesterAvatarData?:string){
 const view=musicController(state,now),display=status(view);
 let svg=header(),y=72;
 const voice=copy(voiceChannelName??view.voiceChannelId,220,y+42,360,16,2,ink.white,true);
 svg+=panel(18,y,404,voice.height+34,ink.teal)+label('VOICE CHANNEL',220,y+18,ink.teal,true)+voice.svg;y+=voice.height+46;
 const heroTop=y;
 let hero=artwork('music-cover',artworkData,36,y+18,108);
 hero+=label(state.current?'ON THE DECK':'THE JUKEBOX',274,y+40,ink.gold,true);
 const stateTitle=copy(display.title,274,y+70,228,23,2,display.color,true,true);hero+=stateTitle.svg;
 const statusDetail=copy(display.detail,274,y+77+stateTitle.height,220,14,2,ink.muted,true);hero+=statusDetail.svg;
 y+=Math.max(156,95+stateTitle.height+statusDetail.height);
 const title=copy(state.current?view.title:'The jukebox is empty',220,y,362,25,3,ink.white,true,true);hero+=title.svg;y+=title.height+6;
 const artist=copy(view.artist??view.prompt??'',220,y,360,16,2,ink.muted,true);hero+=artist.svg;y+=artist.height+7;
 if(view.album){const album=copy(view.album,220,y,352,14,1,ink.muted,true);hero+=album.svg;y+=album.height+8;}
 if(state.current){hero+=progress(view,38,y,364);y+=49;}
 else y+=5;
 hero+=copy(`${view.queueCount} queued  ·  Volume ${view.volume}%`,220,y,364,15,1,ink.white,true).svg;y+=24;
 hero+=copy(`Loop ${view.loop}  ·  Autoplay ${view.autoplay?'on':'off'}`,220,y,364,14,1,ink.muted,true).svg;y+=20;
 svg+=panel(18,heroTop,404,y-heroTop,ink.gold)+hero;y+=12;
 const by=context(state,view,y,requesterName,requesterAvatarData);svg+=by.svg;y+=by.height+12;
 const queueTop=y;let queue=label('UP NEXT',38,y+25,ink.teal)+text(402,y+25,`${view.queueCount} queued`,13,ink.muted,'text-anchor="end"');y+=53;
 for(const [index,entry]of state.queue.slice(0,3).entries()){
  const track=entry.requestedTrack??entry.track;queue+=text(38,y,String(index+1).padStart(2,'0'),13,ink.gold,'font-family="Space Grotesk"');
  const title=copy(track.title,68,y,328,16,1);queue+=title.svg+copy(track.artist,68,y+22,328,13,1,ink.muted).svg;y+=51;
 }
 if(!state.queue.length){queue+=copy('An open seat for your next track.',220,y,360,15,2,ink.muted,true).svg;y+=28;}
 if(state.queue.length>3){queue+=copy(`+${state.queue.length-3} more · Open Queue to see every track`,220,y,362,13,1,ink.muted,true).svg;y+=25;}
 svg+=panel(18,queueTop,404,y-queueTop,ink.teal)+queue;
 return shell(y+18,svg);
}

/** Compact controller in the same visual family; publication owns the single pinned post. */
export function renderMusicStrip(state:MusicState,now:number,requesterName:string,artworkData?:string,voiceChannelName?:string,requesterAvatarData?:string){
 const view=musicController(state,now),display=status(view);
 let svg=label('ANGRIER JORDAN · THE JUKEBOX',220,28,ink.teal,true),y=43;
 const top=y;let body=artwork('music-strip-cover',artworkData,34,y+18,70)+label(display.title.toUpperCase(),121,y+30,display.color);
 const title=copy(state.current?view.title:'The jukebox is empty',121,y+56,276,18,2,ink.white,false,true);body+=title.svg;
 const artist=copy(view.artist??'Use /play to choose a track.',121,y+62+title.height,276,14,1,ink.muted);body+=artist.svg;y+=Math.max(112,76+title.height+artist.height);
 if(state.current){body+=progress(view,38,y,364);y+=46;}
 const voice=copy('Voice · '+(voiceChannelName??view.voiceChannelId),38,y+3,364,14,2,ink.white);body+=voice.svg;y+=voice.height+12;
 if(state.current){body+=portrait('strip-requester',clean(requesterName,100),requesterAvatarData,49,y-2,26);const who=copy(view.requesterUserId?'Requested by '+requesterName:'Autoplay',72,y+16,326,14,2,ink.muted);body+=who.svg;y+=Math.max(34,who.height+13);}
 if(view.provider){const source=copy('Audio source · '+providerName(view.provider)+(view.requestedProvider!==view.provider?' · Requested via '+providerName(view.requestedProvider??view.provider):''),38,y,364,13,2,ink.muted);body+=source.svg;y+=source.height+9;}
 const settings=copy(`${view.queueCount} queued · Volume ${view.volume}% · Loop ${view.loop} · Autoplay ${view.autoplay?'on':'off'}`,220,y,364,14,2,ink.white,true);body+=settings.svg;y+=settings.height+3;
 svg+=panel(18,top,404,y-top,ink.gold)+body;return shell(y+18,svg);
}

export function renderMusicNotice(title:string,message:string){
 let svg=header(),y=74;const top=y;
 let body=artwork('music-notice',undefined,192,y+17,56);y+=102;
 const heading=copy(title,220,y,360,25,3,ink.white,true,true);body+=heading.svg;y+=heading.height+12;
 const description=copy(message,220,y,360,17,12,ink.muted,true);body+=description.svg;y+=description.height+10;
 svg+=panel(18,top,404,y-top,ink.gold)+body;return shell(y+18,svg);
}

export interface MusicListRow {title:string;detail?:string;badge?:string;}
/** Caller supplies one page. Oversized input is bounded and the omitted count remains visible. */
export function renderMusicList(title:string,subtitle:string,rows:MusicListRow[],footer?:string){
 let svg=header(),y=90;
 const head=copy(title,220,y,364,26,3,ink.white,true,true);svg+=head.svg;y+=head.height+8;
 if(subtitle){const sub=copy(subtitle,220,y,362,15,3,ink.muted,true);svg+=sub.svg;y+=sub.height+13;}
 for(const row of rows.slice(0,25)){
  const top=y;let body='';y+=28;
  const x=row.badge?112:38,width=row.badge?290:364;
  if(row.badge)body+=copy(row.badge,38,y,62,12,2,ink.gold,false,true).svg;
  const title=copy(row.title,x,y,width,18,3,ink.white,false,true);body+=title.svg;y+=title.height+5;
  if(row.detail){const detail=copy(row.detail,x,y,width,14,3,ink.muted);body+=detail.svg;y+=detail.height;}
  y=Math.max(y,top+(row.badge?63:0));
  y+=8;svg+=panel(18,top,404,y-top,ink.teal)+body;y+=10;
 }
 if(!rows.length){svg+=panel(18,y,404,64,ink.teal)+copy('Nothing here yet.',220,y+38,364,17,1,ink.muted,true).svg;y+=76;}
 const tail=[rows.length>25?`${rows.length-25} additional choices below`:null,footer].filter(Boolean).join(' · ');
 if(tail){const foot=copy(tail,220,y+17,360,14,3,ink.muted,true);svg+=foot.svg;y+=foot.height+22;}
 return shell(y+8,svg);
}
