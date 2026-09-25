import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { FixedClock } from '../../.test-build/packages/core/src/index.js';
import { DomainError } from '../../.test-build/packages/core/src/index.js';
import { InMemoryWyrPromptRepository, InMemoryWyrSessionRepository, SequentialIdGenerator, WyrController, WyrService } from '../../.test-build/packages/features-wyr/src/index.js';

const prompts=JSON.parse(fs.readFileSync(new URL('../../packages/content/golden/wyr_sample.json',import.meta.url),'utf8'));
const make=({random=0}={})=>{
  const clock=new FixedClock(new Date('2026-09-21T12:00:00Z'));
  const promptRepo=new InMemoryWyrPromptRepository(prompts);
  const sessionRepo=new InMemoryWyrSessionRepository();
  const ids=new SequentialIdGenerator();
  const service=new WyrService(promptRepo,sessionRepo,clock,ids,{next:()=>random});
  return {clock,promptRepo,sessionRepo,service,controller:new WyrController(service)};
};

test('WYR starts a public hidden-total round from Random category',async()=>{
  const {controller}=make({random:0});
  const view=await controller.start({guildId:'g1',channelId:'games',userId:'u1',category:'Random'});
  assert.equal(view.ephemeral,false);
  assert.match(view.renderAsset,/WOULD YOU RATHER/);
  assert.match(view.renderAsset,/CASUAL/);
  assert.doesNotMatch(view.renderAsset,/ANGRIER JORDAN/i);
  assert.doesNotMatch(view.renderAsset,/vote[s]? •/i);
  assert.equal(view.components.length,3);
  assert.equal(view.components[2].label,'+30 Seconds');
});

test('WYR voting is anonymous and editable without duplicate ballots',async()=>{
  const {controller,service}=make();
  const open=await controller.start({guildId:'g1',channelId:'games',userId:'host',category:'Casual'});
  await controller.handleComponent(`wyr:vote:A:${open.sessionId}`,'voter');
  await controller.handleComponent(`wyr:vote:B:${open.sessionId}`,'voter');
  const session=await service.get(open.sessionId);
  assert.equal(session.votes.length,1);
  assert.equal(session.votes[0].choice,'B');
});

test('WYR permits one host/staff extension and blocks a second',async()=>{
  const {controller,service}=make();
  const open=await controller.start({guildId:'g1',channelId:'games',userId:'host',category:'Casual'});
  await assert.rejects(()=>controller.handleComponent(`wyr:extend:${open.sessionId}`,'random-user'),e=>e instanceof DomainError&&e.code==='NOT_ALLOWED');
  const extended=await controller.handleComponent(`wyr:extend:${open.sessionId}`,'host');
  assert.match(extended.content,/Voting closes/);
  const session=await service.get(open.sessionId);
  assert.equal((session.expiresAt-session.openedAt)/1000,90);
  await assert.rejects(()=>controller.handleComponent(`wyr:extend:${open.sessionId}`,'host'),e=>e instanceof DomainError&&e.code==='EXTENSION_ALREADY_USED');
});

test('WYR results reveal totals and Play Again creates a fresh round',async()=>{
  const {controller,service}=make();
  const open=await controller.start({guildId:'g1',channelId:'games',userId:'host',category:'Casual'});
  await controller.handleComponent(`wyr:vote:A:${open.sessionId}`,'u2');
  await controller.handleComponent(`wyr:vote:A:${open.sessionId}`,'u3');
  await controller.handleComponent(`wyr:vote:B:${open.sessionId}`,'u4');
  const closed=await controller.close(open.sessionId);
  assert.equal(closed.components[0].label,'Play Again');
  assert.match(closed.renderAsset,/3 total votes/);
  const original=await service.get(open.sessionId);
  assert.equal(original.state,'CLOSED');
  const replay=await controller.handleComponent(`wyr:play:${open.sessionId}`,'u5');
  assert.notEqual(replay.sessionId,open.sessionId);
  const fresh=await service.get(replay.sessionId);
  assert.equal(fresh.ownerUserId,'u5');
  assert.equal(fresh.data.category,'Casual');
});

test('WYR recovery closes expired rounds and leaves active rounds open',async()=>{
  const {controller,clock,service}=make();
  const first=await controller.start({guildId:'g1',channelId:'games-a',userId:'host',category:'Casual'});
  await controller.start({guildId:'g1',channelId:'games-b',userId:'host',category:'Friends',durationSeconds:180});
  clock.advanceMs(61_000);
  const recovered=await service.recoverAndCloseExpired();
  assert.equal(recovered.closed.length,1);
  assert.equal(recovered.closed[0].session.id,first.sessionId);
  assert.equal(recovered.active.length,1);
});

test('WYR enforces one active public WYR round per channel',async()=>{
  const {controller}=make();
  await controller.start({guildId:'g1',channelId:'games',userId:'u1',category:'Casual'});
  await assert.rejects(()=>controller.start({guildId:'g1',channelId:'games',userId:'u2',category:'Friends'}),e=>e instanceof DomainError&&e.code==='PARTY_ROUND_ACTIVE');
});

test('WYR runtime persists Discord message linkage and recovers after restart',async()=>{
  const {clock,service}=make();
  const calls={post:[],update:[],results:[],ephemeral:[]};
  const port={
    async postRound(session,svg){calls.post.push({id:session.id,svg});return {messageId:`msg-${session.id}`};},
    async updateRound(session,svg){calls.update.push({id:session.id,messageId:session.messageId,svg});},
    async postResults(session,results,svg){calls.results.push({id:session.id,messageId:session.messageId,results,svg});},
    async ephemeral(userId,message){calls.ephemeral.push({userId,message});},
  };
  const { WyrRuntime }=await import('../../.test-build/packages/features-wyr/src/index.js');
  const runtime=new WyrRuntime(service,port);
  const session=await runtime.launch({guildId:'g1',channelId:'games',userId:'host',category:'Casual'});
  assert.equal(session.messageId,`msg-${session.id}`);
  await runtime.vote(session.id,'u2','A');
  assert.equal(calls.ephemeral.length,1);
  clock.advanceMs(61_000);
  const recovered=await runtime.recover();
  assert.deepEqual(recovered,{active:0,closed:1});
  assert.equal(calls.results.length,1);
  assert.equal(calls.results[0].messageId,`msg-${session.id}`);
});
