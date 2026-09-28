import test from 'node:test';
import assert from 'node:assert/strict';
import {enableProductionGames,GAME_CHANNELS,GAME_SETTINGS,main} from '../../scripts/enable-production-games.mjs';
import {GUILD} from '../../scripts/audit-production-race-line.mjs';

function fixture(){
 const rows=new Map([['features.pvp',{value:false,version:1}],['features.casino',{value:false,version:1}],['features.crime',{value:false,version:1}],['roles_panel.enabled',{value:false,version:1}],['unrelated.owner_value',{value:'keep',version:3}]]);
 const writes=[],output=[],requests=[];
 const db={guild:{findUnique:async()=>({id:GUILD})}};
 const config={getWithMetadata:async(_guild,key)=>rows.get(key)??{value:null,version:0},set:async input=>{
  assert.equal(input.guildId,GUILD);assert.equal(input.source,'operator.production-games-enablement');assert.ok(input.requestId);
  assert.equal(input.expectedVersion,rows.get(input.key)?.version??0);
  writes.push(input);rows.set(input.key,{value:structuredClone(input.value),version:input.expectedVersion+1});
 }};
 const get=async path=>{requests.push(path);const id=path.split('/').at(-1);return {id,guild_id:GUILD,type:0};};
 return {rows,writes,output,requests,db,config,get,run:()=>enableProductionGames({db,config,get,write:line=>output.push(line)})};
}

test('production Games maps all four channels, enables only safe game flags, and disables solo payout',async()=>{
 const f=fixture();await f.run();
 assert.deepEqual(f.requests,Object.values(GAME_CHANNELS).map(id=>`/channels/${id}`));
 assert.deepEqual(Object.fromEntries(Object.keys(GAME_CHANNELS).map(key=>[key,f.rows.get(key).value])),GAME_CHANNELS);
 for(const key of ['features.solo_games','features.party_games','features.channel_games'])assert.equal(f.rows.get(key).value,true);
 assert.equal(f.rows.get('solo.reward').value,0);assert.equal(f.rows.get('solo.daily_reward_cap').value,0);
 assert.deepEqual(f.writes.map(row=>row.key),GAME_SETTINGS.map(([key])=>key));
 assert.deepEqual([...f.rows].filter(([key])=>!GAME_SETTINGS.some(([target])=>key===target)).map(([key,row])=>[key,row.value]),[['features.pvp',false],['features.casino',false],['features.crime',false],['roles_panel.enabled',false],['unrelated.owner_value','keep']]);
 assert.ok(f.output.every(line=>line.startsWith('PASS:')));
});

test('second Games run writes nothing and preserves unrelated settings',async()=>{
 const f=fixture();await f.run();const first=f.writes.length,unrelated=structuredClone(f.rows.get('unrelated.owner_value'));
 await f.run();assert.equal(f.writes.length,first);assert.deepEqual(f.rows.get('unrelated.owner_value'),unrelated);
});

test('missing, wrong-guild, or wrong-type game channel blocks every write',async()=>{
 for(const invalid of [()=>null,ch=>({...ch,guild_id:'999999999999999999'}),ch=>({...ch,type:4})]){
  const f=fixture(),get=f.get;f.get=async path=>path.endsWith(GAME_CHANNELS['channels.one_word_story_channel'])?invalid(await get(path)):get(path);
  await assert.rejects(()=>enableProductionGames({db:f.db,config:f.config,get:f.get}),/GAME_CHANNEL_INVALID/);
  assert.equal(f.writes.length,0);
 }
});

test('interrupted settings write resumes without duplicates or premature PASS',async()=>{
 const f=fixture(),set=f.config.set;let fail=true;
 f.config.set=async input=>{if(fail&&input.key==='features.party_games')throw Error('private detail');return set(input);};
 await assert.rejects(f.run());assert.equal(f.output.length,0);fail=false;await f.run();
 assert.deepEqual(f.writes.map(row=>row.key),GAME_SETTINGS.map(([key])=>key));
});

test('invalid production target fails before database connection and sanitizes output',async()=>{
 const errors=[];
 assert.equal(await main({NODE_ENV:'test',DATABASE_URL:'postgresql://secret:secret@bad.example/db'},{connect:()=>assert.fail('must not connect'),error:line=>errors.push(line)}),1);
 assert.doesNotMatch(errors.join(''),/secret|postgresql:/);
});
