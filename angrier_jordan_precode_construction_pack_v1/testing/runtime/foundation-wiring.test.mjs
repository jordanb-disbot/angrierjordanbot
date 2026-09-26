import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AuditService,ConfigService,HealthService,IdempotentScheduler,InMemoryAuditSink,InMemoryConfigRepository,InMemoryJobRepository,SchedulerWorker,
} from '../../.test-build/packages/core/src/index.js';
import { CommandDispatcher } from '../../.test-build/apps/bot/src/architecture/dispatcher.js';
import { ComponentDispatcher } from '../../.test-build/apps/bot/src/architecture/component-dispatcher.js';
import { AngrierJordanApplication } from '../../.test-build/apps/bot/src/architecture/application.js';
import { createStatusHandler } from '../../.test-build/apps/bot/src/features/status-handler.js';

const definitions=[{key:'party_games.enabled',type:'boolean',default:false,mutable:true}];

test('ConfigService resolves defaults, audits writes, and supports safe rollback',async()=>{
  const repo=new InMemoryConfigRepository();const sink=new InMemoryAuditSink();const service=new ConfigService(definitions,repo,new AuditService(sink));
  assert.equal(await service.get('g1','party_games.enabled'),false);
  const first=await service.set({guildId:'g1',key:'party_games.enabled',value:true,actorUserId:'admin',requestId:'r1'});
  assert.equal(first.version,1);assert.equal(await service.get('g1','party_games.enabled'),true);assert.equal(sink.events.length,1);
  await service.set({guildId:'g1',key:'party_games.enabled',value:false,actorUserId:'admin',requestId:'r2',expectedVersion:1});
  const restored=await service.rollback({guildId:'g1',key:'party_games.enabled',toVersion:1,actorUserId:'owner',requestId:'r3'});
  assert.equal(restored.value,true);assert.equal(restored.version,3);assert.equal(sink.events.at(-1).source,'rollback');
});

test('Scheduler executes a due job once and completes it',async()=>{
  const due={id:'j1',guildId:'g1',jobType:'demo',executionKey:'demo:g1:1',dueAt:new Date('2026-09-21T12:00:00Z'),status:'PENDING',attempts:0};
  const repo=new InMemoryJobRepository([due]);let runs=0;
  const scheduler=new IdempotentScheduler(repo,{demo:async()=>{runs+=1;}});
  await scheduler.tick(new Date('2026-09-21T12:01:00Z'));
  assert.equal(runs,1);assert.equal(repo.get('j1').status,'COMPLETED');
  await scheduler.tick(new Date('2026-09-21T12:02:00Z'));
  assert.equal(runs,1);
});

test('Application performs recovery before scheduler startup and exposes health',async()=>{
  const order=[];const repo=new InMemoryJobRepository();const scheduler=new IdempotentScheduler(repo,{});const worker=new SchedulerWorker(scheduler,60_000);
  const health=new HealthService([async()=>({name:'postgres',status:'ok',latencyMs:2})]);
  const app=new AngrierJordanApplication(new CommandDispatcher(),new ComponentDispatcher(),worker,health,[{name:'wyr',recover:async()=>{order.push('wyr');}}]);
  const started=await app.start();app.stop();
  assert.deepEqual(started.recovered,['wyr']);assert.equal(started.health,'ok');assert.deepEqual(order,['wyr']);
});

test('/status handler renders health checks privately',async()=>{
  const health=new HealthService([async()=>({name:'postgres',status:'ok',latencyMs:3}),async()=>({name:'discord',status:'ok',latencyMs:1})]);
  const handler=createStatusHandler(health);
  const response=await handler({guildId:'g',channelId:'c',userId:'u',commandId:'status',options:{},requestId:'r'});
  assert.equal(response.ephemeral,true);assert.match(response.content,/OK/);assert.match(response.content,/postgres 3ms/);assert.match(response.content,/discord 1ms/);
});

test('urgent persisted work wakes immediately after a busy tick without overlapping leases',async()=>{
 let release,calls=0,active=0,maximum=0;const gate=new Promise(resolve=>release=resolve);
 const worker=new SchedulerWorker({tick:async()=>{calls++;maximum=Math.max(maximum,++active);if(calls===1)await gate;active--;}});
 const polling=worker.runOnce(),waking=worker.wake();assert.equal(calls,1);release();await Promise.all([polling,waking]);assert.equal(calls,2);assert.equal(maximum,1);
});
