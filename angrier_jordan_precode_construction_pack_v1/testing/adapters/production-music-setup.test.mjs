import test from 'node:test';
import assert from 'node:assert/strict';
import {enableProductionMusic} from '../../scripts/enable-production-music.mjs';
import {GUILD} from '../../scripts/audit-production-race-line.mjs';

test('production music maintenance changes only music.enabled and is idempotent',async()=>{
 const writes=[];let current={value:false,version:3};
 const config={definition:key=>key==='music.enabled'?{type:'boolean'}:undefined,getWithMetadata:async()=>current,get:async()=>current.value,set:async input=>{writes.push(input);current={value:input.value,version:input.expectedVersion+1};}};
 const dependencies={db:{guild:{findUnique:async()=>({id:GUILD})}},config,write:()=>{}};
 await enableProductionMusic(dependencies);await enableProductionMusic(dependencies);
 assert.equal(current.value,true);assert.equal(writes.length,1);assert.deepEqual(writes[0],{guildId:GUILD,key:'music.enabled',value:true,expectedVersion:3,source:'operator.production-music',requestId:writes[0].requestId});
});

test('production music maintenance rejects a missing guild or an invalid setting before writing',async()=>{
 const config={definition:()=>({type:'boolean'}),getWithMetadata:async()=>({value:'invalid',version:0}),get:async()=>false,set:async()=>assert.fail('must not write')};
 await assert.rejects(enableProductionMusic({db:{guild:{findUnique:async()=>null}},config,write:()=>{}}),/PRODUCTION_GUILD_MISSING/);
 await assert.rejects(enableProductionMusic({db:{guild:{findUnique:async()=>({id:GUILD})}},config,write:()=>{}}),/MUSIC_SETTING_INVALID/);
});
