import {economyPresentation,type EconomyPresentationInput} from './economy-presentation.js';
import {itemPage,inventoryCategories,inventoryCard,collectionCards,craftingCards} from './item-view-models.js';
import itemHelp from '../../../../packages/content/help/items.json' with {type:'json'};
import {ActionRowBuilder,ButtonBuilder,ButtonStyle,ModalBuilder,StringSelectMenuBuilder,TextInputBuilder,TextInputStyle,type ButtonInteraction,type ChatInputCommandInteraction,type ModalSubmitInteraction,type StringSelectMenuInteraction} from 'discord.js';
import {DomainError,PermissionEngine,type ConfigService} from '../../../../packages/core/src/index.js';
import {CAPABILITY_MATRIX} from '../../../../packages/contracts/src/generated/capabilities.js';
import {ItemService} from '../../../../packages/features-economy/src/items-service.js';
import type {ItemContext,ItemPolicy,ItemRepository} from '../../../../packages/features-economy/src/items-types.js';
export const ITEM_COMMANDS=new Set(['shop','inventory','gift','unlock','repair','craft','collection']);
type Interaction=ChatInputCommandInteraction|ButtonInteraction|StringSelectMenuInteraction|ModalSubmitInteraction;
const button=(id:string,label:string,style:ButtonStyle=ButtonStyle.Secondary)=>new ButtonBuilder().setCustomId(id).setLabel(label).setStyle(style);
const row=(...buttons:ButtonBuilder[])=>new ActionRowBuilder<ButtonBuilder>().addComponents(buttons);
export class DiscordItemsCoordinator {
 constructor(private readonly repo:ItemRepository,private readonly config:ConfigService,private readonly eligible:(g:string,u:string)=>Promise<boolean>){}
 private async service(g:string){const number=async(k:string)=>Number(await this.config.get(g,k));const repairs={} as ItemPolicy['repairs'];for(const tier of ['cheap','standard','premium'] as const)repairs[tier]={cost:BigInt(await number(`crafting.repair.${tier}_cost`)),min:await number(`crafting.repair.${tier}_restore_min`),max:await number(`crafting.repair.${tier}_restore_max`)};const floor=await number('shop.buyback_floor_percent'),ceiling=await number('shop.buyback_ceiling_percent');if(floor>ceiling)throw new DomainError('BUYBACK_POLICY','Shop pricing is temporarily unavailable.');return new ItemService(this.repo,{bonusSlots:await number('shop.personalized_bonus_slots'),buybackPercent:Math.max(floor,Math.min(ceiling,await number('shop.buyback_percent'))),repairs});}
 async handle(i:Interaction){
  try{
   if(!i.guildId||!i.guild)throw new DomainError('SERVER_ONLY','Use this in the server.');
   if(await this.config.get(i.guildId,'features.items')!==true)throw new DomainError('FEATURE_DISABLED','Shop and item controls are not enabled yet.');
   if(!new PermissionEngine({'items.use':CAPABILITY_MATRIX.capabilities['items.use']}).can('member','items.use')||!await this.eligible(i.guildId,i.user.id))throw new DomainError('ITEM_RESTRICTED','Item controls are unavailable while restricted.');
   const currentMember=await i.guild.members.fetch(i.user.id);if(currentMember.user.bot)throw new DomainError('MEMBER_ONLY','These controls are for server members.');
   const allowed=await this.config.get(i.guildId,'channels.bot_channel');
   if(i.isChatInputCommand()&&i.commandName!=='collection'&&typeof allowed==='string'&&allowed&&i.channelId!==allowed)throw new DomainError('CHANNEL','Use item commands in the configured bot channel.');
   const opensModal=(i.isButton()&&['filter','category'].includes(i.customId.split(':')[1]??''))||(i.isStringSelectMenu()&&i.customId.split(':')[1]==='buy');
   if(!opensModal)await i.deferReply({ephemeral:true});
   const svc=await this.service(i.guildId),c:ItemContext={guildId:i.guildId,userId:i.user.id,requestKey:i.id};
   const parts=i.isChatInputCommand()?[]:i.customId.split(':');
   if(parts.length&&parts[2]!==i.user.id)throw new DomainError('OWNER_ONLY','Open your own item controls.');
   const id=(action:string,arg='')=>`items:${action}:${i.user.id}${arg?':'+arg:''}`;
   const send=async(title:string,text:string,components:(ActionRowBuilder<ButtonBuilder>|ActionRowBuilder<StringSelectMenuBuilder>)[]=[],presentation:Partial<EconomyPresentationInput>&{imagePrimary?:boolean}={})=>{const payload={...await economyPresentation({title,description:text,...presentation}),components,allowedMentions:{parse:[] as never[]}};if(i.deferred)await i.editReply(payload);else await i.reply({ephemeral:true,...payload});};
   const menu=(action:string,options:{label:string;value:string;description?:string}[])=>new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(new StringSelectMenuBuilder().setCustomId(id(action)).setPlaceholder('Choose an item').addOptions(options.slice(0,25)));
   const view=async()=>svc.view(c.guildId,c.userId);
   const pages=(action:string,page:number,count:number)=>count>1?[row(button(id(action,String(page-1)),'Previous').setDisabled(page===0),button(id(action,String(page+1)),'Next').setDisabled(page===count-1))]:[];
   const showInventory=async(query:Parameters<ItemService['inventory']>[2]={},page=0)=>{
    const s=await view(),owned=svc.inventory(s,c.userId),all=svc.inventory(s,c.userId,query),v=itemPage(all,page,4),categories=inventoryCategories(owned);
    const categoryMenu=new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(new StringSelectMenuBuilder().setCustomId(id('browsecategory')).setPlaceholder('Inventory category').addOptions([{label:'All categories',value:'all',default:!query.type},...categories.map(type=>({label:type.replaceAll('_',' '),value:type,default:query.type===type}))]));
    const cards=v.items.map(x=>({...inventoryCard(s,c.userId,x),quantity:`OWNED ×${x.quantity}`,status:x.locked?'LOCKED':'READY'}));
    await send('Your Inventory',v.items.map((x,n)=>(n+1)+'. '+x.item.name+' · '+cards[n]!.detail+'\nID: '+x.id).join('\n')||'No matching items. Choose All categories or adjust your search.',[categoryMenu,...(v.items.length?[menu('inspect',v.items.map((x,n)=>({label:((n+1)+'. '+x.item.name+' × '+x.quantity).slice(0,100),value:x.id})))]:[]),...(Object.keys(query).length?[]:pages('inventorypage',v.page,v.pages)),row(button(id('filter'),'Search / Sort / Page'),button(id('sale','junk'),'Sell All Junk'),button(id('sale','duplicates'),'Sell Duplicates')),row(button(id('category'),'Category Locks'),button(id('help'),'How This Works'))],{mode:'inventory',cards,summary:all.length+' owned entries · Page '+(v.page+1)+'/'+v.pages+' · '+(query.type??'All categories'),imagePrimary:true});
   };
   const showShop=async(page=0)=>{
    const s=await view(),shop=svc.shop(s,c.userId),v=itemPage(shop.items,page,4),owned=svc.inventory(s,c.userId);
    const cards=v.items.map(x=>({name:x.name,badge:x.rarity+' · '+x.type,motif:x.name+' '+x.type,price:(x.buyPrice??0).toLocaleString('en-US')+' Ottomans',detail:Array.isArray(x.metadata?.requiresAchievements)?'Requires '+x.metadata.requiresAchievements.join(', '):'Available to purchase',quantity:'OWNED ×'+owned.filter(row=>row.itemId===x.id).reduce((sum,row)=>sum+row.quantity,0)}));
    return await send('Daily Shop','Refresh <t:'+Math.floor(shop.resetAt.getTime()/1000)+':R>\n'+cards.map(x=>x.name+' · '+x.price).join('\n'),[...(v.items.length?[menu('buy',v.items.map((x,n)=>({label:((n+1)+'. '+x.name).slice(0,100),value:x.id,description:(x.buyPrice+' Ottomans · '+x.rarity).slice(0,100)})))]:[]),...pages('shoppage',v.page,v.pages),row(button(id('help'),'How This Works'))],{mode:'shop',cards,summary:shop.items.length+' products · Page '+(v.page+1)+'/'+v.pages+' · Daily rotation',imagePrimary:true});
   };
   const showCollection=async(page=0)=>{
    const s=await view(),progress=svc.collections(s,c.userId),all=collectionCards(s,c.userId),v=itemPage(all,page);
    return await send('Chair Collection',v.items.map(x=>x.name+' · '+x.badge+' · '+x.detail).join('\n')||'Explore the server to discover your first collection piece.',pages('collectionpage',v.page,v.pages),{mode:'collection',cards:v.items,summary:progress.percent+'% complete · '+progress.sets.filter(x=>x.complete).length+'/'+progress.sets.length+' visible sets complete · Page '+(v.page+1)+'/'+v.pages,imagePrimary:true});
   };
   const showCraft=async(page=0)=>{
    const s=await view(),m=s.members.find(x=>x.userId===c.userId)!,all=craftingCards(s,c.userId),v=itemPage(all,page),tool=m.tools.find(t=>t.slot==='workshop_tool'&&t.equipped&&t.durability>0);
    const status=m.progress.rank+' · '+m.progress.skillPoints+' skill points · Workshop '+(tool?'ready ('+tool.durability+'/'+tool.maxDurability+')':'requires an equipped usable tool');
    return await send('Chair Building',status+'\n'+(v.items.map(x=>x.recipe.name+': '+x.card.detail).join('\n')||'No learned recipes yet. Purchase or find a recipe to begin; then gather its materials and equip a usable workshop tool.'),[...(v.items.length?[menu('craft',v.items.map((x,n)=>({label:((n+1)+'. '+x.recipe.name).slice(0,100),value:x.recipe.id})))]:[]),...pages('craftpage',v.page,v.pages),row(button(id('help'),'How This Works'))],{mode:'craft',cards:v.items.map((x,n)=>({...x.card,name:(n+1)+'. '+x.card.name})),summary:status,footer:m.progress.successes+'/'+m.progress.attempts+' successful crafts · Page '+(v.page+1)+'/'+v.pages,imagePrimary:true});
   };
   if(i.isChatInputCommand()){
    if(i.commandName==='inventory')return await showInventory();
    if(i.commandName==='unlock'){const result=await svc.unlockAll(c);return await send('Inventory',result.message);}
    if(i.commandName==='gift'){const target=i.options.getUser('member',true);const member=await i.guild.members.fetch(target.id);if(member.user.bot||!await this.eligible(c.guildId,target.id))throw new DomainError('RECIPIENT','Choose an eligible server member.');const s=await view();const ref=i.options.getString('item',true);const matches=svc.inventory(s,c.userId).filter(x=>x.id===ref||x.itemId===ref||x.item.name.toLowerCase()===ref.toLowerCase());if(matches.length!==1)throw new DomainError('ITEM_ID','Use the exact item ID shown in your inventory.');return await send('Named Gift',(await svc.gift(c,target.id,matches[0]!.id,1)).message);}
    if(i.commandName==='collection')return await showCollection();
    if(i.commandName==='shop')return await showShop();
    if(i.commandName==='craft')return await showCraft();
    if(i.commandName==='repair'){const s=await view(),tools=s.members[0]!.tools;return await send('Tool Repair',tools.map(t=>`${t.catalogItemId}: ${t.durability}/${t.maxDurability}`).join('\n')||'No owned tools.',tools.length?[menu('repair',tools.map(t=>({label:`${t.catalogItemId} · ${t.durability}/${t.maxDurability}`.slice(0,100),value:t.id})))]:[]);}
   }
   if(i.isStringSelectMenu()){
    const chosen=i.values[0]!;
    if(parts[1]==='browsecategory')return await showInventory(chosen==='all'?{}:{type:chosen});
    if(parts[1]==='buy'){const modal=new ModalBuilder().setCustomId(id('buyamount',chosen)).setTitle('Buy Item').addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId('quantity').setLabel('Quantity (1–100)').setValue('1').setStyle(TextInputStyle.Short)));await i.showModal(modal);return;}
    if(parts[1]==='craft')return await send('Chair Building',(await svc.craft(c,chosen)).message);
    if(parts[1]==='repair')return await send('Choose Repair Tier','Restoration is immediate and randomized. Maximum durability never decreases.',[row(...(['cheap','standard','premium'] as const).map(t=>button(id('repairdo',`${chosen}:${t}`),`${t} · ${String(svc.policy.repairs[t].cost)} Ottomans`)))]);
    if(parts[1]==='inspect'){const s=await view(),x=svc.inventory(s,c.userId).find(x=>x.id===chosen);if(!x)throw new DomainError('ITEM_MISSING','Item no longer owned.');return await send(x.item.name,`${x.item.rarity} · ${x.item.type}\n${inventoryCard(s,c.userId,x).detail}\nID: ${x.id}`,[row(button(id('lock',`${x.id}:${x.locked?'off':'on'}`),x.locked?'Unlock':'Lock'),...(x.kind==='tool'?[button(id('equip',x.id),'Equip')]:[button(id('sale',`item:${x.id}`),'Sell Item')]),...(['mystery_box','gift_box'].includes(x.item.type)?[button(id('open',x.id),'Open Box')]:[]))],{mode:'inventory',cards:[inventoryCard(s,c.userId,x)],summary:'Owned item · Inspect and manage'});}
   }
   if(i.isButton()){
    if(parts[1]==='inventorypage')return await showInventory({},Number(parts[3]));
    if(parts[1]==='shoppage')return await showShop(Number(parts[3]));
    if(parts[1]==='collectionpage')return await showCollection(Number(parts[3]));
    if(parts[1]==='craftpage')return await showCraft(Number(parts[3]));
    if(parts[1]==='help')return await send(itemHelp.title,itemHelp.body);
    if(parts[1]==='filter'||parts[1]==='category'){const modal=new ModalBuilder().setCustomId(id(parts[1]==='filter'?'filters':'categoryset')).setTitle(parts[1]==='filter'?'Inventory Search and Filters':'Category Lock');const fields=parts[1]==='filter'?[['search','Name search (optional)',''],['filter','Filter: type,rarity,quality,locked (optional)',''],['sort','Sort: newness,rarity,type,quality,lock,sell value','newness'],['page','Page number','1']]:[['category','Category (tool, material, junk, collectible…)',''],['lock','on or off','on']];for(const [key,label,value] of fields)modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId(key!).setLabel(label!.slice(0,45)).setStyle(TextInputStyle.Short).setRequired(false).setValue(value||' ')));await i.showModal(modal);return;}
    if(parts[1]==='sale'){const mode=parts[3] as 'item'|'junk'|'duplicates';const q=svc.sale(await view(),c.userId,mode,parts[4]);if(!q.rows.length)throw new DomainError('EMPTY_SALE','No unlocked sellable items match.');return await send('Confirm Sale',`${q.rows.map(x=>`${x.sellQuantity} × ${x.item.name}`).join('\n')}\nTotal: ${q.total} Ottomans`,[row(button(id('confirm',`${mode}:${q.token.slice(0,16)}${parts[4]?':'+parts[4]:''}`),'Confirm Sale',ButtonStyle.Danger),button(id('cancel'),'Cancel'))]);}
    if(parts[1]==='confirm'){c.requestKey=`sale:${i.message.id}`;return await send('Inventory',(await svc.sell(c,parts[3] as 'item'|'junk'|'duplicates',parts[4]!,parts[5])).message);}
    if(parts[1]==='cancel'){await i.message.edit({components:[]});return await send('Sale Cancelled','No items sold.');}
    if(parts[1]==='lock')return await send('Inventory',(await svc.lock(c,parts[3]!,parts[4]==='on')).message);
    if(parts[1]==='equip')return await send('Tools',(await svc.equip(c,parts[3]!)).message);
    if(parts[1]==='open')return await send('Box Result',(await svc.open(c,parts[3]!)).message);
    if(parts[1]==='repairdo')return await send('Repair Result',(await svc.repair(c,parts[3]!,parts[4] as 'cheap'|'standard'|'premium')).message);
   }
   if(i.isModalSubmit()){
    if(parts[1]==='buyamount')return await send('Shop',(await svc.buy(c,parts[3]!,Number(i.fields.getTextInputValue('quantity')))).message);
    if(parts[1]==='categoryset')return await send('Inventory',(await svc.lock(c,i.fields.getTextInputValue('category').trim(),i.fields.getTextInputValue('lock').trim()==='on',true)).message);
    if(parts[1]==='filters'){const [type,rarity,quality,lock]=i.fields.getTextInputValue('filter').trim().split(',').map(x=>x.trim());return await showInventory({search:i.fields.getTextInputValue('search').trim(),sort:i.fields.getTextInputValue('sort').trim(),...(type?{type}:{}),...(rarity?{rarity}:{}),...(quality?{quality}:{}),...(lock?{locked:lock==='locked'}:{})},Math.max(0,Number(i.fields.getTextInputValue('page'))-1));}
   }
   throw new DomainError('CONTROL_EXPIRED','Reopen the command to continue.');
  }catch(error){const content=error instanceof DomainError?error.message:'That action failed. No success was recorded.';if(i.replied||i.deferred)await i.followUp({ephemeral:true,content});else await i.reply({ephemeral:true,content});}
 }
}
