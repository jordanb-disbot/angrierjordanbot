import test from 'node:test';
import assert from 'node:assert/strict';
import {inspect} from 'node:util';
import {LavalinkRestClient} from '../../dist/apps/bot/src/music/lavalink-client.js';
import {normalizeMusicReference,safeMusicArtworkUrl} from '../../dist/packages/features-music/src/provider-references.js';
const video='aBcDeFgH123',yt='https://www.youtube.com/watch?v='+video,spotify='https://open.spotify.com/track/'+'A'.repeat(22),sc='https://soundcloud.com/artist/song';
const signal=()=>new AbortController().signal,json=value=>new Response(JSON.stringify(value),{headers:{'content-type':'application/json'}});
const nodeInfo=(sources=[],plugins=[])=>({version:{major:4},sourceManagers:['youtube','soundcloud',...sources],plugins:[{name:'youtube-plugin',version:'1.18.2'},...plugins]});
const raw=(uri=yt,sourceName='youtube',extra={})=>({encoded:'PRIVATE_ENCODED',info:{uri,sourceName,title:'Song',author:'Artist',isStream:false,isSeekable:true,length:90000,artworkUrl:'https://i.ytimg.com/vi/'+video+'/default.jpg',isrc:'USABC2600001',...extra},pluginInfo:{albumName:'Album',previewUrl:'PRIVATE_PREVIEW',secret:'PRIVATE_PLUGIN'},userData:{secret:'PRIVATE_USER'}});
const meta=(reference=yt,provider='youtube')=>({provider,reference,title:'Song',artist:'Artist',album:null,durationMs:90000,artworkUrl:null,seekable:true});
function setup({info=nodeInfo(),sourcePolicy,reply={loadType:'track',data:raw()},...rest}={}){const calls=[];return{calls,client:new LavalinkRestClient({endpoint:'https://node.invalid',password:'PRIVATE_PASSWORD',sessionId:'session',isCurrent:async()=>true,...(sourcePolicy?{sourcePolicy}:{}),...rest,fetch:async(url,init)=>{calls.push({url,init});return json(url.endsWith('/info')?info:typeof reply==='function'?reply(url,init):reply);}})};}
const rejected=(operation,code)=>assert.rejects(async()=>operation(),{code});

test('Provider references canonicalize only stable public identities and reject secrets, private links and redirects',()=>{
 assert.equal(normalizeMusicReference('https://youtu.be/'+video+'?si=tracking').reference,yt);
 assert.equal(normalizeMusicReference(yt+'&list=PL1234567890&feature=share').reference,yt);
 assert.equal(normalizeMusicReference('https://music.youtube.com/watch?v='+video).provider,'youtube_music');
 assert.equal(normalizeMusicReference('https://open.spotify.com/intl-us/track/'+'A'.repeat(22)+'?si=tracking').reference,spotify);
 assert.equal(normalizeMusicReference('https://music.apple.com/us/album/title/123?i=456&ls=1').reference,'https://music.apple.com/us/song/456');
 assert.equal(normalizeMusicReference('https://soundcloud.com/artist/sets/album?utm_source=clipboard').kind,'collection');
 for(const input of ['ytsearch:song','file:///song','https://127.0.0.1/song','https://youtube.com.evil/watch?v='+video,'https://user:secret@youtube.com/watch?v='+video,yt+'#secret',yt+'&token=secret',sc+'?secret_token=s-private',sc+'/s-private','https://on.soundcloud.com/abc','https://spotify.link/abc','https://www.youtube.com/shorts/'+video+'/extra',yt+'&v=xxxxxxxxxxx','https://open.spotify.com/track/%41',yt+'&signature=private'])assert.equal(normalizeMusicReference(input),null,input);
});
test('Artwork allowlist discards signed URLs and arbitrary origins',()=>{
 assert.equal(safeMusicArtworkUrl('https://i.scdn.co/image/abc'),'https://i.scdn.co/image/abc');
 for(const input of ['https://evil.invalid/a','https://i.scdn.co/image/a?token=secret','https://i.scdn.co.evil/a','http://i.ytimg.com/a','https://user:secret@i.ytimg.com/a',null])assert.equal(safeMusicArtworkUrl(input),null);
});
test('Default reviewed node policy admits pinned YouTube and SoundCloud, with no direct or metadata implicit capability',async()=>{
 const {client,calls}=setup();const handle=await client.loadPlayableTrack(meta());assert.deepEqual(handle,{});assert.equal(JSON.stringify(handle),'{}');assert.ok(!inspect(client).includes('PRIVATE'));assert.equal(calls.length,2);
 await rejected(()=>client.loadCatalogTrack('song'),'LAVALINK_SOURCE_DISABLED');await rejected(()=>client.resolve(spotify,10,signal()),'LAVALINK_SOURCE_DISABLED');assert.equal(calls.length,2);
 for(const info of [nodeInfo(['http']),nodeInfo(['local']),nodeInfo([], [{name:'lavasrc-plugin',version:'4.8.3'}]),{...nodeInfo(),plugins:[{name:'youtube-plugin',version:'999'}]},{...nodeInfo(),sourceManagers:['youtube','youtube']},{...nodeInfo(),version:{major:3}}]){const other=setup({info});await rejected(()=>other.client.loadPlayableTrack(meta()),'LAVALINK_NODE_POLICY');assert.equal(other.calls.length,1);}
});
test('Owned search prefixes project safe metadata and never persist encoded/plugin/user fields',async()=>{
 for(const [source,prefix] of [['youtube_music','ytmsearch:'],['youtube','ytsearch:'],['soundcloud','scsearch:']]){
  const {client,calls}=setup({reply:{loadType:'search',data:[raw(source==='soundcloud'?sc:yt,source==='soundcloud'?'soundcloud':'youtube'),raw('https://evil.invalid/song','youtube'),raw(yt,'spotify')]}});
  const rows=await client.search(source,{text:'ytsearch:https://private.invalid'},5,signal());assert.equal(rows.length,1);assert.equal(rows[0].provider,source);assert.ok(!JSON.stringify(rows).includes('PRIVATE'));assert.ok(!JSON.stringify(rows).includes('encoded'));
  assert.equal(new URL(calls[1].url).searchParams.get('identifier'),prefix+'ytsearch:https://private.invalid');
 }
 const {client,calls}=setup({reply:{loadType:'search',data:[]}});await client.search('youtube',{text:'ignored',isrc:'USABC2600001'},1,signal());assert.equal(new URL(calls[1].url).searchParams.get('identifier'),'ytsearch:"USABC2600001"');
});
test('Search rejects invalid inputs, filters provider mismatch, de-duplicates and enforces bounds',async()=>{
 const {client,calls}=setup({reply:{loadType:'search',data:[raw(),raw(),raw('https://www.youtube.com/watch?v=xxxxxxxxxxx'),raw(sc,'soundcloud')]}});
 const rows=await client.search('youtube',{text:'song'},1,signal());assert.equal(rows.length,1);
 for(const [source,query,limit] of [['http',{text:'song'},1],['youtube',{text:' '},1],['youtube',{text:'song\nsecret'},1],['youtube',{text:'song'},26],['youtube',{text:'song',isrc:'not-isrc'},1]])await rejected(()=>client.search(source,query,limit,signal()),'LAVALINK_INPUT');assert.equal(calls.length,2);
});
test('Metadata-only Spotify and Apple resolutions discard mirror capabilities and require opted-in source managers',async()=>{
 for(const [provider,reference] of [['spotify',spotify],['applemusic','https://music.apple.com/us/song/123']]){
  const {client,calls}=setup({sourcePolicy:{mode:'multi-source',metadataSources:[provider]},info:nodeInfo([provider],[{name:'lavasrc-plugin',version:'4.8.3'}]),reply:{loadType:'track',data:raw(reference,provider)}});
  const result=await client.resolve(reference,10,signal());assert.equal(result.tracks[0].provider,provider);assert.equal(result.truncated,false);assert.equal(result.tracks[0].isrc,'USABC2600001');assert.ok(!JSON.stringify(result).includes('PRIVATE'));
  await rejected(()=>client.loadPlayableTrack(result.tracks[0]),'LAVALINK_SOURCE');assert.equal(calls.length,2);
  await rejected(()=>client.updatePlayer({guildId:'111111111111111111',revision:1,generation:1},{track:result.tracks[0]}),'LAVALINK_TRACK');
 }
});
test('Playback freshly reloads exact chosen recording and rejects mirrors or changed identity',async()=>{
 for(const data of [raw('https://www.youtube.com/watch?v=xxxxxxxxxxx'),raw(spotify,'spotify'),raw(sc,'soundcloud')]){const {client}=setup({reply:{loadType:'track',data}});await rejected(()=>client.loadPlayableTrack(meta()),'LAVALINK_SOURCE');}
 const {client,calls}=setup({reply:(_url,init)=>init.method==='PATCH'?{guildId:'111111111111111111'}:{loadType:'track',data:raw(sc,'soundcloud')}}),handle=await client.loadPlayableTrack(meta(sc,'soundcloud'));
 await client.updatePlayer({guildId:'111111111111111111',revision:1,generation:1},{track:handle,entryId:'entry'});assert.equal(JSON.parse(calls.at(-1).init.body).track.encoded,'PRIVATE_ENCODED');
});
test('Collection output marks response limits, filtered rows and unknown upstream totals as partial',async()=>{
 const ref='https://www.youtube.com/playlist?list=PL1234567890';
 for(const [total,limit,truncated] of [[2,2,false],[2,1,true],[5,2,true],[undefined,2,true]]){const {client}=setup({reply:{loadType:'playlist',data:{tracks:[raw(),raw('https://www.youtube.com/watch?v=xxxxxxxxxxx')],pluginInfo:total===undefined?{}:{totalTracks:total}}}});const result=await client.resolve(ref,limit,signal());assert.equal(result.truncated,truncated);assert.equal(result.tracks.length,limit);}
 const {client}=setup({reply:{loadType:'playlist',data:{tracks:[raw(),raw('https://evil.invalid')],pluginInfo:{totalTracks:2}}}});assert.equal((await client.resolve(ref,2,signal())).truncated,true);
});
test('Provider errors and redirects stay redacted; cancelled input never queries a node',async()=>{
 const {client,calls}=setup({reply:{loadType:'error',data:{message:'PRIVATE_PROVIDER_ERROR'}}});await assert.rejects(client.search('youtube',{text:'song'},1,signal()),error=>!inspect(error).includes('PRIVATE'));
 const c=new AbortController();c.abort();const before=calls.length;await rejected(()=>client.resolve(yt,1,c.signal),'LAVALINK_ABORTED');assert.equal(calls.length,before);
});
test('Persisted guard distinguishes read telemetry from mutation authorization',async()=>{
 const operations=[],guildId='111111111111111111';const {client}=setup({isCurrent:async(_fence,operation)=>{operations.push(operation);return true;},reply:(_url,init)=>init.method==='GET'?{guildId,paused:false,state:{connected:true,position:0,time:1},track:null}:{guildId}});
 const fence={guildId,revision:1,generation:1};await client.readPlayer(fence);await client.updatePlayer(fence,{paused:true});assert.deepEqual(operations,['read','read','write','write']);
});
