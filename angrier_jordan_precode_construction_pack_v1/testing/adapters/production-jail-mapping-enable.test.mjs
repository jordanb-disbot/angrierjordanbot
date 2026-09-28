import test from 'node:test';
import assert from 'node:assert/strict';
import {enableProductionJailMapping,main,JAIL_ROLE,HOTSEAT_CHANNEL,JAIL_MAPPINGS} from '../../scripts/enable-production-jail-mapping.mjs';
import {GUILD} from '../../scripts/audit-production-race-line.mjs';

const BOT='1550000000000000000',BOT_ROLE='1550000000000000001';
function fixture(){
 const rows=new Map([['roles.jailed',{value:null,version:0}],['channels.hotseat_channel',{value:null,version:0}],['features.family',{value:true,version:3}]]),writes=[],output=[];
 const db={guild:{findUnique:async()=>({id:GUILD})}};
 const config={definition:key=>key==='roles.jailed'?{type:'discord_role'}:key==='channels.hotseat_channel'?{type:'discord_channel'}:undefined,getWithMetadata:async(_guild,key)=>rows.get(key),set:async input=>{
  assert.equal(input.guildId,GUILD);assert.equal(input.source,'operator.production-jail-mapping');assert.ok(input.requestId);
  assert.equal(input.expectedVersion,rows.get(input.key).version);writes.push(input);rows.set(input.key,{value:input.value,version:input.expectedVersion+1});
 }};
 const responses={'/users/@me':{id:BOT},[`/guilds/${GUILD}/roles`]:[{id:GUILD,position:0,permissions:'0'},{id:BOT_ROLE,position:53,permissions:String(1n<<28n)},{id:JAIL_ROLE,name:'Restraint Chair',position:41,permissions:'0',managed:false}],[`/guilds/${GUILD}/members/${BOT}`]:{roles:[BOT_ROLE]},[`/channels/${HOTSEAT_CHANNEL}`]:{id:HOTSEAT_CHANNEL,guild_id:GUILD,type:0,name:'🔥-hotseat'}};
 const f={db,config,responses,rows,writes,output};f.get=async path=>responses[path];f.run=()=>enableProductionJailMapping({...f,write:line=>output.push(line)});return f;
}

test('writes only the two audited Jail mappings and verifies both',async()=>{
 const f=fixture();await f.run();assert.deepEqual(f.writes.map(row=>[row.key,row.value]),JAIL_MAPPINGS);
 assert.equal(f.rows.get('features.family').value,true);assert.ok(f.output.every(line=>line.startsWith('PASS:')));
});

test('second run is idempotent',async()=>{const f=fixture();await f.run();await f.run();assert.equal(f.writes.length,2);});

test('missing role, hierarchy, permission, or channel prevents every write',async()=>{
 for(const change of [f=>f.responses[`/guilds/${GUILD}/roles`].pop(),f=>{f.responses[`/guilds/${GUILD}/roles`][1].position=40;},f=>{f.responses[`/guilds/${GUILD}/roles`][1].permissions='0';},f=>{f.responses[`/channels/${HOTSEAT_CHANNEL}`].guild_id='999';},f=>{f.responses[`/channels/${HOTSEAT_CHANNEL}`].type=4;}]){
  const f=fixture();change(f);await assert.rejects(f.run());assert.equal(f.writes.length,0);
 }
});

test('invalid production target fails before connection without leaking URL',async()=>{
 const errors=[];assert.equal(await main({NODE_ENV:'test',DATABASE_URL:'postgresql://secret:secret@bad.example/db'},{connect:()=>assert.fail('must not connect'),error:line=>errors.push(line)}),1);
 assert.doesNotMatch(errors.join(''),/secret|postgresql:/);
});
