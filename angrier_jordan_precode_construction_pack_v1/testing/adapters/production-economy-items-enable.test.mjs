import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {enableProductionEconomyItems,main,GRANT_KEY,NOT_JORDAN,RING,FAMILY_IDS} from '../../scripts/enable-production-economy-items.mjs';
import {GUILD} from '../../scripts/audit-production-race-line.mjs';

const tiers=[{tier:1,cap:5000,upgrade_cost:1000},{tier:2,cap:25000,upgrade_cost:5000},{tier:3,cap:100000,upgrade_cost:20000},{tier:4,cap:500000,upgrade_cost:75000},{tier:5,cap:null,upgrade_cost:0}];
const familyCatalogItems=JSON.parse(readFileSync(new URL('../../packages/content/economy/family_catalog.json',import.meta.url),'utf8')).items;
function fixture(){
 const rows=new Map(Object.entries({'features.items':false,'economy.bank_tiers':tiers,'economy.bank_tier5_interest_bps':100,'economy.bank_tier5_interest_cap':100000,'features.family':true,'unrelated.setting':'keep'}).map(([key,value])=>[key,{value,version:1}]));
 const state={wallet:1200n,bank:300n,ring:0,locked:false},writes=[],receipts=new Map(),output=[],catalog=new Map(),ensuredIds=[];
 const db={guild:{findUnique:async()=>({id:GUILD})},catalogItem:{findUnique:async({where})=>catalog.get(where.id)??null},inventoryCategoryLock:{findUnique:async()=>null}};
 const ensureFamilyCatalog=async()=>{for(const item of familyCatalogItems){ensuredIds.push(item.id);if(!catalog.has(item.id))catalog.set(item.id,{...structuredClone(item),buyPrice:BigInt(item.buyPrice),sellValue:BigInt(item.sellValue)});}};
 const config={definition:key=>key==='features.items'?{type:'boolean'}:undefined,getWithMetadata:async(_g,key)=>rows.get(key),set:async input=>{writes.push(input);rows.set(input.key,{value:input.value,version:input.expectedVersion+1});}};
 const get=async path=>{assert.equal(path,`/guilds/${GUILD}/members/${NOT_JORDAN}`);return {user:{id:NOT_JORDAN,bot:false}};};
 const tx={catalogItem:db.catalogItem,inventoryCategoryLock:db.inventoryCategoryLock,member:{upsert:async()=>({})},economyAccount:{findUnique:async()=>({wallet:state.wallet,bank:state.bank})},inventoryEntry:{findUnique:async()=>state.ring?{quantity:state.ring,locked:state.locked}:null,update:async()=>{state.locked=false;return {quantity:state.ring,locked:false};}}};
 const ledger={apply:async input=>{assert.equal(input.idempotencyKey,GRANT_KEY+':ledger');assert.equal(input.lines.reduce((n,line)=>n+line.amount,0n),0n);state.wallet+=25_000n;return'applied';}};
 const atomic={run:async(_g,key,_fingerprint,operation)=>{if(receipts.has(key))return receipts.get(key);const result=await operation(tx,ledger);receipts.set(key,result);return result;}};
 const grantCatalogReward=async(_tx,g,u,catalog,quantity)=>{assert.equal(g,GUILD);assert.equal(u,NOT_JORDAN);assert.equal(catalog.id,RING);state.ring+=quantity;};
 const f={db,config,get,atomic,grantCatalogReward,ensureFamilyCatalog,familyCatalogItems,state,rows,writes,receipts,output,catalog,ensuredIds};f.run=()=>enableProductionEconomyItems({...f,write:line=>output.push(line)});return f;
}

test('enables only canonical Items setting and grants one unlocked ring plus exactly 25,000 Ottomans',async()=>{
 const f=fixture();const result=await f.run();
 assert.deepEqual(f.writes.map(x=>x.key),['features.items']);assert.equal(f.writes[0].source,'operator.production-economy-items-enablement');
 assert.equal(result.balanceBefore,'1500');assert.equal(result.balanceAfter,'26500');assert.equal(f.state.wallet,26200n);assert.equal(f.state.bank,300n);
 assert.equal(f.state.ring,1);assert.equal(f.state.locked,false);assert.equal(f.rows.get('unrelated.setting').value,'keep');assert.equal(f.rows.get('features.family').value,true);
 assert.deepEqual(f.ensuredIds,FAMILY_IDS);assert.equal(f.catalog.size,3);
 for(const item of familyCatalogItems)assert.ok(f.output.some(line=>line.includes(item.id)&&line.startsWith('PASS:')));
 assert.ok(f.output.every(line=>line.startsWith('PASS:')));
});

test('catalog ensure preserves existing Family administration and does not touch unrelated items',async()=>{
 const f=fixture(),source=familyCatalogItems[0];
 const existing={...structuredClone(source),buyPrice:777n,sellValue:0n};f.catalog.set(RING,existing);
 const unrelated={id:'other.item',name:'Other'};f.catalog.set(unrelated.id,unrelated);
 await f.run();assert.deepEqual(f.catalog.get(RING),existing);assert.equal(f.catalog.get('other.item'),unrelated);assert.equal(f.catalog.size,4);
 await f.run();assert.equal(f.catalog.size,4);assert.equal(f.state.ring,1);
});

test('rerun replays receipt without duplicating ring or money, even after ring use',async()=>{
 const f=fixture();await f.run();f.state.ring=0;await f.run();
 assert.equal(f.state.ring,0);assert.equal(f.state.wallet,26200n);assert.equal(f.writes.length,1);assert.equal(f.receipts.size,1);
});

test('bad bank config, disabled catalog row, or member mismatch prevents feature and grants',async()=>{
 for(const change of [f=>f.rows.set('economy.bank_tiers',{value:[],version:1}),f=>{const item=familyCatalogItems[0];f.catalog.set(RING,{...structuredClone(item),buyPrice:25000n,sellValue:0n,enabled:false});},f=>{f.get=async()=>({user:{id:'999',bot:false}});},f=>{f.db.inventoryCategoryLock.findUnique=async()=>({category:'family'});},f=>{f.config.definition=()=>undefined;}]){
  const f=fixture();change(f);await assert.rejects(f.run());assert.equal(f.writes.length,0);assert.equal(f.receipts.size,0);assert.equal(f.state.ring,0);assert.equal(f.state.wallet,1200n);
 }
});

test('invalid production target fails before connecting and hides connection details',async()=>{
 const errors=[];assert.equal(await main({NODE_ENV:'test',DATABASE_URL:'postgresql://secret:secret@bad.example/db'},{connect:()=>assert.fail('must not connect'),error:line=>errors.push(line)}),1);
 assert.doesNotMatch(errors.join(''),/secret|postgresql:/);
});
