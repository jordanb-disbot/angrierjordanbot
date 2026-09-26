import {readFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';
import {PrismaClient} from '@prisma/client';
import {PrismaJobRepository} from '../../.test-build/packages/database/src/prisma-adapters.js';
import {PrismaJobDeliveryRepository} from '../../.test-build/packages/database/src/job-delivery.js';
const require=createRequire(import.meta.url),schema='aj_jobs_test_'+randomUUID().replaceAll('-','');
const value=parseEnv(readFileSync(new URL('../../.env.test.local',import.meta.url),'utf8')).TEST_DATABASE_URL;
const url=new URL(value);url.searchParams.set('schema',schema);
const db=new PrismaClient({datasourceUrl:url.toString()});
test('Shared scheduler PostgreSQL lease and retry recovery',async t=>{
 let connected=false;
 try{
  await db.$connect();connected=true;
  const migration=spawnSync(process.execPath,[require.resolve('prisma/build/index.js'),'migrate','deploy','--schema','packages/database/prisma/schema.prisma'],{env:{...process.env,DATABASE_URL:url.toString()},encoding:'utf8'});
  assert.equal(migration.status,0,'Test schema migration must succeed.');await db.guild.create({data:{id:'jobs',name:'Test Chairs'}});
  const repo=new PrismaJobRepository(db),now=new Date();
  await db.scheduledJob.create({data:{guildId:'jobs',jobType:'test',executionKey:'lease-test',dueAt:new Date(now.getTime()-1000),status:'PENDING',payload:{}}});
  await t.test('concurrent workers claim a due job once',async()=>{
   const results=await Promise.all([repo.claimDue(now,1),new PrismaJobRepository(db).claimDue(now,1)]);assert.equal(results.flat().length,1);
  });
  await t.test('crashed worker lease is reclaimed and stale completion is fenced',async()=>{
   const old=await db.scheduledJob.findUniqueOrThrow({where:{executionKey:'lease-test'}});
   await db.scheduledJob.update({where:{id:old.id},data:{leaseUntil:new Date(now.getTime()-1)}});
   const [recovered]=await new PrismaJobRepository(db).claimDue(now,1);assert.ok(recovered);assert.notEqual(recovered.leaseToken,old.leaseToken);
   await repo.complete(old.id,old.leaseToken);assert.equal((await db.scheduledJob.findUniqueOrThrow({where:{id:old.id}})).status,'RUNNING');
   assert.equal(await repo.renew(old.id,old.leaseToken),false);assert.equal(await repo.renew(recovered.id,recovered.leaseToken),true);
   await repo.fail(recovered.id,'Injected retryable failure',recovered.leaseToken);
   const failed=await db.scheduledJob.findUniqueOrThrow({where:{id:old.id}});assert.equal(failed.dueAt.getTime(),old.dueAt.getTime());assert.equal((await repo.claimDue(now,1)).length,0);
   const [retried]=await repo.claimDue(new Date(failed.retryAt.getTime()+1),1);assert.ok(retried);await repo.complete(retried.id,retried.leaseToken);assert.equal(await repo.wasExecuted('lease-test'),true);
  });
  await t.test('delivery completion retries stale PostgreSQL payloads without resurrecting a scrubbed snapshot',async()=>{
   for(const finalizedState of ['SENDING','SENT']){
    const job=await db.scheduledJob.create({data:{guildId:'jobs',jobType:'delivery-test',executionKey:'delivery-scrub-'+finalizedState,dueAt:now,payload:{deliveryState:'SENDING',eventId:'event',snapshot:{body:'Transient fixture content'},finalized:false}}});
    let readReady,releaseRead,reads=0,casMisses=0;
    const ready=new Promise(resolve=>{readReady=resolve;}),released=new Promise(resolve=>{releaseRead=resolve;});
    const wrapped={scheduledJob:{
     findUniqueOrThrow:async args=>{const row=await db.scheduledJob.findUniqueOrThrow(args);if(++reads===1){readReady();await released;}return row;},
     updateMany:async args=>{const result=await db.scheduledJob.updateMany(args);if(result.count===0)casMisses++;return result;}
    }};
    const completion=new PrismaJobDeliveryRepository(wrapped,job.id).complete('confirmed-message');
    await ready;
    const scrubbed={deliveryState:finalizedState,eventId:'event',finalized:true,...(finalizedState==='SENT'?{deliveryMessageId:'confirmed-message'}:{})};
    try{await db.scheduledJob.update({where:{id:job.id},data:{payload:scrubbed}});}finally{releaseRead();}
    await completion;
    const current=await db.scheduledJob.findUniqueOrThrow({where:{id:job.id}});
    assert.deepEqual(current.payload,{...scrubbed,deliveryState:'SENT',deliveryMessageId:'confirmed-message'});
    assert.equal('snapshot' in current.payload,false);assert.equal(casMisses,1);assert.equal(reads,2);
   }
  });
  await t.test('matching concurrent delivery completions are idempotent and preserve current feature metadata',async()=>{
   const payload={deliveryState:'SENDING',eventId:'same-event',finalized:true},job=await db.scheduledJob.create({data:{guildId:'jobs',jobType:'delivery-test',executionKey:'delivery-matching',dueAt:now,payload}});
   let bothReady,releaseReads,reads=0,casWins=0,casMisses=0;
   const ready=new Promise(resolve=>{bothReady=resolve;}),released=new Promise(resolve=>{releaseReads=resolve;});
   const wrapped={scheduledJob:{
    findUniqueOrThrow:async args=>{const row=await db.scheduledJob.findUniqueOrThrow(args);if(++reads<=2){if(reads===2)bothReady();await released;}return row;},
    updateMany:async args=>{const result=await db.scheduledJob.updateMany(args);if(result.count===1)casWins++;else casMisses++;return result;}
   }};
   const completions=[new PrismaJobDeliveryRepository(wrapped,job.id).complete('same-message'),new PrismaJobDeliveryRepository(wrapped,job.id).complete('same-message')];
   await ready;releaseReads();await Promise.all(completions);
   assert.equal(casWins,1);assert.equal(casMisses,1);
   assert.deepEqual((await db.scheduledJob.findUniqueOrThrow({where:{id:job.id}})).payload,{...payload,deliveryState:'SENT',deliveryMessageId:'same-message'});
   await new PrismaJobDeliveryRepository(db,job.id).complete('same-message');
   assert.deepEqual(await new PrismaJobDeliveryRepository(db,job.id).read(),{state:'SENT',messageId:'same-message'});
  });
  await t.test('conflicting concurrent delivery message IDs cannot overwrite the confirmed delivery',async()=>{
   const job=await db.scheduledJob.create({data:{guildId:'jobs',jobType:'delivery-test',executionKey:'delivery-conflicting',dueAt:now,payload:{deliveryState:'SENDING',eventId:'conflicting-event'}}});
   let bothReady,releaseReads,reads=0;
   const ready=new Promise(resolve=>{bothReady=resolve;}),released=new Promise(resolve=>{releaseReads=resolve;});
   const wrapped={scheduledJob:{
    findUniqueOrThrow:async args=>{const row=await db.scheduledJob.findUniqueOrThrow(args);if(++reads<=2){if(reads===2)bothReady();await released;}return row;},
    updateMany:args=>db.scheduledJob.updateMany(args)
   }};
   const ids=['message-a','message-b'],outcomes=Promise.allSettled(ids.map(id=>new PrismaJobDeliveryRepository(wrapped,job.id).complete(id)));
   await ready;releaseReads();const results=await outcomes;
   assert.equal(results.filter(result=>result.status==='fulfilled').length,1);
   const loser=results.findIndex(result=>result.status==='rejected'),winner=1-loser;assert.equal(results[loser].reason.code,'DELIVERY_CONFLICT');
   const before=await db.scheduledJob.findUniqueOrThrow({where:{id:job.id}});assert.equal(before.payload.deliveryMessageId,ids[winner]);
   await assert.rejects(new PrismaJobDeliveryRepository(db,job.id).complete(ids[loser]),{code:'DELIVERY_CONFLICT'});
   assert.deepEqual((await db.scheduledJob.findUniqueOrThrow({where:{id:job.id}})).payload,before.payload);
  });
 }finally{assert.match(schema,/^aj_jobs_test_[0-9a-f]{32}$/);try{if(connected)await db.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);}finally{await db.$disconnect();}}
});
