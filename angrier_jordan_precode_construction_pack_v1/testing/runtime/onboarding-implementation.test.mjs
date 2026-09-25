import test from 'node:test';
import assert from 'node:assert/strict';
import { AuditService,FixedClock,InMemoryAuditSink } from '../../.test-build/packages/core/src/index.js';
import { InMemoryOnboardingRepository,OnboardingService } from '../../.test-build/packages/features-onboarding/src/index.js';
import { DomainError } from '../../.test-build/packages/core/src/index.js';

const make=()=>{
  const clock=new FixedClock(new Date('2026-09-21T12:00:00Z'));
  const repo=new InMemoryOnboardingRepository();
  const sink=new InMemoryAuditSink();
  const service=new OnboardingService(repo,new AuditService(sink),clock);
  return {clock,repo,sink,service};
};

const panel={
  id:'panel',guildId:'g',name:'Default Roles',enabled:true,categories:[
    {key:'gender',label:'Gender',mode:'single',options:[{roleId:'r-man',label:'Man',enabled:true},{roleId:'r-woman',label:'Woman',enabled:true}]},
    {key:'pings',label:'Pings',mode:'multi',options:[{roleId:'r-line',label:'Line',enabled:true},{roleId:'r-race',label:'Race',enabled:true},{roleId:'r-old',label:'Old',enabled:true,archived:true}]},
  ],
};

test('join/rejoin always resets the rules gate without erasing persistent state',async()=>{
  const {repo,service}=make();
  repo.panel=panel;
  await service.memberJoined('g','u');
  const presence=await repo.getPresence('g','u');
  assert.equal(presence.needsRulesAck,true);
  assert.equal(repo.members.has('g:u'),true);
});

test('leaving pauses punishment and rules acknowledgement resumes remaining time into jailed state',async()=>{
  const {clock,repo,service}=make();
  repo.punishments.set('g:u',[{id:'j1',kind:'MODERATION',reason:'test',endsAt:new Date('2026-09-21T13:00:00Z')}]);
  await service.memberJoined('g','u');
  const leave=await service.memberLeft({guildId:'g',userId:'u',nickname:'ChairGuy',roles:[{roleId:'self1',kind:'SELF'},{roleId:'manual1',kind:'MANUAL'}]});
  assert.deepEqual(leave.pausedPunishmentIds,['j1']);
  assert.equal(repo.punishments.get('g:u')[0].pausedRemainingSeconds,3600);
  clock.advanceMs(2*60*60*1000);
  const plan=await service.acknowledgeRules('g','u');
  assert.equal(plan.grantMemberAccess,false);
  assert.equal(plan.applyJailedRole,true);
  assert.equal(plan.deferredBecausePunished,true);
  assert.deepEqual(plan.rolesToRestore,[]);
  assert.equal(repo.punishments.get('g:u')[0].endsAt.toISOString(),'2026-09-21T15:00:00.000Z');
});

test('post-punishment restore excludes staff, booster and expired temporary roles',async()=>{
  const {clock,repo,service}=make();
  await service.memberJoined('g','u');
  await service.memberLeft({guildId:'g',userId:'u',nickname:'ChairGuy',roles:[
    {roleId:'self1',kind:'SELF'},{roleId:'manual1',kind:'MANUAL'},{roleId:'staff1',kind:'STAFF'},{roleId:'boost1',kind:'BOOSTER'},
    {roleId:'temp-live',kind:'TEMPORARY',expiresAt:new Date('2026-09-22T12:00:00Z')},{roleId:'temp-dead',kind:'TEMPORARY',expiresAt:new Date('2026-09-20T12:00:00Z')},
  ]});
  await service.acknowledgeRules('g','u');
  const plan=await service.buildPostPunishmentRestorePlan('g','u');
  assert.deepEqual(plan.rolesToRestore.map(x=>x.roleId),['self1','manual1','temp-live']);
  assert.equal(plan.nickname,'ChairGuy');
  assert.equal(plan.grantMemberAccess,true);
  assert.equal(plan.applyJailedRole,false);
  clock.advanceMs(1);
});

test('single-choice self-role category replaces previous selection and may be cleared',async()=>{
  const {repo,service}=make();repo.panel=panel;
  await service.memberJoined('g','u');
  let delta=await service.updateRoleCategory({guildId:'g',userId:'u',categoryKey:'gender',selectedRoleIds:['r-man']});
  assert.deepEqual(delta.addRoleIds,['r-man']);
  delta=await service.updateRoleCategory({guildId:'g',userId:'u',categoryKey:'gender',selectedRoleIds:['r-woman']});
  assert.deepEqual(delta.addRoleIds,['r-woman']);assert.deepEqual(delta.removeRoleIds,['r-man']);
  delta=await service.updateRoleCategory({guildId:'g',userId:'u',categoryKey:'gender',selectedRoleIds:[]});
  assert.deepEqual(delta.removeRoleIds,['r-woman']);
  assert.deepEqual((await repo.listSelfRoleSelections('g','u')).filter(x=>x.active),[]);
});

test('multi-choice role category allows independent choices but rejects archived options',async()=>{
  const {repo,service}=make();repo.panel=panel;await service.memberJoined('g','u');
  const delta=await service.updateRoleCategory({guildId:'g',userId:'u',categoryKey:'pings',selectedRoleIds:['r-line','r-race']});
  assert.deepEqual(delta.addRoleIds,['r-line','r-race']);
  await assert.rejects(()=>service.updateRoleCategory({guildId:'g',userId:'u',categoryKey:'pings',selectedRoleIds:['r-old']}),e=>e instanceof DomainError&&e.code==='ROLE_OPTION_NOT_AVAILABLE');
});

test('restore completion records failed role/nickname restoration without blocking rejoin',async()=>{
  const {repo,sink,service}=make();await service.memberJoined('g','u');
  await service.completeRoleRestore('g','u',{restoredRoleIds:['ok'],failed:[{roleId:'gone',reason:'Role no longer exists.'}],nicknameRestored:false,nicknameFailure:'Missing permissions'});
  assert.equal((await repo.getPresence('g','u')).pendingRoleRestore,false);
  const event=sink.events.at(-1);assert.equal(event.action,'member.restore_complete');assert.equal(event.after.failed.length,1);
});
