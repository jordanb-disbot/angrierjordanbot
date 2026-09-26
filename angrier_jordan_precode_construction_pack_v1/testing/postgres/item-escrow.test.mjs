import {readFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';
import {PrismaClient} from '@prisma/client';
import {PrismaAtomicOperations} from '../../.test-build/packages/database/src/atomic-operations.js';
import {PrismaItemEscrow} from '../../.test-build/packages/database/src/item-escrow.js';
import {PrismaWagerEscrow} from '../../.test-build/packages/database/src/wager-escrow.js';

const require=createRequire(import.meta.url),secret=parseEnv(readFileSync(new URL('../../.env.test.local',import.meta.url),'utf8')).TEST_DATABASE_URL;
if(!secret)throw Error('Dedicated TEST_DATABASE_URL is required.');
const schema='aj_item_escrow_test_'+randomUUID().replaceAll('-',''),url=new URL(secret);url.searchParams.set('schema',schema);
const db=new PrismaClient({datasourceUrl:url.toString()}),atomic=new PrismaAtomicOperations(db);
const scope=(userId,referenceId,quantity=1)=>({guildId:'items',userId,itemId:'ring',quantity,referenceType:'proposal',referenceId,key:'reserve:'+referenceId+':'+userId});
const reserve=(input,key=randomUUID())=>atomic.run('items',key,key,async tx=>{const row=await new PrismaItemEscrow(tx).reserve(input);return{id:row.id,state:row.state};});
const finish=(id,outcome,key=randomUUID(),client=db)=>new PrismaAtomicOperations(client).run('items',key,key,async tx=>{const row=await new PrismaItemEscrow(tx).finish('items',id,outcome);return{state:row.state};});
const inventory=userId=>db.inventoryEntry.findUniqueOrThrow({where:{guildId_userId_itemId:{guildId:'items',userId,itemId:'ring'}}});
const account=userId=>db.economyAccount.findUniqueOrThrow({where:{guildId_userId:{guildId:'items',userId}}});
async function seed(userId,quantity=5){await db.member.create({data:{guildId:'items',userId}});await db.economyAccount.create({data:{guildId:'items',userId,wallet:40n,bank:60n}});await db.inventoryEntry.create({data:{guildId:'items',userId,itemId:'ring',quantity}});}
const constraintFailure=error=>error.code==='P2010'&&error.meta?.code==='23514';

test('typed inventory escrow, monetary separation and transactional recovery',async t=>{
 let connected=false;
 try{
  await db.$connect();connected=true;
  const migrated=spawnSync(process.execPath,[require.resolve('prisma/build/index.js'),'migrate','deploy','--schema','packages/database/prisma/schema.prisma'],{env:{...process.env,DATABASE_URL:url.toString()},encoding:'utf8'});
  assert.equal(migrated.status,0,'Disposable schema migrations must succeed.');
  await db.guild.create({data:{id:'items',name:'Test Chairs'}});await db.catalogItem.create({data:{id:'ring',type:'family',name:'Ring',rarity:'rare',enabled:true}});

  await t.test('forward migration preserves funded legacy rows and rejects ambiguous rows before any schema change',async()=>{
   const migration=readFileSync(new URL('../../packages/database/prisma/migrations/0020_typed_item_escrow/migration.sql',import.meta.url),'utf8');
   const preflight=migration.match(/DO \$\$[\s\S]*?END \$\$;/)?.[0];assert.ok(preflight);
   const column=migration.match(/ALTER TABLE "Escrow" ADD COLUMN[^;]+;/)?.[0],constraint=migration.match(/ALTER TABLE "Escrow" ADD CONSTRAINT[\s\S]*?\n\);/)?.[0];assert.ok(column&&constraint);
   const legacy=schema+'_legacy';await db.$executeRawUnsafe('CREATE SCHEMA "'+legacy+'"');
   try{
    await db.$executeRawUnsafe('CREATE TABLE "'+legacy+'"."Escrow" ("id" TEXT PRIMARY KEY,"kind" TEXT NOT NULL,"ownerUserId" TEXT,"amount" BIGINT,"walletAmount" BIGINT NOT NULL DEFAULT 0,"bankAmount" BIGINT NOT NULL DEFAULT 0,"itemRef" TEXT,CONSTRAINT "Escrow_amount_bounds" CHECK ("walletAmount">=0 AND "bankAmount">=0 AND ("amount" IS NULL OR ("amount">=0 AND "walletAmount"+"bankAmount"="amount"))))');
    await db.$executeRawUnsafe('INSERT INTO "'+legacy+'"."Escrow" VALUES (\'money\',\'OTTOMANS\',\'member\',100,40,60,NULL),(\'ambiguous\',\'ITEM\',\'member\',NULL,0,0,\'ring\')');
    const apply=()=>db.$transaction(async tx=>{await tx.$executeRawUnsafe('SET LOCAL search_path TO "'+legacy+'"');await tx.$executeRawUnsafe('LOCK TABLE "Escrow" IN ACCESS EXCLUSIVE MODE');await tx.$executeRawUnsafe(preflight);await tx.$executeRawUnsafe(column);await tx.$executeRawUnsafe(constraint);});
    await assert.rejects(apply,error=>error.code==='P2010'&&error.meta?.code==='P0001');
    assert.equal((await db.$queryRawUnsafe('SELECT count(*)::int AS n FROM information_schema.columns WHERE table_schema=$1 AND table_name=\'Escrow\' AND column_name=\'itemQuantity\'',legacy))[0].n,0);
    assert.equal((await db.$queryRawUnsafe('SELECT count(*)::int AS n FROM "'+legacy+'"."Escrow"'))[0].n,2);
    // Only the disposable fixture removes its deliberately ambiguous row; production migration never does.
    await db.$executeRawUnsafe('DELETE FROM "'+legacy+'"."Escrow" WHERE "id"=\'ambiguous\'');await apply();
    const [money]=await db.$queryRawUnsafe('SELECT * FROM "'+legacy+'"."Escrow"');assert.deepEqual(money,{id:'money',kind:'OTTOMANS',ownerUserId:'member',amount:100n,walletAmount:40n,bankAmount:60n,itemRef:null,itemQuantity:null});
   }finally{await db.$executeRawUnsafe('DROP SCHEMA "'+legacy+'" CASCADE');}
  });
  await t.test('reserves explicit inventory quantity without touching money',async()=>{
   await seed('reserve');const result=await reserve(scope('reserve','quantity',3)),row=await db.escrow.findUniqueOrThrow({where:{id:result.id}});
   assert.equal((await inventory('reserve')).quantity,2);assert.equal(row.amount,null);assert.equal(row.itemQuantity,3);assert.equal(row.walletAmount,0n);assert.equal(row.bankAmount,0n);assert.equal((await account('reserve')).wallet,40n);assert.equal(await db.economyTransaction.count(),0);
  });
  await t.test('insufficient, individually locked and category-locked inventory do not create reservations',async()=>{
   await seed('insufficient',1);await assert.rejects(reserve(scope('insufficient','short',2)),{code:'ITEM_ESCROW_INVENTORY'});
   await db.inventoryEntry.updateMany({where:{userId:'insufficient'},data:{locked:true}});await assert.rejects(reserve(scope('insufficient','locked')),{code:'ITEM_ESCROW_INVENTORY'});
   await db.inventoryEntry.updateMany({where:{userId:'insufficient'},data:{locked:false}});await db.inventoryCategoryLock.create({data:{guildId:'items',userId:'insufficient',category:'family'}});
   await assert.rejects(reserve(scope('insufficient','category')),{code:'ITEM_ESCROW_UNAVAILABLE'});assert.equal((await inventory('insufficient')).quantity,1);assert.equal(await db.escrow.count({where:{ownerUserId:'insufficient'}}),0);
  });
  await t.test('duplicate reservation keys replay once and reject changed ownership, quantity or reference',async()=>{
   await seed('replay');const input=scope('replay','same',2),first=await reserve(input);assert.equal((await reserve(input)).id,first.id);
   for(const change of [{quantity:1},{userId:'reserve'},{guildId:'other'},{referenceId:'other'},{referenceType:'other'}])await assert.rejects(reserve({...input,...change}),{code:'REPLAY_MISMATCH'});
   assert.equal((await inventory('replay')).quantity,3);assert.equal(await db.escrow.count({where:{idempotencyKey:input.key}}),1);
  });
  await t.test('restart recovery refunds outstanding quantity exactly once and cannot resurrect finalized escrow',async()=>{
   await seed('refund');const input=scope('refund','restart',3),first=await reserve(input),restarted=new PrismaClient({datasourceUrl:url.toString()});
   try{await finish(first.id,'REFUNDED','restart-refund',restarted);await finish(first.id,'REFUNDED','repeat-refund',restarted);}finally{await restarted.$disconnect();}
   assert.equal((await inventory('refund')).quantity,5);assert.equal((await reserve(input)).state,'REFUNDED');assert.equal((await inventory('refund')).quantity,5);await assert.rejects(finish(first.id,'SETTLED'),{code:'ESCROW_FINAL'});
  });
  await t.test('consumption survives replay without refunding inventory',async()=>{
   await seed('consume');const row=await reserve(scope('consume','consume',2));await finish(row.id,'SETTLED');await finish(row.id,'SETTLED');assert.equal((await inventory('consume')).quantity,3);await assert.rejects(finish(row.id,'REFUNDED'),{code:'ESCROW_FINAL'});
  });
  await t.test('concurrent duplicate requests reserve once and distinct attempts never overdraw',async()=>{
   await seed('parallel',1);const input=scope('parallel','duplicate');const values=await Promise.all(Array.from({length:4},()=>reserve(input)));assert.equal(new Set(values.map(r=>r.id)).size,1);assert.equal((await inventory('parallel')).quantity,0);
   await seed('competing',1);const outcomes=await Promise.allSettled([reserve(scope('competing','a')),reserve(scope('competing','b'))]);assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,1);assert.equal((await inventory('competing')).quantity,0);assert.equal(await db.escrow.count({where:{ownerUserId:'competing'}}),1);
  });
  await t.test('refund and consumption racing have one final outcome and no double return',async()=>{
   await seed('finish-race',1);const row=await reserve(scope('finish-race','finish-race')),outcomes=await Promise.allSettled([finish(row.id,'SETTLED'),finish(row.id,'REFUNDED')]);assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,1);const final=await db.escrow.findUniqueOrThrow({where:{id:row.id}});assert.equal((await inventory('finish-race')).quantity,final.state==='REFUNDED'?1:0);
  });
  await t.test('monetary reserve and exact-source refunds retain wallet/bank accounting',async()=>{
   await seed('money');await atomic.run('items','money-reserve','money-reserve',async(tx,ledger)=>{await new PrismaWagerEscrow(tx,ledger).reserve({guildId:'items',userId:'money',amount:70n,referenceType:'bid',referenceId:'money',key:'money'});return{ok:true};});
   const row=await db.escrow.findUniqueOrThrow({where:{idempotencyKey:'money'}});assert.equal(row.walletAmount,40n);assert.equal(row.bankAmount,30n);assert.equal(row.itemQuantity,null);assert.equal(row.itemRef,null);assert.equal((await account('money')).wallet,0n);assert.equal((await account('money')).bank,30n);
   await atomic.run('items','money-refund','money-refund',async(tx,ledger)=>{await new PrismaWagerEscrow(tx,ledger).refund('items','bid','money','money-refund');return{ok:true};});assert.equal((await account('money')).wallet,40n);assert.equal((await account('money')).bank,60n);
  });
  await t.test('database rejects mixed, missing, negative and unknown asset representations',async()=>{
   const invalid=[['ITEM',1n,1n,0n,'ring',1],['ITEM',null,1n,0n,'ring',1],['ITEM',null,0n,0n,'ring',null],['ITEM',null,0n,0n,'ring',0],['ITEM',null,0n,0n,null,1],['OTTOMANS',1n,1n,0n,'ring',null],['OTTOMANS',1n,1n,0n,null,1],['OTTOMANS',null,0n,0n,null,null],['OTTOMANS',2n,1n,0n,null,null],['OTTOMANS',-1n,-1n,0n,null,null],['UNKNOWN',null,0n,0n,null,null]];
   for(const[kind,amount,wallet,bank,itemRef,quantity]of invalid){const id=randomUUID();await assert.rejects(db.$executeRawUnsafe('INSERT INTO "Escrow" ("id","guildId","ownerUserId","kind","amount","walletAmount","bankAmount","itemRef","itemQuantity","referenceType","referenceId","idempotencyKey") VALUES ($1,\'items\',\'money\',$2,$3,$4,$5,$6,$7,\'invalid\',$1,$1)',id,kind,amount,wallet,bank,itemRef,quantity),constraintFailure);}
   assert.equal(await db.escrow.count({where:{referenceType:'invalid'}}),0);
  });
  await t.test('item and monetary adapters reject the other asset kind before changing state',async()=>{
   await seed('typed');const item=await reserve(scope('typed','typed'));
   await assert.rejects(atomic.run('items','wrong-money','wrong-money',async(tx,ledger)=>{await new PrismaWagerEscrow(tx,ledger).refund('items','proposal','typed','wrong-money');return{};}),{code:'ESCROW_ASSET_CONTRACT'});
   const money=await db.escrow.findUniqueOrThrow({where:{idempotencyKey:'money'}});await assert.rejects(finish(money.id,'REFUNDED'),{code:'ESCROW_ASSET_CONTRACT'});assert.equal((await db.escrow.findUniqueOrThrow({where:{id:item.id}})).state,'RESERVED');
  });
  await t.test('auction item consumption and bid payout roll back together, then retry and settle once',async()=>{
   await seed('winner',1);await seed('seller');await atomic.run('items','auction-reserve','auction-reserve',async(tx,ledger)=>{await new PrismaWagerEscrow(tx,ledger).reserve({guildId:'items',userId:'winner',amount:50n,referenceType:'auction_bid',referenceId:'auction',key:'auction-bid'});return{};});
   const close=(fail,key)=>atomic.run('items',key,key,async(tx,ledger)=>{const item=await new PrismaItemEscrow(tx).reserve(scope('winner','auction-proposal'));await new PrismaItemEscrow(tx).finish('items',item.id,'SETTLED');await new PrismaWagerEscrow(tx,ledger).settle('items','auction_bid','auction',new Map([['seller',50n]]),'auction-payout');if(fail)throw Error('Simulated interrupted close');return{ok:true};});
   await assert.rejects(close(true,'failed-close'),/Simulated interrupted close/);assert.equal((await inventory('winner')).quantity,1);assert.equal((await account('seller')).wallet,40n);assert.equal((await db.escrow.findUniqueOrThrow({where:{idempotencyKey:'auction-bid'}})).state,'RESERVED');
   await close(false,'successful-close');await close(false,'successful-close');assert.equal((await inventory('winner')).quantity,0);assert.equal((await account('seller')).wallet,90n);assert.equal((await account('winner')).wallet,0n);assert.equal((await account('winner')).bank,50n);
  });
 }finally{assert.match(schema,/^aj_item_escrow_test_[0-9a-f]{32}$/);try{if(connected)await db.$executeRawUnsafe('DROP SCHEMA IF EXISTS "'+schema+'" CASCADE');}finally{await db.$disconnect();}}
});
