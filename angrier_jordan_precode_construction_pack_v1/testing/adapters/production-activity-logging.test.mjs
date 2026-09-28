import test from 'node:test';
import assert from 'node:assert/strict';
import {enableProductionActivityLogging,verifyAdminOnlyLogChannel,LOG_CHANNEL} from '../../scripts/enable-production-activity-logging.mjs';
import {GUILD} from '../../scripts/audit-production-race-line.mjs';

const BOT='1538560039726620766',BOT_ID='1550000000000000001',PARENT='1538320805933613066',MEMBER='1550000000000000002';
const VIEW=String(1n<<10n),ADMIN=String(1n<<3n),SEND=String(1n<<11n);
function fixture(){
 const roles=[{id:GUILD,name:'@everyone',permissions:'0'},{id:BOT,name:'The Chairman',permissions:String(BigInt(ADMIN)|BigInt(SEND))},{id:MEMBER,name:'Member',permissions:'0'}];
 const channels=[
  {id:PARENT,guild_id:GUILD,type:4,name:'Boardroom',permission_overwrites:[{id:GUILD,type:0,allow:'0',deny:VIEW},{id:BOT,type:0,allow:VIEW,deny:'0'}]},
  {id:LOG_CHANNEL,parent_id:PARENT,guild_id:GUILD,type:0,name:'the-clipboard',permission_overwrites:[{id:GUILD,type:0,allow:'0',deny:VIEW}]},
 ];
 const botMember={user:{id:BOT_ID},roles:[BOT]},rows=new Map([['channels.staff_log',{value:null,version:0}]]),writes=[],output=[];
 const config={definition:()=>({type:'discord_channel'}),getWithMetadata:async(_guild,key)=>rows.get(key),set:async input=>{writes.push(input);rows.set(input.key,{value:input.value,version:rows.get(input.key).version+1});}};
 const db={guild:{findUnique:async()=>({id:GUILD})}};
 const get=async path=>path.endsWith('/channels')?channels:path.endsWith('/roles')?roles:path==='/users/@me'?{id:BOT_ID}:botMember;
 return{roles,channels,botMember,db,config,get,rows,writes,output,run:()=>enableProductionActivityLogging({db,config,get,write:line=>output.push(line)})};
}
test('admin-only channel passes and audited mapping is idempotent',async()=>{
 const f=fixture();await f.run();await f.run();assert.equal(f.writes.length,1);assert.equal(f.rows.get('channels.staff_log').value,LOG_CHANNEL);assert.equal(f.output.filter(line=>line.startsWith('PASS:')).length,6);
});
test('dry run verifies target and planned mapping without writes',async()=>{
 const f=fixture();await enableProductionActivityLogging({db:f.db,config:f.config,get:f.get,dryRun:true,write:line=>f.output.push(line)});
 assert.equal(f.writes.length,0);assert.equal(f.rows.get('channels.staff_log').value,null);assert.match(f.output.join('\n'),/PLAN: channels.staff_log will map to/);
});
test('public or non-admin access aborts before writing configuration',async()=>{
 for(const alter of [f=>f.channels[1].permission_overwrites[0].allow=VIEW,f=>f.channels[1].permission_overwrites.push({id:MEMBER,type:0,allow:VIEW,deny:'0'}),f=>f.channels[0].permission_overwrites.push({id:MEMBER,type:0,allow:VIEW,deny:'0'}),f=>f.channels[1].permission_overwrites.push({id:MEMBER,type:1,allow:VIEW,deny:'0'})]){
  const f=fixture();alter(f);await assert.rejects(f.run());assert.equal(f.writes.length,0);
 }
});
test('missing destination or bot access fails closed',async()=>{
 for(const alter of [f=>f.channels.pop(),f=>f.roles[1].permissions='0']){
  const f=fixture();alter(f);assert.throws(()=>verifyAdminOnlyLogChannel({channels:f.channels,roles:f.roles,botMember:f.botMember,botId:BOT_ID}));
 }
});
