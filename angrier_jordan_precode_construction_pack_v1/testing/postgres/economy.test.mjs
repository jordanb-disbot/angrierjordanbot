import {cpSync,mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {parseEnv} from 'node:util';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
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
const migrate=(target=url,schemaPath='packages/database/prisma/schema.prisma')=>spawnSync(process.execPath,[require.resolve('prisma/build/index.js'),'migrate','deploy','--schema',schemaPath],{env:{...process.env,DATABASE_URL:target.toString()},encoding:'utf8'});
const service=(client,clock)=>new EconomyService(new PrismaEconomyRepository(client),new AuditService(new InMemoryAuditSink()),clock,{next:()=>0});
const legacyMigrations=()=>{const root=mkdtempSync(join(tmpdir(),'aj-economy-upgrade-'));cpSync('packages/database/prisma/schema.prisma',join(root,'schema.prisma'));for(const name of ['0001_precode_baseline','0002_wyr_golden_feature','0003_onboarding_rejoin_roles','0004_hotseat_execution','0005_main_moderation','0006_moderation_security_controls','0007_automated_security','0008_economy_foundation','0009_item_transactions','0010_profiles_activity','0011_shared_job_recovery','0012_wager_escrow','0013_event_exclusivity','0014_special_commands','0015_dashboard_drafts','0016_party_exclusivity','0017_wallet_holds','0018_crime_decay','0019_family_invariants','0020_typed_item_escrow','0021_phase22_member_content','0022_music_transport_intents','0023_suggestion_panel','0024_fully_furnished_event','0025_private_party_sessions'])cpSync(join('packages/database/prisma/migrations',name),join(root,'migrations',name),{recursive:true});return root;};

test('EAJ 1.1 PostgreSQL migration and durable streak-installment acceptance',async t=>{
 let connected=false;
 try{
  await db.$connect();connected=true;
  const applied=migrate();assert.equal(applied.status,0,'Disposable EAJ schema migration must succeed.');
  await db.guild.create({data:{id:'economy',name:'Economy TEST'}});
  await t.test('upgrade from pre-automated-economy schema preserves existing member economy data',async()=>{
   const legacySchema='aj_economy_upgrade_'+randomUUID().replaceAll('-',''),legacyUrl=new URL(base),legacyRoot=legacyMigrations();legacyUrl.searchParams.set('schema',legacySchema);
   const legacy=new PrismaClient({datasourceUrl:legacyUrl.toString()});
   try{
    const beforeNewEconomy=migrate(legacyUrl,join(legacyRoot,'schema.prisma'));assert.equal(beforeNewEconomy.status,0,'Pre-automated-economy migration baseline must succeed.');await legacy.$connect();
    const now=new Date('2026-10-05T12:00:00Z');await legacy.guild.create({data:{id:'upgrade',name:'Upgrade TEST'}});for(const userId of ['member','spouse'])await legacy.member.create({data:{guildId:'upgrade',userId}});
    await legacy.economyAccount.create({data:{guildId:'upgrade',userId:'member',wallet:777n,bank:333n,bankTier:4,reservedWallet:12n}});await legacy.economyTransaction.create({data:{id:'legacy-ledger',guildId:'upgrade',idempotencyKey:'legacy-ledger',kind:'LEDGER',reason:'legacy',createdAt:now}});await legacy.ledgerEntry.createMany({data:[{guildId:'upgrade',transactionId:'legacy-ledger',userId:'member',bucket:'wallet',amount:10n,reason:'legacy',createdAt:now},{guildId:'upgrade',transactionId:'legacy-ledger',bucket:'system',amount:-10n,reason:'legacy',createdAt:now}]});await legacy.inventoryEntry.create({data:{guildId:'upgrade',userId:'member',itemId:'legacy.item',quantity:3,locked:true}});await legacy.marriage.create({data:{guildId:'upgrade',userA:'member',userB:'spouse',status:'ACTIVE',startedAt:now}});await legacy.achievement.create({data:{id:'legacy.achievement',name:'Legacy',class:'GENERAL',criteria:{}}});await legacy.memberAchievement.create({data:{guildId:'upgrade',userId:'member',achievementId:'legacy.achievement',earnedAt:now}});
    const upgrade=migrate(legacyUrl);assert.equal(upgrade.status,0,'New economy migrations must upgrade the pre-automated-economy schema.');
    const account=await legacy.economyAccount.findUniqueOrThrow({where:{guildId_userId:{guildId:'upgrade',userId:'member'}}});assert.deepEqual({wallet:account.wallet,bank:account.bank,bankTier:account.bankTier,reservedWallet:account.reservedWallet},{wallet:777n,bank:333n,bankTier:4,reservedWallet:12n});assert.equal(await legacy.ledgerEntry.count({where:{guildId:'upgrade'}}),2);assert.equal((await legacy.inventoryEntry.findUniqueOrThrow({where:{guildId_userId_itemId:{guildId:'upgrade',userId:'member',itemId:'legacy.item'}}})).quantity,3);assert.equal(await legacy.marriage.count({where:{guildId:'upgrade',status:'ACTIVE'}}),1);assert.equal(await legacy.memberAchievement.count({where:{guildId:'upgrade',userId:'member',achievementId:'legacy.achievement'}}),1);
   }finally{await legacy.$disconnect();const cleanup=new PrismaClient({datasourceUrl:legacyUrl.toString()});try{await cleanup.$connect();await cleanup.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${legacySchema}" CASCADE`);}finally{await cleanup.$disconnect();rmSync(legacyRoot,{recursive:true,force:true});}}
  });
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
