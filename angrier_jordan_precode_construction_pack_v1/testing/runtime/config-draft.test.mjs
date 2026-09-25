import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { ConfigDraftService, DRAFT_LOCK_MS, emptyDraft } from '../../.test-build/packages/core/src/config-draft.js';
import { ConfigService } from '../../.test-build/packages/core/src/config-service.js';
import { AuditService } from '../../.test-build/packages/core/src/audit.js';
import { PermissionEngine } from '../../.test-build/packages/core/src/permissions.js';
import { DomainError } from '../../.test-build/packages/core/src/errors.js';

const owner={userId:'owner',isGuildOwner:true,administrator:false},admin={userId:'admin',isGuildOwner:false,administrator:true};
const permissions=new PermissionEngine({'dashboard.access':['guild_owner','discord_administrator'],'dashboard.force_draft_unlock':['guild_owner']});
const definitions=[
  {key:'core.dms_default',type:'boolean',default:true,mutable:true,risk:'normal',dashboard_write:'live',section:'core'},
  {key:'economy.rate',type:'integer',default:5,mutable:true,min:1,max:25,risk:'financial',dashboard_write:'draft',section:'economy'},
  {key:'crafting.repair.cheap_restore_min',type:'integer',default:10,mutable:true,min:0,max:100,risk:'financial',dashboard_write:'draft',depends_on:['crafting.repair.cheap_restore_max']},
  {key:'crafting.repair.cheap_restore_max',type:'integer',default:25,mutable:true,min:0,max:100,risk:'financial',dashboard_write:'draft',depends_on:['crafting.repair.cheap_restore_min']},
  {key:'a',type:'integer',default:1,mutable:true,risk:'high',dashboard_write:'draft',depends_on:['b']},
  {key:'b',type:'integer',default:2,mutable:true,risk:'high',dashboard_write:'draft',depends_on:['c']},
  {key:'c',type:'integer',default:3,mutable:true,risk:'high',dashboard_write:'draft'},
  {key:'channel',type:'discord_channel',default:'11111111111111111',mutable:true,risk:'high',dashboard_write:'draft'},
  {key:'features.test',type:'boolean',default:false,mutable:true,risk:'security',dashboard_write:'draft',depends_on:['prerequisite','empty.channel']},
  {key:'prerequisite',type:'boolean',default:false,mutable:true,risk:'normal',dashboard_write:'draft'},
  {key:'empty.channel',type:'discord_channel',default:null,mutable:true,risk:'normal',dashboard_write:'draft'},
  {key:'locked',type:'integer',default:4,mutable:false,risk:'locked',dashboard_write:'blocked'},
  {key:'complex',type:'json',default:[],mutable:true,risk:'high',dashboard_write:'draft'},
  {key:'features.complex',type:'boolean',default:false,mutable:true,risk:'security',dashboard_write:'draft',depends_on:['complex']},
  {key:'solo.reward',type:'integer',default:1,mutable:true,min:0,max:5,risk:'financial',dashboard_write:'draft',depends_on:['solo.daily_reward_cap']},
  {key:'solo.daily_reward_cap',type:'integer',default:10,mutable:true,min:0,max:20,risk:'financial',dashboard_write:'draft',depends_on:['solo.reward']},
  {key:'pvp.min_wager',type:'integer',default:1,mutable:true,min:1,max:100,risk:'financial',dashboard_write:'draft',depends_on:['pvp.max_wager']},
  {key:'pvp.max_wager',type:'integer',default:10,mutable:true,min:1,max:100,risk:'financial',dashboard_write:'draft',depends_on:['pvp.min_wager']},
];

// Transaction fixture commits a cloned state only after every operation/audit succeeds.
class MemoryTransactions {
  state={draft:emptyDraft(),values:{},revisions:[],events:[],receipts:{}};
  queue=Promise.resolve();failAudit=false;
  async run(guildId,work){
    let release;const previous=this.queue;this.queue=new Promise(resolve=>{release=resolve;});await previous;
    const state=structuredClone(this.state);
    const sink={write:async event=>{if(this.failAudit)throw new Error('injected audit failure');state.events.push(structuredClone(event));}};
    const audit=new AuditService(sink);
    const configRepository={
      get:async(_,key)=>state.values[key]??null,
      set:async input=>{
        const old=state.values[input.key],version=old?.version??0;
        if(input.expectedVersion!==undefined&&input.expectedVersion!==version)throw new DomainError('CONFIG_CONFLICT','Conflict');
        const row={guildId,key:input.key,value:structuredClone(input.value),source:input.source,version:version+1,updatedBy:input.actorUserId,updatedAt:new Date()};
        state.values[input.key]=row;state.revisions.push({...row,actorUserId:input.actorUserId,rollbackSafe:input.rollbackSafe,createdAt:new Date()});return row;
      },
      revisions:async(_,key,limit=100)=>state.revisions.filter(row=>row.key===key).slice(-limit).reverse(),
      setAudited:async(input,event)=>{const before=state.values[input.key]??null,row=await configRepository.set(input);await sink.write(event(before,row));return row;},
    };
    try{
      const result=await work({config:new ConfigService(definitions,configRepository,audit),configRepository,audit,
        draft:async()=>structuredClone(state.draft),saveDraft:async draft=>{state.draft=structuredClone(draft);},
        receipt:async key=>state.receipts[key]??null,saveReceipt:async(key,fingerprint,result)=>{state.receipts[key]={fingerprint,result:structuredClone(result)};}});
      this.state=state;return structuredClone(result);
    }finally{release();}
  }
}
function fixture(referenceVerifier,complexValidator){
  const repo=new MemoryTransactions();let now=Date.now();
  const service=new ConfigDraftService(definitions,repo,permissions,referenceVerifier,()=>now,complexValidator);
  const call=(command,actor=admin,requestId=randomUUID())=>service.execute({guildId:'g',actor,requestId},command);
  return {repo,service,call,advance:ms=>{now+=ms;}};
}
async function stage(f,key,value,actor=admin){
  let draft=await f.service.view('g',actor);
  if(draft.editorId!==actor.userId)draft=await f.call({action:'acquire',expectedVersion:draft.version},actor);
  return f.call({action:'stage',expectedVersion:draft.version,key,value,baseVersion:f.repo.state.values[key]?.version??0},actor);
}
async function preview(f,key='economy.rate',value=8){const draft=await stage(f,key,value);return f.call({action:'preview',expectedVersion:draft.version});}

test('dashboard engine requires current Discord owner/Admin claims without staff hierarchy shortcuts',async()=>{
  const f=fixture(),member={userId:'throne',isGuildOwner:false,administrator:false};
  await assert.rejects(f.service.view('g',member),{code:'DASHBOARD_FORBIDDEN'});
  await assert.rejects(f.call({action:'save',key:'core.dms_default',value:false,baseVersion:0},member),{code:'DASHBOARD_FORBIDDEN'});
  assert.equal(f.repo.state.events.length,0);
});
test('low-risk saves are atomic and idempotent across retries/restarts; financial edits require a draft',async()=>{
  const f=fixture(),requestId=randomUUID(),command={action:'save',key:'core.dms_default',value:false,baseVersion:0};
  const first=await f.call(command,admin,requestId);assert.equal(first.version,1);
  const restarted=new ConfigDraftService(definitions,f.repo,permissions);
  assert.deepEqual(await restarted.execute({guildId:'g',actor:admin,requestId},command),first);
  assert.equal(f.repo.state.revisions.length,1);assert.equal(f.repo.state.events.length,1);
  await assert.rejects(f.call({...command,value:true},admin,requestId),{code:'REPLAY_MISMATCH'});
  await assert.rejects(f.call({action:'save',key:'economy.rate',value:9,baseVersion:0}),{code:'DRAFT_REQUIRED'});
  await assert.rejects(f.call({...command,value:true}),{code:'CONFIG_CONFLICT'});
});
test('one editor, view does not renew 15-minute inactivity; only owner may force takeover',async()=>{
  const f=fixture();let draft=await f.call({action:'acquire',expectedVersion:0});
  await assert.rejects(f.call({action:'acquire',expectedVersion:draft.version},owner),{code:'DRAFT_LOCKED'});
  await assert.rejects(f.call({action:'takeover',expectedVersion:draft.version}),{code:'OWNER_REQUIRED'});
  draft=await f.call({action:'takeover',expectedVersion:draft.version},owner);
  assert.equal(f.repo.state.events.at(-1).before.editorId,'admin');assert.equal(f.repo.state.events.at(-1).after.editorId,'owner');
  f.advance(DRAFT_LOCK_MS-1);await f.service.view('g',owner);f.advance(1);
  await assert.rejects(f.call({action:'stage',expectedVersion:draft.version,key:'economy.rate',value:7,baseVersion:0},owner),{code:'DRAFT_LOCK_REQUIRED'});
  draft=await f.call({action:'acquire',expectedVersion:draft.version});assert.equal(draft.editorId,'admin');
});
test('invalid cross-field draft blocks the whole publish without partial writes or repairs',async()=>{
  const f=fixture();await stage(f,'economy.rate',9);let draft=await stage(f,'crafting.repair.cheap_restore_min',40);
  draft=await f.call({action:'preview',expectedVersion:draft.version});assert.equal(draft.preview.valid,false);
  assert.ok(draft.preview.errors.some(error=>error.includes('minimum restoration')));
  await assert.rejects(f.call({action:'publish',expectedVersion:draft.version,fingerprint:draft.preview.fingerprint}),{code:'PREVIEW_REQUIRED'});
  assert.deepEqual(f.repo.state.values,{});assert.equal(draft.changes['crafting.repair.cheap_restore_min'].value,40);
});
test('preview contains only direct dependencies and detects stale dependency versions',async()=>{
  const f=fixture(),draft=await preview(f,'a',10);
  assert.deepEqual(draft.preview.dependencies.map(item=>item.key),['a','b']);
  await f.repo.run('g',tx=>tx.config.set({guildId:'g',key:'b',value:22,requestId:'external',source:'bot'}));
  await assert.rejects(f.call({action:'publish',expectedVersion:draft.version,fingerprint:draft.preview.fingerprint}),{code:'PREVIEW_STALE'});
  assert.equal(f.repo.state.values.a,undefined);
});
test('any current Admin can publish a reviewed draft; audit identifies publisher',async()=>{
  const f=fixture(),draft=await preview(f);
  const result=await f.call({action:'publish',expectedVersion:draft.version,fingerprint:draft.preview.fingerprint},owner);
  assert.deepEqual(result.changes,{});assert.equal(result.editorId,null);
  assert.equal(f.repo.state.values['economy.rate'].value,8);
  const event=f.repo.state.events.find(item=>item.action==='config.set');assert.equal(event.actorUserId,'owner');assert.equal(event.before.value,5);assert.equal(event.after.value,8);
});
test('audit failure rolls back settings, revisions, draft state and idempotency receipt',async()=>{
  const f=fixture(),draft=await preview(f),before=structuredClone(f.repo.state);f.repo.failAudit=true;
  await assert.rejects(f.call({action:'publish',expectedVersion:draft.version,fingerprint:draft.preview.fingerprint}),/injected audit failure/);
  assert.deepEqual(f.repo.state,before);
  await assert.rejects(f.call({action:'save',key:'core.dms_default',value:false,baseVersion:0}),/injected audit failure/);
  assert.deepEqual(f.repo.state,before);
});
test('concurrent duplicate publishes return one persisted result and distinct publish conflicts',async()=>{
  const f=fixture(),draft=await preview(f),requestId=randomUUID(),command={action:'publish',expectedVersion:draft.version,fingerprint:draft.preview.fingerprint};
  const results=await Promise.all(Array.from({length:8},()=>f.call(command,admin,requestId)));
  assert.ok(results.every(result=>result.version===results[0].version));assert.equal(f.repo.state.revisions.length,1);
  await assert.rejects(f.call(command),{code:'DRAFT_CONFLICT'});
});
test('stale edits and stale live settings cannot overwrite newer changes',async()=>{
  const f=fixture(),draft=await f.call({action:'acquire',expectedVersion:0});
  await assert.rejects(f.call({action:'stage',expectedVersion:0,key:'economy.rate',value:8,baseVersion:0}),{code:'DRAFT_CONFLICT'});
  await f.repo.run('g',tx=>tx.config.set({guildId:'g',key:'economy.rate',value:9,requestId:'external',source:'bot'}));
  await assert.rejects(f.call({action:'stage',expectedVersion:draft.version,key:'economy.rate',value:8,baseVersion:0}),{code:'CONFIG_CONFLICT'});
});
test('safe rollback stages a retained revision then creates new revision/audit at publish',async()=>{
  const f=fixture();await f.call({action:'save',key:'core.dms_default',value:false,baseVersion:0});await f.call({action:'save',key:'core.dms_default',value:true,baseVersion:1});
  let draft=await f.call({action:'acquire',expectedVersion:0});
  draft=await f.call({action:'rollback',expectedVersion:draft.version,key:'core.dms_default',toVersion:1,baseVersion:2});
  draft=await f.call({action:'preview',expectedVersion:draft.version});
  await f.call({action:'publish',expectedVersion:draft.version,fingerprint:draft.preview.fingerprint});
  assert.equal(f.repo.state.values['core.dms_default'].version,3);assert.equal(f.repo.state.values['core.dms_default'].value,false);
  assert.equal(f.repo.state.revisions.length,3);assert.equal(f.repo.state.events.filter(event=>event.action==='config.set').length,3);
  assert.equal(f.repo.state.values['core.dms_default'].source,'dashboard.rollback');
});
test('unknown operations, scheduled publishing, immutable values and unsupported JSON fail closed',async()=>{
  const f=fixture(),draft=await f.call({action:'acquire',expectedVersion:0});
  await assert.rejects(f.call({action:'schedule',expectedVersion:draft.version}),{code:'INVALID_OPERATION'});
  await assert.rejects(f.call({action:'preview',expectedVersion:draft.version,publishAt:'tomorrow'}),{code:'INVALID_OPERATION'});
  await assert.rejects(f.call({action:'stage',expectedVersion:draft.version,key:'locked',value:5,baseVersion:0}),{code:'IMMUTABLE_SETTING'});
  await assert.rejects(f.call({action:'stage',expectedVersion:draft.version,key:'complex',value:[],baseVersion:0}),{code:'COMPLEX_EDITOR_REQUIRED'});
  await assert.rejects(f.call({action:'save',key:'core.dms_default',value:false}),{code:'INVALID_VERSION'});
});
test('references must be freshly verified and changed Discord objects invalidate reviewed preview',async()=>{
  const missing=fixture(),blocked=await preview(missing,'channel','22222222222222222');assert.equal(blocked.preview.valid,false);
  let referenceVersion=1;
  const f=fixture(async()=>({errors:[],references:{channel:{id:'22222222222222222',type:referenceVersion}}})),draft=await preview(f,'channel','22222222222222222');
  assert.equal(draft.preview.valid,true);referenceVersion=2;
  await assert.rejects(f.call({action:'publish',expectedVersion:draft.version,fingerprint:draft.preview.fingerprint}),{code:'PREVIEW_STALE'});
});
test('enabling a feature with broken direct prerequisites blocks the whole draft without repairs',async()=>{
  const f=fixture(),draft=await preview(f,'features.test',true);
  assert.equal(draft.preview.valid,false);
  assert.ok(draft.preview.errors.some(error=>error.includes('prerequisite must be enabled')));
  assert.ok(draft.preview.errors.some(error=>error.includes('empty.channel must be configured')));
  assert.equal(draft.changes.prerequisite,undefined);assert.equal(draft.changes['empty.channel'],undefined);
});
test('supported complex dependencies use their shared validator and fresh reference checks',async()=>{
  let checked=0;
  const f=fixture(async()=>({errors:[],references:{complex:'verified'}}),(key,value)=>{checked++;return key==='complex'&&Array.isArray(value);});
  const draft=await preview(f,'features.complex',true);assert.equal(draft.preview.valid,true);assert.ok(checked>0);
  const unsupported=fixture(async()=>({errors:[],references:{}}));
  assert.equal((await preview(unsupported,'features.complex',true)).preview.valid,false);
});
test('solo cap-zero follows shared policy: positive reward is invalid until reward is zero',async()=>{
  const f=fixture();let draft=await preview(f,'solo.daily_reward_cap',0);
  assert.equal(draft.preview.valid,false);assert.ok(draft.preview.errors.some(error=>error.includes('daily reward cap')));
  draft=await stage(f,'solo.reward',0);draft=await f.call({action:'preview',expectedVersion:draft.version});
  assert.equal(draft.preview.valid,true);
});
test('wager limits cannot publish an inverted range and resolve together in the shared draft',async()=>{
  const f=fixture();let draft=await preview(f,'pvp.min_wager',20);assert.equal(draft.preview.valid,false);
  draft=await stage(f,'pvp.max_wager',30);draft=await f.call({action:'preview',expectedVersion:draft.version});assert.equal(draft.preview.valid,true);
});
