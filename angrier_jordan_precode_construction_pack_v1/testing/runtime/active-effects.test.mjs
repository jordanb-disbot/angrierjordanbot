import test from 'node:test';
import assert from 'node:assert/strict';
import {claimActiveEffect} from '../../.test-build/packages/core/src/active-effects.js';

function adapter(){
 let row={id:'stack-1',remaining:1,claimKey:null};
 return{
  findActiveEffect:async()=>row.remaining?row:{...row,remaining:0},
  claimActiveEffect:async({id,claimKey})=>{if(id!==row.id||row.remaining<1||row.claimKey)return false;row={...row,remaining:0,claimKey};return true;}
 };
}
test('active effect claim is one-shot and replay-safe',async()=>{
 const tx=adapter();
 assert.deepEqual(await claimActiveEffect(tx,{guildId:'g',userId:'u',effect:'fighting_lessons',requestKey:'event-1'}),{applied:true,effect:'fighting_lessons'});
 assert.deepEqual(await claimActiveEffect(tx,{guildId:'g',userId:'u',effect:'fighting_lessons',requestKey:'event-1'}),{applied:false,effect:'fighting_lessons'});
});
test('concurrent effect claims allow exactly one winner',async()=>{
 const tx=adapter();
 const results=await Promise.all([1,2].map(n=>claimActiveEffect(tx,{guildId:'g',userId:'u',effect:'wheelchair_tuneup',requestKey:'race-'+n})));
 assert.equal(results.filter(x=>x.applied).length,1);
});
test('missing effect does not mutate resolution',async()=>{
 const tx={findActiveEffect:async()=>null,claimActiveEffect:async()=>{throw new Error('must not claim');}};
 assert.deepEqual(await claimActiveEffect(tx,{guildId:'g',userId:'u',effect:'boner_pills',requestKey:'pp-1'}),{applied:false,effect:'boner_pills'});
});
