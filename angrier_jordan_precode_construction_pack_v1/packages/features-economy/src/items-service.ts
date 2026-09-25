import {randomInt,randomUUID,createHash} from 'node:crypto';
import {DomainError} from '../../core/src/index.js';
import {dailyCycle} from './service.js';
import type {CatalogItemRecord} from './types.js';
import {QUALITIES,RANKS,RARITIES,type ItemContext,type ItemMember,type ItemOutcome,type ItemPolicy,type ItemRepository,type ItemState,type ItemUnit} from './items-types.js';
function check(condition:unknown,code:string,message:string):asserts condition {if(!condition)throw new DomainError(code,message);}
const member=(s:ItemState,id:string)=>{const m=s.members.find(m=>m.userId===id);if(!m)throw new DomainError('MEMBER_MISSING','Member account is unavailable.');return m;};
const item=(s:ItemState,id:string)=>{const i=s.catalog.find(i=>i.id===id);if(!i)throw new DomainError('ITEM_UNAVAILABLE','That item is unavailable.');return i;};
const integer=(n:number)=>{check(Number.isSafeInteger(n)&&n>0&&n<=100,'QUANTITY','Choose a quantity from 1 to 100.');return n;};
const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
const meta=(i:CatalogItemRecord)=>i.metadata??{};
const locked=(m:ItemMember,i:CatalogItemRecord,own:boolean)=>own||m.categoryLocks.includes(i.type);
const random=()=>randomInt(0,1_000_000)/1_000_000;

export class ItemService {
 constructor(private readonly repo:ItemRepository,readonly policy:ItemPolicy,private readonly now=()=>new Date(),private readonly roll=random){}
 async view(g:string,u:string){return this.repo.read(g,[u]);}
 shop(state:ItemState,userId:string){
  const cycle=dailyCycle(this.now());
  const priced=state.catalog.filter(i=>i.enabled&&i.buyPrice!==undefined);
  const essentials=priced.filter(i=>meta(i).essential===true);
  const rotating=priced.filter(i=>meta(i).essential!==true).sort((a,b)=>hash(`${state.guildId}:${cycle.key}:${a.id}`).localeCompare(hash(`${state.guildId}:${cycle.key}:${b.id}`)));
  const shared=rotating.slice(0,6),bonus=rotating.slice(6).sort((a,b)=>hash(`${userId}:${cycle.key}:${a.id}`).localeCompare(hash(`${userId}:${cycle.key}:${b.id}`))).slice(0,Math.max(1,Math.min(2,this.policy.bonusSlots)));
  return {items:[...essentials,...shared,...bonus],resetAt:cycle.next,cycleKey:cycle.key};
 }
 private run(c:ItemContext,action:string,args:unknown,fn:(u:ItemUnit,m:ItemMember)=>Promise<ItemOutcome>,extra:string[]=[]){return this.repo.transact(c,{action,args,userId:c.userId},[...new Set([c.userId,...extra])],u=>fn(u,member(u.state,c.userId)));}
 private grant(s:ItemState,m:ItemMember,id:string,quantity:number){
  const i=item(s,id),data=meta(i);check(i.enabled,'ITEM_UNAVAILABLE','That item is unavailable.');
  if(!m.discoveries.includes(id))m.discoveries.push(id);
  if(i.type==='tool'){
   const durability=Number(data.maxDurability??100);check(Number.isSafeInteger(durability)&&durability>0,'INVALID_TOOL','Tool configuration is invalid.');
   for(let n=0;n<quantity;n++)m.tools.push({id:randomUUID(),guildId:s.guildId,userId:m.userId,catalogItemId:id,slot:String(data.slot),durability,maxDurability:durability,equipped:false,locked:false});
  }else if(i.type==='recipe'){
   const recipeId=String(data.recipeId);check(s.recipes.some(r=>r.id===recipeId&&r.enabled),'RECIPE_UNAVAILABLE','This recipe is unavailable.');
   check(quantity===1&&!m.recipes.includes(recipeId),'RECIPE_OWNED','Recipes are account-bound and can only be learned once.');m.recipes.push(recipeId);
  }else{
   let stack=m.stacks.find(x=>x.itemId===id);if(!stack){stack={id:randomUUID(),userId:m.userId,itemId:id,quantity:0,locked:false,acquiredAt:this.now()};m.stacks.push(stack);}stack.quantity+=quantity;
  }
  this.completeCollections(s,m);
 }
 private completeCollections(s:ItemState,m:ItemMember){for(const c of s.collections)if(c.itemIds.every(id=>m.discoveries.includes(id))&&!m.achievements.includes(c.badgeId))m.achievements.push(c.badgeId);}
 async buy(c:ItemContext,id:string,quantity:number){integer(quantity);return this.run(c,'buy',{id,quantity},async(u,m)=>{
  const i=item(u.state,id);check(this.shop(u.state,c.userId).items.some(x=>x.id===id),'ROTATION_CHANGED','This item is no longer in the shop.');
  const gates=meta(i).requiresAchievements;check(!Array.isArray(gates)||gates.every(v=>m.achievements.includes(String(v))),'ITEM_GATED',`Requires: ${Array.isArray(gates)?gates.join(', '):'item eligibility'}.`);
  check(i.buyPrice!==undefined&&i.buyPrice>0n,'INVALID_PRICE','Item price is unavailable.');await u.spend(c.userId,i.buyPrice*BigInt(quantity),'Shop purchase');this.grant(u.state,m,id,quantity);return{message:`Purchased ${quantity} × ${i.name}.`};
 });}
 inventory(s:ItemState,u:string,query:{search?:string;type?:string;rarity?:string;quality?:string;locked?:boolean;sort?:string}={}){
  const m=member(s,u);const rows=[...m.stacks.filter(x=>x.quantity>0).map(x=>({...x,quality:'',item:item(s,x.itemId),kind:'stack'})),...m.tools.map(x=>({id:x.id,itemId:x.catalogItemId,quantity:1,locked:x.locked,acquiredAt:new Date(0),quality:'',item:item(s,x.catalogItemId),kind:'tool'})),...m.chairs.map(x=>({id:x.id,itemId:x.chairType,quantity:1,locked:x.locked,acquiredAt:x.createdAt,quality:x.quality,item:item(s,x.chairType),kind:'chair'}))];
  const filtered=rows.map(x=>({...x,locked:locked(m,x.item,x.locked)})).filter(x=>(!query.search||x.item.name.toLowerCase().includes(query.search.toLowerCase()))&&(!query.type||x.item.type===query.type)&&(!query.rarity||x.item.rarity===query.rarity)&&(!query.quality||x.quality===query.quality)&&(query.locked===undefined||x.locked===query.locked));
  const score=(x:typeof rows[number])=>query.sort==='rarity'?RARITIES.indexOf(x.item.rarity as typeof RARITIES[number]):query.sort==='quality'?QUALITIES.indexOf(x.quality as typeof QUALITIES[number]):query.sort==='sell value'?Number(this.sellValue(x.item,x.quality)):query.sort==='lock'?Number(x.locked):x.acquiredAt.getTime();
  return filtered.sort((a,b)=>query.sort==='type'?a.item.type.localeCompare(b.item.type):score(b)-score(a)||a.id.localeCompare(b.id));
 }
 private sellValue(i:CatalogItemRecord,quality=''){const base=i.sellValue??0n;const percent=Math.max(10,Math.min(100,this.policy.buybackPercent));return base*BigInt(percent)*BigInt(Math.max(1,QUALITIES.indexOf(quality as typeof QUALITIES[number])+1))/100n;}
 sale(s:ItemState,u:string,mode:'item'|'junk'|'duplicates',id?:string){
  const m=member(s,u),rows=this.inventory(s,u),keep=new Set<string>();
  for(const type of new Set(m.chairs.map(x=>x.chairType))){const best=rows.filter(x=>x.kind==='chair'&&x.itemId===type).sort((a,b)=>QUALITIES.indexOf(b.quality as typeof QUALITIES[number])-QUALITIES.indexOf(a.quality as typeof QUALITIES[number])||a.id.localeCompare(b.id))[0];if(best)keep.add(best.id);}
  const selected=rows.filter(x=>!x.locked&&x.kind!=='tool'&&x.item.type!=='recipe'&&(mode==='item'?x.id===id:mode==='junk'?x.item.type==='junk':!keep.has(x.id))).map(x=>({...x,sellQuantity:mode==='duplicates'&&x.kind==='stack'?Math.max(0,x.quantity-1):x.quantity})).filter(x=>x.sellQuantity>0&&this.sellValue(x.item,x.quality)>0n);
  const total=selected.reduce((n,x)=>n+this.sellValue(x.item,x.quality)*BigInt(x.sellQuantity),0n);
  return {rows:selected,total,token:hash(JSON.stringify(selected.map(x=>[x.id,x.sellQuantity,this.sellValue(x.item,x.quality).toString()])))};
 }
 async sell(c:ItemContext,mode:'item'|'junk'|'duplicates',token:string,id?:string){return this.run(c,'sell',{mode,token,id},async(u,m)=>{const q=this.sale(u.state,c.userId,mode,id);check(q.token.slice(0,16)===token.slice(0,16),'SALE_CHANGED','Inventory or prices changed. Review a fresh confirmation.');check(q.rows.length,'NOTHING_TO_SELL','No unlocked sellable items match.');for(const row of q.rows){if(row.kind==='chair')m.chairs=m.chairs.filter(x=>x.id!==row.id);else m.stacks.find(x=>x.id===row.id)!.quantity-=row.sellQuantity;}await u.reward(c.userId,q.total,'Inventory sale');return{message:`Sold items for ${q.total} Ottomans.`};});}
 async lock(c:ItemContext,id:string,value:boolean,category=false){return this.run(c,'lock',{id,value,category},async(u,m)=>{
  if(category){check(u.state.catalog.some(i=>i.type===id),'CATEGORY','Unknown category.');m.categoryLocks=m.categoryLocks.filter(x=>x!==id);if(value)m.categoryLocks.push(id);}
  else{const row=[...m.stacks,...m.tools,...m.chairs].find(x=>x.id===id);check(row,'ITEM_MISSING','You do not own that item.');row.locked=value;const itemId='itemId' in row?row.itemId:'catalogItemId' in row?row.catalogItemId:row.chairType;if(!value&&m.categoryLocks.includes(item(u.state,itemId).type))return{message:'Individual lock removed. The category lock still applies; use Category Locks to change it.'};}return{message:value?'Item lock applied.':'Item lock removed.'};
 });}
 async unlockAll(c:ItemContext){return this.run(c,'unlock_all',{},async(_u,m)=>{m.categoryLocks=[];for(const row of [...m.stacks,...m.tools,...m.chairs])row.locked=false;return{message:'All inventory locks removed.'};});}
 async gift(c:ItemContext,recipientId:string,id:string,quantity:number){integer(quantity);check(recipientId!==c.userId,'SELF_GIFT','Choose another member.');return this.run(c,'gift',{recipientId,id,quantity},async(u,m)=>{
  const stack=m.stacks.find(x=>x.id===id),target=member(u.state,recipientId);check(stack&&stack.quantity>=quantity,'ITEM_MISSING','You do not own enough of that item.');const i=item(u.state,stack.itemId);check(i.giftable&&!['tool','recipe','crafted_chair'].includes(i.type)&&!locked(m,i,stack.locked),'NOT_GIFTABLE','That item is locked or cannot be gifted.');stack.quantity-=quantity;this.grant(u.state,target,i.id,quantity);u.gift(c.userId,recipientId,i.id,quantity);return{message:`<@${c.userId}> gifted ${quantity} × ${i.name} to <@${recipientId}>.`};
 },[recipientId]);}
 async equip(c:ItemContext,id:string){return this.run(c,'equip',{id},async(_u,m)=>{const t=m.tools.find(x=>x.id===id);check(t&&t.durability>0,'TOOL_UNUSABLE','Choose an owned usable tool.');for(const x of m.tools)if(x.slot===t.slot)x.equipped=x.id===id;return{message:'Tool equipped.'};});}
 async repair(c:ItemContext,id:string,tier:'cheap'|'standard'|'premium'){return this.run(c,'repair',{id,tier},async(u,m)=>{const t=m.tools.find(x=>x.id===id);check(t,'TOOL_MISSING','Choose an owned tool.');const p=this.policy.repairs[tier];check(p&&p.min>0&&p.max>=p.min&&p.max<=100&&p.cost>0n,'REPAIR_POLICY','Repair configuration is invalid.');check(t.durability<t.maxDurability,'TOOL_FULL','That tool is already fully repaired.');await u.spend(c.userId,p.cost,'Tool repair');const restored=Math.max(1,Math.floor(t.maxDurability*(p.min+this.roll()*(p.max-p.min))/100));const old=t.durability;t.durability=Math.min(t.maxDurability,t.durability+restored);return{message:`Repaired ${t.durability-old} durability. ${t.durability}/${t.maxDurability}.`};});}
 async craft(c:ItemContext,recipeId:string){return this.run(c,'craft',{recipeId},async(u,m)=>{
  const r=u.state.recipes.find(r=>r.id===recipeId&&r.enabled);check(r&&m.recipes.includes(recipeId),'RECIPE_REQUIRED','You must own this recipe.');const tool=m.tools.find(x=>x.slot==='workshop_tool'&&x.equipped&&x.durability>0);check(tool,'TOOL_REQUIRED','Equip a usable workshop tool.');
  for(const [id,n] of Object.entries(r.inputs)){const stack=m.stacks.find(x=>x.itemId===id);check(Number.isSafeInteger(n)&&n>0&&stack&&stack.quantity>=n&&!locked(m,item(u.state,id),stack.locked),'MATERIALS_REQUIRED','Required materials are missing or locked.');}
  const prior=r.chairInput?m.chairs.filter(x=>x.chairType===r.chairInput&&!locked(m,item(u.state,x.chairType),x.locked)).sort((a,b)=>QUALITIES.indexOf(a.quality as typeof QUALITIES[number])-QUALITIES.indexOf(b.quality as typeof QUALITIES[number]))[0]:undefined;check(!r.chairInput||prior,'CHAIR_REQUIRED','The prerequisite crafted chair is missing or locked.');
  const points=m.progress.skillPoints,rank=points>=1000?4:points>=400?3:points>=150?2:points>=40?1:0;
  const modifier=Number(meta(item(u.state,tool.catalogItemId)).craftBonus??0);const success=this.roll()<Math.min(.98,Math.max(.1,r.success+rank*.025+Math.min(.1,Math.max(0,modifier))));
  for(const [id,n] of Object.entries(r.inputs))m.stacks.find(x=>x.itemId===id)!.quantity-=success?Math.max(1,n-(modifier>0?Math.floor(n*.1):0)):Math.max(1,Math.ceil(n/2));
  tool.durability=Math.max(0,tool.durability-1);if(!tool.durability){tool.equipped=false;const fallback=m.tools.filter(x=>x.slot===tool.slot&&x.durability>0).sort((a,b)=>b.maxDurability-a.maxDurability||b.durability-a.durability)[0];if(fallback)fallback.equipped=true;}
  m.progress.attempts++;m.progress.skillPoints+=success?10:4;m.progress.successes+=Number(success);m.progress.rank=RANKS[m.progress.skillPoints>=1000?4:m.progress.skillPoints>=400?3:m.progress.skillPoints>=150?2:m.progress.skillPoints>=40?1:0]!;
  if(!success){if(u.state.catalog.some(i=>i.id==='material.scrap'&&i.enabled))this.grant(u.state,m,'material.scrap',1);return{message:`Craft failed. Some materials became scrap. Rank: ${m.progress.rank}.`};}
  if(prior)m.chairs=m.chairs.filter(x=>x.id!==prior.id);
  const qualityRoll=this.roll();const perfect=rank===4?.025:rank===3?.002:0;const quality=qualityRoll<perfect?'Perfect':qualityRoll<.06+rank*.02?'Masterwork':qualityRoll<.2+rank*.03?'Exceptional':qualityRoll<.5+rank*.04?'Fine':'Standard';
  m.chairs.push({id:randomUUID(),userId:c.userId,chairType:r.outputItemId,quality,locked:false,createdAt:this.now()});if(!m.discoveries.includes(r.outputItemId))m.discoveries.push(r.outputItemId);this.completeCollections(u.state,m);return{message:`Crafted ${quality} ${item(u.state,r.outputItemId).name}. Rank: ${m.progress.rank}.`};
 });}
 async open(c:ItemContext,id:string){return this.run(c,'open',{id},async(u,m)=>{
  const stack=m.stacks.find(x=>x.id===id&&x.quantity>0);check(stack,'BOX_MISSING','You do not own that box.');const box=item(u.state,stack.itemId);check(['mystery_box','gift_box'].includes(box.type)&&!locked(m,box,stack.locked),'BOX_LOCKED','Choose an unopened, unlocked box.');const poolKey=String(meta(box).boxType??box.id);const pool=meta(box).rewards;check(Array.isArray(pool)&&pool.length>0,'BOX_POOL','Box rewards are unavailable.');const count=m.pity[poolKey]??0;const threshold=Math.max(5,Math.min(100,Number(meta(box).pityAt??20)));
  let candidates=pool.map((entry:unknown)=>{check(typeof entry==='object'&&entry!==null,'BOX_POOL','Invalid reward table.');const e=entry as Record<string,unknown>;const i=item(u.state,String(e.itemId));const weight=Number(e.weight);check(weight>0&&Number.isFinite(weight),'BOX_POOL','Invalid reward weight.');return{i,weight};});
  const rare=(i:CatalogItemRecord)=>RARITIES.indexOf(i.rarity as typeof RARITIES[number])>=3;
  if(count+1>=threshold)candidates=candidates.filter(x=>rare(x.i));check(candidates.length,'BOX_POOL','Pity reward table is unavailable.');let point=this.roll()*candidates.reduce((n,x)=>n+x.weight,0);const selected=candidates.find(x=>(point-=x.weight)<0)??candidates[candidates.length-1]!;
  stack.quantity--;m.pity[poolKey]=rare(selected.i)?0:count+1;this.grant(u.state,m,selected.i.id,1);return{message:`Opened ${box.name}: ${selected.i.name}.`};
 });}
 collections(s:ItemState,u:string){const m=member(s,u);const eligible=(id:string)=>{const i=s.catalog.find(i=>i.id===id);return i&&meta(i).limited!==true&&meta(i).eventOnly!==true;};const all=[...new Set(s.collections.flatMap(c=>c.itemIds))].filter(eligible);return{percent:all.length?Math.floor(100*all.filter(id=>m.discoveries.includes(id)).length/all.length):0,sets:s.collections.filter(c=>!c.hidden||c.itemIds.some(id=>m.discoveries.includes(id))).map(c=>({name:c.name,complete:c.itemIds.every(id=>m.discoveries.includes(id)),pieces:c.itemIds.map(id=>m.discoveries.includes(id)?item(s,id).name:c.hidden?'Undiscovered piece':item(s,id).name)}))};}
}
