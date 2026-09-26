import {renderFight} from '../../../../packages/features-events/src/fight-render.js';
import {PermissionFlagsBits,ActionRowBuilder,ButtonBuilder,ButtonStyle,ModalBuilder,TextInputBuilder,TextInputStyle,type Client,type Message,type ButtonInteraction,type ChatInputCommandInteraction,type ModalSubmitInteraction} from 'discord.js';
import {DomainError,PermissionEngine,type ConfigService} from '../../../../packages/core/src/index.js';
import {CAPABILITY_MATRIX} from '../../../../packages/contracts/src/generated/capabilities.js';
import {PrismaEventsRepository,type EventContext,type EventPolicy,type RaceData,type RaceView} from '../../../../packages/features-events/src/prisma-repository.js';
import {eventRandom,raceSnapshot} from '../../../../packages/features-events/src/domain.js';
import {fightSnapshot} from '../../../../packages/features-events/src/fight.js';
import {renderRace} from '../../../../packages/features-events/src/render.js';
import {renderEventNotice} from '../../../../packages/features-events/src/wide-render.js';
import {rasterizeSvg,rasterizeTimeline} from '../../../../packages/renderer/src/raster.js';
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
  if(i.isButton()&&action==='rules'){const title=view.type==='fight'?'Fight rules':'Race rules',copy=(view.type==='fight'?eventHelp.fight:eventHelp.race)+'\n\n'+eventHelp.body;const {content:_content,...payload}=eventWindow({title,description:'',filename:'event-rules.png',image:await rasterizeSvg(renderEventNotice(title,copy)),rows:[]});await i.reply({...payload,ephemeral:true});return;}
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
 async payload(view:RaceView,options:{animate?:boolean;retainImageUrl?:string;callout?:string;timeline?:RaceData}={}){
  const fight=view.type==='fight',prefix=fight?'fight':'event',live=view.state==='LOCKED',saved=options.timeline,plan=fight?saved?.fightPlan:saved?.plan,animate=live&&options.animate!==false&&Boolean(plan&&saved?.startedAt),filename=`${fight?'fight':'race'}-${view.state.toLowerCase()}.${animate||options.retainImageUrl?'gif':'png'}`,open=view.state==='OPEN',components:ActionRowBuilder<ButtonBuilder>[]=[];
  const render=(imageView:RaceView=view,phase=0)=>{const motion={phase,...(options.callout?{callout:options.callout.replace(/<@&[^>]+>\s*/g,'')}: {})};return fight?renderFight(imageView,motion,'wide'):renderRace(imageView,'wide',motion);};
  let image:Buffer|undefined;
  if(!options.retainImageUrl){
   if(animate&&saved?.startedAt&&plan){
    // Only locked wagers and rendered snapshots leave this process; the private plan is never serialized in the payload.
    const end=Math.ceil(plan.durationMs/10)*10,times=[0];
    if(fight&&saved.fightPlan){for(const beat of saved.fightPlan.beats){const at=Math.ceil(beat.atMs/10)*10,previous=times.at(-1)!;if(at-previous>=20)times.push(Math.floor((previous+at)/20)*10);if(at>times.at(-1)!)times.push(at);}}
    else for(let at=500;at<end;at+=500)times.push(at);
    if(times.at(-1)!<end)times.push(end);
    const frames=times.map(at=>render({...view,...(fight&&saved.fightPlan?{combat:fightSnapshot(saved.fightPlan,at,view.racers)}:saved.plan?{motion:raceSnapshot(saved.plan,at)}:{})},at/1000%1));
    image=await rasterizeTimeline(frames,times.map((at,index)=>index+1<times.length?times[index+1]!-at:1000),new Date(saved.startedAt).getTime());
   }else image=await rasterizeSvg(render());
  }
  if(open){components.push(new ActionRowBuilder<ButtonBuilder>().addComponents(...(fight?[]:[new ButtonBuilder().setCustomId('event:join:'+view.id).setLabel('Join Race').setStyle(ButtonStyle.Primary).setDisabled(view.racers.length>=6)]),new ButtonBuilder().setCustomId(prefix+':extend:'+view.id).setLabel('+30 Seconds').setStyle(ButtonStyle.Secondary).setDisabled(view.extensionUsed),new ButtonBuilder().setCustomId(prefix+':rules:'+view.id).setLabel('Rules').setStyle(ButtonStyle.Secondary)));
   for(let start=0;start<view.racers.length;start+=3)components.push(new ActionRowBuilder<ButtonBuilder>().addComponents(...view.racers.slice(start,start+3).map(r=>new ButtonBuilder().setCustomId(`${prefix}:bet:${view.id}:${r.userId}`).setLabel(`Bet · ${r.name}`.slice(0,80)).setStyle(ButtonStyle.Secondary))));
  }
  return eventWindow({title:fight?'Robo Chair Fight':'Chair Race',description:'',filename,...(image?{image}:{}),rows:components,...(options.retainImageUrl?{imageUrl:options.retainImageUrl}:{}),...(options.callout?{callout:options.callout}:{})});
 }
 async refresh(client:Client,id:string){const previous=this.refreshes.get(id)??Promise.resolve();const current=previous.catch(()=>{}).then(async()=>{let view=await this.repo.publicView(id);if(!view.messageId)return;const version=(value:RaceView)=>JSON.stringify([value.state,value.expiresAt,value.extensionUsed,value.racers,value.pool,value.bets,value.result,value.winnerId,value.cancelReason]);let key=version(view);if(this.publishedVersions.get(id)===key)return;const channel=await client.channels.fetch(view.channelId);if(!channel?.isTextBased()||!('messages' in channel))throw new Error('Event channel unavailable.');const message=await channel.messages.fetch(view.messageId);if(message.author.id!==client.user?.id)throw new Error('Event message author mismatch.');
  const filename=`${view.type==='fight'?'fight':'race'}-locked.gif`,existing=view.state==='LOCKED'?message.attachments?.find(attachment=>attachment.name===filename):undefined;
  const retainImageUrl=view.state==='LOCKED'?(existing?.url??this.liveImages.get(id)):undefined;
  const saved=view.state==='LOCKED'&&!retainImageUrl&&typeof this.repo.get==='function'?await this.repo.get(id):undefined;
  let payload=await this.payload(view,retainImageUrl?{retainImageUrl}:saved?.state==='LOCKED'?{timeline:saved.data}:{});
  // Rendering may span the end of a round. Never overwrite a persisted result/cancellation with stale live art.
  if(view.state==='LOCKED'){const latest=await this.repo.publicView(id);if(latest.state!==view.state){view=latest;key=version(view);payload=await this.payload(view);}}
  await message.edit(payload);
  if(view.state==='LOCKED'&&(retainImageUrl||payload.files?.some(file=>file.name===filename)))this.liveImages.set(id,retainImageUrl??'attachment://'+filename);else this.liveImages.delete(id);
  this.publishedVersions.set(id,key);});this.refreshes.set(id,current);try{await current;}finally{if(this.refreshes.get(id)===current)this.refreshes.delete(id);}}
 async sweep(client:Client){if(this.sweeping)return;this.sweeping=true;try{for(const event of await this.repo.active()){
  if(event.expiresAt&&event.expiresAt<=new Date()){await this.advance(client,event.guildId,event.id,event.state==='LOCKED');continue;}
  await this.refresh(client,event.id);
 }}finally{this.sweeping=false;}}
}
