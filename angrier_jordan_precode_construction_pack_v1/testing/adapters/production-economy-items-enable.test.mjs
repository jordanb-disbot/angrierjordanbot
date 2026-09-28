import test from 'node:test';
import assert from 'node:assert/strict';
import {enableProductionEconomyItems,main,GRANT_KEY,NOT_JORDAN,RING} from '../../scripts/enable-production-economy-items.mjs';
import {GUILD} from '../../scripts/audit-production-race-line.mjs';

const tiers=[{tier:1,cap:5000,upgrade_cost:1000},{tier:2,cap:25000,upgrade_cost:5000},{tier:3,cap:100000,upgrade_cost:20000},{tier:4,cap:500000,upgrade_cost:75000},{tier:5,cap:null,upgrade_cost:0}];
function fixture(){
 const rows=new Map(Object.entries({'features.items':false,'economy.bank_tiers':tiers,'economy.bank_tier5_interest_bps':100,'economy.bank_tier5_interest_cap':100000,'features.family':true,'unrelated.setting':'keep'}).map(([key,value])=>[key,{value,version:1}]));
 const item={id:RING,name:'Ring',type:'family',enabled:true},state={wallet:1200n,bank:300n,ring:0,locked:false},writes=[],receipts=new Map(),output=[];
 const db={guild:{findUnique:async()=>({id:GUILD})},catalogItem:{findUnique:async()=>item},inventoryCategoryLock:{findUnique:async()=>null}};
 const config={definition:key=>key==='features.items'?{type:'boolean'}:undefined,getWithMetadata:async(_g,key)=>rows.get(key),set:async input=>{writes.push(input);rows.set(input.key,{value:input.value,version:input.expectedVersion+1});}};
 const get=async path=>{assert.equal(path,`/guilds/${GUILD}/members/${NOT_JORDAN}`);return {user:{id:NOT_JORDAN,bot:false}};};
 const tx={catalogItem:db.catalogItem,inventoryCategoryLock:db.inventoryCategoryLock,member:{upsert:async()=>({})},economyAccount:{findUnique:async()=>({wallet:state.wallet,bank:state.bank})},inventoryEntry:{findUnique:async()=>state.ring?{quantity:state.ring,locked:state.locked}:null,update:async()=>{state.locked=false;return {quantity:state.ring,locked:false};}}};
 const ledger={apply:async input=>{assert.equal(input.idempotencyKey,GRANT_KEY+':ledger');assert.equal(input.lines.reduce((n,line)=>n+line.amount,0n),0n);state.wallet+=25_000n;return'applied';}};
 const atomic={run:async(_g,key,_fingerprint,operation)=>{if(receipts.has(key))return receipts.get(key);const result=await operation(tx,ledger);receipts.set(key,result);return result;}};
 const grantCatalogReward=async(_tx,g,u,catalog,quantity)=>{assert.equal(g,GUILD);assert.equal(u,NOT_JORDAN);assert.equal(catalog.id,RING);state.ring+=quantity;};
 const f={db,config,get,atomic,grantCatalogReward,state,rows,writes,receipts,output};f.run=()=>enableProductionEconomyItems({...f,write:line=>output.push(line)});return f;
}

test('enables only canonical Items setting and grants one unlocked ring plus exactly 25,000 Ottomans',async()=>{
 const f=fixture();const result=await f.run();
 assert.deepEqual(f.writes.map(x=>x.key),['features.items']);assert.equal(f.writes[0].source,'operator.production-economy-items-enablement');
 assert.equal(result.balanceBefore,'1500');assert.equal(result.balanceAfter,'26500');assert.equal(f.state.wallet,26200n);assert.equal(f.state.bank,300n);
 assert.equal(f.state.ring,1);assert.equal(f.state.locked,false);assert.equal(f.rows.get('unrelated.setting').value,'keep');assert.equal(f.rows.get('features.family').value,true);
 assert.ok(f.output.every(line=>line.startsWith('PASS:')));
});

test('rerun replays receipt without duplicating ring or money, even after ring use',async()=>{
 const f=fixture();await f.run();f.state.ring=0;await f.run();
 assert.equal(f.state.ring,0);assert.equal(f.state.wallet,26200n);assert.equal(f.writes.length,1);assert.equal(f.receipts.size,1);
});

test('bad bank config, missing catalog, or member mismatch prevents both configuration and grants',async()=>{
 for(const change of [f=>f.rows.set('economy.bank_tiers',{value:[],version:1}),f=>{f.db.catalogItem.findUnique=async()=>null;},f=>{f.get=async()=>({user:{id:'999',bot:false}});},f=>{f.db.inventoryCategoryLock.findUnique=async()=>({category:'family'});},f=>{f.config.definition=()=>undefined;}]){
  const f=fixture();change(f);await assert.rejects(f.run());assert.equal(f.writes.length,0);assert.equal(f.receipts.size,0);assert.equal(f.state.ring,0);assert.equal(f.state.wallet,1200n);
 }
});

test('invalid production target fails before connecting and hides connection details',async()=>{
 const errors=[];assert.equal(await main({NODE_ENV:'test',DATABASE_URL:'postgresql://secret:secret@bad.example/db'},{connect:()=>assert.fail('must not connect'),error:line=>errors.push(line)}),1);
 assert.doesNotMatch(errors.join(''),/secret|postgresql:/);
});
