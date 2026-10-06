import test from 'node:test';
import assert from 'node:assert/strict';
import {enableProductionCrime} from '../../scripts/enable-production-crime.mjs';

test('crime production setup validates Bots Don’t Sit and changes only the crime feature',async()=>{
 const rows=new Map([['features.crime',{value:false,version:3}],['unrelated.setting',{value:'keep',version:4}]]),writes=[];
 const config={getWithMetadata:async(_g,key)=>rows.get(key)??{value:null,version:0},set:async value=>{writes.push(value);rows.set(value.key,{value:value.value,version:value.expectedVersion+1});}};
 await enableProductionCrime({db:{guild:{findUnique:async()=>({id:'1524964384642957432'})}},config,get:async path=>({id:path.split('/').at(-1),guild_id:'1524964384642957432',type:0}),write:()=>{}});
 assert.deepEqual(writes.map(row=>[row.key,row.value]),[['features.crime',true]]);assert.equal(rows.get('unrelated.setting').value,'keep');
});
