import test from 'node:test';
import assert from 'node:assert/strict';
import {renderMusicController,renderMusicStrip,renderMusicNotice,renderMusicList} from '../../.test-build/packages/features-music/src/render.js';
import {textWidth} from '../../.test-build/packages/renderer/src/text-layout.js';
import {createMusicState,enqueueMusic,observeMusic,musicEntry} from '../../.test-build/packages/features-music/src/domain.js';

const actor={guildId:'server',userId:'member',voiceChannelId:'voice',textChannelId:'voice',eligible:true,isDj:false};
const policy={queueMaxTracks:25,defaultVolume:65,defaultLoop:'off',defaultAutoplay:false};
const track=(id,extra={})=>({provider:'youtube',reference:'https://www.youtube.com/watch?v='+id,title:'Lounge frequency '+id,artist:'The House Band',album:'After Hours',durationMs:240000,artworkUrl:null,seekable:true,...extra});
const empty=()=>createMusicState('server',actor,policy).state;
const pending=(extra={})=>enqueueMusic(empty(),actor,[musicEntry('first','member',track('first',extra)),...['second','third','fourth','fifth'].map(id=>musicEntry(id,'member',track(id)))],policy).state;
const playing=(extra={})=>{const state=pending(extra);return observeMusic(state,{generation:state.generation,status:'PLAYING',positionMs:60000,at:1000}).state;};
const unescape=value=>value.replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&quot;','"').replaceAll('&amp;','&');
const words=svg=>[...svg.matchAll(/<text\b[^>]*>(.*?)<\/text>/g)].map(row=>unescape(row[1])).join(' ');
const height=svg=>Number(svg.match(/^<svg[^>]+height="(\d+)"/)[1]);
function boundedText(svg){
 const h=height(svg);assert.match(svg,/width="440"/);assert.match(svg,/viewBox="0 0 440 /);
 for(const node of svg.matchAll(/<text\b([^>]*)>(.*?)<\/text>/g)){
  const attrs=node[1],x=Number(attrs.match(/\bx="([\d.]+)"/)[1]),y=Number(attrs.match(/\by="([\d.]+)"/)[1]),size=Number(attrs.match(/font-size="([\d.]+)"/)[1]);
  const width=textWidth(unescape(node[2]),size),left=attrs.includes('text-anchor="middle"')?x-width/2:attrs.includes('text-anchor="end"')?x-width:x;
  assert.ok(left>=12&&left+width<=428,`Text exceeds safe horizontal bounds: ${node[2]}`);
  assert.ok(y-size>=7&&y<h-7,`Text exceeds vertical frame: ${node[2]}`);
 }
}

test('Music controller is deterministic, modular, source-attributed and preserves its input',()=>{
 const state=playing(),before=structuredClone(state),svg=renderMusicController(state,1000,'Jordan',undefined,'The Listening Room');
 assert.equal(renderMusicController(state,1000,'Jordan',undefined,'The Listening Room'),svg);assert.deepEqual(state,before);
 const copy=words(svg);for(const expected of ['The Jukebox','VOICE CHANNEL','The Listening Room','Now playing','Lounge frequency first','The House Band','1:00 / 4:00','REQUESTED BY','Jordan','Audio source · YouTube','UP NEXT','4 queued','+1 more'])assert.ok(copy.includes(expected),expected);
 assert.match(svg,/data-music-art="record"/);assert.match(svg,/data-music-progress="0.25"/);assert.match(svg,/font-family="Space Grotesk"/);assert.match(svg,/font-family="Inter"/);boundedText(svg);
});

test('Compact controller retains track, voice, progress, requester and both source identities',()=>{
 const state=playing();state.current.requestedTrack=track('requested',{provider:'spotify',title:'The requested recording'});
 const svg=renderMusicStrip(state,1000,'Jordan',undefined,'The Listening Room'),copy=words(svg);
 for(const expected of ['NOW PLAYING','The requested recording','The House Band','Voice · The Listening Room','1:00 / 4:00','Requested by Jordan','Audio source · YouTube','Requested via Spotify','Autoplay off'])assert.ok(copy.includes(expected),expected);
 assert.ok(height(svg)<height(renderMusicController(state,1000,'Jordan')));assert.ok(height(svg)<460);boundedText(svg);
});

test('Playback states never label pending, paused, unavailable or reconnecting audio as playing',()=>{
 for(const [state,label]of [[pending(),'Connecting'],[{...playing(),observedStatus:'FAILED'},'Unavailable'],[{...playing(),observedStatus:'RECOVERING'},'Reconnecting'],[{...playing(),desiredStatus:'PAUSED',observedStatus:'PAUSED'},'Paused']]){
  for(const render of [renderMusicController,renderMusicStrip]){const svg=render(state,1000,'Jordan');assert.ok(words(svg).toLowerCase().includes(label.toLowerCase()));assert.doesNotMatch(words(svg),/now playing/i);boundedText(svg);}
 }
 const idle={...empty(),observedStatus:'IDLE',observedGeneration:0};
 for(const render of [renderMusicController,renderMusicStrip]){const svg=render(idle,0,'Jordan');assert.match(words(svg),/jukebox is empty/i);assert.match(words(svg),/\/play/);boundedText(svg);}
});

test('Unknown duration and hour-long recordings stay truthful, with bounded progress',()=>{
 for(const render of [renderMusicController,renderMusicStrip]){
  const live=render(playing({durationMs:null,seekable:false}),1000,'Jordan');assert.match(words(live),/Live \/ duration unavailable/);assert.match(live,/data-music-progress="0"/);boundedText(live);
  const long=render({...playing({durationMs:3661000}),positionMs:3600000},1000,'Jordan');assert.match(words(long),/1:00:00 \/ 1:01:01/);boundedText(long);
  assert.match(render(playing(),99999999,'Jordan'),/data-music-progress="1"/);
 }
});

test('Adversarial long names and Unicode remain bounded at 440px and readable when reduced to 360px',()=>{
 const long='WW <&> 👩🏽‍🎤 音楽 é '.repeat(300),state=playing();Object.assign(state.current.track,{title:long,artist:long,album:long});
 state.current.requestedTrack=track('request',{provider:'applemusic',title:long,artist:long});
 for(const render of [renderMusicController,renderMusicStrip]){
  const svg=render(state,1000,long,undefined,long);boundedText(svg);assert.ok(height(svg)<1200);assert.match(svg,/…/);assert.doesNotMatch(svg,/<&>/);
  // Runtime and mobile use the same 440px viewBox; body copy starts at 14px (11.45px at 360px).
  assert.ok(14*360/440>11);assert.match(svg,/font-size="14"/);
 }
});

test('Artwork and avatar accept embedded raster only; hostile and remote media never reach SVG',()=>{
 const state=playing({artworkUrl:'https://private.invalid/art?token=private'}),bad=['https://private.invalid/private','data:image/svg+xml;base64,PHN2Zz4=','" onload="bad','data:image/png;base64,'+'A'.repeat(1_400_000)];
 for(const data of bad){const svg=renderMusicController(state,1000,'<script>&',data,'Voice <&>',data);assert.match(svg,/data-music-art="record"/);assert.doesNotMatch(svg,/private\.invalid|onload=|<script>|image\/svg/);assert.match(svg,/&lt;script&gt;&amp;/);boundedText(svg);}
 const raster='data:image/png;base64,iVBORw0KGgo=';
 const svg=renderMusicController(state,1000,'Jordan',raster,'Voice',raster);assert.equal((svg.match(/href="data:image\/png;base64,iVBORw0KGgo="/g)??[]).length,2);assert.doesNotMatch(svg,/data-music-art="record"/);
});

test('Music notice escapes bounded title and explanation while preserving the approved shell',()=>{
 const svg=renderMusicNotice('Track unavailable <&>','No matching recording is available. <script>alert("x")</script>');
 assert.match(words(svg),/No matching recording is available/);assert.doesNotMatch(svg,/<script>/);assert.match(svg,/&lt;script&gt;/);boundedText(svg);
 const long=renderMusicNotice('NOTICE '.repeat(1000),'Explanation '.repeat(2000));assert.ok(height(long)<700);assert.match(long,/…/);boundedText(long);
});

test('Music lists show all 25 choices, explicit overflow, empty state and bounded long rows',()=>{
 const rows=Array.from({length:25},(_,i)=>({title:'Recording '+i,detail:'Artist · Source <&>',badge:'CHOICE '+(i+1)}));
 const svg=renderMusicList('Search results','Choose the recording you intended.',rows,'25 choices');
 for(let i=0;i<25;i++)assert.ok(words(svg).includes('Recording '+i));assert.match(svg,/Source &lt;&amp;&gt;/);boundedText(svg);
 assert.match(words(renderMusicList('Queue','',[],'Page 1')),/Nothing here yet/);
 const overflow=renderMusicList('History','Recent tracks',[...rows,...rows]);assert.match(words(overflow),/25 additional choices below/);boundedText(overflow);
 const long=renderMusicList('X'.repeat(5000),'Y'.repeat(5000),[{title:'Z'.repeat(5000),detail:'W'.repeat(5000),badge:'B'.repeat(5000)}],'F'.repeat(5000));assert.ok(height(long)<700);boundedText(long);
});
