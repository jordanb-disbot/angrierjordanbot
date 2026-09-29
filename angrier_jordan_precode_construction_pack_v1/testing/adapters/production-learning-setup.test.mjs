import assert from 'node:assert/strict';
import test from 'node:test';
import {enableProductionLearning} from '../../scripts/enable-production-learning.mjs';

const guild='1524964384642957432';
function fixture(value=false){let version=1,writes=0;const values=new Map([['features.learning',value]]);return {db:{guild:{findUnique:async()=>({id:guild})}},config:{definition:key=>key==='features.learning'?{type:'boolean'}:undefined,get:async(_guild,key)=>values.get(key),getWithMetadata:async(_guild,key)=>({value:values.get(key),version}),set:async input=>{writes++;version++;values.set(input.key,input.value);}},values,writes:()=>writes};}
test('production learning maintenance enables only learning and is idempotent',async()=>{const f=fixture();await enableProductionLearning({...f,write:()=>{}});assert.equal(f.values.get('features.learning'),true);assert.equal(f.writes(),1);await enableProductionLearning({...f,write:()=>{}});assert.equal(f.writes(),1);});
