import {randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
import {productionTarget,GUILD} from './audit-production-race-line.mjs';

export const NOT_JORDAN='1432212068785721424';
export const RING='family.ring';
export const FAMILY_IDS=['family.ring','family.blessing','family.wedding_sack'];
export const GRANT_KEY=`operator:production-economy-items:${GUILD}:${NOT_JORDAN}:ring-1-ottomans-25000:v1`;
const check=(ok,code)=>{if(!ok)throw Error(code);};

function bankReady(tiers,bps,cap){
 return Array.isArray(tiers)&&tiers.length===5&&tiers.every((row,index)=>row&&row.tier===index+1&&Number.isSafeInteger(row.upgrade_cost)&&row.upgrade_cost>=0&&row.upgrade_cost<=10_000_000&&(index===4?row.cap===null:Number.isSafeInteger(row.cap)&&row.cap>0&&(index===0||row.cap>tiers[index-1].cap)))&&Number.isSafeInteger(bps)&&bps>=0&&bps<=500&&Number.isSafeInteger(cap)&&cap>=0&&cap<=1_000_000;
}

export async function enableProductionEconomyItems({db,config,get,atomic,grantCatalogReward,ensureFamilyCatalog,familyCatalogItems,write=console.log}){
 const familyItems=familyCatalogItems.filter(item=>FAMILY_IDS.includes(item.id));
 check(await db.guild.findUnique({where:{id:GUILD},select:{id:true}}),'PRODUCTION_GUILD_MISSING');
 check(config.definition('features.items')?.type==='boolean'&&!config.definition('features.economy')&&!config.definition('features.bank'),'CANONICAL_FEATURE_SCHEMA_MISMATCH');
 const tiers=await config.getWithMetadata(GUILD,'economy.bank_tiers'),bps=await config.getWithMetadata(GUILD,'economy.bank_tier5_interest_bps'),cap=await config.getWithMetadata(GUILD,'economy.bank_tier5_interest_cap');
 check(bankReady(tiers.value,bps.value,cap.value),'BANK_CONFIG_INVALID');
 const member=await get(`/guilds/${GUILD}/members/${NOT_JORDAN}`);
 check(member?.user?.id===NOT_JORDAN&&member.user.bot!==true,'NOT_JORDAN_MEMBER_INVALID');
 const existingLock=await db.inventoryCategoryLock.findUnique({where:{guildId_userId_category:{guildId:GUILD,userId:NOT_JORDAN,category:'family'}}});
 check(!existingLock,'FAMILY_INVENTORY_CATEGORY_LOCKED');
 const feature=await config.getWithMetadata(GUILD,'features.items');
 check(typeof feature.value==='boolean','ITEMS_FEATURE_INVALID');
 check(familyItems.length===3&&isDeepStrictEqual(familyItems.map(item=>item.id),FAMILY_IDS),'FAMILY_CATALOG_SOURCE_INVALID');
 const catalogBefore=await Promise.all(familyItems.map(item=>db.catalogItem.findUnique({where:{id:item.id}})));
 for(let index=0;index<familyItems.length;index++){
  const row=catalogBefore[index],definition=familyItems[index];
  if(row)check(row.name===definition.name&&row.type===definition.type&&row.rarity===definition.rarity&&row.enabled===true&&row.giftable===definition.giftable&&row.sellValue===BigInt(definition.sellValue)&&row.buyPrice!==null&&row.buyPrice>=0n&&row.metadata?.inheritable===definition.metadata.inheritable&&row.metadata?.consumable===definition.metadata.consumable,'FAMILY_CATALOG_EXISTING_ROW_INVALID');
 }
 await ensureFamilyCatalog(db);
 const catalogAfter=await Promise.all(familyItems.map(item=>db.catalogItem.findUnique({where:{id:item.id}})));
 for(let index=0;index<familyItems.length;index++){
  const row=catalogAfter[index],before=catalogBefore[index],definition=familyItems[index];
  check(row?.id===definition.id,'FAMILY_CATALOG_ENSURE_FAILED');
  if(before)check(isDeepStrictEqual(row,before),'FAMILY_CATALOG_EXISTING_ROW_CHANGED');
  else check(row.name===definition.name&&row.type===definition.type&&row.rarity===definition.rarity&&row.buyPrice===BigInt(definition.buyPrice)&&row.sellValue===BigInt(definition.sellValue)&&row.enabled===definition.enabled&&row.giftable===definition.giftable&&isDeepStrictEqual(row.metadata,definition.metadata),'FAMILY_CATALOG_ENSURE_FAILED');
 }
 if(feature.value!==true)await config.set({guildId:GUILD,key:'features.items',value:true,expectedVersion:feature.version,source:'operator.production-economy-items-enablement',requestId:randomUUID()});
 check((await config.getWithMetadata(GUILD,'features.items')).value===true,'ITEMS_FEATURE_VERIFY_FAILED');

 const result=await atomic.run(GUILD,GRANT_KEY,'ring-1-ottomans-25000:v1',async(tx,ledger)=>{
  const currentCatalog=await tx.catalogItem.findUnique({where:{id:RING}});
  check(currentCatalog?.id===RING,'FAMILY_RING_CATALOG_MISSING');
  check(currentCatalog.type==='family'&&currentCatalog.enabled===true,'FAMILY_RING_CATALOG_DISABLED_OR_INVALID');
  check(!await tx.inventoryCategoryLock.findUnique({where:{guildId_userId_category:{guildId:GUILD,userId:NOT_JORDAN,category:'family'}}}),'FAMILY_INVENTORY_CATEGORY_LOCKED');
  await tx.member.upsert({where:{guildId_userId:{guildId:GUILD,userId:NOT_JORDAN}},create:{guildId:GUILD,userId:NOT_JORDAN},update:{}});
  const prior=await tx.economyAccount.findUnique({where:{guildId_userId:{guildId:GUILD,userId:NOT_JORDAN}}});
  const priorRing=await tx.inventoryEntry.findUnique({where:{guildId_userId_itemId:{guildId:GUILD,userId:NOT_JORDAN,itemId:RING}}});
  const balanceBefore=(prior?.wallet??0n)+(prior?.bank??0n);
  check(await ledger.apply({guildId:GUILD,idempotencyKey:GRANT_KEY+':ledger',lines:[{userId:NOT_JORDAN,bucket:'wallet',amount:25_000n,reason:'One-time approved production Family test grant'},{bucket:'system',amount:-25_000n,reason:'One-time approved production Family test grant'}]})==='applied','OTTOMAN_GRANT_NOT_APPLIED');
  await grantCatalogReward(tx,GUILD,NOT_JORDAN,currentCatalog,1);
  const ring=await tx.inventoryEntry.update({where:{guildId_userId_itemId:{guildId:GUILD,userId:NOT_JORDAN,itemId:RING}},data:{locked:false}});
  const account=await tx.economyAccount.findUnique({where:{guildId_userId:{guildId:GUILD,userId:NOT_JORDAN}}});
  check(ring.quantity===(priorRing?.quantity??0)+1&&!ring.locked&&account?.wallet===((prior?.wallet??0n)+25_000n)&&account.bank===(prior?.bank??0n),'GRANT_VERIFY_FAILED');
  return {userId:NOT_JORDAN,ringQuantityBefore:priorRing?.quantity??0,ringQuantityAfter:ring.quantity,balanceBefore:balanceBefore.toString(),balanceAfter:(account.wallet+account.bank).toString()};
 });
 // The durable atomic receipt contains the committed grant result. A later proposal may
 // legitimately consume the ring, so replay must not require its current quantity to match.
 write('PASS: Economy configuration verified; ENABLE_ECONOMY_SMOKE=true required on worker.');
 write('PASS: Bank tiers and interest configuration verified; Bank uses the Economy worker flag.');
 write('PASS: Items/Inventory enabled (features.items=true); ENABLE_ITEMS_SMOKE=true required on worker.');
 for(let index=0;index<familyItems.length;index++)write(`PASS: ${familyItems[index].id} catalog ${catalogBefore[index]?'existing preserved':'created from source definition'}; enabled=true.`);
 write(`PASS: @NotJordan Discord user ID ${NOT_JORDAN} verified in production guild.`);
 write(`PASS: ${RING} quantity after one-time grant=${result.ringQuantityAfter}; unlocked=true.`);
 write(`PASS: Ottoman balance before=${result.balanceBefore}; after=${result.balanceAfter}; one-time grant=25000.`);
 write('PASS: existing balances and inventories were not replaced; Family data and unrelated settings were not written by this script.');
 return result;
}

export async function main(env=process.env,{connect,fetcher=fetch,write=console.log,error=console.error}={}){
 let db,stage='target';
 try{
  const target=productionTarget(env);
  check(typeof env.DISCORD_TOKEN==='string'&&env.DISCORD_TOKEN.length>0,'DISCORD_TOKEN_MISSING');
  stage='connect';const connection=connect?await connect(target):await connectProduction(target);db=connection.db;
  const get=async path=>{const response=await fetcher('https://discord.com/api/v10'+path,{method:'GET',headers:{Authorization:'Bot '+env.DISCORD_TOKEN},signal:AbortSignal.timeout(15000)});check(response.ok,'DISCORD_READ_FAILED');return response.json();};
  stage='enable_and_grant';await enableProductionEconomyItems({...connection,get,write});
 }catch(cause){const safe=/^[A-Z][A-Z0-9_]+$/.test(cause?.message??'')?cause.message:'PRODUCTION_ECONOMY_ITEMS_FAILED';error(`FAIL: ${safe} at ${stage}. No exception details displayed.`);return 1;
 }finally{if(db)try{await db.$disconnect();}catch{error('FAIL: DATABASE_DISCONNECT_FAILED.');return 1;}}
 return 0;
}

async function connectProduction(target){
 const [{PrismaClient},{PrismaConfigRepository,PrismaAuditSink},{ConfigService},{AuditService},{SETTINGS},{PrismaAtomicOperations},{grantCatalogReward},{seedFamilyCatalog,FAMILY_CATALOG_ITEMS}]=await Promise.all([
  import('@prisma/client'),import('../dist/packages/database/src/prisma-adapters.js'),import('../dist/packages/core/src/config-service.js'),import('../dist/packages/core/src/audit.js'),import('../dist/packages/contracts/src/generated/settings.js'),import('../dist/packages/database/src/atomic-operations.js'),import('../dist/packages/features-economy/src/catalog-grants.js'),import('../dist/packages/features-economy/src/catalog-seed.js')]);
 const db=new PrismaClient({datasourceUrl:target.databaseUrl,log:[]});
 return {db,config:new ConfigService(SETTINGS,new PrismaConfigRepository(db),new AuditService(new PrismaAuditSink(db))),atomic:new PrismaAtomicOperations(db),grantCatalogReward,ensureFamilyCatalog:seedFamilyCatalog,familyCatalogItems:FAMILY_CATALOG_ITEMS};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)process.exitCode=await main();
