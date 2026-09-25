import {readFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {PrismaClient} from '@prisma/client';
import {LedgerEngine} from '../../.test-build/packages/core/src/ledger.js';
import {PrismaAtomicOperations,TransactionLedgerRepository} from '../../.test-build/packages/database/src/atomic-operations.js';
import {PrismaWalletHolds} from '../../.test-build/packages/database/src/wallet-holds.js';
import {PrismaWagerEscrow} from '../../.test-build/packages/database/src/wager-escrow.js';
import {PrismaEconomyRepository} from '../../.test-build/packages/features-economy/src/prisma-repository.js';
const require=createRequire(import.meta.url);
const base=parseEnv(readFileSync(new URL('../../.env.test.local',import.meta.url),'utf8')).TEST_DATABASE_URL;
if(!base)throw new Error('TEST_DATABASE_URL is required from ignored .env.test.local.');
const schema='aj_wallet_holds_test_'+randomUUID().replaceAll('-',''),url=new URL(base);url.searchParams.set('schema',schema);
const db=new PrismaClient({datasourceUrl:url.toString()}),atomic=new PrismaAtomicOperations(db),economy=new PrismaEconomyRepository(db);
const account=userId=>db.economyAccount.findUniqueOrThrow({where:{guildId_userId:{guildId:'g',userId}}});
const scope=(userId,referenceId)=>({guildId:'g',userId,referenceType:'test',referenceId});
const reserve=(reference,amount,key=randomUUID())=>atomic.run('g',key,key,async tx=>{const hold=await new PrismaWalletHolds(tx).reserve({...reference,amount});return{state:hold.state,amount:hold.amount.toString()};});
const release=(reference,key=randomUUID())=>atomic.run('g',key,key,async tx=>{const hold=await new PrismaWalletHolds(tx).release(reference);return{state:hold.state};});
const debit=(userId,amount,key=randomUUID())=>atomic.run('g',key,key,async(_,ledger)=>{await ledger.apply({guildId:'g',idempotencyKey:'debit:'+key,lines:[{userId,bucket:'wallet',amount:-amount,reason:'test debit'},{bucket:'system',amount,reason:'test debit'}]});return{paid:amount.toString()};});
async function seed(userId,wallet=100n,bank=0n){
  await economy.grantStarter({guildId:'g',userId,amount:wallet,idempotencyKey:'seed:'+userId,now:new Date()});
  if(bank)await new LedgerEngine(economy).apply({guildId:'g',idempotencyKey:'bank-seed:'+userId,lines:[{userId,bucket:'bank',amount:bank,reason:'test bank seed'},{bucket:'system',amount:-bank,reason:'test bank seed'}]});
}

test('durable wallet holds preserve full restitution across every spending path',async t=>{
  let connected=false;
  try{
    await db.$connect();connected=true;
    const migrated=spawnSync(process.execPath,[require.resolve('prisma/build/index.js'),'migrate','deploy','--schema','packages/database/prisma/schema.prisma'],{env:{...process.env,DATABASE_URL:url.toString()},encoding:'utf8'});
    assert.equal(migrated.status,0,'Migration failed in isolated wallet-hold test schema.');
    await db.guild.create({data:{id:'g',name:'Wallet holds test Chairs'}});
    await t.test('hold helper rejects a full client to prevent accidental multi-transaction writes',async()=>{
      assert.throws(()=>new PrismaWalletHolds(db),{code:'WALLET_HOLD_TRANSACTION_REQUIRED'});
    });
    await t.test('credit and hold commit together, preserve wallet display and block spending stolen funds',async()=>{
      await seed('victim',200n,75n);await seed('robber',10n,50n);
      await atomic.run('g','robbery','robbery',async(tx,ledger)=>{
        await ledger.apply({guildId:'g',idempotencyKey:'robbery:transfer',lines:[{userId:'victim',bucket:'wallet',amount:-80n,reason:'test robbery'},{userId:'robber',bucket:'wallet',amount:80n,reason:'test robbery'}]});
        await new PrismaWalletHolds(tx).reserve({...scope('robber','incident'),amount:80n});return{stolen:'80'};
      });
      const robber=await account('robber');assert.equal(robber.wallet,90n);assert.equal(robber.reservedWallet,80n);assert.equal((await account('victim')).bank,75n);
      await assert.rejects(debit('robber',11n),{code:'WALLET_FUNDS_HELD'});
      assert.equal((await account('robber')).wallet,90n);
    });
    await t.test('wager funding uses only spendable wallet then bank while the hold remains intact',async()=>{
      await atomic.run('g','wager','wager',async(tx,ledger)=>{await new PrismaWagerEscrow(tx,ledger).reserve({guildId:'g',userId:'robber',amount:25n,referenceType:'test',referenceId:'wager',key:'hold-wager'});return{reserved:true};});
      const result=await account('robber');assert.equal(result.wallet,80n);assert.equal(result.reservedWallet,80n);assert.equal(result.bank,35n);
      const wager=await db.escrow.findUniqueOrThrow({where:{idempotencyKey:'hold-wager'}});assert.equal(wager.walletAmount,10n);assert.equal(wager.bankAmount,15n);
    });
    await t.test('release and full reversal are one idempotent transaction, including restart retries',async()=>{
      const reverse=()=>new PrismaAtomicOperations(db).run('g','reverse','reverse',async(tx,ledger)=>{
        await new PrismaWalletHolds(tx).release(scope('robber','incident'));
        await ledger.apply({guildId:'g',idempotencyKey:'reverse:transfer',lines:[{userId:'robber',bucket:'wallet',amount:-80n,reason:'test restitution'},{userId:'victim',bucket:'wallet',amount:80n,reason:'test restitution'}]});return{returned:'80'};
      });
      await reverse();await reverse();
      assert.equal((await account('victim')).wallet,200n);assert.equal((await account('victim')).bank,75n);
      const robber=await account('robber');assert.equal(robber.wallet,0n);assert.equal(robber.reservedWallet,0n);
      assert.equal((await reserve(scope('robber','incident'),80n)).state,'RELEASED');assert.equal((await account('robber')).reservedWallet,0n);
    });
    await t.test('reference amount, server and owner are immutable; released requests do not resurrect holds',async()=>{
      await assert.rejects(reserve(scope('robber','incident'),81n),{code:'WALLET_HOLD_MISMATCH'});
      await assert.rejects(release({...scope('robber','incident'),userId:'victim'}),{code:'WALLET_HOLD_NOT_FOUND'});
      await assert.rejects(release({...scope('robber','incident'),guildId:'other'}),{code:'WALLET_HOLD_NOT_FOUND'});
      const before=(await account('robber')).version;await release(scope('robber','incident'));assert.equal((await account('robber')).version,before);
    });
    await t.test('simultaneous duplicate holds reserve once and concurrent distinct holds never overreserve',async()=>{
      await seed('duplicates');const ref=scope('duplicates','same');
      await Promise.all(Array.from({length:6},()=>reserve(ref,60n)));
      assert.equal((await account('duplicates')).reservedWallet,60n);
      assert.equal(await db.walletHold.count({where:{guildId:'g',userId:'duplicates'}}),1);
      const attempts=await Promise.allSettled([reserve(scope('duplicates','extra-a'),30n),reserve(scope('duplicates','extra-b'),30n)]);
      assert.equal(attempts.filter(result=>result.status==='fulfilled').length,1);assert.equal((await account('duplicates')).reservedWallet,90n);
    });
    await t.test('a wallet debit racing a hold cannot consume the same available funds twice',async()=>{
      await seed('race');const result=await Promise.allSettled([reserve(scope('race','race'),80n),debit('race',80n)]);
      assert.equal(result.filter(item=>item.status==='fulfilled').length,1);const current=await account('race');assert.ok(current.wallet>=current.reservedWallet);
    });
    await t.test('failure after hold creation rolls back aggregate, row and receipt',async()=>{
      await seed('failure');const before=await account('failure');
      await assert.rejects(atomic.run('g','failed-hold','failed-hold',async tx=>{await new PrismaWalletHolds(tx).reserve({...scope('failure','failed'),amount:50n});throw new Error('injected hold failure');}));
      assert.deepEqual(await account('failure'),before);assert.equal(await db.walletHold.count({where:{userId:'failure'}}),0);
      assert.equal(await db.operationReceipt.findUnique({where:{guildId_key:{guildId:'g',key:'failed-hold'}}}),null);
    });
    await t.test('failure after release and attempted reversal restores the active hold and balances',async()=>{
      await seed('release-failure');const ref=scope('release-failure','active');await reserve(ref,80n);const before=await account('release-failure');
      await assert.rejects(atomic.run('g','failed-release','failed-release',async(tx,ledger)=>{
        await new PrismaWalletHolds(tx).release(ref);await ledger.apply({guildId:'g',idempotencyKey:'failed-release:debit',lines:[{userId:'release-failure',bucket:'wallet',amount:-80n,reason:'reversal'},{bucket:'system',amount:80n,reason:'reversal'}]});throw new Error('injected reversal failure');
      }));
      assert.deepEqual(await account('release-failure'),before);assert.equal((await db.walletHold.findUniqueOrThrow({where:{guildId_userId_referenceType_referenceId:ref}})).state,'ACTIVE');
    });
    await t.test('both Prisma adapters independently reject held debits and the database enforces aggregate bounds',async()=>{
      await seed('adapters');await reserve(scope('adapters','held'),80n);const row=await account('adapters');
      const input={guildId:'g',idempotencyKey:'adapter-bypass',lines:[{userId:'adapters',bucket:'wallet',amount:-50n,reason:'test'},{bucket:'system',amount:50n,reason:'test'}]};
      await assert.rejects(economy.commit(input,new Map([['adapters',row.version]])),{code:'WALLET_FUNDS_HELD'});
      await assert.rejects(db.$transaction(tx=>new TransactionLedgerRepository(tx).commit(input,new Map([['adapters',row.version]]))),{code:'WALLET_FUNDS_HELD'});
      await assert.rejects(db.economyAccount.update({where:{guildId_userId:{guildId:'g',userId:'adapters'}},data:{wallet:{decrement:50n}}}));
      assert.deepEqual(await account('adapters'),row);
    });
    await t.test('non-ledger fines and bank upgrades cannot spend held money',async()=>{
      await seed('fines',100n,50n);await reserve(scope('fines','held'),80n);
      const fine=await economy.commitActivity({guildId:'g',userId:'fines',activity:'work',outcome:'fine',idempotencyKey:'held-fine',reason:'fine',now:new Date(),technicalThrottleMs:0,requestedDelta:-500n});
      assert.equal(fine.account.wallet,80n);assert.equal(fine.account.bank,0n);assert.equal(fine.event.ottomansDelta,-70n);
      await seed('upgrade',100n,50n);await reserve(scope('upgrade','held'),80n);
      const upgraded=await economy.commitBankUpgrade({guildId:'g',userId:'upgrade',idempotencyKey:'held-upgrade',currentRule:{tier:1,cap:50n,upgradeCost:40n},nextRule:{tier:2,cap:100n,upgradeCost:80n},reason:'upgrade',now:new Date()});
      assert.equal(upgraded.wallet,80n);assert.equal(upgraded.bank,30n);assert.equal(upgraded.reservedWallet,80n);
    });
    await t.test('aggregate equals active per-reference holds and every ledger transaction remains balanced',async()=>{
      for(const row of await db.economyAccount.findMany({where:{guildId:'g'}})){
        const holds=await db.walletHold.findMany({where:{guildId:'g',userId:row.userId,state:'ACTIVE'}});assert.equal(row.reservedWallet,holds.reduce((sum,hold)=>sum+hold.amount,0n));
      }
      const totals=new Map();for(const line of await db.ledgerEntry.findMany({where:{guildId:'g'}}))totals.set(line.transactionId,(totals.get(line.transactionId)??0n)+line.amount);
      for(const total of totals.values())assert.equal(total,0n);
    });
  }finally{
    assert.match(schema,/^aj_wallet_holds_test_[0-9a-f]{32}$/);
    try{if(connected)await db.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);}finally{await db.$disconnect();}
  }
});
