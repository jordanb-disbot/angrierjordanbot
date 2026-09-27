import test from 'node:test';
import assert from 'node:assert/strict';
import {DiscordModerationCoordinator} from '../../dist/apps/bot/src/discord/moderation-coordinator.js';
import {ModerationService,InMemoryModerationRepository} from '../../dist/packages/features-moderation/src/index.js';
import {AuditService,FixedClock,InMemoryAuditSink} from '../../dist/packages/core/src/index.js';

async function fixture({reviewer='reviewer',staff=true,type='TIMEOUT',outcome='REVERSED',guildId='g',rationale='Reviewed evidence',duration='2m'}={}){
 const clock=new FixedClock(new Date('2026-09-26T12:00:00Z')),repo=new InMemoryModerationRepository(),sink=new InMemoryAuditSink(),service=new ModerationService(repo,new AuditService(sink),clock);
 const c=await service.prepare({guildId:'g',subjectUserId:'subject',actorUserId:'issuer',actionType:type,reason:'Original reason',durationSeconds:3600});
 await service.finalize(c.id,'ACTIVE');await service.scheduleTemporaryCase(c,'subject',3600,type==='BAN'?'moderation.temp_ban_expire':'moderation.timeout_expire');const appeal=await service.requestReview(c.id,'subject');
 const state=()=>JSON.stringify({cases:[...repo.cases],appeals:repo.appeals,events:repo.events,jobs:[...repo.expiryJobs],audit:sink.events});
 const calls=[];let authorized=false,mutations=0;
 const originalPreflight=service.validateAppealReview.bind(service);service.validateAppealReview=async(...args)=>{const result=await originalPreflight(...args);authorized=true;calls.push('authorized');return result;};
 for(const key of ['resolveAppeal','cancelExpiryJobs','upsertExpiryJob']){const original=repo[key].bind(repo);repo[key]=async(...args)=>{assert.equal(authorized,true,'authorization must precede database mutation');mutations++;calls.push('db:'+key);return original(...args);};}
 const discord=[];const mutate=(action,value)=>{assert.equal(authorized,true,'authorization must precede Discord mutation');discord.push({action,value});calls.push('discord:'+action);};
 const guild={id:guildId,ownerId:'owner',members:{fetch:async id=>id===reviewer?{id,guild,roles:{cache:new Map(staff?[['staff',{}]]:[])}}:{id,timeout:async value=>mutate('timeout',value)},unban:async id=>mutate('unban',id)},bans:{fetch:async()=>({})}};
 const config={get:async(_g,k)=>k==='roles.recliner'?'staff':null};const coordinator=new DiscordModerationCoordinator(service,config);let reply,modal;
 const i={guildId,guild,user:{id:reviewer},customId:`moderation:appeal_submit:${outcome}:${appeal.appealId}`,fields:{getTextInputValue:k=>k==='rationale'?rationale:duration,fields:new Map([['modification',{}]])},reply:async p=>{reply=p;},showModal:async m=>{modal=m;}};
 return {repo,service,coordinator,i,c,appeal,discord,calls,state,get mutations(){return mutations;},get reply(){return reply;},get modal(){return modal;}};
}

for(const type of ['TIMEOUT','BAN'])for(const outcome of ['UPHELD','MODIFIED','REVERSED'])for(const independent of [true,false]){
 test(`${type} ${outcome}: ${independent?'unauthorized':'issuing'} reviewer has zero side effects`,async()=>{
  const f=await fixture({type,outcome,staff:!independent,reviewer:independent?'ordinary':'issuer'}),before=f.state();
  await assert.rejects(()=>f.coordinator.handleAppealModal(f.i),e=>e.code===(independent?'STAFF_PERMISSION_REQUIRED':'APPEAL_REVIEWER_CONFLICT'));
  assert.deepEqual(f.discord,[]);assert.equal(f.mutations,0);assert.equal(f.state(),before);
 });
}

for(const type of ['TIMEOUT','BAN'])test(`valid ${type} Uphold persists review without Discord punishment mutation`,async()=>{
 const f=await fixture({type,outcome:'UPHELD'});await f.coordinator.handleAppealModal(f.i);
 assert.deepEqual(f.discord,[]);assert.equal(f.repo.appeals[0].status,'UPHELD');assert.equal(f.repo.cases.get(f.c.id).status,'UPHELD');assert.ok(f.repo.expiryJobs.has(f.c.id));assert.match(f.reply.content,/UPHELD/);
});

test('valid Modify updates timeout only after preflight, persists duration and reschedules',async()=>{
 const f=await fixture({outcome:'MODIFIED'});await f.coordinator.handleAppealModal(f.i);
 assert.deepEqual(f.discord,[{action:'timeout',value:120000}]);assert.equal(f.repo.cases.get(f.c.id).durationSeconds,120);assert.equal(f.repo.appeals[0].status,'MODIFIED');assert.equal(f.repo.expiryJobs.get(f.c.id).dueAt.toISOString(),'2026-09-26T12:02:00.000Z');assert.equal(f.calls[0],'authorized');
});

for(const [duration,expected] of [['2m',120],['permanent',undefined]])test(`valid Modify preserves ${duration} ban handling`,async()=>{
 const f=await fixture({type:'BAN',outcome:'MODIFIED',duration});await f.coordinator.handleAppealModal(f.i);assert.deepEqual(f.discord,[]);assert.equal(f.repo.cases.get(f.c.id).durationSeconds,expected);assert.equal(f.repo.expiryJobs.has(f.c.id),expected!==undefined);assert.equal(f.repo.appeals[0].status,'MODIFIED');
});

for(const type of ['TIMEOUT','BAN'])test(`valid ${type} Reverse authorizes before enforcement and closes the review`,async()=>{
 const f=await fixture({type});await f.coordinator.handleAppealModal(f.i);
 assert.deepEqual(f.discord,[type==='TIMEOUT'?{action:'timeout',value:null}:{action:'unban',value:'subject'}]);assert.equal(f.repo.cases.get(f.c.id).status,'REVERSED');assert.equal(f.repo.appeals[0].status,'REVERSED');assert.equal(f.repo.expiryJobs.has(f.c.id),false);assert.equal(f.calls[0],'authorized');
});

for(const [options,code] of [[{guildId:'other'},'CASE_WRONG_SERVER'],[{rationale:'  '},'APPEAL_REASON_REQUIRED'],[{outcome:'invalid'},'APPEAL_CONTROL_INVALID']])test(`${code} is rejected before all mutation`,async()=>{
 const f=await fixture(options),before=f.state();await assert.rejects(()=>f.coordinator.handleAppealModal(f.i),e=>e.code===code);assert.deepEqual(f.discord,[]);assert.equal(f.mutations,0);assert.equal(f.state(),before);
});

test('resolved review cannot reapply Discord mutations',async()=>{
 const f=await fixture();f.repo.appeals[0].status='UPHELD';const before=f.state();await assert.rejects(()=>f.coordinator.handleAppealModal(f.i),e=>e.code==='APPEAL_ALREADY_RESOLVED');assert.deepEqual(f.discord,[]);assert.equal(f.mutations,0);assert.equal(f.state(),before);
});

test('opening review controls checks independence and a valid reviewer still receives the modal',async()=>{
 const rejected=await fixture({reviewer:'issuer'}),before=rejected.state();rejected.i.customId=`moderation:appeal:modified:${rejected.appeal.appealId}`;
 await assert.rejects(()=>rejected.coordinator.handleAppealButton(rejected.i),e=>e.code==='APPEAL_REVIEWER_CONFLICT');assert.equal(rejected.modal,undefined);assert.equal(rejected.mutations,0);assert.equal(rejected.state(),before);
 const valid=await fixture();valid.i.customId=`moderation:appeal:modified:${valid.appeal.appealId}`;await valid.coordinator.handleAppealButton(valid.i);assert.ok(valid.modal);assert.equal(valid.mutations,0);
});

test('service resolution retains its independent-reviewer defense for non-Discord callers',async()=>{
 const f=await fixture(),before=f.state();await assert.rejects(()=>f.service.resolveAppeal({appealId:f.appeal.appealId,reviewerUserId:'issuer',outcome:'REVERSED',reason:'Denied'}),e=>e.code==='APPEAL_REVIEWER_CONFLICT');assert.equal(f.state(),before);assert.equal(f.mutations,0);
});
