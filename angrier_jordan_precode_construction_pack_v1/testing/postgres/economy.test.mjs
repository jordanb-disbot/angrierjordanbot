import {readFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';
import {PrismaClient} from '@prisma/client';
import {AuditService,FixedClock,InMemoryAuditSink} from '../../.test-build/packages/core/src/index.js';
import {EconomyService,PrismaEconomyRepository} from '../../.test-build/packages/features-economy/src/index.js';

const require=createRequire(import.meta.url);
const base=parseEnv(readFileSync(new URL('../../.env.test.local',import.meta.url),'utf8')).TEST_DATABASE_URL;
if(!base)throw new Error('TEST_DATABASE_URL is required from ignored .env.test.local.');
const schema='aj_economy_test_'+randomUUID().replaceAll('-','');
const url=new URL(base);url.searchParams.set('schema',schema);
const db=new PrismaClient({datasourceUrl:url.toString()});
const migrate=()=>spawnSync(process.execPath,[require.resolve('prisma/build/index.js'),'migrate','deploy','--schema','packages/database/prisma/schema.prisma'],{env:{...process.env,DATABASE_URL:url.toString()},encoding:'utf8'});
const service=(client,clock)=>new EconomyService(new PrismaEconomyRepository(client),new AuditService(new InMemoryAuditSink()),clock,{next:()=>0});

test('EAJ 1.1 PostgreSQL migration and durable streak-installment acceptance',async t=>{
 let connected=false;
 try{
  await db.$connect();connected=true;
  const applied=migrate();assert.equal(applied.status,0,'Disposable EAJ schema migration must succeed.');
  await db.guild.create({data:{id:'economy',name:'Economy TEST'}});
  await t.test('migration rerun preserves existing economy, inventory, ledger, and relationship rows',async()=>{
   const repo=new PrismaEconomyRepository(db),now=new Date('2026-10-05T12:00:00Z');
   await repo.grantStarter({guildId:'economy',userId:'keeper',amount:500n,idempotencyKey:'starter:keeper',now});
   await db.marriage.create({data:{guildId:'economy',userA:'keeper',userB:'partner',status:'ACTIVE',startedAt:now}});
   const before={account:await db.economyAccount.findUniqueOrThrow({where:{guildId_userId:{guildId:'economy',userId:'keeper'}}}),entries:await db.ledgerEntry.count({where:{guildId:'economy'}}),tools:await db.toolInstance.count({where:{guildId:'economy',userId:'keeper'}}),marriages:await db.marriage.count({where:{guildId:'economy'}})};
   const rerun=migrate();assert.equal(rerun.status,0,'Reapplying TEST migrations must be non-destructive.');
   const after=await db.economyAccount.findUniqueOrThrow({where:{guildId_userId:{guildId:'economy',userId:'keeper'}}});
   assert.equal(after.wallet,before.account.wallet);assert.equal(await db.ledgerEntry.count({where:{guildId:'economy'}}),before.entries);assert.equal(await db.toolInstance.count({where:{guildId:'economy',userId:'keeper'}}),before.tools);assert.equal(await db.marriage.count({where:{guildId:'economy'}}),before.marriages);
  });
  await t.test('atomic settlement, concurrent workers, retry, and restart recovery pay each installment once',async()=>{
   const clock=new FixedClock(new Date('2026-10-06T12:00:00Z')),repo=new PrismaEconomyRepository(db);
   const claim=await repo.commitClaim({guildId:'economy',userId:'streaker',claimField:'dailyLastClaimAt',cycleStart:new Date('2026-10-06T10:00:00Z'),now:clock.now(),idempotencyKey:'streak:claim',kind:'DAILY_CLAIM',reason:'Daily claim',walletReward:200n,dailyStreak:30,streakInstallment:{totalAmount:2500n,installmentCount:7,firstDueAt:clock.now()},metadata:{streak:30}});
   assert.equal(claim.status,'applied');assert.ok(claim.streakInstallment);
   const id=claim.streakInstallment.id,worker=service(db,clock);
   const attempts=await Promise.allSettled(Array.from({length:8},()=>worker.settleStreakInstallment(id)));
   assert.ok(attempts.some(result=>result.status==='fulfilled'));
   let row=await db.streakInstallment.findUniqueOrThrow({where:{id}});
   const installmentTransactions=await db.economyTransaction.findMany({where:{idempotencyKey:{startsWith:`streak-installment:${id}:`}}});
   assert.equal(installmentTransactions.length,1);assert.equal(row.installmentsPaid,1);assert.equal(row.paidAmount,358n);
   const retry=await worker.settleStreakInstallment(id);assert.equal(retry?.paidAmount,358n);
   await db.$disconnect();
   const restartedClient=new PrismaClient({datasourceUrl:url.toString()});await restartedClient.$connect();
   const restarted=service(restartedClient,clock);clock.advanceMs(86_400_000);
   const second=await restarted.settleStreakInstallment(id);assert.equal(second?.installmentsPaid,2);
   const duplicateAfterRestart=await restarted.settleStreakInstallment(id);assert.equal(duplicateAfterRestart?.installmentsPaid,2);
   const afterRestartTransactions=await restartedClient.economyTransaction.count({where:{idempotencyKey:{startsWith:`streak-installment:${id}:`}}});assert.equal(afterRestartTransactions,2);
   row=await restartedClient.streakInstallment.findUniqueOrThrow({where:{id}});assert.equal(row.paidAmount,716n);assert.equal(row.installmentsPaid,2);
   await restartedClient.$disconnect();
  });
 }finally{
  assert.match(schema,/^aj_economy_test_[0-9a-f]{32}$/);
  const cleanup=new PrismaClient({datasourceUrl:url.toString()});
  try{if(connected){await cleanup.$connect();await cleanup.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);}}finally{await cleanup.$disconnect();}
 }
});
