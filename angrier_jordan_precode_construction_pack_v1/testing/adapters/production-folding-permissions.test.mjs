import test from 'node:test';
import assert from 'node:assert/strict';
import {FOLDING_CHAIR} from '../../scripts/enable-production-onboarding.mjs';
import {STALE_ROLE,planFoldingPermissionRepair,repairFoldingPermissions,main} from '../../scripts/fix-production-folding-chair-permissions.mjs';

const guild='1524964384642957432',bot='1524964384642957433',botRole='1524964384642957434';
const lounge='1524964386077151363',chat='1524964386077151365',parlor='1525535562046636102',pull='1537333091180355655',welcome='1553926850185666601';
const role=(id,name,position,permissions='0')=>({id,name,position,permissions,managed:false});
const overwrite=(id,allow,deny='0')=>({id,type:0,allow,deny});
function fixture(){
 const roles=[role(guild,'@everyone',0),role(STALE_ROLE,'Metal Chair',48),role(FOLDING_CHAIR,'Folding Chair',43),role(botRole,'The Chairman',53,String(1n<<3n))];
 const channels=[
  {id:lounge,guild_id:guild,type:4,parent_id:null,permission_overwrites:[overwrite(guild,'0','1024'),overwrite(FOLDING_CHAIR,'1049600')]},
  {id:chat,guild_id:guild,type:0,parent_id:lounge,permission_overwrites:[overwrite(guild,'0','1024'),overwrite(STALE_ROLE,'3072')]},
  {id:parlor,guild_id:guild,type:4,parent_id:null,permission_overwrites:[overwrite(guild,'0','1024'),overwrite(STALE_ROLE,'1049600'),overwrite(FOLDING_CHAIR,'1049600'),overwrite('1700000000000000001','8')]},
  {id:pull,guild_id:guild,type:0,parent_id:parlor,permission_overwrites:[overwrite(guild,'0','1024'),overwrite(STALE_ROLE,'1049600'),overwrite(FOLDING_CHAIR,'1049600')]},
  {id:welcome,guild_id:guild,type:4,parent_id:null,permission_overwrites:[overwrite(guild,'1024')]},
 ];
 const calls=[],output=[];
 const get=async path=>path===`/guilds/${guild}/roles`?structuredClone(roles):path===`/guilds/${guild}/channels`?structuredClone(channels):path==='/users/@me'?{id:bot}:path===`/guilds/${guild}/members/${bot}`?{roles:[botRole]}:path.startsWith('/channels/')?structuredClone(channels.find(c=>c.id===path.split('/')[2])):assert.fail('unexpected GET '+path);
 const put=async(path,body)=>{calls.push(['PUT',path]);const c=channels.find(c=>c.id===path.split('/')[2]);c.permission_overwrites.push(overwrite(FOLDING_CHAIR,body.allow,body.deny));};
 const remove=async path=>{calls.push(['DELETE',path]);const c=channels.find(c=>c.id===path.split('/')[2]);c.permission_overwrites=c.permission_overwrites.filter(o=>o.id!==STALE_ROLE);};
 return {roles,channels,calls,output,get,put,remove,run:()=>repairFoldingPermissions({get,put,remove,write:line=>output.push(line)})};
}

test('preflight selects only the three current stale member-access overwrites',()=>{
 const f=fixture(),targets=planFoldingPermissionRepair({roles:f.roles,channels:f.channels,botMember:{roles:[botRole]}});
 assert.deepEqual(targets.map(t=>t.id),[chat,parlor,pull].sort());
 assert.equal(targets.find(t=>t.id===chat).create,true);
 assert.ok(targets.filter(t=>t.id!==chat).every(t=>!t.create));
});

test('repair copies exact bits, removes only stale overwrites, verifies each channel, and is idempotent',async()=>{
 const f=fixture(),before=structuredClone(f.channels);
 await f.run();assert.equal(f.calls.length,4);
 for(const id of [chat,parlor,pull]){
  const old=before.find(c=>c.id===id).permission_overwrites.find(o=>o.id===STALE_ROLE),after=f.channels.find(c=>c.id===id);
  assert.deepEqual(after.permission_overwrites.find(o=>o.id===FOLDING_CHAIR),overwrite(FOLDING_CHAIR,old.allow,old.deny));
  assert.equal(after.permission_overwrites.some(o=>o.id===STALE_ROLE),false);
  assert.deepEqual(after.permission_overwrites.filter(o=>![STALE_ROLE,FOLDING_CHAIR].includes(o.id)),before.find(c=>c.id===id).permission_overwrites.filter(o=>![STALE_ROLE,FOLDING_CHAIR].includes(o.id)));
 }
 assert.deepEqual(f.channels.find(c=>c.id===welcome),before.find(c=>c.id===welcome));
 assert.equal(f.output.filter(line=>line.startsWith('PASS: channel')||line.startsWith('PASS: category')).length,3);
 await f.run();assert.equal(f.calls.length,4);assert.match(f.output.at(-1),/0 stale member-access overwrites repaired/);
});

test('ambiguous or unsafe overwrites abort before any Discord write',async()=>{
 const cases=[
  f=>{f.channels.find(c=>c.id===chat).permission_overwrites.find(o=>o.id===STALE_ROLE).allow=String(1n<<4n|1n<<10n);},
  f=>{f.channels.find(c=>c.id===parlor).permission_overwrites.find(o=>o.id===FOLDING_CHAIR).allow='1024';},
  f=>{f.channels.find(c=>c.id===welcome).permission_overwrites.push(overwrite(STALE_ROLE,'1024'));},
  f=>{f.roles.find(r=>r.id===STALE_ROLE).name='Unknown role';},
 ];
 for(const mutate of cases){const f=fixture();mutate(f);await assert.rejects(f.run());assert.equal(f.calls.length,0);assert.equal(f.output.length,0);}
});

test('a failed delete can be safely retried after Folding Chair copy succeeds',async()=>{
 const f=fixture();let fail=true;
 await assert.rejects(()=>repairFoldingPermissions({get:f.get,put:f.put,remove:async path=>{if(fail){fail=false;throw Error('temporary failure');}return f.remove(path);}}));
 assert.ok(f.channels.find(c=>c.id===chat).permission_overwrites.some(o=>o.id===FOLDING_CHAIR));
 await f.run();assert.ok(f.channels.every(c=>!c.permission_overwrites.some(o=>o.id===STALE_ROLE)));
});

test('invalid production target fails before contacting Discord and hides token',async()=>{
 const errors=[];const code=await main({NODE_ENV:'test',DISCORD_GUILD_ID:guild,DISCORD_TOKEN:'secret-token',DATABASE_URL:'postgresql://x:y@db.railway.internal:5432/railway'},{fetcher:()=>assert.fail('Discord must not be called'),error:line=>errors.push(line)});
 assert.equal(code,1);assert.match(errors[0],/^FAIL: /);assert.doesNotMatch(errors[0],/secret-token|postgresql:/);
});
