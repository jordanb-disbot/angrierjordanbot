import test from 'node:test';
import assert from 'node:assert/strict';
import {inspect} from 'node:util';
import {DiscordVoiceHandshake,DiscordVoiceBoundaryError} from '../../dist/apps/bot/src/music/discord-voice.js';
const guildId='111111111111111111',channelId='222222222222222222',botId='333333333333333333',other='444444444444444444';
const fence=(revision=1,generation=1,guild=guildId)=>({guildId:guild,revision,generation});
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const rejected=(operation,code)=>assert.rejects(async()=>operation(),{code});

test('Join stage diagnostics distinguish success and failure without exposing credentials or raw errors',async t=>{
 const traces=[];t.mock.method(console,'info',message=>traces.push(message));
 const ready=setup(),pending=ready.manager.join(fence(),channelId);await tick();ready.state();ready.server();await pending;ready.manager.shutdown();
 const failed=setup({onSend:async()=>{throw new TypeError('SECRET_TOKEN SECRET_SESSION https://SECRET_ENDPOINT');}});await rejected(()=>failed.manager.join(fence(),channelId),'VOICE_GATEWAY');failed.manager.shutdown();
 assert.deepEqual(traces.map(line=>line.split(' ')[2]),['voice.join.start','voice.join.success','voice.join.start','voice.join.failure']);
 assert.ok(traces.every(line=>line.includes(guildId)&&line.includes(channelId)));assert.doesNotMatch(traces.join('\n'),/SECRET|discord\.media|sessionId|token|endpoint/);
});
function setup(overrides={}){
 let epoch='gateway-1',sequence=0;const listeners=new Set(),calls=[];
 const emit=(type,data,meta={})=>{const value={kind:'dispatch',epoch,sequence:++sequence,type,data,...meta};sequence=Math.max(sequence,value.sequence);for(const fn of listeners)fn(value);};
 const gateway={snapshot:()=>({epoch,sequence}),subscribe:(_guild,listener)=>{listeners.add(listener);return()=>listeners.delete(listener);},send:async(guild,packet,signal,beforeSend)=>{await beforeSend?.();calls.push({guild,packet,signal});await overrides.onSend?.({guild,packet,signal,emit});}};
 const options={botId,gateway,isCurrent:async()=>true,timeoutMs:200,...overrides};delete options.onSend;
 const manager=new DiscordVoiceHandshake(options);
 return{manager,gateway,calls,listeners,emit,state:(changes={},meta={})=>emit('VOICE_STATE_UPDATE',{guild_id:guildId,user_id:botId,channel_id:channelId,session_id:'SECRET_SESSION',...changes},meta),server:(changes={},meta={})=>emit('VOICE_SERVER_UPDATE',{guild_id:guildId,token:'SECRET_TOKEN',endpoint:'voice.discord.media:443',...changes},meta),disconnect:()=>{for(const fn of listeners)fn({kind:'disconnected',epoch});},epoch:value=>{epoch=value;sequence=0;}};
}

test('Voice credentials require both gateway events in either order and serialize no secrets',async()=>{
 for(const serverFirst of [true,false]){const env=setup(),pending=env.manager.join(fence(),channelId);await tick();assert.deepEqual(env.calls[0].packet,{op:4,d:{guild_id:guildId,channel_id:channelId,self_mute:false,self_deaf:true}});
  if(serverFirst){env.server();env.state();}else{env.state();env.server();}const handle=await pending;assert.equal(env.listeners.size,0);assert.equal(JSON.stringify(handle),'{}');assert.ok(!inspect(handle).includes('SECRET'));assert.ok(!inspect(env.manager).includes('SECRET'));
  let received;await handle.consume(async value=>{received=value;});assert.deepEqual(received,{token:'SECRET_TOKEN',endpoint:'voice.discord.media:443',sessionId:'SECRET_SESSION',channelId});assert.ok(Object.isFrozen(received));await rejected(()=>handle.consume(async()=>{}),'VOICE_CREDENTIALS_USED');env.manager.shutdown();
 }
});

test('Foreign server/user/channel events and old gateway sequence/epoch cannot satisfy a join',async()=>{
 const env=setup(),pending=env.manager.join(fence(),channelId);let finished=false;void pending.then(()=>{finished=true;});await tick();
 env.server({guild_id:other});env.state({user_id:other});env.state({channel_id:other});env.state({}, {sequence:0});env.server({}, {epoch:'old-gateway'});await tick();assert.equal(finished,false);
 env.server();env.state();await pending;env.manager.shutdown();
});

test('A server allocation with null endpoint invalidates older server credentials until a fresh update',async()=>{
 const env=setup(),pending=env.manager.join(fence(),channelId);await tick();env.server();env.server({endpoint:null});env.state();let finished=false;void pending.then(()=>{finished=true;});await tick();assert.equal(finished,false);env.server({token:'FRESH_TOKEN'});const handle=await pending;let received;await handle.consume(async value=>{received=value;});assert.equal(received.token,'FRESH_TOKEN');env.manager.shutdown();
});

test('Authority is checked before opcode 4, before credentials return, and again at consumption',async()=>{
 let current=false;const denied=setup({isCurrent:async()=>current});await rejected(()=>denied.manager.join(fence(),channelId),'VOICE_STALE');assert.equal(denied.calls.length,0);assert.equal(denied.listeners.size,0);
 current=true;const pending=denied.manager.join(fence(2),channelId);await tick();current=false;denied.state();denied.server();await rejected(()=>pending,'VOICE_STALE');denied.manager.shutdown();
 const env=setup({isCurrent:async()=>current});current=true;const p=env.manager.join(fence(),channelId);await tick();env.state();env.server();const handle=await p;current=false;let used=false;await rejected(()=>handle.consume(async()=>{used=true;}),'VOICE_STALE');assert.equal(used,false);env.manager.shutdown();
});

test('A superseded guild attempt never sends and same-guild attempts remain serialized',async()=>{
 const env=setup();const first=env.manager.join(fence(),channelId),firstCheck=rejected(()=>first,'VOICE_STALE');const second=env.manager.join(fence(2),channelId);await firstCheck;await tick();assert.equal(env.calls.length,1);env.server();env.state();await second;await rejected(()=>env.manager.join(fence(),channelId),'VOICE_STALE');env.manager.shutdown();
});

test('Timeout after send quarantines retry until an explicit confirmed disconnect',async()=>{
 const env=setup({timeoutMs:10});await rejected(()=>env.manager.join(fence(),channelId),'VOICE_TIMEOUT');assert.equal(env.listeners.size,0);await rejected(()=>env.manager.join(fence(2),channelId),'VOICE_UNCERTAIN');assert.equal(env.calls.length,1);
 const leave=env.manager.disconnect(fence(3));await tick();assert.equal(env.calls.at(-1).packet.d.channel_id,null);env.state({channel_id:null});await leave;
 const joined=env.manager.join(fence(4),channelId);await tick();env.state();env.server();await joined;env.manager.shutdown();
});

test('Aborted pending joins clean listeners and cannot reuse late credentials in the same gateway epoch',async()=>{
 const env=setup(),controller=new AbortController(),pending=env.manager.join(fence(),channelId,controller.signal),check=rejected(()=>pending,'VOICE_ABORTED');await tick();controller.abort('SECRET_ABORT_REASON');await check;assert.equal(env.listeners.size,0);env.state();env.server();await rejected(()=>env.manager.join(fence(2),channelId),'VOICE_UNCERTAIN');assert.equal(env.calls.length,1);env.manager.shutdown();
});

test('A fresh gateway epoch permits a new handshake after an ambiguous failure',async()=>{
 const env=setup({timeoutMs:10});await rejected(()=>env.manager.join(fence(),channelId),'VOICE_TIMEOUT');env.epoch('gateway-2');const pending=env.manager.join(fence(2),channelId);await tick();env.state();env.server();await pending;assert.equal(env.calls.length,2);env.manager.shutdown();
});

test('Bot disconnect and gateway disconnect abort an incomplete join without exposing credentials',async()=>{
 for(const gatewayFailure of [false,true]){const env=setup(),pending=env.manager.join(fence(),channelId),check=rejected(()=>pending,gatewayFailure?'VOICE_GATEWAY_DISCONNECTED':'VOICE_DISCONNECTED');await tick();env.server();if(gatewayFailure)env.disconnect();else env.state({channel_id:null});await check;assert.equal(env.listeners.size,0);env.manager.shutdown();}
});

test('Shutdown cancels active and queued work, disposes subscriptions and invalidates returned credentials',async()=>{
 const env=setup(),active=env.manager.join(fence(),channelId),check=rejected(()=>active,'VOICE_SHUTDOWN');await tick();env.manager.shutdown();env.manager.shutdown();await check;await rejected(()=>env.manager.join(fence(2),channelId),'VOICE_SHUTDOWN');assert.equal(env.listeners.size,0);
 const ready=setup(),pending=ready.manager.join(fence(),channelId);await tick();ready.server();ready.state();const handle=await pending;ready.manager.shutdown();await rejected(()=>handle.consume(async()=>{}),'VOICE_SHUTDOWN');
});

test('Send, fence, and consumer exceptions are redacted; valid callback results are discarded',async()=>{
 const env=setup({onSend:async()=>{throw Error('SECRET_TOKEN https://SECRET_ENDPOINT');}});await assert.rejects(env.manager.join(fence(),channelId),error=>{assert.equal(error.code,'VOICE_GATEWAY');assert.ok(!inspect(error).includes('SECRET'));assert.equal(error.cause,undefined);return true;});env.manager.shutdown();
 const ready=setup(),pending=ready.manager.join(fence(),channelId);await tick();ready.state();ready.server();const handle=await pending;await rejected(()=>handle.consume(async()=>{throw Error('SECRET_TOKEN');}),'VOICE_HANDOFF');ready.manager.shutdown();
 const denied=setup({isCurrent:async()=>{throw Error('SECRET_DB');}});await rejected(()=>denied.manager.join(fence(),channelId),'VOICE_FENCE');assert.equal(denied.calls.length,0);denied.manager.shutdown();
});

test('Malformed matching voice endpoints/tokens cannot reach the credential consumer',async()=>{
 for(const changes of [{endpoint:'https://voice.discord.media'},{endpoint:'voice.discord.media.evil.invalid'},{endpoint:'127.0.0.1:443'},{endpoint:'voice.discord.media:70000'},{token:'secret\r\nheader'},{token:''}]){const env=setup(),pending=env.manager.join(fence(),channelId),check=rejected(()=>pending,'VOICE_EVENT');await tick();env.state();env.server(changes);await check;assert.equal(env.listeners.size,0);env.manager.shutdown();}
});

test('Pre-aborted joins and authority timeouts send no opcode and do not quarantine untouched gateway state',async()=>{
 const env=setup(),controller=new AbortController();controller.abort();await rejected(()=>env.manager.join(fence(),channelId,controller.signal),'VOICE_ABORTED');assert.equal(env.calls.length,0);env.manager.shutdown();
 const blocked=setup({timeoutMs:10,isCurrent:async()=>new Promise(()=>{})});await rejected(()=>blocked.manager.join(fence(),channelId),'VOICE_TIMEOUT');assert.equal(blocked.calls.length,0);assert.equal(blocked.listeners.size,0);blocked.manager.shutdown();
});

test('Events emitted synchronously from gateway send are captured and independent guilds proceed separately',async()=>{
 const env=setup({onSend:async({guild,packet,emit})=>{emit('VOICE_SERVER_UPDATE',{guild_id:guild,token:'SECRET_TOKEN',endpoint:'voice.discord.media'});emit('VOICE_STATE_UPDATE',{guild_id:guild,user_id:botId,channel_id:packet.d.channel_id,session_id:'SECRET_SESSION'});}});
 const handles=await Promise.all([env.manager.join(fence(),channelId),env.manager.join(fence(1,1,other),channelId)]);assert.equal(handles.length,2);assert.equal(env.calls.length,2);assert.equal(env.listeners.size,0);env.manager.shutdown();
});

test('Injected boundary-shaped errors cannot smuggle credential data through error codes or messages',async()=>{
 for(const code of ['SECRET_TOKEN','VOICE_GATEWAY']){const env=setup({onSend:async()=>{const error=new DiscordVoiceBoundaryError(code);error.message='SECRET_SESSION https://SECRET_ENDPOINT';throw error;}});await assert.rejects(env.manager.join(fence(),channelId),error=>{assert.equal(error.code,'VOICE_GATEWAY');assert.ok(!inspect(error).includes('SECRET'));return true;});env.manager.shutdown();}
});
