import test from 'node:test';
import assert from 'node:assert/strict';
import {inspect} from 'node:util';
import {LavalinkRestClient} from '../../dist/apps/bot/src/music/lavalink-client.js';
const guildId='111111111111111111',channelId='222222222222222222';
const fence=(revision=1,generation=1)=>({guildId,revision,generation});
const json=value=>new Response(JSON.stringify(value),{headers:{'content-type':'application/json'}});
const track=()=>json({loadType:'track',data:{encoded:'PRIVATE_ENCODED_SOURCE',info:{sourceName:'http',isSeekable:true,length:90000,uri:'https://catalog.invalid/private?token=secret'},pluginInfo:{secret:'private'}}});
function setup(overrides={}){const calls=[];const options={endpoint:'https://node.invalid',password:'PRIVATE_NODE_PASSWORD',sessionId:'ready-session',fetch:async(url,init)=>{calls.push({url,init});return init.method==='GET'?track():init.method==='DELETE'?new Response(null,{status:204}):json(url.includes('/players/')?{guildId,voice:{token:'PRIVATE_VOICE_TOKEN'}}:{resuming:true,timeout:60});},resolveCatalogSource:async()=>({uri:'https://catalog.invalid/song.ogg'}),isCurrent:async()=>true,...overrides};return{client:new LavalinkRestClient(options),calls,options};}
const rejected=(operation,code)=>assert.rejects(async()=>operation(),{code});
const tick=()=>new Promise(resolve=>setImmediate(resolve));

test('Lavalink authenticates fixed v4 routes and returns no private provider fields',async()=>{
 const {client,calls}=setup();const handle=await client.loadCatalogTrack('licensed-song');
 assert.deepEqual(handle,{});assert.equal(JSON.stringify(handle),'{}');assert.equal(JSON.stringify(client),'{}');assert.ok(!inspect(client).includes('PRIVATE'));
 assert.equal(calls[0].url,'https://node.invalid/v4/loadtracks?identifier=https%3A%2F%2Fcatalog.invalid%2Fsong.ogg');
 const voice={token:'PRIVATE_VOICE_TOKEN',endpoint:'voice.discord.media:443',sessionId:'discord-session',channelId};
 assert.deepEqual(await client.updatePlayer(fence(),{track:handle,position:1000,paused:true,volume:65,voice}),{accepted:true});
 assert.equal(calls[1].url,`https://node.invalid/v4/sessions/ready-session/players/${guildId}?noReplace=false`);
 assert.deepEqual(JSON.parse(calls[1].init.body),{track:{encoded:'PRIVATE_ENCODED_SOURCE'},position:1000,paused:true,volume:65,voice});
 assert.equal(calls[1].init.headers.Authorization,'PRIVATE_NODE_PASSWORD');assert.equal(calls[1].init.redirect,'error');
 await client.destroyPlayer(fence(2));assert.equal(calls[2].init.method,'DELETE');assert.equal(calls[2].init.body,undefined);
 assert.deepEqual(await client.updateSession({resuming:true,timeout:60}),{accepted:true});assert.equal(calls[3].url,'https://node.invalid/v4/sessions/ready-session');
});

test('Operator endpoint rejects alternate schemes, credentials, injected paths and implicit insecure HTTP',()=>{
 for(const endpoint of ['http://node.invalid','file:///tmp/node','https://user:password@node.invalid','https://node.invalid/v4','https://node.invalid/?secret=x','https://node.invalid/#x','https://node.invalid\n'])assert.throws(()=>setup({endpoint}),{code:'LAVALINK_CONFIG'});
 assert.throws(()=>setup({sessionId:'../players'}),{code:'LAVALINK_CONFIG'});assert.throws(()=>setup({password:'token\r\nInjected:value'}),{code:'LAVALINK_CONFIG'});assert.throws(()=>setup({isCurrent:undefined}),{code:'LAVALINK_CONFIG'});
 assert.doesNotThrow(()=>setup({endpoint:'http://localhost:2333',allowInsecureHttp:true}));
 assert.throws(()=>setup({endpoint:'http://public.example:2333',allowInsecureHttp:true}),{code:'LAVALINK_CONFIG'});
 for(const host of ['10.example.com','127.evil.invalid','192.168.example.com','172.16.evil.invalid'])assert.throws(()=>setup({endpoint:'http://'+host,allowInsecureHttp:true}),{code:'LAVALINK_CONFIG'});
 for(const host of ['10.0.0.1','172.16.0.2','192.168.1.3','[::1]','lavalink.railway.internal'])assert.doesNotThrow(()=>setup({endpoint:'http://'+host+':2333',allowInsecureHttp:true}));
});

test('Only trusted catalog IDs resolve; search prefixes and member URLs never reach Lavalink',async()=>{
 let resolutions=0;const {client,calls}=setup({resolveCatalogSource:async()=>{resolutions++;return{uri:'http://catalog.invalid/song.mp3'};}});
 for(const id of ['ytsearch:some song','scsearch:some song','https://youtube.com/watch?v=x','../x','song?token=secret'])await rejected(()=>client.loadCatalogTrack(id),'LAVALINK_CATALOG');
 assert.equal(resolutions,0);assert.equal(calls.length,0);await client.loadCatalogTrack('catalog-123');assert.equal(resolutions,1);assert.ok(calls[0].url.includes('http%3A'));
 for(const uri of ['ytsearch:secret','file:///secret','https://user:secret@catalog.invalid/song','https://catalog.invalid/song#x','ftp://catalog.invalid/song']){const bad=setup({resolveCatalogSource:async()=>({uri})});await rejected(()=>bad.client.loadCatalogTrack('song'),'LAVALINK_SOURCE');assert.equal(bad.calls.length,0);}
});

test('Search, playlist, empty, error and non-HTTP provider responses cannot create playable handles',async()=>{
 for(const result of [{loadType:'search',data:[]},{loadType:'playlist',data:{}},{loadType:'empty',data:null},{loadType:'error',data:{message:'SECRET_ERROR'}},{loadType:'track',data:{encoded:'SECRET_ENCODED',info:{sourceName:'youtube',isSeekable:true,length:10}}}]){const {client}=setup({fetch:async()=>json(result)});await rejected(()=>client.loadCatalogTrack('song'),'LAVALINK_SOURCE');}
});

test('Handles cannot be forged, serialized, or borrowed from another node instance',async()=>{
 const a=setup(),b=setup(),handle=await a.client.loadCatalogTrack('song');
 for(const forged of [{},JSON.parse(JSON.stringify(handle)),{encoded:'arbitrary track'},'raw track'])await rejected(()=>a.client.updatePlayer(fence(),{track:forged}),'LAVALINK_TRACK');
 await rejected(()=>b.client.updatePlayer(fence(),{track:handle}),'LAVALINK_TRACK');assert.equal(b.calls.length,0);
 await a.client.updatePlayer(fence(),{track:null});assert.deepEqual(JSON.parse(a.calls.at(-1).init.body),{track:{encoded:null}});
});

test('Player input rejects unknown identifier/filter fields, invalid bounds and incomplete voice state',async()=>{
 const {client,calls}=setup();for(const patch of [{identifier:'ytsearch:x'},{track:{identifier:'x'}},{filters:{volume:99}},{volume:0},{volume:101},{position:-1},{position:1.5},{paused:'false'},{voice:{token:'secret',endpoint:'voice.discord.media',sessionId:'session'}},{voice:{token:'secret',endpoint:'https://evil.invalid',sessionId:'session',channelId}},{}])await assert.rejects(async()=>client.updatePlayer(fence(),patch));
 assert.equal(calls.length,0);const handle=await client.loadCatalogTrack('song');await rejected(()=>client.updatePlayer(fence(),{track:handle,position:90000}),'LAVALINK_POSITION');
});

test('Persisted fence refusal and invalid monotonic fences prevent all network mutations',async()=>{
 const blocked=setup({isCurrent:async()=>false});await rejected(()=>blocked.client.updatePlayer(fence(),{paused:true}),'LAVALINK_STALE');assert.equal(blocked.calls.length,0);
 const {client,calls}=setup();await client.updatePlayer(fence(5,3),{paused:true});for(const old of [fence(4,3),fence(6,2),fence(5,4)])await rejected(()=>client.destroyPlayer(old),'LAVALINK_STALE');assert.equal(calls.length,1);
 await rejected(()=>client.updatePlayer({...fence(),guildId:'../other'},{paused:true}),'LAVALINK_FENCE');
});

test('Per-guild queue supersedes old waiting writes and rejects stale in-flight acknowledgement',async()=>{
 let release;const started=[];const {client}=setup({fetch:async(url,init)=>{started.push(JSON.parse(init.body).volume);if(started.length===1)await new Promise(resolve=>{release=resolve;});return json({guildId});}});
 const first=client.updatePlayer(fence(1),{volume:20});const firstCheck=rejected(()=>first,'LAVALINK_STALE');await tick();assert.deepEqual(started,[20]);
 const second=client.updatePlayer(fence(2),{volume:40});const secondCheck=rejected(()=>second,'LAVALINK_STALE');const third=client.updatePlayer(fence(3),{volume:60});await tick();assert.deepEqual(started,[20]);release();await firstCheck;await secondCheck;await third;assert.deepEqual(started,[20,60]);
});

test('Fence is checked again after asynchronous persisted validation and snapshots caller inputs',async()=>{
 let release;let validations=0;const {client,calls}=setup({isCurrent:async()=>{if(++validations===1)await new Promise(resolve=>{release=resolve;});return true;}});
 const original=fence(1),patch={volume:30};const old=client.updatePlayer(original,patch),oldCheck=rejected(()=>old,'LAVALINK_STALE');await tick();const latest=client.updatePlayer(fence(2),{volume:60});original.revision=999;patch.volume=100;release();await oldCheck;await latest;assert.equal(calls.length,1);assert.equal(JSON.parse(calls[0].init.body).volume,60);
});

test('Network exceptions are redacted and ambiguous writes block subsequent commands',async()=>{
 let count=0;const {client}=setup({fetch:async()=>{count++;throw Error('https://secret.invalid/?token=PRIVATE_NODE_PASSWORD');}});
 await assert.rejects(client.updatePlayer(fence(),{paused:true}),error=>{assert.equal(error.code,'LAVALINK_TRANSPORT');assert.ok(!inspect(error).includes('secret.invalid'));assert.ok(!inspect(error).includes('PRIVATE_NODE_PASSWORD'));assert.equal(error.cause,undefined);return true;});
 await rejected(()=>client.destroyPlayer(fence(2)),'LAVALINK_UNCERTAIN');assert.equal(count,1);
});

test('REST redirects are rejected without following Location or exposing error bodies',async()=>{
 let count=0;const {client}=setup({fetch:async(_url,init)=>{count++;assert.equal(init.redirect,'error');return new Response('SECRET_RESPONSE_BODY',{status:302,headers:{Location:'https://secret.invalid'}});}});
 await rejected(()=>client.updatePlayer(fence(),{paused:true}),'LAVALINK_REDIRECT');await rejected(()=>client.destroyPlayer(fence(2)),'LAVALINK_UNCERTAIN');assert.equal(count,1);
 const failed=setup({fetch:async()=>new Response('SECRET_RESPONSE_BODY',{status:401})});await rejected(()=>failed.client.updatePlayer(fence(),{paused:true}),'LAVALINK_HTTP');
});

test('Malformed or oversized successful responses are rejected without copying node payloads',async()=>{
 for(const response of [new Response('private html',{headers:{'content-type':'text/html'}}),new Response('{private',{headers:{'content-type':'application/json'}}),new Response('x'.repeat(131073),{headers:{'content-type':'application/json'}}),json({guildId:'333333333333333333',voice:{token:'SECRET'}})]){const {client}=setup({fetch:async()=>response});await rejected(()=>client.updatePlayer(fence(),{paused:false}),'LAVALINK_RESPONSE');await rejected(()=>client.destroyPlayer(fence(2)),'LAVALINK_UNCERTAIN');}
});

test('Timeout fails closed even when an injected fetch ignores abort; pre-aborted calls make no request',async()=>{
 const slow=setup({timeoutMs:5,fetch:async()=>new Promise(()=>{})});await rejected(()=>slow.client.updatePlayer(fence(),{paused:true}),'LAVALINK_TRANSPORT');await rejected(()=>slow.client.destroyPlayer(fence(2)),'LAVALINK_UNCERTAIN');
 const {client,calls}=setup(),controller=new AbortController();controller.abort();await rejected(()=>client.updatePlayer(fence(),{paused:true},controller.signal),'LAVALINK_ABORTED');assert.equal(calls.length,0);
 await client.updatePlayer(fence(2),{paused:true});assert.equal(calls.length,1);
});

test('Separate guilds do not block one another and valid same-revision operations retain order',async()=>{
 const other='333333333333333333',order=[];const {client}=setup({fetch:async(url,init)=>{order.push(JSON.parse(init.body).volume);return json({guildId:url.includes(other)?other:guildId});}});
 await Promise.all([client.updatePlayer(fence(),{volume:20}),client.updatePlayer(fence(),{volume:30}),client.updatePlayer({...fence(),guildId:other},{volume:40})]);assert.ok(order.indexOf(20)<order.indexOf(30));assert.ok(order.includes(40));
});

test('Session-setting mutations snapshot inputs and fail closed after ambiguous network failure',async()=>{
 let release,calls=0;const {client}=setup({fetch:async()=>{calls++;await new Promise(resolve=>{release=resolve;});throw Error('SECRET_ENDPOINT');}});
 const pending=client.updateSession({resuming:true,timeout:60}),check=rejected(()=>pending,'LAVALINK_TRANSPORT');await tick();release();await check;await rejected(()=>client.updateSession({resuming:false,timeout:0}),'LAVALINK_UNCERTAIN');assert.equal(calls,1);
});

test('REST track correlation derives generation from the persisted fence and rejects raw userdata',async()=>{
 const {client,calls}=setup(),handle=await client.loadCatalogTrack('song');
 await client.updatePlayer(fence(7,4),{track:handle,entryId:'entry-123'});
 assert.deepEqual(JSON.parse(calls.at(-1).init.body).track.userData,{ajMusic:{entryId:'entry-123',generation:4}});
 await assert.rejects(async()=>client.updatePlayer(fence(8,4),{track:handle,userData:{ajMusic:{entryId:'forged',generation:999}}}));
 await assert.rejects(async()=>client.updatePlayer(fence(8,4),{entryId:'orphan',paused:true}));
 await assert.rejects(async()=>client.updatePlayer(fence(8,4),{track:null,entryId:'orphan'}));
 await assert.rejects(async()=>client.updatePlayer(fence(8,4),{track:handle,entryId:'https://private.invalid'}));
 assert.equal(calls.length,2);
});
