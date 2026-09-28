import test from 'node:test';
import assert from 'node:assert/strict';
import {configureProductionJailPermissions,planJailPermissions,main} from '../../scripts/configure-production-jail-permissions.mjs';
import {GUILD} from '../../scripts/audit-production-race-line.mjs';

const jailed='1550658793384312922',hotseat='1553646766967103570',bot='1550000000000000000',botRole='1550000000000000001',category='1550000000000000002',normal='1550000000000000003',otherRole='1550000000000000004',jailCategory='1554032613939740702';
const VIEW=1n<<10n,SEND=1n<<11n,HISTORY=1n<<16n;
const overwrite=(id,allow='0',deny='0')=>({id,type:0,allow,deny});

function fixture(){
 const roles=[{id:GUILD,position:0,permissions:'0'},{id:botRole,position:53,permissions:String(1n<<28n)},{id:jailed,position:41,permissions:'0',managed:false}];
 const channels=[
  {id:category,name:'The Lounge',guild_id:GUILD,type:4,permission_overwrites:[overwrite(otherRole,String(VIEW))]},
  {id:normal,name:'sit-and-chat',guild_id:GUILD,type:0,parent_id:category,permission_overwrites:[overwrite(otherRole,String(VIEW)),overwrite(jailed,String(SEND))]},
  {id:jailCategory,name:'Jail',guild_id:GUILD,type:4,permission_overwrites:[overwrite(otherRole,String(VIEW))]},
  {id:hotseat,name:'hotseat',guild_id:GUILD,type:0,parent_id:jailCategory,permission_overwrites:[overwrite(otherRole,String(VIEW)),overwrite(jailed,'0',String(HISTORY))]},
 ];
 const writes=[],audits=[],output=[];
 const get=async path=>{
  if(path==='/users/@me')return{id:bot};if(path===`/guilds/${GUILD}/roles`)return roles;
  if(path===`/guilds/${GUILD}/channels`)return structuredClone(channels);
  if(path===`/guilds/${GUILD}/members/${bot}`)return{roles:[botRole]};
  const id=path.split('/').at(-1);return structuredClone(channels.find(c=>c.id===id));
 };
 const put=async(path,body)=>{writes.push({path,body});const id=path.split('/')[2],channel=channels.find(c=>c.id===id);const index=channel.permission_overwrites.findIndex(row=>row.id===jailed);if(index>=0)channel.permission_overwrites[index]={id:jailed,...body};else channel.permission_overwrites.push({id:jailed,...body});};
 const db={guild:{findUnique:async()=>({id:GUILD})}},config={get:async(_g,key)=>key==='roles.jailed'?jailed:hotseat},audit={record:async event=>audits.push(event)};
 const f={db,config,audit,get,put,roles,channels,writes,audits,output};f.run=(dryRun=false)=>configureProductionJailPermissions({...f,dryRun,write:line=>output.push(line)});return f;
}

test('dry run plans every channel and category without Discord or audit writes',async()=>{
 const f=fixture(),before=structuredClone(f.channels);const plan=await f.run(true);
 assert.equal(plan.length,4);assert.equal(f.writes.length,0);assert.equal(f.audits.length,0);assert.deepEqual(f.channels,before);
 assert.equal(f.output.filter(line=>line.startsWith('PLAN:')).length,4);
});

test('normal channels deny access, Hotseat allows view/send/history, unrelated overwrites survive',async()=>{
 const f=fixture(),before=f.channels.map(channel=>structuredClone(channel.permission_overwrites.filter(row=>row.id!==jailed)));
 await f.run();assert.equal(f.writes.length,4);assert.equal(f.audits.length,4);
 for(let i=0;i<f.channels.length;i++){
  const channel=f.channels[i],row=channel.permission_overwrites.find(item=>item.id===jailed),allow=BigInt(row.allow),deny=BigInt(row.deny);
  assert.deepEqual(channel.permission_overwrites.filter(item=>item.id!==jailed),before[i]);
  if(channel.id===hotseat){assert.equal(allow&(VIEW|SEND|HISTORY),VIEW|SEND|HISTORY);assert.equal(deny&(VIEW|SEND|HISTORY),0n);}
  else if(channel.id===jailCategory){assert.equal(allow&VIEW,VIEW);assert.equal(deny&VIEW,0n);assert.equal(deny&SEND,SEND);}
  else{assert.equal(deny&(VIEW|SEND),VIEW|SEND);assert.equal(allow&(VIEW|SEND),0n);}
 }
 assert.ok(f.output.every(line=>line.startsWith('PASS:')));
});

test('rerun is idempotent',async()=>{const f=fixture();await f.run();await f.run();assert.equal(f.writes.length,4);assert.equal(f.audits.length,4);});

test('role, hierarchy, guild, or Hotseat failure prevents every permission write',async()=>{
 for(const change of [f=>{f.roles[2].managed=true;},f=>{f.roles[1].position=40;},f=>{f.roles[1].permissions='0';},f=>{f.roles[2].permissions=String(1n<<3n);},f=>{f.channels[3].guild_id='999';},f=>{f.channels[3].type=4;},f=>{f.channels[3].parent_id=category;},f=>{f.channels[2].type=0;},f=>{f.channels.splice(2,1);}]){
  const f=fixture();change(f);await assert.rejects(f.run());assert.equal(f.writes.length,0);assert.equal(f.audits.length,0);
 }
});

test('invalid production target fails before database or Discord access',async()=>{
 const errors=[];assert.equal(await main({NODE_ENV:'test',DATABASE_URL:'postgresql://secret:secret@bad.example/db'},{connect:()=>assert.fail('must not connect'),error:line=>errors.push(line)}),1);
 assert.doesNotMatch(errors.join(''),/secret|postgresql:/);
});
