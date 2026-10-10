import {presentationKey} from '../../.test-build/packages/features-events/src/presentation-key.js';
import {PrismaEventsRepository} from '../../.test-build/packages/features-events/src/prisma-repository.js';
import {readFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';
import {PrismaClient} from '@prisma/client';
import {PrismaEconomyRepository} from '../../.test-build/packages/features-economy/src/prisma-repository.js';
import {PrismaAtomicOperations} from '../../.test-build/packages/database/src/atomic-operations.js';
const require=createRequire(import.meta.url),schema='aj_events_test_'+randomUUID().replaceAll('-','');
const value=parseEnv(readFileSync(new URL('../../.env.test.local',import.meta.url),'utf8')).TEST_DATABASE_URL;
const url=new URL(value);url.searchParams.set('schema',schema);
const db=new PrismaClient({datasourceUrl:url.toString()});
test('Phase 12 PostgreSQL Race event acceptance',async t=>{
 let connected=false;let now=new Date('2026-09-25T12:00:00Z');
 try{
  await db.$connect();connected=true;
  const migration=spawnSync(process.execPath,[require.resolve('prisma/build/index.js'),'migrate','deploy','--schema','packages/database/prisma/schema.prisma'],{env:{...process.env,DATABASE_URL:url.toString()},encoding:'utf8'});
  assert.equal(migration.status,0,'Test schema migration must succeed.');await db.guild.create({data:{id:'events',name:'Test Chairs'}});
  const economy=new PrismaEconomyRepository(db),atomic=new PrismaAtomicOperations(db);for(const userId of ['host','a','b','c','d','e','f','g','h','bettor'])await economy.grantStarter({guildId:'events',userId,amount:10000n,idempotencyKey:'starter:'+userId,now});
  const repo=new PrismaEventsRepository(db,()=>0,()=>now),policy={minBet:10n,maxBet:1000n};const context=(requestKey,userId='host')=>({guildId:'events',channelId:'main',userId,requestKey}),racer=userId=>({userId,name:userId}),account=userId=>db.economyAccount.findUniqueOrThrow({where:{guildId_userId:{guildId:'events',userId}}});let id;
  await t.test('concurrent starts share one channel slot and saved invocation replays once',async()=>{
   const attempts=await Promise.allSettled([repo.startRace(context('start1'),racer('host')),repo.startRace(context('start2'),racer('host'))]);assert.equal(attempts.filter(r=>r.status==='fulfilled').length,1);id=attempts.find(r=>r.status==='fulfilled').value.sessionId;const key=attempts[0].status==='fulfilled'?'start1':'start2';assert.equal((await repo.startRace(context(key),racer('host'))).sessionId,id);
  });
  await t.test('concurrent join is capped at six distinct chairs and entrants',async()=>{
   await Promise.allSettled(['a','b','c','d','e','f','g','h'].map(u=>repo.join(context('join:'+u,u),id,racer(u))));const state=await repo.get(id);assert.equal(state.data.racers.length,6);assert.equal(new Set(state.data.racers.map(r=>r.chair)).size,6);assert.equal(await db.gameParticipant.count({where:{sessionId:id}}),6);
  });
  await t.test('one host extension commits atomically and nonhost cannot extend',async()=>{
   await assert.rejects(()=>repo.extend(context('foreign','a'),id),{code:'HOST_ONLY'});const results=await Promise.allSettled([repo.extend(context('extend1'),id),repo.extend(context('extend2'),id)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal((await repo.get(id)).expiresAt.getTime(),now.getTime()+60000);
  });
  await t.test('cumulative wager limit and immutable selection survive concurrent commits and replay',async()=>{
   const results=await Promise.allSettled([repo.bet(context('bet1','bettor'),id,'host',600n,policy),repo.bet(context('bet2','bettor'),id,'host',600n,policy)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);await repo.bet(context('bet3','bettor'),id,'host',400n,policy);assert.equal((await repo.bet(context('bet3','bettor'),id,'host',400n,policy)).total,'1000');const other=(await repo.get(id)).data.racers.find(r=>r.userId!=='host').userId;await assert.rejects(()=>repo.bet(context('switch','bettor'),id,other,1n,policy),{code:'SELECTION_LOCKED'});assert.equal((await account('bettor')).wallet,9000n);
  });
  await t.test('bet close persists the plan and restart resumes its authoritative progress',async()=>{
   const preparation=await repo.prepareClose('events',id);assert.equal((await repo.get(id)).data.plan,undefined);now=new Date(now.getTime()+60001);await Promise.all([repo.closeBetting('events',id,preparation),repo.closeBetting('events',id,preparation)]);assert.equal(presentationKey((await repo.get(id)).data.plan),presentationKey(preparation.data.plan));const saved=await repo.get(id);assert.equal(saved.state,'LOCKED');await assert.rejects(()=>repo.bet(context('late','a'),id,'host',10n,policy),{code:'BETTING_CLOSED'});now=new Date(now.getTime()+7000);const restarted=new PrismaEventsRepository(db,()=>0,()=>now);assert.deepEqual((await restarted.get(id)).data.plan,saved.data.plan);assert.deepEqual((await restarted.publicView(id)).motion,(await repo.publicView(id)).motion);
  });
  await t.test('concurrent settlement and restart distribute 95 percent once and count one win',async()=>{
   now=new Date(now.getTime()+30000);await Promise.all(Array.from({length:4},()=>repo.settle('events',id,policy)));await new PrismaEventsRepository(db,()=>0,()=>now).settle('events',id,policy);const state=await repo.get(id);assert.equal(state.state,'CLOSED');assert.equal(state.data.result.rake,'50');assert.equal(state.data.result.settlement,'PROPORTIONAL_PAYOUT');assert.equal((await account('bettor')).wallet,9950n);assert.equal((await db.memberGameStats.findUniqueOrThrow({where:{guildId_userId_gameKey:{guildId:'events',userId:'host',gameKey:'race'}}})).wins,1);
  });
  await t.test('NO_WINNING_BETS_REFUND restores wallet and bank once but records the race normally',async()=>{
   await atomic.run('events','bank-test','bank-test',async(tx,ledger)=>{await ledger.apply({guildId:'events',idempotencyKey:'move-bank',lines:[{userId:'bettor',bucket:'wallet',amount:-9450n,reason:'Test bank transfer'},{userId:'bettor',bucket:'bank',amount:9450n,reason:'Test bank transfer'}]});return{ok:true}});const before=await account('bettor');const second=(await repo.startRace(context('second'),racer('host'))).sessionId;await repo.join(context('second-join','a'),second,racer('a'));await repo.bet(context('loser-bet','bettor'),second,'a',1000n,policy);now=new Date(now.getTime()+30001);await repo.closeBetting('events',second);now=new Date(now.getTime()+30000);await Promise.all(Array.from({length:4},()=>repo.settle('events',second,policy)));await new PrismaEventsRepository(db,()=>0,()=>now).settle('events',second,policy);const state=await repo.get(second),after=await account('bettor');assert.equal(state.state,'CLOSED');assert.equal(state.data.winnerId,'host');assert.equal(state.data.result.settlement,'NO_WINNING_BETS_REFUND');assert.equal(state.data.result.rake,'0');assert.equal(after.wallet,before.wallet);assert.equal(after.bank,before.bank);assert.equal((await db.memberGameStats.findUniqueOrThrow({where:{guildId_userId_gameKey:{guildId:'events',userId:'host',gameKey:'race'}}})).wins,2);
  });
  await t.test('Start Now is host-only, keeps the two-racer minimum, and locks once across concurrent clicks and the old expiry job',async()=>{
   const early=(await repo.startRace(context('early'),racer('host'))).sessionId;
   await assert.rejects(()=>repo.startNow(context('early-foreign','a'),early),{code:'HOST_ONLY'});
   await assert.rejects(()=>repo.startNow(context('early-underfilled'),early),{code:'RACE_MINIMUM'});
   assert.equal((await repo.get(early)).state,'OPEN');
   await repo.join(context('early-join','a'),early,racer('a'));
   const prepared=await repo.prepareClose('events',early);
   const attempts=await Promise.allSettled([repo.startNow(context('early-click-one'),early,prepared),repo.startNow(context('early-click-two'),early,prepared)]);
   assert.equal(attempts.filter(result=>result.status==='fulfilled').length,1);
   assert.equal(attempts.filter(result=>result.status==='rejected'&&result.reason.code==='RACE_STARTED').length,1);
   const locked=await repo.get(early);assert.equal(locked.state,'LOCKED');assert.equal(locked.data.startedAt,now.toISOString());
   assert.equal(presentationKey(locked.data.plan),presentationKey(prepared.data.plan));
   assert.equal(await db.scheduledJob.count({where:{executionKey:'events:settle:'+early}}),1);
   now=new Date(now.getTime()+60001);await repo.closeBetting('events',early);
   assert.equal((await repo.get(early)).state,'LOCKED');
   assert.equal(await db.scheduledJob.count({where:{executionKey:'events:settle:'+early}}),1);
   now=new Date(Math.max(now.getTime(),locked.expiresAt.getTime()+1));await repo.settle('events',early);
   assert.equal((await repo.get(early)).state,'CLOSED');
  });
  await t.test('underfilled race cancels and refunds; active Fight prevents a Race',async()=>{
   const third=(await repo.startRace(context('third'),racer('host'))).sessionId;await repo.bet(context('third-bet','a'),third,'host',100n,policy);now=new Date(now.getTime()+30001);await repo.closeBetting('events',third);assert.equal((await repo.get(third)).state,'CANCELLED');assert.equal((await account('a')).wallet,10000n);const fight=await db.gameSession.create({data:{guildId:'events',channelId:'main',type:'fight',state:'OPEN',data:{}}});await assert.rejects(()=>repo.startRace(context('blocked'),racer('host')),{code:'EVENT_ACTIVE'});await assert.rejects(()=>db.gameSession.create({data:{guildId:'events',channelId:'main',type:'race',state:'OPEN',data:{}}}),{code:'P2002'});await db.gameSession.update({where:{id:fight.id},data:{state:'CANCELLED'}});
  });
  await t.test('all ledger transactions balance and every event escrow is terminal',async()=>{const totals=new Map();for(const line of await db.ledgerEntry.findMany())totals.set(line.transactionId,(totals.get(line.transactionId)??0n)+line.amount);for(const n of totals.values())assert.equal(n,0n);assert.equal(await db.escrow.count({where:{state:'RESERVED'}}),0);assert.equal(await db.economyAccount.count({where:{OR:[{wallet:{lt:0n}},{bank:{lt:0n}}]}}),0);});
 }finally{assert.match(schema,/^aj_events_test_[0-9a-f]{32}$/);try{if(connected)await db.$executeRawUnsafe('DROP SCHEMA IF EXISTS "'+schema+'" CASCADE');}finally{await db.$disconnect();}}
});
