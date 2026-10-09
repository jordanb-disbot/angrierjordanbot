import {notificationRole,notificationMessage} from './notification-roles.js';
import {presentationKey} from '../../../../packages/features-events/src/presentation-key.js';
import {eventTiming} from './event-performance.js';
import {renderFight} from '../../../../packages/features-events/src/fight-render.js';
import {PermissionFlagsBits,ActionRowBuilder,ButtonBuilder,ButtonStyle,ModalBuilder,TextInputBuilder,TextInputStyle,type Client,type Message,type GuildMember,type ButtonInteraction,type ChatInputCommandInteraction,type ModalSubmitInteraction} from 'discord.js';
import {DomainError,PermissionEngine,type ConfigService} from '../../../../packages/core/src/index.js';
import {CAPABILITY_MATRIX} from '../../../../packages/contracts/src/generated/capabilities.js';
import {PrismaEventsRepository,type EventContext,type EventPolicy,type RaceData,type RaceView,type PreparedEventClose} from '../../../../packages/features-events/src/prisma-repository.js';
import {eventRandom,raceSnapshot} from '../../../../packages/features-events/src/domain.js';
import {fightSnapshot} from '../../../../packages/features-events/src/fight.js';
import {renderRace} from '../../../../packages/features-events/src/render.js';
import {renderEventNotice} from '../../../../packages/features-events/src/wide-render.js';
import {rasterizeSvg,rasterizeTimeline} from '../../../../packages/renderer/src/raster.js';
import {AnimationAssets} from '../../../../packages/renderer/src/animation-assets.js';
import {eventWindow,waitingCountdown} from './event-window.js';
import {funChannelAllowed} from './fun-channels.js';
import {interactiveGameChannelAllowed} from './interactive-game-channels.js';
import eventHelp from '../../../../packages/content/help/events.json' with {type:'json'};
const callouts=['Chairs to the starting line. Who has the fastest seat?','The lounge has a finish line. Pick your chair.','Six seats. One sprint. Chairs, assemble.'];
function raceWaitingText(view:RaceView,now:number){
 const names=view.racers.map(r=>r.name.replace(/\s+/g,' ').replace(/[\\*_~`|<>]/g,'').slice(0,22)).join(' · ');
 const open=6-view.racers.length;
 return `**RACE WAITING ROOM · ${waitingCountdown(view.expiresAt,now)} remaining**\n**Joined (${view.racers.length}/6):** ${names}\n**${open} open ${open===1?'seat':'seats'}** · **Wager pool:** ${view.pool} Ottomans`;
}
function fightWaitingText(view:RaceView){
 const [challenger,target]=view.racers;
 const deadline=Math.floor((view.expiresAt?.getTime()??Date.now())/1000);
 return `**FIGHT BETTING WINDOW · starts <t:${deadline}:R>**\n**${challenger?.name??'Challenger'}** vs **${target?.name??'Opponent'}** · **Wager pool:** ${view.pool} Ottomans`;
}
function fightProgress(view:RaceView){
 const combat=view.combat;
 return `${combat?.action?.atMs??0}:${combat?.hp.join(',')??'100,100'}:${combat?.finished?'finished':'live'}`;
}
export class DiscordEventsCoordinator {
 private readonly racePublications=new Map<string,Promise<string|undefined>>();
 private readonly refreshes=new Map<string,Promise<void>>();
 private readonly publishedVersions=new Map<string,string>();
 private readonly countdownVersions=new Map<string,string>();
 private readonly liveImages=new Map<string,string>();
 private readonly prepared=new Map<string,{key:string;preview:PreparedEventClose;payload?:Awaited<ReturnType<DiscordEventsCoordinator['payload']>>}>();
 private readonly preparing=new Set<string>();
 private publicationKey(value:RaceView){return JSON.stringify([value.state,value.expiresAt,value.extensionUsed,value.racers,value.pool,value.bets,value.result,value.winnerId,value.cancelReason]);}
 private visualKey(view:RaceView){return JSON.stringify([view.type,view.racers,view.pool,view.bets,view.extensionUsed]);}
 private prepare(view:RaceView){
  if(view.type==='fight'||view.state!=='OPEN')return;
  const key=this.visualKey(view);
  if(view.racers.length<2||this.preparing.has(view.id)||this.prepared.get(view.id)?.key===key||typeof this.repo.prepareClose!=='function')return;
  if((view.expiresAt?.getTime()??0)-Date.now()<10000)return;
  this.preparing.add(view.id);
  void (async()=>{
   const preview=await this.repo.prepareClose(view.guildId,view.id);if(!preview)return;
   if(this.prepared.size>=8)this.prepared.delete(this.prepared.keys().next().value!);
   const entry:{key:string;preview:PreparedEventClose;payload?:Awaited<ReturnType<DiscordEventsCoordinator['payload']>>}={key,preview};this.prepared.set(view.id,entry);
   const payload=await eventTiming('animation.prepare',()=>this.payload({...view,state:'LOCKED'},{timeline:{...preview.data,racers:view.racers,startedAt:new Date(Date.now()+600000).toISOString()}}));
   if(this.prepared.get(view.id)===entry)entry.payload=payload;
  })().catch(()=>{this.prepared.delete(view.id);}).finally(()=>this.preparing.delete(view.id));
 }
 private sweeping=false;
 constructor(private readonly repo:PrismaEventsRepository,private readonly config:ConfigService,private readonly eligible:(g:string,u:string)=>Promise<boolean>,private readonly maximumWager?:(guildId:string)=>Promise<bigint|undefined>){}
 async policy(guildId:string):Promise<EventPolicy>{const [min,max,adaptive]=await Promise.all([this.config.get(guildId,'events.min_bet'),this.config.get(guildId,'events.max_bet'),this.maximumWager?.(guildId)]);const configured=BigInt(Number(max));return{minBet:BigInt(Number(min)),maxBet:adaptive===undefined?configured:adaptive<configured?adaptive:configured};}
 private async guard(guildId:string,userId:string,channelId:string,kind='race',legacyPrefix=false){
  const [enabled,channelAllowed,eligible]=await Promise.all([this.config.get(guildId,'features.'+kind),kind==='fight'?funChannelAllowed(this.config,guildId,channelId,'fight'):interactiveGameChannelAllowed(this.config,guildId,channelId,legacyPrefix),this.eligible(guildId,userId)]);
  if(enabled!==true)throw new DomainError('EVENT_DISABLED','This event is not enabled yet.');
  if(!channelAllowed)throw new DomainError('EVENT_CHANNEL',kind==='fight'?'Use Fight in an approved channel.':'Use events in the main chat, Gaming Chair, or Bots Don’t Sit.');
  if(!new PermissionEngine({'events.use':CAPABILITY_MATRIX.capabilities['events.use']}).can('member','events.use')||!eligible)throw new DomainError('EVENT_RESTRICTED','Event controls are unavailable while restricted.');
 }
 async message(message:Message){
  if(message.content.trim()!=='!race'||message.author.bot||!message.guildId||!message.guild)return;
  const correlationId=`race:${message.id}`;
  const fail=(stage:string,error:unknown)=>console.warn('Legacy race trigger failed.',{correlationId,stage,guildId:message.guildId,channelId:message.channelId,code:error instanceof DomainError?error.code:error instanceof Error?error.name:'UNKNOWN'});
  try{
  if(message.channel&&'sendTyping' in message.channel)void message.channel.sendTyping().catch(()=>{});
  const channelName='name' in message.channel?message.channel.name:undefined;
  const namedMainChat=typeof channelName==='string'&&/^((main[-_ ]?chat)|(sit[-_ ]and[-_ ]chat))$/i.test(channelName.replace(/^.*?([a-z].*)$/i,'$1'));
  if(!namedMainChat&&!await interactiveGameChannelAllowed(this.config,message.guildId,message.channelId,true,channelName??undefined))return;
  if(await this.config.get(message.guildId,'special_commands.enabled')!==true)return;
  const [member,accessValue]=await Promise.all([message.guild.members.fetch(message.author.id),this.config.get(message.guildId,'special_commands.access_roles')]);const access=accessValue as Record<string,unknown>;
  const roles=access?.['!race']??[];if(!Array.isArray(roles)||roles.some(r=>typeof r!=='string'))throw new Error('Invalid Race access-role configuration.');if(roles.length&&!roles.some(r=>member.roles.cache.has(r)))return;
  try{await this.guard(message.guildId,message.author.id,message.channelId,'race',true);}catch(error){console.warn('Legacy race command rejected.',{guildId:message.guildId,channelId:message.channelId,code:error instanceof DomainError?error.code:'UNKNOWN'});return;}
  if(!message.channel.isSendable())return;
  const sessionMessageId=await this.queueRace(message,member);
  if(sessionMessageId)try{await message.delete();}catch{throw new Error('Race trigger could not be removed.');}
  }catch(error){fail('message-to-session-publication',error);}
 }
 async startRace(i:ChatInputCommandInteraction){try{
  if(!i.deferred)await i.deferReply({ephemeral:true});
  if(!i.guildId||!i.guild||!i.channelId||!i.channel?.isSendable())throw new DomainError('SERVER_ONLY','Use Race in the server main chat.');
  const [enabled,accessValue,member]=await Promise.all([this.config.get(i.guildId,'special_commands.enabled'),this.config.get(i.guildId,'special_commands.access_roles'),i.guild.members.fetch(i.user.id)]);
  if(enabled!==true)throw new DomainError('EVENT_DISABLED','Race is not enabled yet.');
  const roles=(accessValue as Record<string,unknown>)?.['!race'];
  if(!Array.isArray(roles)||roles.some(r=>typeof r!=='string'))throw new DomainError('EVENT_CONFIG','Race access roles need configuration.');
  if(roles.length&&!roles.some(r=>member.roles.cache.has(r)))throw new DomainError('EVENT_RESTRICTED','You do not have access to start Race.');
  // Legacy Race sessions can be joined from the configured main chat as
  // well as the dedicated games/bot channels.
  await this.guard(i.guildId,i.user.id,i.channelId,'race',true);
  const sent=await this.queueRace({id:i.id,guild:i.guild,guildId:i.guildId,channelId:i.channelId,channel:i.channel},member);
  if(!sent)throw new DomainError('EVENT_ACTIVE','A Race or Fight is already active here.');
  await i.deleteReply();
 }catch(error){const content=error instanceof DomainError?error.message:'Race could not start. Please try again.';if(i.deferred)await i.editReply({content});else await i.reply({ephemeral:true,content});}}
 private async queueRace(source:Pick<Message,'id'|'guild'|'guildId'|'channel'|'channelId'>,member:GuildMember){
  // Both entry commands share one in-flight publication; the serializable repository
  // also rejects competing active sessions across workers/restarts.
  const key=source.guildId+':'+source.channelId,existing=this.racePublications.get(key);if(existing)return existing;
  const publication=this.publishRace(source,member);this.racePublications.set(key,publication);
  try{return await publication;}finally{if(this.racePublications.get(key)===publication)this.racePublications.delete(key);}
 }
 private async publishRace(message:Pick<Message,'id'|'guild'|'guildId'|'channel'|'channelId'>,member:GuildMember){
  if(!message.guild||!message.guildId||!message.channel.isSendable())return;
  let id:string|undefined;
  try{
   const roleMap=await this.config.get(message.guildId,'special_commands.builtin_role_map') as Record<string,unknown>,role=roleMap?.['!race'];
   const notification=await notificationRole(message.guild,message.channelId,typeof role==='string'?role:null,this.config);
   id=(await this.repo.startRace({guildId:message.guildId,channelId:message.channelId,userId:member.id,requestKey:message.id},{userId:member.id,name:member.displayName,avatarUrl:member.displayAvatarURL({size:128,extension:'png'})})).sessionId;
   const initial=await this.repo.publicView(id);if(initial.messageId)return initial.messageId;
   if(initial.state!=='OPEN')return;
   const {callout,allowedMentions}=notificationMessage(notification,callouts[eventRandom(callouts.length)]!);
   const {content:_clearContent,...payload}=await this.payload(initial,{callout});
   // Discord additionally deduplicates overlapping network sends for this trigger.
   const sent=await message.channel.send({...payload,allowedMentions,nonce:message.id,enforceNonce:true});
   await this.repo.linkMessage(id,message.guildId,sent.id);this.publishedVersions.set(id,this.publicationKey(initial));this.countdownVersions.set(id,waitingCountdown(initial.expiresAt));this.prepare(initial);return sent.id;
  }catch(error){if(id)await this.repo.cancel(message.guildId,id,'Race could not be published; wagers refunded.');if(error instanceof DomainError&&error.code==='EVENT_ACTIVE')return;throw error;}
 }

 async startFight(i:ChatInputCommandInteraction){let id:string|undefined,published=false;try{
  if(!i.guildId||!i.guild||!i.channelId)throw new DomainError('SERVER_ONLY','Use Fight in the server.');
  const target=i.options.getUser('member',true);if(target.id===i.user.id||target.bot)throw new DomainError('FIGHT_TARGET','Choose another eligible member.');
  await eventTiming('fight.ack',()=>i.deferReply());
  // The interaction already supplies the current guild member in normal use. Avoid
  // two forced REST fetches before the first visible Fight card, while retaining a
  // fetch fallback for a cold cache.
  const [,targetEligible]=await Promise.all([
   this.guard(i.guildId,i.user.id,i.channelId,'fight'),
   this.eligible(i.guildId,target.id),
  ]);
  if(!targetEligible)throw new DomainError('FIGHT_TARGET','That member cannot participate right now.');
  const member=(user:string)=>i.guild!.members.cache?.get(user)??i.guild!.members.fetch({user});
  const fighters=await Promise.all([i.user.id,target.id].map(member));
  if(fighters.some(m=>m.isCommunicationDisabled()||!m.permissionsIn(i.channelId!).has(PermissionFlagsBits.ViewChannel|PermissionFlagsBits.SendMessages)))throw new DomainError('FIGHT_TARGET','Both fighters need access to participate in main chat.');
  id=(await this.repo.startFight({guildId:i.guildId,channelId:i.channelId,userId:i.user.id,requestKey:i.id},fighters.map(m=>({userId:m.id,name:m.displayName,...(m.joinedAt?{joinedAt:m.joinedAt.toISOString()}:{}),avatarUrl:m.displayAvatarURL({size:128,extension:'png'})})))).sessionId;
  const initial=await this.repo.publicView(id);
  const message=await i.editReply(await this.payload(initial));published=true;await this.repo.linkMessage(id,i.guildId,message.id);this.publishedVersions.set(id,this.publicationKey(initial));
 }catch(error){if(id&&i.guildId)await this.repo.cancel(i.guildId,id,'Fight could not be published; wagers refunded.');const content=error instanceof DomainError?error.message:'Fight could not start. Try again when both members are available.';if(published||i.replied)await i.followUp({ephemeral:true,content});else if(i.deferred){await i.deleteReply();await i.followUp({ephemeral:true,content});}else await i.reply({ephemeral:true,content});}}
 async memberLeft(client:Client,guildId:string,userId:string){const affected=(await this.repo.active(guildId)).filter(r=>r.type==='fight');await this.repo.memberLeft(guildId,userId);for(const row of affected)await this.refresh(client,row.id);}
 async verifyFighters(client:Client,id:string){const view=await this.repo.publicView(id);if(view.type!=='fight'||!['OPEN','LOCKED'].includes(view.state))return;const guild=await client.guilds.fetch(view.guildId);for(const fighter of view.racers){try{const current=await guild.members.fetch({user:fighter.userId,force:true});if(fighter.joinedAt&&current.joinedAt&&current.joinedAt.toISOString()!==fighter.joinedAt){await this.repo.cancel(view.guildId,id,'A fighter left and rejoined; all wagers refunded.');return;}}catch(error){if(error&&typeof error==='object'&&'code' in error&&Number(error.code)===10007){await this.repo.memberLeft(view.guildId,fighter.userId);return;}throw error;}}}
 async advance(client:Client,guildId:string,id:string,settle:boolean){return eventTiming(settle?'event.final-transition':'event.waiting-to-combat',async()=>{await eventTiming('event.verify-members',()=>this.verifyFighters(client,id));if(settle)await eventTiming('event.settle',()=>this.repo.settle(guildId,id));else await eventTiming('event.close',()=>this.repo.closeBetting(guildId,id,this.prepared.get(id)?.preview));await eventTiming('event.transition-publication',()=>this.refresh(client,id));});}
 async handle(i:ButtonInteraction|ModalSubmitInteraction){let silent=false;try{
  if(!i.guildId||!i.guild||!i.channelId)throw new DomainError('SERVER_ONLY','Use event controls in the server.');
  const parts=i.customId.split(':'),action=parts[1],id=action==='wager'?parts[3]:parts[2];if(!id)throw new DomainError('EVENT_CONTROL','This event control is unavailable.');
  if(i.isButton()&&action==='bet'){
   await i.showModal(new ModalBuilder().setCustomId(`${parts[0]}:wager:${i.user.id}:${id}:${parts[3]}`).setTitle(parts[0]==='fight'?'Fight wager':'Race wager').addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId('amount').setLabel('Ottomans to add to your wager').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(7))));return;
  }
  // Acknowledge before configuration, eligibility, session reads or raster work.
  if(i.isModalSubmit()&&action==='wager'&&!i.deferred)await i.deferReply({ephemeral:true});
  if(i.isButton()&&action==='rules'&&!i.deferred)await i.deferReply({ephemeral:true});
  if(i.isButton()&&(action==='join'||action==='extend'||action==='start_now')){silent=true;if(!i.deferred)await eventTiming('event.ack',()=>i.deferUpdate());}
  await this.guard(i.guildId,i.user.id,i.channelId,i.customId.startsWith('fight:')?'fight':'race',!i.customId.startsWith('fight:'));
  const c:EventContext={guildId:i.guildId,channelId:i.channelId,userId:i.user.id,requestKey:i.id};
  const view=await this.repo.publicView(id);if(view.type&&view.type!==(parts[0]==='fight'?'fight':'race'))throw new DomainError('EVENT_CONTROL','Use the original event controls.');if(view.guildId!==i.guildId||view.channelId!==i.channelId)throw new DomainError('EVENT_CHANNEL','Use this event’s original message.');
  if(i.isButton()&&action==='rules'){const title=view.type==='fight'?'Fight rules':'Race rules',copy=(view.type==='fight'?eventHelp.fight:eventHelp.race)+'\n\n'+eventHelp.body;const {content:_content,...payload}=eventWindow({title,description:'',filename:'event-rules.png',image:await rasterizeSvg(renderEventNotice(title,copy)),rows:[]});await i.editReply(payload);return;}
  silent=i.isButton();if(silent){if(!i.deferred)await (i as ButtonInteraction).deferUpdate();}else if(!i.deferred)await i.deferReply({ephemeral:true});let content='Race updated.';
  if(i.isButton()&&action==='join'){const member=await i.guild.members.fetch(i.user.id);await this.repo.join(c,id,{userId:member.id,name:member.displayName,avatarUrl:member.displayAvatarURL({size:128,extension:'png'})});content='Your racer spot is saved.';}
  else if(i.isButton()&&action==='extend'){await this.repo.extend(c,id);content=view.type==='fight'?'Betting extended by 30 seconds.':'Entry and betting extended by 30 seconds.';}
  else if(i.isButton()&&action==='start_now'){await this.repo.startNow(c,id,this.prepared.get(id)?.preview);content='The Race is starting now.';}
  else if(i.isModalSubmit()&&action==='wager'){
   if(!view.racers.some(r=>r.userId===parts[4]))throw new DomainError('RACER_MISSING','Choose a current racer.');
   if(parts[2]!==i.user.id)throw new DomainError('OWNER_ONLY','Open your own wager modal.');const raw=i.fields.getTextInputValue('amount');if(!/^\d{1,7}$/.test(raw))throw new DomainError('WAGER_AMOUNT','Enter a whole Ottoman amount.');
   const result=await this.repo.bet(c,id,parts[4]!,BigInt(raw),await this.policy(i.guildId));content=`Wager confirmed: ${result.total} Ottomans total. Your selection is locked.`;
  }else throw new DomainError('EVENT_CONTROL','This event control is unavailable.');
  if(!silent)await i.deleteReply();
  try{await this.refresh(i.client,id);}catch{await i.followUp({ephemeral:true,content:'Your action is saved. The public card refresh is pending.'});}
 }catch(error){const content=error instanceof DomainError?error.message:'The event update could not be completed. Check its saved state before retrying.';if(i.replied||silent&&i.deferred)await i.followUp({ephemeral:true,content});else if(i.deferred)await i.editReply({content});else await i.reply({ephemeral:true,content});}}
 async payload(view:RaceView,options:{animate?:boolean;retainImageUrl?:string;callout?:string;timeline?:RaceData;nowMs?:number}={}){
  const now=options.nowMs??Date.now(),waitingMs=Math.max(0,Math.ceil(((view.expiresAt?.getTime()??now)-now)/10)*10);
  const fight=view.type==='fight',prefix=fight?'fight':'event',live=view.state==='LOCKED',saved=options.timeline,plan=fight?saved?.fightPlan:saved?.plan,animate=live&&options.animate!==false&&Boolean(plan&&saved?.startedAt),filename=`${fight?'fight':'race'}-${view.state.toLowerCase()}.${animate||options.retainImageUrl?'gif':'png'}`,open=view.state==='OPEN',components:ActionRowBuilder<ButtonBuilder>[]=[];
  const render=(imageView:RaceView=view,phase=0,remaining=waitingMs)=>{const motion={phase,waitingMs:remaining,...(options.callout?{callout:options.callout.replace(/<@&[^>]+>\s*/g,'')}: {})};return fight?renderFight(imageView,motion,'wide'):renderRace(imageView,'wide',motion);};
  let image:Buffer|undefined;
  if(!options.retainImageUrl){
   if(animate&&saved?.startedAt&&plan){
    // Only locked wagers and rendered snapshots leave this process; the private plan is never serialized in the payload.
    const end=Math.ceil(plan.durationMs/10)*10,times=[0];
    if(fight&&saved.fightPlan){for(const beat of saved.fightPlan.beats){const at=Math.ceil(beat.atMs/10)*10,previous=times.at(-1)!;if(at-previous>=20)times.push(Math.floor((previous+at)/20)*10);if(at>times.at(-1)!)times.push(at);}}
    else for(let at=100;at<end;at+=100)times.push(at);
    if(times.at(-1)!<end)times.push(end);
    const artwork=new AnimationAssets();
    const frames:string[]=[];
    for(const [index,at] of times.entries()){frames.push(artwork.pack(render({...view,...(fight&&saved.fightPlan?{combat:fightSnapshot(saved.fightPlan,at,view.racers)}:saved.plan?{motion:raceSnapshot(saved.plan,at)}:{})},fight?at/1000%1:at/end)));if(index%16===15)await new Promise<void>(resolve=>setImmediate(resolve));}
    image=await rasterizeTimeline(frames,times.map((at,index)=>index+1<times.length?times[index+1]!-at:1000),new Date(saved.startedAt).getTime(),artwork.assets);
   }else image=await rasterizeSvg(render());
  }
  if(open){
   const join=new ButtonBuilder().setCustomId('event:join:'+view.id).setLabel('Join Race').setStyle(ButtonStyle.Primary).setDisabled(view.racers.length>=6);
   const startNow=!fight?new ButtonBuilder().setCustomId('event:start_now:'+view.id).setLabel('Start Now').setStyle(ButtonStyle.Success).setDisabled(view.racers.length<2):undefined;
   const secondary=[new ButtonBuilder().setCustomId(prefix+':extend:'+view.id).setLabel('+30 Seconds').setStyle(ButtonStyle.Secondary).setDisabled(view.extensionUsed),new ButtonBuilder().setCustomId(prefix+':rules:'+view.id).setLabel('Rules').setStyle(ButtonStyle.Secondary)];
   const bets=view.racers.map(r=>new ButtonBuilder().setCustomId(prefix+':bet:'+view.id+':'+r.userId).setLabel('Bet · '+r.name.slice(0,24)).setStyle(fight?ButtonStyle.Primary:ButtonStyle.Secondary));
   if(!fight&&bets.length<=1){components.push(new ActionRowBuilder<ButtonBuilder>().addComponents(join,...bets));components.push(new ActionRowBuilder<ButtonBuilder>().addComponents(startNow!,...secondary));}
   else{
    if(!fight){components.push(new ActionRowBuilder<ButtonBuilder>().addComponents(join,startNow!));components.push(new ActionRowBuilder<ButtonBuilder>().addComponents(...secondary));}
    const size=Math.ceil(bets.length/Math.max(1,Math.ceil(bets.length/3)));
    for(let start=0;start<bets.length;start+=size)components.push(new ActionRowBuilder<ButtonBuilder>().addComponents(...bets.slice(start,start+size)));
    if(fight)components.push(new ActionRowBuilder<ButtonBuilder>().addComponents(...secondary));
   }
  }
  return eventWindow({title:fight?'Robo Chair Fight':'Chair Race',description:'',filename,...(image?{image}:{}),rows:components,...(options.retainImageUrl?{imageUrl:options.retainImageUrl}:{}),...(open?{countdown:fight?fightWaitingText(view):raceWaitingText(view,now)}:{}),...(options.callout?{callout:options.callout}:{})});
 }
 async refresh(client:Client,id:string){const previous=this.refreshes.get(id)??Promise.resolve();const current=previous.catch(()=>{}).then(async()=>{let view=await eventTiming('event.read',()=>this.repo.publicView(id));if(!view.messageId)return;const version=(value:RaceView)=>this.publicationKey(value);let key=version(view),tick=view.type==='race'&&view.state==='OPEN'?waitingCountdown(view.expiresAt):undefined;const sameState=this.publishedVersions.get(id)===key;if(sameState&&(!tick||this.countdownVersions.get(id)===tick))return;const channel=await client.channels.fetch(view.channelId);if(!channel?.isTextBased()||!('messages' in channel))throw new Error('Event channel unavailable.');const message=await channel.messages.fetch(view.messageId);if(message.author.id!==client.user?.id)throw new Error('Event message author mismatch.');
  const filename=`${view.type==='fight'?'fight-locked.gif':'race-locked.gif'}`,existing=view.state==='LOCKED'?message.attachments?.find?.(attachment=>attachment.name===filename):undefined;
  const openImage=view.type==='race'&&view.state==='OPEN'?message.attachments?.find(attachment=>attachment.name==='race-open.png')?.url:undefined;
  const retainImageUrl=view.state==='LOCKED'?(existing?.url??this.liveImages.get(id)):sameState?openImage:undefined;
  const saved=view.state==='LOCKED'&&!retainImageUrl&&typeof this.repo.get==='function'?await this.repo.get(id):undefined;
  const prepared=this.prepared.get(id);
  const samePlan=saved&&prepared&&presentationKey({plan:saved.data.plan,fightPlan:saved.data.fightPlan})===presentationKey({plan:prepared.preview.data.plan,fightPlan:prepared.preview.data.fightPlan});
  let payload=!retainImageUrl&&samePlan&&prepared?.key===this.visualKey(view)&&prepared.payload?prepared.payload:await eventTiming('event.render',()=>this.payload(view,retainImageUrl?{retainImageUrl}:saved?.state==='LOCKED'?{timeline:saved.data}:{}));
  if(view.state!=='OPEN')this.prepared.delete(id);
  // Rendering may span the end of a round. Never overwrite a persisted result/cancellation with stale live art.
  if(view.state==='LOCKED'||view.state==='OPEN'){const latest=await this.repo.publicView(id);if(latest.state!==view.state||latest.expiresAt?.getTime()!==view.expiresAt?.getTime()){view=latest;key=version(view);const latestSaved=view.state==='LOCKED'&&typeof this.repo.get==='function'?await this.repo.get(id):undefined;payload=await this.payload(view,latestSaved?.state==='LOCKED'?{timeline:latestSaved.data}:{});}}
  await eventTiming('event.edit-upload',()=>message.edit(payload));
  if(view.state==='LOCKED'&&(retainImageUrl||payload.files?.some(file=>file.name===filename)))this.liveImages.set(id,retainImageUrl??'attachment://'+filename);else this.liveImages.delete(id);
  this.publishedVersions.set(id,key);if(tick)this.countdownVersions.set(id,tick);else this.countdownVersions.delete(id);this.prepare(view);});this.refreshes.set(id,current);try{await current;}finally{if(this.refreshes.get(id)===current)this.refreshes.delete(id);}}
 async sweep(client:Client){if(this.sweeping)return;this.sweeping=true;try{for(const event of await this.repo.active()){
  if(event.expiresAt&&event.expiresAt<=new Date()){await this.advance(client,event.guildId,event.id,event.state==='LOCKED');continue;}
  await this.refresh(client,event.id);
 }}finally{this.sweeping=false;}}
}
