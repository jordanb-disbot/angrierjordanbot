import {readFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {PrismaClient} from '@prisma/client';
import {ItemService} from '../../.test-build/packages/features-economy/src/items-service.js';
import {PrismaItemRepository} from '../../.test-build/packages/features-economy/src/items-prisma.js';
import {PrismaEconomyRepository} from '../../.test-build/packages/features-economy/src/prisma-repository.js';
import {PrismaAtomicOperations} from '../../.test-build/packages/database/src/atomic-operations.js';
const require=createRequire(import.meta.url);
const testEnv=parseEnv(readFileSync(new URL('../../.env.test.local',import.meta.url),'utf8'));
const base=testEnv.TEST_DATABASE_URL;
if(!base)throw new Error('TEST_DATABASE_URL is required. Use a disposable PostgreSQL database; this suite creates and drops only its own aj_items_test_* schema.');
const schema='aj_items_test_'+randomUUID().replaceAll('-','');
const url=new URL(base);url.searchParams.set('schema',schema);
const db=new PrismaClient({datasourceUrl:url.toString()});
const policy={bonusSlots:2,buybackPercent:50,repairs:{cheap:{cost:25n,min:10,max:25},standard:{cost:75n,min:25,max:55},premium:{cost:150n,min:50,max:100}}};
const context=(key,userId='a')=>({guildId:'g',userId,requestKey:key});
test('Phase 09 PostgreSQL transactions and restart recovery',async t=>{
 try{
  const migrate=spawnSync(process.execPath,[require.resolve('prisma/build/index.js'),'migrate','deploy','--schema','packages/database/prisma/schema.prisma'],{env:{...process.env,DATABASE_URL:url.toString()},encoding:'utf8'});
  assert.equal(migrate.status,0,`Migration failed: ${migrate.stderr.replaceAll(url.toString(),'[redacted]').replaceAll(base,'[redacted]')}`);
  await db.guild.create({data:{id:'g',name:'Test Chairs'}});
  const economy=new PrismaEconomyRepository(db);
  for(const userId of ['a','b'])await economy.grantStarter({guildId:'g',userId,amount:500n,idempotencyKey:'starter:'+userId,now:new Date()});
  const svc=new ItemService(new PrismaItemRepository(db),policy);
  await t.test('simultaneous buys reserve money and grant items exactly once per receipt',async()=>{
   const results=await Promise.allSettled(Array.from({length:16},()=>svc.buy(context('one'),'material.wood',1)));
   assert.ok(results.some(r=>r.status==='fulfilled'));
   const account=await db.economyAccount.findUniqueOrThrow({where:{guildId_userId:{guildId:'g',userId:'a'}}});assert.equal(account.wallet,450n);
   const owned=await db.inventoryEntry.findUniqueOrThrow({where:{guildId_userId_itemId:{guildId:'g',userId:'a',itemId:'material.wood'}}});assert.equal(owned.quantity,1);
   const restarted=new ItemService(new PrismaItemRepository(db),policy);await restarted.buy(context('one'),'material.wood',1);
   assert.equal((await db.economyAccount.findUniqueOrThrow({where:{guildId_userId:{guildId:'g',userId:'a'}}})).wallet,450n);
  });
  await t.test('concurrent distinct purchases never overdraw funds',async()=>{
   await Promise.allSettled(Array.from({length:24},(_,i)=>svc.buy(context('spend'+i),'material.fabric',1)));
   const a=await db.economyAccount.findUniqueOrThrow({where:{guildId_userId:{guildId:'g',userId:'a'}}});assert.ok(a.wallet>=0n&&a.bank>=0n);
   const owned=await db.inventoryEntry.findUnique({where:{guildId_userId_itemId:{guildId:'g',userId:'a',itemId:'material.fabric'}}});assert.equal(500n-a.wallet,50n+BigInt(owned?.quantity??0)*50n);
  });
  await t.test('sale and gift racing over one item cannot both consume it',async()=>{
   const s=await svc.view('g','a'),id=s.members[0].stacks.find(x=>x.itemId==='material.wood').id,q=svc.sale(s,'a','item',id);
   const results=await Promise.allSettled([svc.sell(context('sale'),'item',q.token,id),svc.gift(context('gift'),'b',id,1)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
   assert.equal((await db.inventoryEntry.findUniqueOrThrow({where:{id}})).quantity,0);
  });
  await t.test('failure after ledger write rolls back ledger, account and receipt',async()=>{
   const before=await db.economyAccount.findUniqueOrThrow({where:{guildId_userId:{guildId:'g',userId:'b'}}});
   await assert.rejects(()=>new PrismaAtomicOperations(db).run('g','fail','fingerprint',async(tx,ledger)=>{await ledger.apply({guildId:'g',idempotencyKey:'fail-ledger',lines:[{userId:'b',bucket:'wallet',amount:10n,reason:'test'},{bucket:'system',amount:-10n,reason:'test'}]});throw new Error('injected failure');}));
   assert.equal((await db.economyAccount.findUniqueOrThrow({where:{guildId_userId:{guildId:'g',userId:'b'}}})).wallet,before.wallet);
   assert.equal(await db.economyTransaction.findUnique({where:{idempotencyKey:'fail-ledger'}}),null);
   assert.equal(await db.operationReceipt.findUnique({where:{guildId_key:{guildId:'g',key:'fail'}}}),null);
  });
  await t.test('ledger is balanced after all concurrent transactions',async()=>{const lines=await db.ledgerEntry.findMany({where:{guildId:'g'}});const totals=new Map();for(const l of lines)totals.set(l.transactionId,(totals.get(l.transactionId)??0n)+l.amount);for(const n of totals.values())assert.equal(n,0n);});
 }finally{
  // The target identifier is generated here, never supplied by the connection string or caller.
  assert.match(schema,/^aj_items_test_[0-9a-f]{32}$/);
  await db.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await db.$disconnect();
 }
});
