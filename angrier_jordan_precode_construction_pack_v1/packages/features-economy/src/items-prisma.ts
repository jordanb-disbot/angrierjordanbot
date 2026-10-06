import {Prisma,type PrismaClient} from '@prisma/client';
import {PrismaAtomicOperations,requestFingerprint} from '../../database/src/atomic-operations.js';
import {DomainError,spendableWallet} from '../../core/src/index.js';
import type {ItemContext,ItemMember,ItemOutcome,ItemRepository,ItemState,ItemUnit} from './items-types.js';
const object=(value:unknown)=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
const json=(value:unknown):Prisma.InputJsonValue=>JSON.parse(JSON.stringify(value,(_key,current)=>typeof current==='bigint'?current.toString():current));

async function load(db:Prisma.TransactionClient,guildId:string,userIds:string[]):Promise<ItemState>{
 const where={guildId,userId:{in:userIds}};
 const [catalog,recipes,collections,accounts,stacks,tools,chairs,owned,discoveries,locks,pity,progress,achievements]=await Promise.all([
  db.catalogItem.findMany(),db.recipe.findMany(),db.collectionSet.findMany({where:{enabled:true}}),db.economyAccount.findMany({where}),db.inventoryEntry.findMany({where}),db.toolInstance.findMany({where}),db.craftedChair.findMany({where}),db.ownedRecipe.findMany({where}),db.collectionDiscovery.findMany({where}),db.inventoryCategoryLock.findMany({where}),db.pityCounter.findMany({where}),db.craftingProgress.findMany({where}),db.memberAchievement.findMany({where})
 ]);
 return{guildId,catalog:catalog.map(i=>({id:i.id,type:i.type,name:i.name,rarity:i.rarity,giftable:i.giftable,enabled:i.enabled,...(i.buyPrice===null?{}:{buyPrice:i.buyPrice}),...(i.sellValue===null?{}:{sellValue:i.sellValue}),metadata:object(i.metadata)})),recipes:recipes.map(r=>{const config=object(r.successConfig);return{id:r.id,name:r.name,outputItemId:r.outputItemId,inputs:object(r.inputs) as Record<string,number>,success:Number(config.success??.7),enabled:r.enabled,...(typeof config.chairInput==='string'?{chairInput:config.chairInput}:{})};}),collections,
 members:userIds.map(userId=>{const a=accounts.find(a=>a.userId===userId);return{userId,wallet:a?.wallet??0n,reservedWallet:a?.reservedWallet??0n,bank:a?.bank??0n,stacks:stacks.filter(s=>s.userId===userId),tools:tools.filter(t=>t.userId===userId).map(t=>({...t,metadata:object(t.metadata)})),chairs:chairs.filter(c=>c.userId===userId),recipes:owned.filter(r=>r.userId===userId).map(r=>r.recipeId),discoveries:[...new Set([...discoveries.filter(d=>d.userId===userId).map(d=>d.itemId),...stacks.filter(s=>s.userId===userId&&s.quantity>0).map(s=>s.itemId),...tools.filter(t=>t.userId===userId).map(t=>t.catalogItemId),...chairs.filter(c=>c.userId===userId).map(c=>c.chairType)])],categoryLocks:locks.filter(l=>l.userId===userId).map(l=>l.category),pity:Object.fromEntries(pity.filter(p=>p.userId===userId).map(p=>[p.poolKey,p.count])),progress:progress.find(p=>p.userId===userId)??{rank:'Apprentice',skillPoints:0,attempts:0,successes:0},achievements:achievements.filter(a=>a.userId===userId).map(a=>a.achievementId)};})};
}
async function save(tx:Prisma.TransactionClient,guildId:string,m:ItemMember){
 const userId=m.userId,where={guildId,userId};
 for(const s of m.stacks)await tx.inventoryEntry.upsert({where:{guildId_userId_itemId:{...where,itemId:s.itemId}},create:{id:s.id,...where,itemId:s.itemId,quantity:s.quantity,locked:s.locked,acquiredAt:s.acquiredAt},update:{quantity:s.quantity,locked:s.locked}});
 await tx.toolInstance.updateMany({where,data:{equipped:false}});
 for(const t of m.tools)await tx.toolInstance.upsert({where:{id:t.id},create:{id:t.id,...where,catalogItemId:t.catalogItemId,slot:t.slot,durability:t.durability,maxDurability:t.maxDurability,equipped:t.equipped,locked:t.locked},update:{durability:t.durability,equipped:t.equipped,locked:t.locked}});
 await tx.craftedChair.deleteMany({where:{...where,id:{notIn:m.chairs.map(c=>c.id)}}});
 for(const c of m.chairs)await tx.craftedChair.upsert({where:{id:c.id},create:{...where,id:c.id,chairType:c.chairType,quality:c.quality,locked:c.locked,createdAt:c.createdAt},update:{locked:c.locked}});
 for(const recipeId of m.recipes)await tx.ownedRecipe.upsert({where:{guildId_userId_recipeId:{...where,recipeId}},create:{...where,recipeId},update:{}});
 for(const itemId of m.discoveries)await tx.collectionDiscovery.upsert({where:{guildId_userId_itemId:{...where,itemId}},create:{...where,itemId},update:{}});
 await tx.inventoryCategoryLock.deleteMany({where});
 if(m.categoryLocks.length)await tx.inventoryCategoryLock.createMany({data:m.categoryLocks.map(category=>({...where,category}))});
 for(const [poolKey,count] of Object.entries(m.pity))await tx.pityCounter.upsert({where:{guildId_userId_poolKey:{...where,poolKey}},create:{...where,poolKey,count},update:{count}});
 const {rank,skillPoints,attempts,successes}=m.progress;
 await tx.craftingProgress.upsert({where:{guildId_userId:where},create:{...where,rank,skillPoints,attempts,successes},update:{rank,skillPoints,attempts,successes}});
 for(const achievementId of m.achievements)await tx.memberAchievement.upsert({where:{guildId_userId_achievementId:{...where,achievementId}},create:{...where,achievementId},update:{}});
}
export class PrismaItemRepository implements ItemRepository {
 private readonly atomic:PrismaAtomicOperations;
 constructor(private readonly db:PrismaClient){this.atomic=new PrismaAtomicOperations(db);}
 read(guildId:string,userIds:string[]){return this.db.$transaction(tx=>load(tx,guildId,userIds),{isolationLevel:'RepeatableRead'});}
 transact(c:ItemContext,fingerprint:unknown,userIds:string[],operation:(unit:ItemUnit)=>Promise<ItemOutcome>){
  return this.atomic.run(c.guildId,`items:${c.requestKey}`,requestFingerprint(fingerprint),async(tx,ledger)=>{
   for(const userId of [...userIds].sort())await tx.member.upsert({where:{guildId_userId:{guildId:c.guildId,userId}},create:{guildId:c.guildId,userId},update:{}});
   const state=await load(tx,c.guildId,userIds);let ordinal=0;const gifts:{senderId:string;recipientId:string;itemId:string;quantity:number}[]=[];
   const move=async(userId:string,amount:bigint,reason:string)=>{
    const m=state.members.find(m=>m.userId===userId)!;
    if(amount<0n&&spendableWallet(m)+m.bank < -amount)throw new DomainError('INSUFFICIENT_FUNDS','You do not have enough Ottomans.');
    const wallet=amount>=0n?amount:spendableWallet(m)>=-amount?amount:-spendableWallet(m),bank=amount-wallet;
    await ledger.apply({guildId:c.guildId,idempotencyKey:`items:${c.guildId}:${c.requestKey}:${ordinal++}`,lines:[{userId,bucket:'wallet',amount:wallet,reason},...(bank?[{userId,bucket:'bank' as const,amount:bank,reason}]:[]),{bucket:'system',amount:-amount,reason}]});m.wallet+=wallet;m.bank+=bank;
   };
   const result=await operation({state,spend:(u,n,r)=>move(u,-n,r),reward:move,gift:(senderId,recipientId,itemId,quantity)=>gifts.push({senderId,recipientId,itemId,quantity})});
   for(const m of state.members)await save(tx,c.guildId,m);
   for(const [index,gift] of gifts.entries())await tx.giftRecord.create({data:{id:`${c.guildId}:${c.requestKey}:${index}`,guildId:c.guildId,...gift}});
   const details=object(fingerprint),args=object(details.args),itemId=typeof args.id==='string'?args.id:typeof args.recipeId==='string'?args.recipeId:undefined;
   await tx.auditEvent.create({data:{guildId:c.guildId,actorUserId:c.userId,source:'economy',action:`economy.item.${String(details.action??'mutation')}`,targetType:itemId?'catalog_item':'inventory',targetId:itemId??c.userId,reason:`Inventory ${String(details.action??'mutation')}`,requestId:`items:${c.requestKey}`,createdAt:new Date(),after:json({affectedUserIds:userIds,itemId:itemId??null,args,result,accounts:state.members.map(member=>({userId:member.userId,wallet:member.wallet.toString(),bank:member.bank.toString()})),gifts})}});
   return result;
  });
 }
}
