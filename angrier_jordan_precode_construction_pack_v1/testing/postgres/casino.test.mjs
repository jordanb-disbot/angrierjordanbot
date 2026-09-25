import {readFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';
import {PrismaClient} from '@prisma/client';
import {PrismaCasinoRepository} from '../../.test-build/packages/features-casino/src/prisma-repository.js';
import {PrismaLotteryRepository,lotteryCycle} from '../../.test-build/packages/features-casino/src/lottery-repository.js';
import {PrismaEconomyRepository} from '../../.test-build/packages/features-economy/src/prisma-repository.js';
import {PrismaAtomicOperations} from '../../.test-build/packages/database/src/atomic-operations.js';
import {PrismaWagerEscrow} from '../../.test-build/packages/database/src/wager-escrow.js';
const require=createRequire(import.meta.url),schema='aj_casino_test_'+randomUUID().replaceAll('-','');
const value=parseEnv(readFileSync(new URL('../../.env.test.local',import.meta.url),'utf8')).TEST_DATABASE_URL;
const url=new URL(value);url.searchParams.set('schema',schema);
const db=new PrismaClient({datasourceUrl:url.toString()});
test('Phase 11 PostgreSQL escrow, casino and lottery acceptance',async t=>{
 let connected=false;
 try{
  await db.$connect();connected=true;
  const migration=spawnSync(process.execPath,[require.resolve('prisma/build/index.js'),'migrate','deploy','--schema','packages/database/prisma/schema.prisma'],{env:{...process.env,DATABASE_URL:url.toString()},encoding:'utf8'});
  assert.equal(migration.status,0,'Test schema migration must succeed.');await db.guild.create({data:{id:'casino',name:'Test Chairs'}});
  const economy=new PrismaEconomyRepository(db),atomic=new PrismaAtomicOperations(db);
  for(const userId of ['a','blackjack','slot1','slot2','lottery','refund','timeout'])await economy.grantStarter({guildId:'casino',userId,amount:10000n,idempotencyKey:'starter:'+userId,now:new Date()});
  const policy={minBet:10n,maxBet:100000n,chairPotPercent:1,symbols:[{id:'chair',name:'Chair',weight:99,multiplier:2},{id:'throne',name:'Throne',weight:1,multiplier:0,jackpot:true}],slotsWagers:[100n],rouletteChoices:['red','number:0'],diceChoices:['high']};
  const context=(requestKey,userId='a')=>({guildId:'casino',userId,channelId:'bot',requestKey}),repo=new PrismaCasinoRepository(db),account=userId=>db.economyAccount.findUniqueOrThrow({where:{guildId_userId:{guildId:'casino',userId}}});
  await t.test('concurrent instant replay persists one round, charge, outcome and statistics',async()=>{
   const before=await account('a');const results=await Promise.all(Array.from({length:8},()=>repo.start(context('coin'),'coinflip',100n,'heads',policy)));assert.equal(new Set(results.map(r=>r.sessionId)).size,1);
   const round=await repo.get(results[0].sessionId);assert.equal(round.state,'CLOSED');assert.equal((await account('a')).wallet,before.wallet-100n+BigInt(round.data.payout));
   const restarted=new PrismaCasinoRepository(db);assert.deepEqual(await restarted.start(context('coin'),'coinflip',100n,'heads',policy),results[0]);assert.equal(await db.gameSession.count({where:{type:'casino'}}),1);
   await assert.rejects(()=>repo.start(context('coin'),'coinflip',100n,'tails',policy),{code:'REPLAY_MISMATCH'});assert.equal((await db.memberGameStats.findUniqueOrThrow({where:{guildId_userId_gameKey:{guildId:'casino',userId:'a',gameKey:'coinflip'}}})).plays,1);
  });
  await t.test('concurrent blackjack double commits one extra stake and one result',async()=>{
   const blackjack=new PrismaCasinoRepository(db,()=>0,()=>[4,9,5,6,9]),started=await blackjack.start(context('blackjack','blackjack'),'blackjack',100n,'',policy);
   const results=await Promise.allSettled([blackjack.action(context('double1','blackjack'),started.sessionId,0,'double',policy),blackjack.action(context('double2','blackjack'),started.sessionId,0,'double',policy)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
   const round=await blackjack.get(started.sessionId);assert.equal(round.data.payout,'400');assert.equal((await account('blackjack')).wallet,10200n);assert.equal(await db.escrow.count({where:{referenceId:started.sessionId,state:'SETTLED'}}),2);
  });
  await t.test('restart recovers expired blackjack and settles the automatic stand exactly once',async()=>{
   const started=await new PrismaCasinoRepository(db,()=>0,()=>[4,9,5,6,9]).start(context('timeout','timeout'),'blackjack',100n,'',policy);
   await db.gameSession.update({where:{id:started.sessionId},data:{expiresAt:new Date(Date.now()-1000)}});
   const restarted=new PrismaCasinoRepository(db);await Promise.all(Array.from({length:4},()=>restarted.expire('casino',started.sessionId)));
   assert.equal((await restarted.get(started.sessionId)).state,'CLOSED');assert.equal((await account('timeout')).wallet,9900n);
   assert.equal(await db.escrow.count({where:{referenceId:started.sessionId,state:'SETTLED'}}),1);
   assert.equal(await db.scheduledJob.count({where:{executionKey:'casino:records:'+started.sessionId}}),1);
  });
  await t.test('simultaneous Chair Pot wins cannot both receive the previous pot',async()=>{
   await db.casinoPool.create({data:{guildId:'casino',poolKey:'chair_pot',amount:500n}});const slots=new PrismaCasinoRepository(db,()=>99);
   const results=await Promise.all([slots.start(context('slot1','slot1'),'slots',100n,'',policy),slots.start(context('slot2','slot2'),'slots',100n,'',policy)]);
   const rounds=await Promise.all(results.map(r=>slots.get(r.sessionId)));assert.equal(rounds.reduce((n,r)=>n+BigInt(r.data.payout),0n),502n);assert.equal((await db.casinoPool.findUniqueOrThrow({where:{guildId_poolKey:{guildId:'casino',poolKey:'chair_pot'}}})).amount,0n);
   assert.equal((await account('slot1')).wallet+(await account('slot2')).wallet,20302n);
  });
  const lottery=new PrismaLotteryRepository(db);
  await t.test('concurrent lottery purchases enforce the 20-ticket cap atomically',async()=>{
   const results=await Promise.allSettled([lottery.buy(context('tickets1','lottery'),15,100n),lottery.buy(context('tickets2','lottery'),15,100n)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
   await lottery.buy(context('tickets3','lottery'),5,100n);const state=await lottery.current('casino','lottery');assert.equal(state.memberTickets,20);assert.equal(state.round.pot,2000n);assert.equal((await account('lottery')).wallet,8000n);
  });
  await t.test('concurrent draw and restart pay the full ticket-funded pot once',async()=>{
   const state=await lottery.current('casino','lottery'),at=new Date(state.round.drawAt.getTime()+1);const results=await Promise.all(Array.from({length:4},()=>lottery.draw('casino',state.round.id,at)));assert.ok(results.every(r=>r.status==='DRAWN'));assert.equal((await account('lottery')).wallet,10000n);
   await new PrismaLotteryRepository(db).draw('casino',state.round.id,at);assert.equal((await account('lottery')).wallet,10000n);assert.equal(await db.scheduledJob.count({where:{jobType:'lottery.announce'}}),1);
  });
  await t.test('zero-ticket draw skips without a payout or rollover',async()=>{
   const round=await db.lotteryRound.create({data:{guildId:'casino',weekKey:'empty-test-week',drawAt:new Date(Date.now()-1000)}});assert.equal((await lottery.draw('casino',round.id)).status,'SKIPPED');assert.equal((await db.lotteryRound.findUniqueOrThrow({where:{id:round.id}})).pot,0n);
  });
  await t.test('refund restores original wallet/bank funding exactly once',async()=>{
   await atomic.run('casino','refund-setup','setup',async(tx,ledger)=>{await ledger.apply({guildId:'casino',idempotencyKey:'refund-bank',lines:[{userId:'refund',bucket:'wallet',amount:-9500n,reason:'Test bank transfer'},{userId:'refund',bucket:'bank',amount:9500n,reason:'Test bank transfer'}]});await new PrismaWagerEscrow(tx,ledger).reserve({guildId:'casino',userId:'refund',amount:1000n,referenceType:'test',referenceId:'refund',key:'refund-reserve'});return{ok:true}});
   const results=await Promise.allSettled(['refund-a','refund-b'].map(key=>atomic.run('casino',key,key,async(tx,ledger)=>{await new PrismaWagerEscrow(tx,ledger).refund('casino','test','refund',key);return{ok:true}})));assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal((await account('refund')).wallet,500n);assert.equal((await account('refund')).bank,9500n);
  });
  await t.test('all financial movements remain balanced and leave no negative accounts',async()=>{const totals=new Map();for(const line of await db.ledgerEntry.findMany())totals.set(line.transactionId,(totals.get(line.transactionId)??0n)+line.amount);for(const value of totals.values())assert.equal(value,0n);assert.equal(await db.economyAccount.count({where:{OR:[{wallet:{lt:0n}},{bank:{lt:0n}}]}}),0);assert.equal(await db.escrow.count({where:{state:'RESERVED'}}),0);});
 }finally{assert.match(schema,/^aj_casino_test_[0-9a-f]{32}$/);try{if(connected)await db.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);}finally{await db.$disconnect();}}
});
