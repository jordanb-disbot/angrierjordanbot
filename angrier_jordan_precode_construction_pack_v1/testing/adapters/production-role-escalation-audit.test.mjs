import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectRoleEscalation,inspectDiscordRoleUpdates,main,INCIDENT_MEMBERS} from '../../scripts/audit-production-role-escalation.mjs';

const env={NODE_ENV:'production',AJ_DATABASE_PURPOSE:'production',DISCORD_GUILD_ID:'1524964384642957432',DATABASE_URL:'postgresql://user:pass@postgres.railway.internal:5432/railway',DISCORD_TOKEN:'never-print'};
const ids=INCIDENT_MEMBERS.map(member=>member.id);
test('incident database inspection is transactionally read-only and scopes both reported members',async()=>{
 const calls=[];
 const tx={$executeRawUnsafe:async sql=>calls.push(sql),selfRolePanel:{findMany:async()=>[]},selfRoleSelection:{findMany:async query=>{assert.deepEqual(query.where.userId.in,ids);return[];}},auditEvent:{findMany:async query=>{assert.deepEqual(query.where.OR[0].actorUserId.in,ids);return[];}}};
 const db={$transaction:async callback=>callback(tx)};
 assert.deepEqual(await inspectRoleEscalation(db),{panel:[],selections:[],audits:[]});
 assert.deepEqual(calls,['SET TRANSACTION READ ONLY']);
});
test('Discord audit report identifies executor and added role names using GET-only data',async()=>{
 const requests=[];
 const report=await inspectDiscordRoleUpdates(async path=>{requests.push(path);if(path.endsWith('/roles'))return[{id:'1',name:'Arm Chair',position:1,managed:false,permissions:'0'},{id:'2',name:'Unsafe Role',position:2,managed:false,permissions:String(1n<<28n)}];if(path.includes('/members/'))return{roles:['2']};if(path.includes('action_type=31'))return{audit_log_entries:[{id:'1555805032778309682',target_id:'2',user_id:'owner',changes:[{key:'permissions',old_value:String(1n<<28n),new_value:'0'}]}]};return{audit_log_entries:[{id:'1555805032778309682',target_id:ids[0],user_id:'actor',changes:[{key:'$add',new_value:[{id:'1'}]}]}]};});
 assert.equal(report[0].updates[0].executorId,'actor');assert.deepEqual(report[0].updates[0].$add,['Arm Chair']);assert.equal(report[0].roleManagementGrants[0].name,'Unsafe Role');assert.equal(report[0].permissionUpdates[0].before.manageRoles,true);assert.equal(report[1].updates.length,0);assert.ok(requests.every(path=>path.startsWith('/guilds/')));
});
test('production entrypoint uses only GET and never prints the Discord token',async()=>{
 const output=[],errors=[],methods=[];
 const db={$transaction:async callback=>callback({$executeRawUnsafe:async()=>{},selfRolePanel:{findMany:async()=>[]},selfRoleSelection:{findMany:async()=>[]},auditEvent:{findMany:async()=>[]}}),$disconnect:async()=>{}};
 const result=await main(env,{connectDatabase:async()=>db,fetcher:async(_url,options)=>{methods.push(options.method);return{ok:true,json:async()=>options.method==='GET'?[]:null};},write:line=>output.push(line),error:line=>errors.push(line)});
 assert.equal(result,0);assert.ok(methods.every(method=>method==='GET'));assert.equal(errors.length,0);assert.doesNotMatch([...output,...errors].join('\n'),/never-print/);
});
