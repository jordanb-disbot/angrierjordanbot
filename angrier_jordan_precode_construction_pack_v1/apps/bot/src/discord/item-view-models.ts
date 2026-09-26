import type {ItemState} from '../../../../packages/features-economy/src/items-types.js';
import type {ItemService} from '../../../../packages/features-economy/src/items-service.js';
export const ITEM_PAGE_SIZE=3;
export function itemPage<T>(items:T[],requested=0){const pages=Math.max(1,Math.ceil(items.length/ITEM_PAGE_SIZE)),page=Math.min(pages-1,Math.max(0,Number.isFinite(requested)?Math.floor(requested):0));return {items:items.slice(page*ITEM_PAGE_SIZE,(page+1)*ITEM_PAGE_SIZE),page,pages};}
export function inventoryCategories(rows:ReturnType<ItemService['inventory']>){return [...new Set(rows.map(x=>x.item.type))].sort().slice(0,24);}
export function inventoryCard(state:ItemState,userId:string,x:ReturnType<ItemService['inventory']>[number]){
 const tool=state.members.find(m=>m.userId===userId)?.tools.find(t=>t.id===x.id);
 return {name:x.item.name,badge:`${x.item.rarity} · ${x.item.type}`,motif:x.item.name+' '+x.item.type,detail:[`Quantity ${x.quantity}`,x.quality,tool?`${tool.equipped?'Equipped':'Not equipped'} · ${tool.durability}/${tool.maxDurability} durability`:'',x.locked?'Locked':'Unlocked'].filter(Boolean).join(' · ')};
}
export function collectionCards(state:ItemState,userId:string){
 const member=state.members.find(m=>m.userId===userId)!;
 return state.collections.filter(set=>!set.hidden||set.itemIds.some(id=>member.discoveries.includes(id))).flatMap(set=>set.itemIds.map(id=>{
  const found=member.discoveries.includes(id),item=state.catalog.find(x=>x.id===id);
  return {name:found||!set.hidden?item?.name??'Collection piece':'Undiscovered piece',badge:found?'Discovered':'Undiscovered',detail:set.name,motif:found||!set.hidden?(item?.name??'chair')+' '+(item?.type??'chair'):'unknown',accent:found?0x10b981:0x8893a4};
 }));
}
export function craftingCards(state:ItemState,userId:string){
 const member=state.members.find(m=>m.userId===userId)!;
 return state.recipes.filter(r=>r.enabled&&member.recipes.includes(r.id)).map(recipe=>({recipe,card:{name:recipe.name,badge:'Learned recipe',motif:'tool',detail:Object.entries(recipe.inputs).map(([id,required])=>`${state.catalog.find(i=>i.id===id)?.name??id}: ${member.stacks.filter(x=>x.itemId===id).reduce((n,x)=>n+x.quantity,0)}/${required}${member.stacks.some(x=>x.itemId===id&&x.locked)||member.categoryLocks.includes(state.catalog.find(i=>i.id===id)?.type??'')?' (locked)':''}`).concat(recipe.chairInput?[`Chair: ${state.catalog.find(i=>i.id===recipe.chairInput)?.name??recipe.chairInput} · ${member.chairs.some(x=>x.chairType===recipe.chairInput&&!x.locked&&!member.categoryLocks.includes(state.catalog.find(i=>i.id===x.chairType)?.type??''))?'ready':'missing or locked'}`]:[]).join(' · ')}}));
}
