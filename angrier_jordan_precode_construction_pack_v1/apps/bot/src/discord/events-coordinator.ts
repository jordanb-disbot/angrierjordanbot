import {ActionRowBuilder,AttachmentBuilder,ButtonBuilder,ButtonStyle,EmbedBuilder,ModalBuilder,TextInputBuilder,TextInputStyle,type Client,type Message,type ButtonInteraction,type ModalSubmitInteraction} from 'discord.js';
import {DomainError,PermissionEngine,type ConfigService} from '../../../../packages/core/src/index.js';
import {CAPABILITY_MATRIX} from '../../../../packages/contracts/src/generated/capabilities.js';
import {PrismaEventsRepository,type EventContext,type EventPolicy,type RaceView} from '../../../../packages/features-events/src/prisma-repository.js';
import {eventRandom} from '../../../../packages/features-events/src/domain.js';
import {renderRace} from '../../../../packages/features-events/src/render.js';
import {rasterizeSvg} from '../../../../packages/renderer/src/raster.js';
import eventHelp from '../../../../packages/content/help/events.json' with {type:'json'};
const callouts=['Chairs to the starting line. Who has the fastest seat?','The lounge has a finish line. Pick your chair.','Six seats. One sprint. Chairs, assemble.'];
export class DiscordEventsCoordinator {
 private readonly refreshes=new Map<string,Promise<void>>();
 private sweeping=false;
 constructor(private readonly repo:PrismaEventsRepository,private readonly config:ConfigService,private readonly eligible:(g:string,u:string)=>Promise<boolean>){}
 async policy(guildId:string):Promise<EventPolicy>{return{minBet:BigInt(Number(await this.config.get(guildId,'events.min_bet'))),maxBet:BigInt(Number(await this.config.get(guildId,'events.max_bet')))};}
 private async guard(guildId:string,userId:string,channelId:string){
  if(await this.config.get(guildId,'features.race')!==true)throw new DomainError('EVENT_DISABLED','Race is not enabled yet.');
  if(channelId!==await this.config.get(guildId,'channels.main_chat'))throw new DomainError('EVENT_CHANNEL','Use Race in the configured main chat.');
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
   const payload=await this.payload(await this.repo.publicView(id));
   const sent=await message.channel.send({...payload,content:`${notification?'<@&'+notification+'> ':''}${callouts[eventRandom(callouts.length)]}`,allowedMentions:{parse:[],roles:notification?[notification]:[]}});
   await this.repo.linkMessage(id,message.guildId,sent.id);
  }catch(error){if(id)await this.repo.cancel(message.guildId,id,'Race could not be published; wagers refunded.');if(error instanceof DomainError&&error.code==='EVENT_ACTIVE')return;throw error;}
 }
 async handle(i:ButtonInteraction|ModalSubmitInteraction){try{
  if(!i.guildId||!i.guild||!i.channelId)throw new DomainError('SERVER_ONLY','Use event controls in the server.');await this.guard(i.guildId,i.user.id,i.channelId);
  const parts=i.customId.split(':'),action=parts[1],id=action==='wager'?parts[3]:parts[2];if(!id)throw new DomainError('EVENT_CONTROL','This event control is unavailable.');
  const c:EventContext={guildId:i.guildId,channelId:i.channelId,userId:i.user.id,requestKey:i.id};
  const view=await this.repo.publicView(id);if(view.guildId!==i.guildId||view.channelId!==i.channelId)throw new DomainError('EVENT_CHANNEL','Use this event’s original message.');
  if(i.isButton()&&action==='rules'){await i.reply({ephemeral:true,embeds:[new EmbedBuilder().setAuthor({name:'Angrier Jordan'}).setTitle('Race rules').setDescription(eventHelp.race+'\n\n'+eventHelp.body).setColor(0x14b8a6)]});return;}
  if(i.isButton()&&action==='bet'){
   if(view.state!=='OPEN'||!view.expiresAt||view.expiresAt<=new Date())throw new DomainError('BETTING_CLOSED','Betting has closed.');
   if(!view.racers.some(r=>r.userId===parts[3]))throw new DomainError('RACER_MISSING','Choose a current racer.');
   await i.showModal(new ModalBuilder().setCustomId(`event:wager:${i.user.id}:${id}:${parts[3]}`).setTitle('Race wager').addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId('amount').setLabel('Ottomans to add to your wager').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(7))));return;
  }
  await i.deferReply({ephemeral:true});let content='Race updated.';
  if(i.isButton()&&action==='join'){const member=await i.guild.members.fetch(i.user.id);await this.repo.join(c,id,{userId:member.id,name:member.displayName,avatarUrl:member.displayAvatarURL({size:128,extension:'png'})});content='Your racer spot is saved.';}
  else if(i.isButton()&&action==='extend'){await this.repo.extend(c,id);content='Entry and betting extended by 30 seconds.';}
  else if(i.isModalSubmit()&&action==='wager'){
   if(parts[2]!==i.user.id)throw new DomainError('OWNER_ONLY','Open your own wager modal.');const raw=i.fields.getTextInputValue('amount');if(!/^\d{1,7}$/.test(raw))throw new DomainError('WAGER_AMOUNT','Enter a whole Ottoman amount.');
   const result=await this.repo.bet(c,id,parts[4]!,BigInt(raw),await this.policy(i.guildId));content=`Wager confirmed: ${result.total} Ottomans total. Your racer selection is locked.`;
  }else throw new DomainError('EVENT_CONTROL','This event control is unavailable.');
  await i.editReply({content});
  try{await this.refresh(i.client,id);}catch{await i.followUp({ephemeral:true,content:'Your action is saved. The public card refresh is pending.'});}
 }catch(error){const content=error instanceof DomainError?error.message:'The event update could not be completed. Check its saved state before retrying.';if(i.replied)await i.followUp({ephemeral:true,content});else if(i.deferred)await i.editReply({content});else await i.reply({ephemeral:true,content});}}
 async payload(view:RaceView){
  const image=await rasterizeSvg(renderRace(view)),open=view.state==='OPEN',components:ActionRowBuilder<ButtonBuilder>[]=[];
  if(open){components.push(new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId('event:join:'+view.id).setLabel('Join Race').setStyle(ButtonStyle.Primary).setDisabled(view.racers.length>=6),new ButtonBuilder().setCustomId('event:extend:'+view.id).setLabel('+30 Seconds').setStyle(ButtonStyle.Secondary).setDisabled(view.extensionUsed),new ButtonBuilder().setCustomId('event:rules:'+view.id).setLabel('Rules').setStyle(ButtonStyle.Secondary)));
   for(let start=0;start<view.racers.length;start+=3)components.push(new ActionRowBuilder<ButtonBuilder>().addComponents(...view.racers.slice(start,start+3).map(r=>new ButtonBuilder().setCustomId(`event:bet:${view.id}:${r.userId}`).setLabel(`Bet · ${r.name}`.slice(0,80)).setStyle(ButtonStyle.Secondary))));
  }
  const result=view.result,description=open?`Entry and betting close <t:${Math.floor(view.expiresAt!.getTime()/1000)}:R>.\nChoose a racer to open a private wager modal. Selection locks after your first wager.`:view.state==='CANCELLED'?view.cancelReason:view.state==='CLOSED'?`Winner: <@${view.winnerId}>\n${result?.refunded?'All wagers refunded.':`Pool: ${result?.pool??0} · Rake: ${result?.rake??0} Ottomans`}`:'The sprint is live. Betting is locked.';
  return{embeds:[new EmbedBuilder().setAuthor({name:'Angrier Jordan'}).setTitle('Chair Race').setDescription(description??'').setColor(0x14b8a6).setImage('attachment://race.png').setFooter({text:'race:'+view.id})],files:[new AttachmentBuilder(image,{name:'race.png'})],attachments:[],components,allowedMentions:{parse:[] as never[]}};
 }
 async refresh(client:Client,id:string){const previous=this.refreshes.get(id)??Promise.resolve();const current=previous.catch(()=>{}).then(async()=>{const view=await this.repo.publicView(id);if(!view.messageId)return;const channel=await client.channels.fetch(view.channelId);if(!channel?.isTextBased()||!('messages' in channel))throw new Error('Event channel unavailable.');const message=await channel.messages.fetch(view.messageId);if(message.author.id!==client.user?.id)throw new Error('Event message author mismatch.');await message.edit(await this.payload(view));});this.refreshes.set(id,current);try{await current;}finally{if(this.refreshes.get(id)===current)this.refreshes.delete(id);}}
 async sweep(client:Client){if(this.sweeping)return;this.sweeping=true;try{for(const event of await this.repo.active()){
  if(event.expiresAt&&event.expiresAt<=new Date()){if(event.state==='OPEN')await this.repo.closeBetting(event.guildId,event.id);else if(event.state==='LOCKED')await this.repo.settle(event.guildId,event.id,await this.policy(event.guildId));}
  await this.refresh(client,event.id);
 }}finally{this.sweeping=false;}}
}
