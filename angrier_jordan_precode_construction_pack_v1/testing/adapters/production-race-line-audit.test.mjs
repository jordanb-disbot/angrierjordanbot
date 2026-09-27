import test from 'node:test';
import assert from 'node:assert/strict';
import {main,productionTarget,GUILD,MAIN_CHAT,RACE_PING} from '../../scripts/audit-production-race-line.mjs';

const env={NODE_ENV:'production',AJ_DATABASE_PURPOSE:'production',DISCORD_GUILD_ID:GUILD,DATABASE_URL:'postgresql://ignored:secret@postgres.railway.internal/app',DISCORD_TOKEN:'never-print-token',AUDIT_MEMBER_ID:'123456789012345678'};
const values={'features.race':false,'features.line':false,'features.special_commands':false,'special_commands.enabled':true,'channels.main_chat':MAIN_CHAT,'special_commands.access_roles':{'!race':[],'!line':['123456789012345679']},'special_commands.builtin_role_map':{'!race':RACE_PING,'!line':null}};
function database({missingGuild=false,broken=false}={}){
 let queries=0,transactions=0;
 const select=result=>async()=>{queries++;return result;};
 const tx={guild:{findUnique:select(missingGuild?null:{id:GUILD})},configValue:{findMany:async()=>{if(broken)throw Error('SECRET');return Object.entries(values).map(([key,value])=>({key,value}));}},gameSession:{findMany:select([{id:'session1',type:'race',state:'OPEN',channelId:MAIN_CHAT}])},securityModeState:{findUnique:select({mode:'LOCKDOWN',panicActive:true})},jailSentence:{findFirst:select(null)},verificationState:{findUnique:select({status:'REQUIRED'})}};
 const db={$disconnect:async()=>{},$transaction:async fn=>{transactions++;let readonly=false;const guarded={};for(const [name,model]of Object.entries(tx))guarded[name]=Object.fromEntries(Object.entries(model).map(([method,read])=>[method,async args=>{assert.equal(readonly,true,'SELECT must follow READ ONLY');return read(args);} ]));guarded.$executeRawUnsafe=async sql=>{assert.equal(sql,'SET TRANSACTION READ ONLY');readonly=true;};return fn(guarded);}};
 return {db,counts:()=>({queries,transactions})};
}
const fetcher=async(url,options)=>{assert.equal(options.method,'GET');return{ok:true,json:async()=>url.endsWith('/roles')?[{id:RACE_PING,name:'Race Ping',permissions:'0',managed:false,mentionable:true}]:{roles:[]}};};
test('target guard rejects non-production, wrong guild and non-private databases before connecting',async()=>{
 for(const changes of [{NODE_ENV:'development'},{AJ_DATABASE_PURPOSE:'test'},{DISCORD_GUILD_ID:'123'},{DATABASE_URL:'postgresql://u:p@public.example/app'}]){
  assert.throws(()=>productionTarget({...env,...changes}));const lines=[];assert.equal(await main({...env,...changes},{connect:()=>assert.fail('must not connect'),write:s=>lines.push(s)}),1);assert.equal(lines.length,1);
 }
});
test('audit uses database-enforced read-only transactions and reports blockers without failing',async()=>{
 const {db,counts}=database(),lines=[];assert.equal(await main(env,{connect:async()=>db,definitions:[],fetcher,write:s=>lines.push(s)}),0);
 assert.equal(counts().transactions,2);const output=lines.join('\n');assert.match(output,/WARN: features.race/);assert.match(output,/WARN: active_sessions/);assert.match(output,/WARN: member_containment/);assert.match(output,/WARN: member_access\[!line\]/);assert.match(output,/unique_current_role_not_found/);assert.doesNotMatch(output,/secret|never-print-token|postgresql:/i);
});
test('missing guild is a target failure; post-verification failures are sanitized warnings',async()=>{
 const missing=database({missingGuild:true});assert.equal(await main(env,{connect:async()=>missing.db,write:()=>{}}),1);
 const broken=database({broken:true}),lines=[];assert.equal(await main(env,{connect:async()=>broken.db,definitions:[],fetcher:async()=>{throw Error('SECRET');},write:s=>lines.push(s)}),0);assert.match(lines.join('\n'),/incomplete/);assert.doesNotMatch(lines.join('\n'),/SECRET/);
});
test('unspecified member stays unknown rather than reporting a false containment pass',async()=>{
 const {db}=database(),lines=[];assert.equal(await main({...env,AUDIT_MEMBER_ID:undefined},{connect:async()=>db,definitions:[],fetcher,write:s=>lines.push(s)}),0);assert.match(lines.join('\n'),/WARN: member_containment unknown; set AUDIT_MEMBER_ID/);
});
