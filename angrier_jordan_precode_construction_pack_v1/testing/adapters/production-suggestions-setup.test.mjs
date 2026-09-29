import test from 'node:test';
import assert from 'node:assert/strict';
import {configureProductionSuggestions,SUGGESTIONS_CHANNEL} from '../../scripts/configure-production-suggestions.mjs';
import {GUILD} from '../../scripts/audit-production-race-line.mjs';

function fixture(){
 const rows=new Map([['features.community',{value:false,version:2}],['channels.suggestions_channel',{value:null,version:1}],['features.casino',{value:false,version:4}]]),writes=[],output=[];
 const db={guild:{findUnique:async()=>({id:GUILD})}};
 const config={get:async(_g,key)=>rows.get(key)?.value??null,getWithMetadata:async(_g,key)=>rows.get(key)??{value:null,version:0},set:async input=>{assert.equal(input.guildId,GUILD);assert.equal(input.source,'operator.production-suggestions');assert.equal(input.expectedVersion,rows.get(input.key)?.version??0);writes.push(input);rows.set(input.key,{value:input.value,version:input.expectedVersion+1});}};
 const get=async path=>({id:path.split('/').at(-1),guild_id:GUILD,type:0});
 return {rows,writes,output,run:()=>configureProductionSuggestions({db,config,get,write:line=>output.push(line)})};
}

test('production Suggestions enables only Community and maps the verified panel channel',async()=>{
 const f=fixture();await f.run();
 assert.deepEqual(f.writes.map(row=>row.key),['features.community','channels.suggestions_channel']);
 assert.equal(f.rows.get('features.community').value,true);assert.equal(f.rows.get('channels.suggestions_channel').value,SUGGESTIONS_CHANNEL);assert.equal(f.rows.get('features.casino').value,false);
 assert.ok(f.output.every(line=>line.startsWith('PASS:')));
});

test('production Suggestions rerun is idempotent',async()=>{
 const f=fixture();await f.run();const writes=f.writes.length;await f.run();assert.equal(f.writes.length,writes);
});
