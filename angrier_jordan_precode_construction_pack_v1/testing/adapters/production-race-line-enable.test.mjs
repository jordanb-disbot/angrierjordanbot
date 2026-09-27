import test from 'node:test';
import assert from 'node:assert/strict';
import {enableProductionRaceLine,resolveMappings,main} from '../../scripts/enable-production-race-line.mjs';
import {GUILD,MAIN_CHAT,RACE_PING} from '../../scripts/audit-production-race-line.mjs';
const line='1538564922118774886',vc='1541641325332533288',chess='1541641274497695754';
const expected={'!race':RACE_PING,'!line':line,'!vc':vc,'!chess':chess};
function fixture(){
 const roles=Object.entries({'Race Ping':RACE_PING,'Line Ping':line,'VC Ping':vc,'Chess Ping':chess}).map(([name,id])=>({id,name,permissions:'0',mentionable:true,managed:false}));
 roles.push({id:'123456789012345678',name:'bot',permissions:'8',managed:true});
 const access={'!race':['123456789012345678'],'!line':[],'!vc':[],'!chess':[]};
 const rows=new Map(Object.entries({'special_commands.access_roles':access,'special_commands.custom_commands':[],'special_commands.builtin_response_pools':{'!line':[],'!vc':[],'!chess':[]}}).map(([k,value])=>[k,{value,version:1}]));
 const writes=[],output=[];const config={getWithMetadata:async(g,k)=>rows.get(k)??{value:null,version:0},set:async i=>{assert.equal(i.source,'operator.production-race-line-enablement');assert.ok(i.requestId);assert.equal(i.expectedVersion,rows.get(i.key)?.version??0);writes.push(i);rows.set(i.key,{value:structuredClone(i.value),version:i.expectedVersion+1});}};
 const db={guild:{findUnique:async()=>({id:GUILD})}};
 const get=async path=>path.endsWith('/roles')?roles:path.startsWith('/channels/')?{id:MAIN_CHAT,guild_id:GUILD,type:0}:path==='/users/@me'?{id:'123456789012345679'}:{user:{id:'123456789012345679'},roles:['123456789012345678']};
 return{roles,rows,writes,output,access,config,db,get,run:()=>enableProductionRaceLine({db,config,get,write:s=>output.push(s)})};
}
test('all four mappings use canonical lowercase keys, preserve access, verify persisted values and rerun idempotently',async()=>{
 const f=fixture();await f.run();assert.deepEqual(f.rows.get('special_commands.builtin_role_map').value,expected);assert.deepEqual(f.rows.get('special_commands.access_roles').value,f.access);assert.equal(f.writes.length,6);assert.deepEqual(f.writes.map(w=>w.key),['channels.main_chat','special_commands.builtin_role_map','special_commands.enabled','features.special_commands','features.line','features.race']);await f.run();assert.equal(f.writes.length,6);assert.ok(f.output.every(s=>s.startsWith('PASS:')));
});
test('missing, unsafe, duplicate or protected roles fail before writes',async()=>{
 for(const mutate of [f=>f.roles.splice(1,1),f=>f.roles[1].permissions='8',f=>f.roles.push({...f.roles[1]}),f=>f.rows.set('roles.member_access',{value:line,version:1})]){const f=fixture();mutate(f);await assert.rejects(f.run());assert.equal(f.writes.length,0);}
});
test('invalid access fails closed without opening access or touching settings',async()=>{
 const f=fixture();f.access['!race']=['999999999999999999'];await assert.rejects(f.run(),/ACCESS_ROLES_INVALID/);assert.equal(f.writes.length,0);
});
test('partial failure is resumable and no PASS is printed before all values verify',async()=>{
 const f=fixture(),set=f.config.set;let fail=true;f.config.set=async i=>{if(fail&&i.key==='features.line')throw Error('secret');return set(i);};await assert.rejects(f.run());assert.equal(f.output.length,0);fail=false;await f.run();assert.equal(f.writes.length,6);
});
test('target rejection never connects and failure output cannot leak secrets',async()=>{
 const errors=[];assert.equal(await main({NODE_ENV:'test',DATABASE_URL:'secret'},{connect:()=>assert.fail(),error:s=>errors.push(s)}),1);assert.doesNotMatch(errors.join(''),/secret/);
});
test('VC and Chess user-facing aliases normalize to lowercase runtime mappings',async()=>{
 const {normalizeNotificationTrigger}=await import('../../dist/apps/bot/src/discord/notification-roles.js');assert.equal(expected[normalizeNotificationTrigger('!VC')],vc);assert.equal(expected[normalizeNotificationTrigger('!Chess')],chess);assert.deepEqual(resolveMappings(fixture().roles),expected);
});
