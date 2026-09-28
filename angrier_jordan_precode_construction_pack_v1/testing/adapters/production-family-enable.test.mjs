import test from 'node:test';
import assert from 'node:assert/strict';
import {enableProductionFamily,familyTarget,main,DEFAULT_BOT_CHANNEL} from '../../scripts/enable-production-family.mjs';
import {GUILD} from '../../scripts/audit-production-race-line.mjs';

const BOT_CHANNEL='1524964386077151365';
const definitions=new Map(Object.entries({
 'features.family':{type:'boolean'},
 'family.marriage_vote_hours':{type:'integer',min:1,max:24},
 'family.auction_min_hours':{type:'integer',min:1,max:72},
 'family.auction_max_hours':{type:'integer',min:1,max:72},
 'family.cooldown_base_seconds':{type:'integer',min:1,max:86400},
 'family.cooldown_max_seconds':{type:'integer',min:1,max:604800},
 'family.cooldown_quiet_hours':{type:'integer',min:1,max:8760},
}));
const validEnv={NODE_ENV:'production',AJ_DATABASE_PURPOSE:'production',DISCORD_GUILD_ID:GUILD,DATABASE_URL:'postgresql://user:password@private.railway.internal/db',DISCORD_TOKEN:'test-token',FAMILY_COMPATIBILITY_SECRET:'a'.repeat(32)};

function fixture(){
 const rows=new Map(Object.entries({
  'features.family':false,'channels.bot_channel':BOT_CHANNEL,'family.marriage_vote_hours':3,
  'family.auction_min_hours':1,'family.auction_max_hours':72,'family.cooldown_base_seconds':1800,
  'family.cooldown_max_seconds':86400,'family.cooldown_quiet_hours':168,'features.economy':false,
 }).map(([key,value])=>[key,{value,version:1}]));
 const writes=[],output=[];
 const db={guild:{findUnique:async()=>({id:GUILD})}};
 const config={definition:key=>definitions.get(key),getWithMetadata:async(_guild,key)=>rows.get(key),set:async input=>{
  assert.equal(input.guildId,GUILD);assert.equal(input.source,'operator.production-family-enablement');assert.ok(input.requestId);
  writes.push(input);rows.set(input.key,{value:input.value,version:input.expectedVersion+1});
 }};
 const get=async path=>({id:path.split('/').at(-1),guild_id:GUILD,type:0,name:'🤖-bots-dont-sit'});
 const result={db,config,get,rows,writes,output};
 result.run=()=>enableProductionFamily({...result,write:line=>output.push(line)});
 return result;
}

test('Family production script writes only canonical feature and preserves existing settings',async()=>{
 const f=fixture(),before=new Map(f.rows);await f.run();
 assert.deepEqual(f.writes.map(w=>w.key),['features.family']);
 assert.equal(f.rows.get('features.family').value,true);
 for(const [key,row] of before)if(key!=='features.family')assert.deepEqual(f.rows.get(key),row);
 assert.equal(f.output.length,4);assert.ok(f.output.every(line=>line.startsWith('PASS:')));
});

test('unset bot-channel mapping resolves to verified production bot channel before enabling Family',async()=>{
 const f=fixture();f.rows.set('channels.bot_channel',{value:null,version:0});await f.run();
 assert.equal(f.rows.get('channels.bot_channel').value,DEFAULT_BOT_CHANNEL);
 assert.deepEqual(f.writes.map(w=>w.key),['channels.bot_channel','features.family']);
 await f.run();assert.equal(f.writes.length,2);
});

test('Family production script is idempotent',async()=>{
 const f=fixture();await f.run();await f.run();assert.equal(f.writes.length,1);
});

test('missing prerequisites block all writes',async()=>{
 for(const mutate of [f=>{f.db.guild.findUnique=async()=>null;},f=>{f.rows.set('channels.bot_channel',{value:'bad',version:1});},f=>{f.get=async()=>({id:BOT_CHANNEL,guild_id:'999',type:0});},f=>{f.rows.set('family.marriage_vote_hours',{value:25,version:1});},f=>{f.rows.set('family.auction_min_hours',{value:72,version:1});f.rows.set('family.auction_max_hours',{value:1,version:1});}]){
  const f=fixture();mutate(f);await assert.rejects(f.run());assert.equal(f.writes.length,0);
 }
});

test('target validation requires production private DB and a valid secret before connection',async()=>{
 for(const change of [{NODE_ENV:'test'},{DISCORD_GUILD_ID:'999'},{DATABASE_URL:'postgresql://user:password@public.example/db'},{FAMILY_COMPATIBILITY_SECRET:'short'},{FAMILY_COMPATIBILITY_SECRET:'${SECRET}'}]){
  assert.throws(()=>familyTarget({...validEnv,...change}));
  const errors=[];assert.equal(await main({...validEnv,...change},{connect:()=>assert.fail('must not connect'),error:line=>errors.push(line)}),1);
  assert.doesNotMatch(errors.join(''),/password|short|\$\{SECRET\}|postgresql:/);
 }
});
