import {readFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';
import {PrismaClient} from '@prisma/client';
import {PrismaJobRepository} from '../../.test-build/packages/database/src/prisma-adapters.js';
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
 }finally{assert.match(schema,/^aj_jobs_test_[0-9a-f]{32}$/);try{if(connected)await db.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);}finally{await db.$disconnect();}}
});
