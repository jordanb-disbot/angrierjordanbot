import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {inspect} from 'node:util';
import {Status} from 'discord.js';
import {DiscordJsVoiceGateway} from '../../dist/apps/bot/src/music/discord-voice-gateway.js';
import {DiscordVoiceHandshake} from '../../dist/apps/bot/src/music/discord-voice.js';
const g='111111111111111111',ch='222222222222222222',bot='333333333333333333',other='444444444444444444';
const voice={guild_id:g,user_id:bot,channel_id:ch,session_id:'SECRET_SESSION',member:{roles:['PRIVATE_ROLE']}};
const server={guild_id:g,token:'SECRET_TOKEN',endpoint:'voice.discord.media:443',extra:'PRIVATE_RAW'};
function setup(){
 const client=new EventEmitter(),sent=[];client.user={id:bot};const shard={id:0,status:Status.Ready,send:packet=>{sent.push(packet);}};
 const second={id:1,status:Status.Ready,send:packet=>{sent.push(packet);}};
 client.ws={shards:new Map([[0,shard],[1,second]])};client.guilds={cache:new Map([[g,{id:g,available:true,shardId:0,shard,channels:{cache:new Map([[ch,{isVoiceBased:()=>true}],[other,{isVoiceBased:()=>false}]])}}],[other,{id:other,available:true,shardId:1,shard:second,channels:{cache:new Map([[ch,{isVoiceBased:()=>true}]])}}]])};
 const bridge=new DiscordJsVoiceGateway(client);const raw=(type,data,sequence,shardId=0)=>client.emit('raw',{op:0,t:type,d:data,s:sequence},shardId);
 return{client,shard,second,bridge,sent,raw};
}
const packet=(channel=ch)=>({op:4,d:{guild_id:g,channel_id:channel,self_mute:false,self_deaf:true}});

test('Discord.js raw dispatches expose only internal voice fields while JSON/logging excludes credentials',()=>{
 const env=setup(),seen=[];env.bridge.subscribe(g,event=>seen.push(event));const before=env.bridge.snapshot(g);
 env.raw('MESSAGE_CREATE',{content:'PRIVATE_CHAT'},1);assert.equal(env.bridge.snapshot(g).sequence,1);assert.equal(seen.length,0);
 env.raw('VOICE_STATE_UPDATE',voice,2);env.raw('VOICE_SERVER_UPDATE',server,3);
 assert.equal(seen.length,2);assert.equal(seen[0].epoch,before.epoch);assert.equal(seen[0].data.session_id,'SECRET_SESSION');assert.equal(seen[1].data.token,'SECRET_TOKEN');assert.equal(seen[1].data.endpoint,'voice.discord.media:443');assert.equal(seen[0].data.member,undefined);assert.equal(seen[1].data.extra,undefined);
 assert.ok(!JSON.stringify([env.bridge,...seen]).includes('SECRET'));assert.ok(!inspect(seen).includes('SECRET'));assert.equal(JSON.stringify(env.bridge),'{}');env.bridge.shutdown();
});

test('Foreign identity, guild, shard, stale sequence and malformed dispatches are ignored',()=>{
 const env=setup(),seen=[];env.bridge.subscribe(g,event=>seen.push(event));
 env.raw('VOICE_STATE_UPDATE',{...voice,user_id:other},1);env.raw('VOICE_SERVER_UPDATE',{...server,guild_id:'555555555555555555'},2);env.raw('VOICE_SERVER_UPDATE',server,3,1);env.raw('VOICE_STATE_UPDATE',voice,3);env.raw('VOICE_STATE_UPDATE',voice,3);env.raw('VOICE_SERVER_UPDATE',server,2);
 env.client.emit('raw',{op:1,t:'VOICE_SERVER_UPDATE',d:server,s:4},0);env.raw('VOICE_SERVER_UPDATE',{...server,token:'bad\nsecret'},5);env.raw('VOICE_STATE_UPDATE',{...voice,channel_id:'bad'},6);env.raw('VOICE_STATE_UPDATE',{...voice,session_id:''},7);
 assert.equal(seen.length,1);assert.equal(seen[0].type,'VOICE_STATE_UPDATE');env.bridge.shutdown();
});

test('Shard reconnect retires the old epoch and drops replayed events until resume is ready',()=>{
 const env=setup(),seen=[];env.bridge.subscribe(g,event=>seen.push(event));const old=env.bridge.snapshot(g).epoch;
 env.shard.status=Status.Connecting;env.client.emit('shardReconnecting',0);assert.deepEqual(seen,[{kind:'disconnected',epoch:old}]);assert.throws(()=>env.bridge.snapshot(g),{code:'VOICE_GATEWAY'});
 env.raw('VOICE_STATE_UPDATE',voice,10);env.raw('VOICE_SERVER_UPDATE',server,11);assert.equal(seen.length,1);
 env.shard.status=Status.Ready;env.raw('RESUMED',{},12);env.client.emit('shardResume',0,2);const fresh=env.bridge.snapshot(g);assert.notEqual(fresh.epoch,old);assert.equal(fresh.sequence,12);
 env.raw('VOICE_STATE_UPDATE',voice,10);assert.equal(seen.length,1);env.raw('VOICE_STATE_UPDATE',voice,13);assert.equal(seen.length,2);env.bridge.shutdown();
});

test('A fresh READY packet invalidates an existing epoch even without a reconnect event',()=>{
 const env=setup(),seen=[];env.bridge.subscribe(g,event=>seen.push(event));const old=env.bridge.snapshot(g).epoch;env.raw('READY',{session_id:'PRIVATE_GATEWAY_SESSION'},1);assert.equal(seen[0].epoch,old);assert.throws(()=>env.bridge.snapshot(g),{code:'VOICE_GATEWAY'});
 env.client.emit('shardReady',0,new Set());assert.notEqual(env.bridge.snapshot(g).epoch,old);assert.ok(!JSON.stringify(seen).includes('PRIVATE'));env.bridge.shutdown();
});

test('Disconnect/error events invalidate only the affected shard and redact event details',()=>{
 for(const name of ['shardDisconnect','shardError']){const env=setup(),a=[],b=[];env.bridge.subscribe(g,event=>a.push(event));env.bridge.subscribe(other,event=>b.push(event));env.client.emit(name,new Error('SECRET_TOKEN'),0);assert.equal(a.length,1);assert.equal(b.length,0);assert.throws(()=>env.bridge.snapshot(g),{code:'VOICE_GATEWAY'});assert.ok(env.bridge.snapshot(other).epoch);assert.ok(!inspect(a).includes('SECRET'));env.bridge.shutdown();}
});

test('Outbound opcodes use the current guild shard and fixed voice fields only',async()=>{
 const env=setup(),signal=new AbortController().signal;await env.bridge.send(g,{...packet(),secret:'SECRET',d:{...packet().d,session_id:'SECRET'}},signal);await env.bridge.send(g,packet(null),signal);
 assert.deepEqual(env.sent,[packet(),packet(null)]);assert.ok(!JSON.stringify(env.sent).includes('SECRET'));env.bridge.shutdown();
});

test('Abort, wrong guild, unavailable shard, non-voice channel and invalid opcode prevent enqueue',async()=>{
 const env=setup(),controller=new AbortController();controller.abort();await assert.rejects(env.bridge.send(g,packet(),controller.signal),{code:'VOICE_GATEWAY'});
 for(const invalid of [{...packet(),op:2},{...packet(),d:{...packet().d,guild_id:other}},{...packet(),d:{...packet().d,self_deaf:false}},packet(other),packet('555555555555555555')])await assert.rejects(env.bridge.send(g,invalid,new AbortController().signal),{code:'VOICE_GATEWAY'});
 env.shard.status=Status.Connecting;await assert.rejects(env.bridge.send(g,packet(),new AbortController().signal),{code:'VOICE_GATEWAY'});assert.equal(env.sent.length,0);env.bridge.shutdown();
});

test('Gateway send exceptions and listener failures never escape credential-bearing raw errors',async()=>{
 const env=setup();env.shard.send=()=>{throw Error('SECRET_TOKEN https://SECRET_ENDPOINT');};await assert.rejects(env.bridge.send(g,packet(),new AbortController().signal),error=>{assert.equal(error.code,'VOICE_GATEWAY');assert.ok(!inspect(error).includes('SECRET'));return true;});
 env.bridge.subscribe(g,()=>{throw Error('SECRET_CALLBACK');});env.bridge.subscribe(g,async()=>{throw Error('SECRET_ASYNC_CALLBACK');});assert.doesNotThrow(()=>env.raw('VOICE_SERVER_UPDATE',server,1));await new Promise(resolve=>setImmediate(resolve));env.bridge.shutdown();
});

test('Shutdown removes only bridge listeners, aborts subscribers and makes all APIs unavailable',async()=>{
 const env=setup(),external=()=>{};env.client.on('raw',external);const seen=[];env.bridge.subscribe(g,event=>seen.push(event));env.bridge.shutdown();env.bridge.shutdown();assert.equal(seen.length,1);assert.equal(seen[0].kind,'disconnected');assert.equal(env.client.listenerCount('raw'),1);
 for(const name of ['shardReconnecting','shardDisconnect','shardError','shardReady','shardResume'])assert.equal(env.client.listenerCount(name),0);
 assert.throws(()=>env.bridge.snapshot(g),{code:'VOICE_GATEWAY'});assert.throws(()=>env.bridge.subscribe(g,()=>{}),{code:'VOICE_GATEWAY'});await assert.rejects(env.bridge.send(g,packet(),new AbortController().signal),{code:'VOICE_GATEWAY'});
});

test('Bridge and handshake integrate using projected private getters without any real networking',async()=>{
 const env=setup(),manager=new DiscordVoiceHandshake({botId:bot,gateway:env.bridge,isCurrent:async()=>true,timeoutMs:200});
 const pending=manager.join({guildId:g,generation:1,revision:1},ch);await new Promise(resolve=>setImmediate(resolve));env.raw('VOICE_SERVER_UPDATE',server,1);env.raw('VOICE_STATE_UPDATE',voice,2);const credentials=await pending;let observed;await credentials.consume(async value=>{observed=value;});assert.equal(observed.sessionId,'SECRET_SESSION');assert.equal(observed.token,'SECRET_TOKEN');assert.equal(env.sent.length,1);manager.shutdown();env.bridge.shutdown();
});

test('Unsubscribe is idempotent and null endpoint/bot disconnect projections retain their semantics',()=>{
 const env=setup(),seen=[];const stop=env.bridge.subscribe(g,event=>seen.push(event));env.raw('VOICE_SERVER_UPDATE',{guild_id:g,endpoint:null},1);env.raw('VOICE_STATE_UPDATE',{...voice,channel_id:null},2);assert.equal(seen[0].data.endpoint,null);assert.equal(seen[1].data.channel_id,null);stop();stop();env.raw('VOICE_SERVER_UPDATE',server,3);assert.equal(seen.length,2);env.bridge.shutdown();
});
