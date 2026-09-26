import test from 'node:test';
import assert from 'node:assert/strict';
import {parseLavalinkMessage,projectLavalinkEvent,LAVALINK_MESSAGE_MAX_BYTES,LAVALINK_MESSAGE_MAX_DEPTH} from '../../dist/apps/bot/src/music/lavalink-events.js';
const guildId='111111111111111111',otherGuild='222222222222222222',entryId='entry-1',generation=3;
const rawTrack=(type='TrackStartEvent',extra={})=>({op:'event',type,guildId,track:{encoded:'SECRET_ENCODED',info:{uri:'https://secret.invalid/?token=SECRET',title:'PRIVATE_PROVIDER_TITLE'},pluginInfo:{password:'SECRET_PASSWORD'},userData:{secret:'SECRET_USERDATA',ajMusic:{entryId,generation}}},...extra});
const parse=(value,ready)=>parseLavalinkMessage(JSON.stringify(value),ready);
const context=(overrides={})=>{const fence={guildId,entryId,generation,revision:12};return{expected:{...fence},current:{...fence},sourceSocketEpoch:'socket-1',activeSocketEpoch:'socket-1',sourceSequence:4,...overrides};};
const update=(overrides={})=>parse({op:'playerUpdate',guildId,state:{position:1200,time:2000,connected:true,ping:12,...overrides},token:'SECRET_VOICE_TOKEN'});

test('Ready session ID is available only through the internal callback',()=>{
 let internal;const result=parse({op:'ready',sessionId:'PRIVATE_SESSION',resumed:true,token:'SECRET'},value=>{internal=value;});
 assert.deepEqual(result,{kind:'ready',resumed:true});assert.deepEqual(internal,{sessionId:'PRIVATE_SESSION',resumed:true});assert.ok(Object.isFrozen(internal));assert.ok(!JSON.stringify(result).includes('PRIVATE_SESSION'));
 assert.equal(parse({op:'ready',sessionId:'bad/session',resumed:false}),null);assert.equal(parse({op:'ready',sessionId:'valid',resumed:'yes'}),null);
 assert.equal(parse({op:'ready',sessionId:'PRIVATE_SESSION',resumed:false},()=>{throw Error('SECRET_CALLBACK_ERROR');}),null);
});

test('Track event projection strips encoded tracks, metadata, arbitrary userdata and raw exceptions',()=>{
 const start=parse(rawTrack());assert.deepEqual(start,{kind:'trackStart',guildId,entryId,generation});
 const exception=parse(rawTrack('TrackExceptionEvent',{exception:{message:'SECRET_URI',cause:'SECRET_TOKEN',causeStackTrace:'SECRET_TRACE',severity:'fault'}}));assert.deepEqual(exception,{kind:'trackException',guildId,entryId,generation,error:'PLAYABLE_SOURCE_FAILED'});
 const projected=projectLavalinkEvent(exception,context());assert.ok(!JSON.stringify([start,exception,projected]).includes('SECRET'));assert.ok(Object.isFrozen(start));
 assert.equal(parse(rawTrack('TrackExceptionEvent',{exception:null})),null);
});

test('Malformed JSON, invalid UTF-8, non-wire objects and oversized multibyte frames are ignored',()=>{
 for(const raw of ['', '{"op":"SECRET', 'null','[]','true',{},42,new Uint8Array([0xc0,0xaf]),'x'.repeat(LAVALINK_MESSAGE_MAX_BYTES+1),JSON.stringify({op:'stats',x:'🪑'.repeat(40000)})])assert.equal(parseLavalinkMessage(raw),null);
 const bytes=new TextEncoder().encode(JSON.stringify(rawTrack()));assert.deepEqual(parseLavalinkMessage(bytes),parse(rawTrack()));
});

test('Depth bounds reject nested payloads while quoted braces and escaped quotes remain harmless',()=>{
 assert.equal(parseLavalinkMessage('['.repeat(LAVALINK_MESSAGE_MAX_DEPTH+1)+'0'+']'.repeat(LAVALINK_MESSAGE_MAX_DEPTH+1)),null);
 const event=rawTrack();event.track.info.title='{["\\'.repeat(1000);assert.equal(parse(event)?.kind,'trackStart');
 assert.equal(parseLavalinkMessage('{"op":"stats"}}'),null);
});

test('Stats, plugin events, unsupported voice/stuck events and non-string event types are ignored',()=>{
 for(const event of [{op:'stats',cpu:{secret:'SECRET'}},{op:'futureOp',guildId},{op:'event',guildId,type:'PluginEvent',secret:'SECRET'},{op:'event',guildId,type:'WebSocketClosedEvent',reason:'SECRET'},{op:'event',guildId,type:'TrackStuckEvent',thresholdMs:100},{op:'event',guildId,type:{toString:'bad'}}])assert.equal(parse(event),null);
});

test('Track callbacks require valid public entry ID and exact integer generation in namespaced userdata',()=>{
 for(const correlation of [undefined,{}, {entryId,generation:'3'}, {entryId,generation:-1}, {entryId,generation:1.5}, {entryId:'https://private.invalid/secret',generation},{entryId:'x'.repeat(101),generation}]){const frame=rawTrack();frame.track.userData={ajMusic:correlation};assert.equal(parse(frame),null);}
 const frame=rawTrack();frame.track.userData={entryId,generation};assert.equal(parse(frame),null);assert.equal(parse(rawTrack('TrackStartEvent',{guildId:'not-a-guild'})),null);
});

test('Only finished and loadFailed end reasons propose advancing the queue',()=>{
 for(const [reason,finishReason] of [['finished','ended'],['loadFailed','failed'],['stopped',null],['replaced',null],['cleanup',null]]){const event=parse(rawTrack('TrackEndEvent',{reason})),result=projectLavalinkEvent(event,context());assert.equal(result.kind,'trackEnd');assert.equal(result.finishReason,finishReason);assert.equal(result.reason,reason);}
 assert.equal(parse(rawTrack('TrackEndEvent',{reason:'error:SECRET'})),null);
});

test('Projection fences server, entry, generation, persisted revision and socket epoch',()=>{
 const event=parse(rawTrack());assert.equal(projectLavalinkEvent(event,context()).expectedRevision,12);
 for(const changed of [{guildId:otherGuild},{entryId:'entry-2'},{entryId:null},{generation:4},{revision:13},{revision:NaN}]){const c=context();Object.assign(c.current,changed);assert.equal(projectLavalinkEvent(event,c),null);}
 assert.equal(projectLavalinkEvent(event,context({activeSocketEpoch:'socket-2'})),null);assert.equal(projectLavalinkEvent(event,context({sourceSequence:-1})),null);
 const c=context();c.current.guildId=otherGuild;c.expected.guildId=otherGuild;assert.equal(projectLavalinkEvent(event,c),null);
});

test('Queue-only revision changes can accept the same track after a fresh persisted snapshot',()=>{
 const event=parse(rawTrack()),c=context();c.expected.revision=15;c.current.revision=15;const result=projectLavalinkEvent(event,c);assert.equal(result.generation,3);assert.equal(result.expectedRevision,15);
 const stale=rawTrack();stale.track.userData.ajMusic.generation=2;assert.equal(projectLavalinkEvent(parse(stale),c),null);
});

test('Player updates expose telemetry without inventing playback or pause status',()=>{
 assert.deepEqual(update(),{kind:'playerUpdate',guildId,positionMs:1200,at:2000,connected:true});assert.equal(projectLavalinkEvent(update(),context()),null);
 const start=projectLavalinkEvent(parse(rawTrack()),context()),c=context({sourceSequence:5,playerBinding:start.binding});const result=projectLavalinkEvent(update(),c);assert.equal(result.kind,'playerUpdate');assert.equal(result.generation,3);assert.equal(result.connected,true);assert.equal(result.status,undefined);assert.equal(result.desiredStatus,undefined);
 const disconnected=projectLavalinkEvent(update({connected:false}),c);assert.equal(disconnected.connected,false);assert.equal(disconnected.status,undefined);
});

test('Player telemetry requires current TrackStart binding and a later receive sequence',()=>{
 const binding=projectLavalinkEvent(parse(rawTrack()),context()).binding;
 for(const changed of [{guildId:otherGuild},{entryId:'entry-2'},{generation:4},{socketEpoch:'old-socket'},{startSequence:5},{startSequence:NaN}])assert.equal(projectLavalinkEvent(update(),context({sourceSequence:5,playerBinding:{...binding,...changed}})),null);
 assert.equal(projectLavalinkEvent(update(),context({sourceSequence:3,playerBinding:binding})),null);
 assert.equal(projectLavalinkEvent(update(),context({sourceSequence:5,playerBinding:binding,lastObservedAt:2001})),null);
 assert.notEqual(projectLavalinkEvent(update(),context({sourceSequence:5,playerBinding:binding,lastObservedAt:2000})),null);
});

test('Malformed telemetry numbers and connected coercions cannot become observations',()=>{
 for(const changed of [{position:-1},{position:604800001},{position:'100'},{position:0.5},{time:-1},{time:8640000000000001},{time:'2000'},{connected:1}])assert.equal(update(changed),null);
});

test('Projection copies safe fields and does not mutate persisted snapshots',()=>{
 const c=context(),before=structuredClone(c),event=parse(rawTrack()),projection=projectLavalinkEvent(event,c);assert.deepEqual(c,before);assert.ok(Object.isFrozen(projection));assert.ok(Object.isFrozen(projection.binding));
 c.current.revision=99;assert.equal(projection.expectedRevision,12);assert.equal(projectLavalinkEvent({kind:'ready',resumed:false},context()),null);
});
