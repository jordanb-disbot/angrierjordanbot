import {renderFight} from '../../../../packages/features-events/src/fight-render.js';
import {PermissionFlagsBits,ActionRowBuilder,ButtonBuilder,ButtonStyle,EmbedBuilder,ModalBuilder,TextInputBuilder,TextInputStyle,escapeMarkdown,type Client,type Message,type ButtonInteraction,type ChatInputCommandInteraction,type ModalSubmitInteraction} from 'discord.js';
import {DomainError,PermissionEngine,type ConfigService} from '../../../../packages/core/src/index.js';
import {CAPABILITY_MATRIX} from '../../../../packages/contracts/src/generated/capabilities.js';
import {PrismaEventsRepository,type EventContext,type EventPolicy,type RaceView} from '../../../../packages/features-events/src/prisma-repository.js';
import {eventRandom} from '../../../../packages/features-events/src/domain.js';
import {renderRace} from '../../../../packages/features-events/src/render.js';
import {rasterizeSvg,rasterizeLoop} from '../../../../packages/renderer/src/raster.js';
import {eventWindow} from './event-window.js';
import eventHelp from '../../../../packages/content/help/events.json' with {type:'json'};
const callouts=['Chairs to the starting line. Who has the fastest seat?','The lounge has a finish line. Pick your chair.','Six seats. One sprint. Chairs, assemble.'];
export class DiscordEventsCoordinator {
 private readonly refreshes=new Map<string,Promise<void>>();
 private readonly publishedVersions=new Map<string,string>();
 private readonly liveImages=new Map<string,string>();
 private sweeping=false;
 constructor(private readonly repo:PrismaEventsRepository,private readonly config:ConfigService,private readonly eligible:(g:string,u:string)=>Promise<boolean>){}
 async policy(guildId:string):Promise<EventPolicy>{return{minBet:BigInt(Number(await this.config.get(guildId,'events.min_bet'))),maxBet:BigInt(Number(await this.config.get(guildId,'events.max_bet')))};}
 private async guard(guildId:string,userId:string,channelId:string,kind='race'){
  if(await this.config.get(guildId,'features.'+kind)!==true)throw new DomainError('EVENT_DISABLED','This event is not enabled yet.');
  if(channelId!==await this.config.get(guildId,'channels.main_chat'))throw new DomainError('EVENT_CHANNEL','Use events in the configured main chat.');
  if(!new PermissionEngine({'events.use':CAPABILITY_MATRIX.capabilities['events.use']}).can('member','events.use')||!await this.eligible(guildId,userId))throw new DomainError('EVENT_RESTRICTED','Event controls are unavailable while restricted.');
 }
 async message(message:Message){
  if(message.content.trim()!=='!race'||message.author.bot||!message.guildId||!message.guild)return;
  if(message.channelId!==await this.config.get(message.guildId,'channels.main_chat'))return;
  // Removal precedes permission evaluation, including the silent unauthorized path.
  try{await message.delete();}catch{throw new Error('Race trigger could not be removed.');}
  if(await this.config.get(message.guildId,'special_commands.enabled')!==true)return;
  const member=await message.guild.members.fetch(message.author.id),access=await this.config.get(message.guildId,'special_commands.access_roles') as Record<string,unknown>;
  const roles=access?.['!race'];if(!Array.isArray(roles)||roles.some(r=>typeof r!=='string'))throw new Error('Invalid Race access-role configuration.');if(roles.length&&!roles.some(r=>member.roles.cache.has(r)))return;
  try{await this.guard(message.guildId,message.author.id,message.channelId);}catch{return;}
  if(!message.channel.isSendable())return;
  let id:string|undefined;
  try{
   id=(await this.repo.startRace({guildId:message.guildId,channelId:message.channelId,userId:member.id,requestKey:message.id},{userId:member.id,name:member.displayName,avatarUrl:member.displayAvatarURL({size:128,extension:'png'})})).sessionId;
   const roleMap=await this.config.get(message.guildId,'special_commands.builtin_role_map') as Record<string,unknown>,role=roleMap?.['!race'];
   const notificationRole=typeof role==='string'?message.guild.roles.cache.get(role):undefined;
   const notification=notificationRole&&notificationRole.id!==message.guildId&&!notificationRole.managed&&notificationRole.permissions.bitfield===0n?notificationRole.id:undefined;
   const {content:_clearContent,...payload}=await this.payload(await this.repo.publicView(id),{callout:`${notification?'<@&'+notification+'> ':''}${callouts[eventRandom(callouts.length)]}`});
   const sent=await message.channel.send({...payload,allowedMentions:{parse:[],roles:notification?[notification]:[]}});
   await this.repo.linkMessage(id,message.guildId,sent.id);
  }catch(error){if(id)await this.repo.cancel(message.guildId,id,'Race could not be published; wagers refunded.');if(error instanceof DomainError&&error.code==='EVENT_ACTIVE')return;throw error;}
 }
 async startFight(i:ChatInputCommandInteraction){let id:string|undefined,published=false;try{
  if(!i.guildId||!i.guild||!i.channelId)throw new DomainError('SERVER_ONLY','Use Fight in the server.');await this.guard(i.guildId,i.user.id,i.channelId,'fight');
  const target=i.options.getUser('member',true);if(target.id===i.user.id||target.bot)throw new DomainError('FIGHT_TARGET','Choose another eligible member.');if(!await this.eligible(i.guildId,target.id))throw new DomainError('FIGHT_TARGET','That member cannot participate right now.');
  const fighters=await Promise.all([i.user.id,target.id].map(user=>i.guild!.members.fetch({user,force:true})));
  if(fighters.some(m=>m.isCommunicationDisabled()||!m.permissionsIn(i.channelId!).has(PermissionFlagsBits.ViewChannel|PermissionFlagsBits.SendMessages)))throw new DomainError('FIGHT_TARGET','Both fighters need access to participate in main chat.');
  await i.deferReply();id=(await this.repo.startFight({guildId:i.guildId,channelId:i.channelId,userId:i.user.id,requestKey:i.id},fighters.map(m=>({userId:m.id,name:m.displayName,...(m.joinedAt?{joinedAt:m.joinedAt.toISOString()}:{}),avatarUrl:m.displayAvatarURL({size:128,extension:'png'})})))).sessionId;
  const message=await i.editReply(await this.payload(await this.repo.publicView(id)));published=true;await this.repo.linkMessage(id,i.guildId,message.id);
 }catch(error){if(id&&i.guildId)await this.repo.cancel(i.guildId,id,'Fight could not be published; wagers refunded.');const content=error instanceof DomainError?error.message:'Fight could not start. Try again when both members are available.';if(published||i.replied)await i.followUp({ephemeral:true,content});else if(i.deferred)await i.editReply({content});else await i.reply({ephemeral:true,content});}}
 async memberLeft(client:Client,guildId:string,userId:string){const affected=(await this.repo.active(guildId)).filter(r=>r.type==='fight');await this.repo.memberLeft(guildId,userId);for(const row of affected)await this.refresh(client,row.id);}
 async verifyFighters(client:Client,id:string){const view=await this.repo.publicView(id);if(view.type!=='fight'||!['OPEN','LOCKED'].includes(view.state))return;const guild=await client.guilds.fetch(view.guildId);for(const fighter of view.racers){try{const current=await guild.members.fetch({user:fighter.userId,force:true});if(fighter.joinedAt&&current.joinedAt&&current.joinedAt.toISOString()!==fighter.joinedAt){await this.repo.cancel(view.guildId,id,'A fighter left and rejoined; all wagers refunded.');return;}}catch(error){if(error&&typeof error==='object'&&'code' in error&&Number(error.code)===10007){await this.repo.memberLeft(view.guildId,fighter.userId);return;}throw error;}}}
 async advance(client:Client,guildId:string,id:string,settle:boolean){await this.verifyFighters(client,id);if(settle)await this.repo.settle(guildId,id);else await this.repo.closeBetting(guildId,id);await this.refresh(client,id);}
 async handle(i:ButtonInteraction|ModalSubmitInteraction){let silent=false;try{
  if(!i.guildId||!i.guild||!i.channelId)throw new DomainError('SERVER_ONLY','Use event controls in the server.');await this.guard(i.guildId,i.user.id,i.channelId,i.customId.startsWith('fight:')?'fight':'race');
  const parts=i.customId.split(':'),action=parts[1],id=action==='wager'?parts[3]:parts[2];if(!id)throw new DomainError('EVENT_CONTROL','This event control is unavailable.');
  const c:EventContext={guildId:i.guildId,channelId:i.channelId,userId:i.user.id,requestKey:i.id};
  const view=await this.repo.publicView(id);if(view.type&&view.type!==(parts[0]==='fight'?'fight':'race'))throw new DomainError('EVENT_CONTROL','Use the original event controls.');if(view.guildId!==i.guildId||view.channelId!==i.channelId)throw new DomainError('EVENT_CHANNEL','Use this event’s original message.');
  if(i.isButton()&&action==='rules'){await i.reply({ephemeral:true,embeds:[new EmbedBuilder().setAuthor({name:'Angrier Jordan'}).setTitle(view.type==='fight'?'Fight rules':'Race rules').setDescription((view.type==='fight'?eventHelp.fight:eventHelp.race)+'\n\n'+eventHelp.body).setColor(0x14b8a6)]});return;}
  if(i.isButton()&&action==='bet'){
   if(view.state!=='OPEN'||!view.expiresAt||view.expiresAt<=new Date())throw new DomainError('BETTING_CLOSED','Betting has closed.');
   if(!view.racers.some(r=>r.userId===parts[3]))throw new DomainError('RACER_MISSING','Choose a current racer.');
   await i.showModal(new ModalBuilder().setCustomId(`${parts[0]}:wager:${i.user.id}:${id}:${parts[3]}`).setTitle(view.type==='fight'?'Fight wager':'Race wager').addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId('amount').setLabel('Ottomans to add to your wager').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(7))));return;
  }
  silent=i.isButton();if(silent)await (i as ButtonInteraction).deferUpdate();else await i.deferReply({ephemeral:true});let content='Race updated.';
  if(i.isButton()&&action==='join'){const member=await i.guild.members.fetch(i.user.id);await this.repo.join(c,id,{userId:member.id,name:member.displayName,avatarUrl:member.displayAvatarURL({size:128,extension:'png'})});content='Your racer spot is saved.';}
  else if(i.isButton()&&action==='extend'){await this.repo.extend(c,id);content=view.type==='fight'?'Betting extended by 30 seconds.':'Entry and betting extended by 30 seconds.';}
  else if(i.isModalSubmit()&&action==='wager'){
   if(parts[2]!==i.user.id)throw new DomainError('OWNER_ONLY','Open your own wager modal.');const raw=i.fields.getTextInputValue('amount');if(!/^\d{1,7}$/.test(raw))throw new DomainError('WAGER_AMOUNT','Enter a whole Ottoman amount.');
   const result=await this.repo.bet(c,id,parts[4]!,BigInt(raw),await this.policy(i.guildId));content=`Wager confirmed: ${result.total} Ottomans total. Your selection is locked.`;
  }else throw new DomainError('EVENT_CONTROL','This event control is unavailable.');
  if(!silent)await i.deleteReply();
  try{await this.refresh(i.client,id);}catch{await i.followUp({ephemeral:true,content:'Your action is saved. The public card refresh is pending.'});}
 }catch(error){const content=error instanceof DomainError?error.message:'The event update could not be completed. Check its saved state before retrying.';if(i.replied||silent&&i.deferred)await i.followUp({ephemeral:true,content});else if(i.deferred)await i.editReply({content});else await i.reply({ephemeral:true,content});}}
 async payload(view:RaceView,options:{animate?:boolean;retainImageUrl?:string;callout?:string}={}){
  const fight=view.type==='fight',prefix=fight?'fight':'event',live=view.state==='LOCKED',animate=live&&options.animate!==false,filename=`${fight?'fight':'race'}-${view.state.toLowerCase()}.${animate?'gif':'png'}`,open=view.state==='OPEN',components:ActionRowBuilder<ButtonBuilder>[]=[];
  // The live attachment is a cosmetic scene. Saved progress and HP belong in the native text below.
  const imageView=live?{...view,motion:undefined,combat:undefined}:view;
  const render=(phase=0)=>fight?renderFight(imageView,{phase},'wide'):renderRace(imageView,'wide',{phase});
  const image=options.retainImageUrl?undefined:animate?await rasterizeLoop(Array.from({length:8},(_,frame)=>render(frame/8)),100):await rasterizeSvg(render());
  if(open){components.push(new ActionRowBuilder<ButtonBuilder>().addComponents(...(fight?[]:[new ButtonBuilder().setCustomId('event:join:'+view.id).setLabel('Join Race').setStyle(ButtonStyle.Primary).setDisabled(view.racers.length>=6)]),new ButtonBuilder().setCustomId(prefix+':extend:'+view.id).setLabel('+30 Seconds').setStyle(ButtonStyle.Secondary).setDisabled(view.extensionUsed),new ButtonBuilder().setCustomId(prefix+':rules:'+view.id).setLabel('Rules').setStyle(ButtonStyle.Secondary)));
   for(let start=0;start<view.racers.length;start+=3)components.push(new ActionRowBuilder<ButtonBuilder>().addComponents(...view.racers.slice(start,start+3).map(r=>new ButtonBuilder().setCustomId(`${prefix}:bet:${view.id}:${r.userId}`).setLabel(`Bet · ${r.name}`.slice(0,80)).setStyle(ButtonStyle.Secondary))));
  }
  const result=view.result;let description=open?`${fight?'Betting closes':'Entry and betting close'} <t:${Math.floor(view.expiresAt!.getTime()/1000)}:R>.\nChoose a contestant to open a private wager modal. Selection locks after your first wager.`:view.state==='CANCELLED'?view.cancelReason:view.state==='CLOSED'?`Winner: <@${view.winnerId}>\n${result?.refunded?'All wagers refunded.':`Pool: ${result?.pool??0} · Rake: ${result?.rake??0} Ottomans`}`:fight?'Combat is live. Betting is locked.':'The sprint is live. Betting is locked.';
  if(live&&fight){description+='\n\n'+view.racers.map((r,index)=>`**${escapeMarkdown(r.name)}** · ${view.combat?.hp[index]??100} HP`).join('\n');if(view.combat?.log.length)description+='\n\n'+view.combat.log.map(line=>escapeMarkdown(line)).join('\n');}
  if(live&&!fight&&view.motion)description+='\n\n'+view.motion.rows.map(row=>`${row.place}. **${escapeMarkdown(view.racers.find(r=>r.userId===row.userId)?.name??'Racer')}** · ${Math.floor(row.progress)}%`).join('\n');
  return eventWindow({title:fight?'Robo Chair Fight':'Chair Race',description:description??'',filename,...(image?{image}:{}),rows:components,...(options.retainImageUrl?{imageUrl:options.retainImageUrl}:{}),...(options.callout?{callout:options.callout}:{})});
 }
 async refresh(client:Client,id:string){const previous=this.refreshes.get(id)??Promise.resolve();const current=previous.catch(()=>{}).then(async()=>{const view=await this.repo.publicView(id);if(!view.messageId)return;const key=JSON.stringify([view.state,view.expiresAt,view.extensionUsed,view.racers,view.pool,view.result,view.winnerId,view.cancelReason,view.motion?.rows.map(r=>[r.userId,r.place,Math.floor(r.progress)]),view.combat?.hp,view.combat?.log]);if(this.publishedVersions.get(id)===key)return;const channel=await client.channels.fetch(view.channelId);if(!channel?.isTextBased()||!('messages' in channel))throw new Error('Event channel unavailable.');const message=await channel.messages.fetch(view.messageId);if(message.author.id!==client.user?.id)throw new Error('Event message author mismatch.');
  const filename=`${view.type==='fight'?'fight':'race'}-locked.gif`,existing=view.state==='LOCKED'?message.attachments?.find(attachment=>attachment.name===filename):undefined;
  const retainImageUrl=view.state==='LOCKED'?(existing?.url??this.liveImages.get(id)):undefined;
  await message.edit(await this.payload(view,retainImageUrl?{retainImageUrl}:{}));
  if(view.state==='LOCKED')this.liveImages.set(id,retainImageUrl??'attachment://'+filename);else this.liveImages.delete(id);
  this.publishedVersions.set(id,key);});this.refreshes.set(id,current);try{await current;}finally{if(this.refreshes.get(id)===current)this.refreshes.delete(id);}}
 async sweep(client:Client){if(this.sweeping)return;this.sweeping=true;try{for(const event of await this.repo.active()){
  if(event.expiresAt&&event.expiresAt<=new Date()){await this.advance(client,event.guildId,event.id,event.state==='LOCKED');continue;}
  await this.refresh(client,event.id);
 }}finally{this.sweeping=false;}}
}
