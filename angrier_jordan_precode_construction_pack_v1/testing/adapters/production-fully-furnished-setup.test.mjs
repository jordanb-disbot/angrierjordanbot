import test from 'node:test';
import assert from 'node:assert/strict';
import {enableProductionFullyFurnished} from '../../scripts/enable-production-fully-furnished.mjs';
import {GUILD} from '../../scripts/audit-production-race-line.mjs';

function fixture(){
 const values=new Map([['roles.fully_furnished',{value:null,version:0}],['features.fully_furnished_event',{value:false,version:0}]]),writes=[],output=[];
 const event=new Map(),achievements=new Map();
 const db={
  guild:{findUnique:async()=>({id:GUILD})},
  fullyFurnishedEvent:{findUnique:async({where})=>event.get(where.guildId)??null,findUniqueOrThrow:async({where})=>event.get(where.guildId)},
  $transaction:async fn=>fn({
   fullyFurnishedEvent:{upsert:async({where,create,update})=>{const row=event.get(where.guildId)??create;event.set(where.guildId,{...row,...update});}},
   achievement:{upsert:async({where,create,update})=>achievements.set(where.id,{...create,...update})}
  })
 };
 const config={get:async(_guild,key)=>values.get(key)?.value??null,getWithMetadata:async(_guild,key)=>values.get(key)??{value:null,version:0},set:async input=>{writes.push(input);values.set(input.key,{value:input.value,version:input.expectedVersion+1});}};
 const get=async path=>{if(path===`/guilds/${GUILD}/roles`)return[{id:'role-fully-furnished',name:'Fully Furnished',position:2},{id:'bot-role',name:'Angrier Jordan',position:5}];if(path==='/users/@me')return{id:'bot-user'};if(path===`/guilds/${GUILD}/members/bot-user`)return{roles:['bot-role']};throw Error('unexpected path');};
 return{event,achievements,writes,output,run:()=>enableProductionFullyFurnished({db,config,get,write:line=>output.push(line),now:()=>new Date('2026-09-29T18:00:00.000Z')})};
}
test('Fully Furnished production enablement writes only its role, event feature, campaign, and six achievement definitions',async()=>{const f=fixture();await f.run();assert.equal(f.writes.length,2);assert.equal(f.writes[0].key,'roles.fully_furnished');assert.equal(f.writes[1].key,'features.fully_furnished_event');assert.equal(f.event.get(GUILD).startsAt.toISOString(),'2026-09-29T18:00:00.000Z');assert.equal(f.event.get(GUILD).endsAt.toISOString(),'2026-10-05T05:59:00.000Z');assert.equal(f.achievements.size,6);assert.ok(f.output.some(line=>line.includes('no historical activity')));});
test('Fully Furnished production enablement remains idempotent',async()=>{const f=fixture();await f.run();const first=f.event.get(GUILD).startsAt.toISOString();await f.run();assert.equal(f.event.get(GUILD).startsAt.toISOString(),first);assert.equal(f.event.get(GUILD).endsAt.toISOString(),'2026-10-05T05:59:00.000Z');assert.equal(f.writes.length,2);});

test('Fully Furnished extension preserves the original start while moving the event end',async()=>{const f=fixture();f.event.set(GUILD,{guildId:GUILD,startsAt:new Date('2026-09-29T18:00:00.000Z'),endsAt:new Date('2026-10-02T16:00:00.000Z'),enabled:true,roleId:'role-fully-furnished'});await f.run();assert.equal(f.event.get(GUILD).startsAt.toISOString(),'2026-09-29T18:00:00.000Z');assert.equal(f.event.get(GUILD).endsAt.toISOString(),'2026-10-05T05:59:00.000Z');});
