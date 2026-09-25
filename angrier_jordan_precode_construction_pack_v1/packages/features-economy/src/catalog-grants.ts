import {DomainError} from '../../core/src/index.js';
/** Shared acquisition path for Daily/grind rewards; tools and recipes are never inert stacks. */
export interface CatalogGrantDatabase {
 inventoryEntry:{upsert(args:any):Promise<any>};
 toolInstance:{createMany(args:any):Promise<any>};
 ownedRecipe:{upsert(args:any):Promise<any>};
 collectionDiscovery:{upsert(args:any):Promise<any>};
}
export async function grantCatalogReward(db:CatalogGrantDatabase,guildId:string,userId:string,item:{id:string;type:string;metadata:unknown},quantity:number){
 if(!Number.isSafeInteger(quantity)||quantity<1||quantity>100)throw new DomainError('REWARD_QUANTITY','Invalid item reward quantity.');
 const metadata=item.metadata&&typeof item.metadata==='object'?item.metadata as Record<string,unknown>:{};
 await db.collectionDiscovery.upsert({where:{guildId_userId_itemId:{guildId,userId,itemId:item.id}},create:{guildId,userId,itemId:item.id},update:{}});
 if(item.type==='tool'){
  const maxDurability=Number(metadata.maxDurability??100),slot=String(metadata.slot??'');
  if(!['fishing_rod','shovel','scavenging_tool','workshop_tool'].includes(slot)||!Number.isSafeInteger(maxDurability)||maxDurability<=0)throw new DomainError('TOOL_CONFIG','Tool reward configuration is invalid.');
  await db.toolInstance.createMany({data:Array.from({length:quantity},()=>({guildId,userId,catalogItemId:item.id,slot,durability:maxDurability,maxDurability,equipped:false,locked:false}))});
 }else if(item.type==='recipe'){
  if(typeof metadata.recipeId!=='string')throw new DomainError('RECIPE_CONFIG','Recipe reward configuration is invalid.');
  await db.ownedRecipe.upsert({where:{guildId_userId_recipeId:{guildId,userId,recipeId:metadata.recipeId}},create:{guildId,userId,recipeId:metadata.recipeId},update:{}});
 }else return db.inventoryEntry.upsert({where:{guildId_userId_itemId:{guildId,userId,itemId:item.id}},create:{guildId,userId,itemId:item.id,quantity,locked:false},update:{quantity:{increment:quantity}}});
 return{id:`reward:${item.id}`,guildId,userId,itemId:item.id,quantity,locked:false,metadata};
}
