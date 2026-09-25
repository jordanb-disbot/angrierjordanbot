import test from 'node:test';
import assert from 'node:assert/strict';
import {AuditService,FixedClock,InMemoryAuditSink,DomainError} from '../../.test-build/packages/core/src/index.js';
import {InMemoryModerationRepository,ModerationService,parseBanDuration,parseTimeoutDuration,parseSlowmodeDuration} from '../../.test-build/packages/features-moderation/src/index.js';

const make=()=>{const clock=new FixedClock(new Date('2026-09-21T12:00:00Z'));const repo=new InMemoryModerationRepository();const sink=new InMemoryAuditSink();const service=new ModerationService(repo,new AuditService(sink),clock);return{clock,repo,sink,service};};

test('moderation durations enforce Discord-safe bounds and temporary/permanent bans',()=>{
  assert.equal(parseTimeoutDuration('30m').seconds,1800);
  assert.throws(()=>parseTimeoutDuration('29d'),e=>e instanceof DomainError&&e.code==='INVALID_TIMEOUT_DURATION');
  assert.equal(parseBanDuration('permanent').permanent,true);
  assert.equal(parseBanDuration('7d').seconds,604800);
  assert.throws(()=>parseBanDuration('2y'),e=>e instanceof DomainError&&e.code==='INVALID_BAN_DURATION');
});

test('prepared moderation case becomes enforced and keeps numbered transition history',async()=>{
  const {service,repo,sink}=make();
  const c=await service.prepare({guildId:'g',subjectUserId:'u',actorUserId:'mod',actionType:'WARN',reason:'Repeated harassment'});
  assert.equal(c.id,1);assert.equal(c.metadata.pending,true);
  const final=await service.finalize(c.id,'OPEN',{actorUserId:'mod',eventKind:'WARNING_ISSUED'});
  assert.equal(final.metadata.pending,false);
  const view=await service.caseView(c.id);assert.deepEqual(view.events.map(e=>e.kind),['PREPARED','WARNING_ISSUED']);
  assert.equal(sink.events.filter(e=>e.targetId==='1').length,2);
  assert.equal(repo.cases.size,1);
});

test('failed Discord enforcement is preserved as a reversed failed case',async()=>{
  const {service}=make();
  const c=await service.prepare({guildId:'g',subjectUserId:'u',actorUserId:'mod',actionType:'KICK',reason:'rule breach'});
  const failed=await service.enforcementFailed(c.id,'mod','rule breach',new Error('Missing Kick Members'));
  assert.equal(failed.status,'REVERSED');assert.equal(failed.metadata.enforcementFailed,true);assert.match(failed.metadata.error,/Kick Members/);
});

test('temporary timeout and ban cases schedule persisted expiration jobs',async()=>{
  const {service,repo}=make();
  const t=await service.prepare({guildId:'g',subjectUserId:'u',actorUserId:'mod',actionType:'TIMEOUT',reason:'spam',durationSeconds:3600});
  await service.finalize(t.id,'ACTIVE',{actorUserId:'mod'});const timeoutDue=await service.scheduleTemporaryCase(t,'u',3600,'moderation.timeout_expire');
  assert.equal(timeoutDue.toISOString(),'2026-09-21T13:00:00.000Z');assert.equal(repo.expiryJobs.get(t.id).jobType,'moderation.timeout_expire');
  const b=await service.prepare({guildId:'g',subjectUserId:'v',actorUserId:'admin',actionType:'BAN',reason:'scam',durationSeconds:86400});
  await service.finalize(b.id,'ACTIVE',{actorUserId:'admin'});await service.scheduleTemporaryCase(b,'v',86400,'moderation.temp_ban_expire');
  assert.equal(repo.expiryJobs.get(b.id).jobType,'moderation.temp_ban_expire');
});

test('appealed temporary actions still expire safely',async()=>{
  const {clock,service}=make();
  const c=await service.prepare({guildId:'g',subjectUserId:'u',actorUserId:'mod',actionType:'TIMEOUT',reason:'spam',durationSeconds:60});
  await service.finalize(c.id,'ACTIVE',{actorUserId:'mod'});await service.scheduleTemporaryCase(c,'u',60,'moderation.timeout_expire');
  const appeal=await service.requestReview(c.id,'u');assert.equal(appeal.caseId,c.id);assert.equal((await service.requireCase(c.id)).status,'APPEALED');
  clock.advanceMs(61_000);const expired=await service.expire(c.id,'Timeout expired.');assert.equal(expired.status,'EXPIRED');
});

test('staff notes and member history remain separate from punitive cases',async()=>{
  const {service}=make();
  await service.note('g','u','mod','Discussed boundary with staff.');
  const c=await service.prepare({guildId:'g',subjectUserId:'u',actorUserId:'mod',actionType:'WARN',reason:'warning'});await service.finalize(c.id,'OPEN',{actorUserId:'mod'});
  const h=await service.history('g','u');assert.equal(h.notes.length,1);assert.equal(h.cases.length,1);assert.equal(h.notes[0].text,'Discussed boundary with staff.');
});

test('reason edits preserve history and only safe actions can be reversed automatically',async()=>{
  const {service}=make();
  const warn=await service.prepare({guildId:'g',subjectUserId:'u',actorUserId:'mod',actionType:'WARN',reason:'first wording'});await service.finalize(warn.id,'OPEN',{actorUserId:'mod'});
  const edited=await service.editReason(warn.id,'admin','Corrected factual wording');assert.equal(edited.status,'MODIFIED');assert.equal(edited.reason,'Corrected factual wording');
  const reversed=await service.reverse(warn.id,'admin','Appeal approved');assert.equal(reversed.status,'REVERSED');
  const kick=await service.prepare({guildId:'g',subjectUserId:'v',actorUserId:'admin',actionType:'KICK',reason:'kick'});await service.finalize(kick.id,'OPEN',{actorUserId:'admin'});
  await assert.rejects(()=>service.reverse(kick.id,'admin','cannot undo'),e=>e instanceof DomainError&&e.code==='CASE_NOT_REVERSIBLE');
});

test('untimeout/unban style close operation closes active related cases and cancels jobs',async()=>{
  const {service,repo}=make();
  const c=await service.prepare({guildId:'g',subjectUserId:'u',actorUserId:'mod',actionType:'TIMEOUT',reason:'spam',durationSeconds:3600});await service.finalize(c.id,'ACTIVE',{actorUserId:'mod'});await service.scheduleTemporaryCase(c,'u',3600,'moderation.timeout_expire');
  const closed=await service.closeActiveCases('g','u',['TIMEOUT'],'mod','Timeout removed');assert.equal(closed.length,1);assert.equal(closed[0].status,'REVERSED');assert.equal(repo.expiryJobs.has(c.id),false);
});

test('slowmode parsing accepts off and enforces Discord six-hour maximum',()=>{
  assert.equal(parseSlowmodeDuration('off').seconds,0);
  assert.equal(parseSlowmodeDuration('10m').seconds,600);
  assert.throws(()=>parseSlowmodeDuration('7h'),e=>e instanceof DomainError&&e.code==='INVALID_SLOWMODE_DURATION');
});

test('channel lock snapshots preserve exact previous send state and cannot double-lock',async()=>{
  const {service,repo}=make();
  const state=await service.saveChannelLock('g','c','inherit',false,'admin');
  assert.equal(state.snapshot.sendMessages,'inherit');
  await assert.rejects(()=>service.saveChannelLock('g','c','allow',true,'admin'),e=>e instanceof DomainError&&e.code==='CHANNEL_ALREADY_LOCKED');
  assert.equal((await service.getChannelLock('g','c')).active,true);
  await service.clearChannelLock('g','c','admin');
  assert.equal(await repo.getActiveChannelLockState('g','c'),null);
});

test('restricted evidence is retained then content-purged without deleting case metadata',async()=>{
  const {service,repo}=make();
  const c=await service.prepare({guildId:'g',subjectUserId:'u',actorUserId:'mod',actionType:'QUARANTINE',reason:'targeted harassment',sourceChannelId:'c',sourceMessageId:'m'});
  const e=await service.storeEvidence({caseRecord:c,contentCiphertext:'ciphertext',context:{channelId:'c',messageId:'m'},retentionDays:30});
  assert.equal(repo.evidenceJobs.has(e.id),true);
  assert.equal((await repo.listEvidence(c.id))[0].contentCiphertext,'ciphertext');
  assert.equal(await service.purgeEvidence(e.id),true);
  const after=(await repo.listEvidence(c.id))[0];
  assert.equal(after.contentCiphertext,undefined);
  assert.ok(after.context.contentPurgedAt);
});

test('review outcomes enforce reviewer independence and persist rationale',async()=>{
  const {service,repo}=make();
  const c=await service.prepare({guildId:'g',subjectUserId:'u',actorUserId:'mod',actionType:'WARN',reason:'warning'});await service.finalize(c.id,'OPEN',{actorUserId:'mod'});
  const appeal=await service.requestReview(c.id,'u');
  await assert.rejects(()=>service.resolveAppeal({appealId:appeal.appealId,reviewerUserId:'mod',outcome:'UPHELD',reason:'I agree with myself'}),e=>e instanceof DomainError&&e.code==='APPEAL_REVIEWER_CONFLICT');
  const out=await service.resolveAppeal({appealId:appeal.appealId,reviewerUserId:'othermod',outcome:'UPHELD',reason:'Independent review completed'});
  assert.equal(out.appeal.status,'UPHELD');assert.equal(out.appeal.outcomeReason,'Independent review completed');assert.equal(out.caseRecord.status,'UPHELD');
  assert.equal(repo.appeals[0].reviewerUserId,'othermod');
});

test('duplicate review button clicks reuse the existing pending appeal',async()=>{
  const {service}=make();const c=await service.prepare({guildId:'g',subjectUserId:'u',actorUserId:'mod',actionType:'WARN',reason:'warning'});await service.finalize(c.id,'OPEN',{actorUserId:'mod'});
  const a=await service.requestReview(c.id,'u');const b=await service.requestReview(c.id,'u');assert.equal(a.appealId,b.appealId);assert.equal(b.existing,true);
});

test('staff alerts are non-punitive and modstats return operational totals without staff ranking',async()=>{
  const {service}=make();await service.staffAlert('g','u','mod','Keep an eye on repeated boundary pushing.');const c=await service.prepare({guildId:'g',subjectUserId:'u',actorUserId:'mod',actionType:'QUARANTINE',reason:'message removed'});await service.finalize(c.id,'OPEN',{actorUserId:'mod'});
  const {stats}=await service.stats('g','7d');assert.equal(stats.staffAlerts,1);assert.equal(stats.quarantines,1);assert.equal(stats.actionCounts.QUARANTINE,1);
  assert.equal('staffRankings' in stats,false);
});

