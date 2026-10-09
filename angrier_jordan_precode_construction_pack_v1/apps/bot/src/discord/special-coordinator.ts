import {normalizeNotificationTrigger,notificationRole,notificationMessage} from './notification-roles.js';
import {eventTiming} from './event-performance.js';
import {eventWindow,hasLineIdentity} from './event-window.js';
import {LINE_DURATION_MS} from '../../../../packages/features-special/src/domain.js';
import {randomInt,createHash} from 'node:crypto';
import {ActionRowBuilder,AttachmentBuilder,ButtonBuilder,ButtonStyle,EmbedBuilder,type Client,type Message,type ButtonInteraction} from 'discord.js';
import {DeliveryEngine,DomainError,PermissionEngine,type ConfigService} from '../../../../packages/core/src/index.js';
import {CAPABILITY_MATRIX} from '../../../../packages/contracts/src/generated/capabilities.js';
import {PrismaSpecialRepository,type LineView} from '../../../../packages/features-special/src/prisma-repository.js';
import {validateBuiltinRoleMap,validateCustomSpecialCommands,mayInvokeSpecial,type SpecialCommand} from '../../../../packages/features-special/src/domain.js';
import {renderLine,lineSequence} from '../../../../packages/features-special/src/render.js';
import {rasterizeSvg,rasterizeSequence,rasterizeTimeline} from '../../../../packages/renderer/src/raster.js';
import builtinCallouts from '../../../../packages/features-special/content/builtin_callouts.json' with {type:'json'};
import {interactiveGameChannelAllowed} from './interactive-game-channels.js';
export const specialDeliveryUrl=(marker:string)=>'https://discord.com/#'+createHash('sha256').update(marker).digest('hex');
export class DiscordSpecialCoordinator {
 private readonly refreshes=new Map<string,Promise<void>>();
 private readonly publishedVersions=new Map<string,string>();
 private readonly finales=new Map<string,{key:string;payload?:Awaited<ReturnType<DiscordSpecialCoordinator['payload']>>}>();
 private readonly preparing=new Set<string>();
 private finaleKey(view:LineView){return JSON.stringify([view.ownerId,view.members,view.extensionUsed]);}
 private prepareFinale(view:LineView){
  if(view.state!=='OPEN'){if(!['LOCKED','SETTLING'].includes(view.state))this.finales.delete(view.id);return;}
  const key=this.finaleKey(view);if(this.preparing.has(view.id)||this.finales.get(view.id)?.key===key)return;
  this.preparing.add(view.id);if(this.finales.size>=8)this.finales.delete(this.finales.keys().next().value!);
  const entry:{key:string;payload?:Awaited<ReturnType<DiscordSpecialCoordinator['payload']>>}={key};this.finales.set(view.id,entry);
  void eventTiming('line.prepare',()=>this.payload({...view,state:'SETTLING',elapsedMs:0,durationMs:LINE_DURATION_MS})).then(payload=>{if(this.finales.get(view.id)===entry)entry.payload=payload;}).catch(()=>this.finales.delete(view.id)).finally(()=>this.preparing.delete(view.id));
 }
 private readyFinale(view:LineView){const entry=this.finales.get(view.id);return entry?.key===this.finaleKey(view)?entry.payload:undefined;}
 private sweeping=false;
 constructor(private readonly repo:PrismaSpecialRepository,private readonly config:ConfigService,private readonly eligible:(g:string,u:string)=>Promise<boolean>){}
 private async guard(guildId:string,userId:string,channelId:string,line=true,channelName?:string){
  const [special,enabled,lineEnabled,channelAllowed,eligible]=await Promise.all([this.config.get(guildId,'features.special_commands'),this.config.get(guildId,'special_commands.enabled'),line?this.config.get(guildId,'features.line'):true,interactiveGameChannelAllowed(this.config,guildId,channelId,line,channelName),this.eligible(guildId,userId)]);
  if(special!==true||enabled!==true||lineEnabled!==true)throw new DomainError('SPECIAL_DISABLED','Special Commands are not enabled yet.');
  if(!channelAllowed)throw new DomainError('SPECIAL_CHANNEL','Use Special Commands in the main chat, Gaming Chair, or Bots Don’t Sit.');
  if(!new PermissionEngine({'events.use':CAPABILITY_MATRIX.capabilities['events.use']}).can('member','events.use')||!eligible)throw new DomainError('SPECIAL_RESTRICTED','Special Command controls are unavailable while restricted.');
 }
 async definitions(guildId:string):Promise<SpecialCommand[]>{
  const [customValue,roleValue,accessValue,poolValue]=await Promise.all(['special_commands.custom_commands','special_commands.builtin_role_map','special_commands.access_roles','special_commands.builtin_response_pools'].map(key=>this.config.get(guildId,key)));
  const custom=validateCustomSpecialCommands(customValue),roles=validateBuiltinRoleMap(roleValue),access=(accessValue&&typeof accessValue==='object'?accessValue:{}) as Record<string,unknown>,pools=(poolValue&&typeof poolValue==='object'?poolValue:{}) as Record<string,unknown>;
  return [...(['!line','!vc','!chess'] as const).map(trigger=>{const allowed=access?.[trigger]??[],pool=pools?.[trigger]??[];if(!Array.isArray(allowed)||allowed.some(r=>typeof r!=='string')||!Array.isArray(pool)||pool.some(s=>typeof s!=='string'||!s.trim()||s.length>1500))throw new DomainError('SPECIAL_CONFIG','Invalid built-in Special Command configuration.');return{trigger,notificationRoleId:typeof roles?.[trigger]==='string'?roles[trigger] as string:null,responsePool:pool.length?pool as string[]:builtinCallouts[trigger],enabled:true,allowedRoleIds:allowed as string[]};}),...custom];
 }
 async visibleCommands(guildId:string,roleIds:ReadonlySet<string>){if(await this.config.get(guildId,'features.special_commands')!==true||await this.config.get(guildId,'special_commands.enabled')!==true)return[];const lineEnabled=await this.config.get(guildId,'features.line')===true;return(await this.definitions(guildId)).filter(d=>d.enabled&&d.responsePool.length&&mayInvokeSpecial(d.allowedRoleIds,roleIds)&&(d.trigger!=='!line'||lineEnabled));}
 async message(message:Message){
  const trigger=normalizeNotificationTrigger(message.content);if(!/^![a-z][a-z0-9_-]{0,31}$/.test(trigger)||trigger==='!race'||message.author.bot||!message.guildId||!message.guild)return;
  const correlationId=`${trigger.slice(1)}:${message.id}`;
  const fail=(stage:string,error:unknown)=>console.warn('Legacy special trigger failed.',{correlationId,trigger,stage,guildId:message.guildId,channelId:message.channelId,code:error instanceof DomainError?error.code:error instanceof Error?error.name:'UNKNOWN'});
  try{
  if(trigger==='!line'&&message.channel&&'sendTyping' in message.channel)void message.channel.sendTyping().catch(()=>{});
  const definition=(await this.definitions(message.guildId)).find(d=>d.trigger===trigger);if(!definition)return;
  if(!definition.enabled)return;
  const member=await message.guild.members.fetch({user:message.author.id,force:true});if(!mayInvokeSpecial(definition.allowedRoleIds,new Set(member.roles.cache.keys())))return;
  try{await this.guard(message.guildId,message.author.id,message.channelId,trigger==='!line',message.channel&&'name' in message.channel?(message.channel.name??undefined):undefined);}catch(error){console.warn('Legacy special command rejected.',{trigger,guildId:message.guildId,channelId:message.channelId,code:error instanceof DomainError?error.code:'UNKNOWN'});return;}
  if(!definition.responsePool.length)throw new DomainError('SPECIAL_CONTENT','Configure an authored response pool before enabling this Special Command.');
  if(!message.channel.isSendable())return;
  const context={guildId:message.guildId,channelId:message.channelId,userId:message.author.id,requestKey:message.id};
  const notification=await notificationRole(message.guild,message.channelId,definition.notificationRoleId,this.config)??null;
  const content=definition.responsePool[randomInt(definition.responsePool.length)]!;
  if(trigger==='!line'){try{const started=await this.repo.start(context,member.displayName,{content,notificationRoleId:notification});if(started.jobId){const view=await this.repo.publicView(started.sessionId);this.prepareFinale(view);await this.deliver(message.client,started.jobId);await message.delete();}return;}catch(error){if(error instanceof DomainError&&error.code==='LINE_ACTIVE')return;throw error;}}
  await message.delete();
  const {jobId}=await this.repo.queueCallout(context,content,notification);await this.deliver(message.client,jobId);
  }catch(error){fail('message-to-publication',error);}
 }
 async deliver(client:Client,jobId:string){const{payload:p}=await this.repo.callout(jobId),channel=await client.channels.fetch(p.channelId);if(!channel?.isSendable()||!('messages' in channel))throw new Error('Special Command destination unavailable.');
  const delivery=this.repo.delivery(jobId),state=await delivery.read();
  // Permission errors must leave new delivery PENDING; recovery of an existing send needs no new ping permission.
  const notification=state.state==='PENDING'?await notificationRole(await client.guilds.fetch(p.guildId),p.channelId,p.notificationRoleId,this.config):undefined;
  const marker='special:'+jobId;
  const messageId=await new DeliveryEngine(delivery).deliver(marker,{
   find:async marker=>{const messages=await channel.messages.fetch({limit:100});return messages.find(m=>m.author.id===client.user?.id&&(m.embeds.some(e=>e.url===specialDeliveryUrl(marker)||e.footer?.text===marker)||Boolean(p.sessionId&&hasLineIdentity(m.components,p.sessionId))))?.id??null;},
   send:async marker=>{const {callout,allowedMentions:mentions}=notificationMessage(notification,p.content);if(p.sessionId){const view=await this.repo.publicView(p.sessionId);this.prepareFinale(view);const {content,...line}=await this.payload(view,callout),sent=await channel.send({...line,allowedMentions:mentions});this.publishedVersions.set(p.sessionId,JSON.stringify([view.state,view.members,view.extensionUsed,view.state==='OPEN'?view.expiresAt:null]));return sent.id;}return(await channel.send({embeds:[new EmbedBuilder().setAuthor({name:'Angrier Jordan'}).setTitle('Chairs, assemble.').setColor(0x0ea5a6).setURL(specialDeliveryUrl(marker))],content:callout,allowedMentions:mentions})).id;}
  });if(p.sessionId)await this.repo.linkMessage(p.sessionId,p.guildId,messageId);
 }
 async handle(i:ButtonInteraction){try{
  if(!i.guildId||!i.guild||!i.channelId)throw new DomainError('SERVER_ONLY','Use Line in the server.');
  const[prefix,action,id,pageRaw]=i.customId.split(':');if(prefix!=='line'||!id)throw new DomainError('LINE_CONTROL','This Line control is unavailable.');
  if(action==='roster'&&!i.deferred)await i.deferReply({ephemeral:true});
  else if(!i.deferred)await eventTiming('line.ack',()=>i.deferUpdate());
  // Line controls remain usable from the same legacy channels as !line,
  // including the configured main chat. Other special commands do not use
  // this interactive handler.
  await this.guard(i.guildId,i.user.id,i.channelId,true);
  const view=await this.repo.publicView(id);if(view.guildId!==i.guildId||view.channelId!==i.channelId||(action!=='roster'&&view.messageId!==i.message.id))throw new DomainError('LINE_CONTROL','Use this Line’s original message.');
  if(action==='roster'){const page=Math.max(0,Math.min(Math.floor((view.members.length-1)/20),Number(pageRaw)||0)),slice=view.members.slice(page*20,page*20+20);const buttons=new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId(`line:roster:${id}:${Math.max(0,page-1)}`).setLabel('Previous').setStyle(ButtonStyle.Secondary).setDisabled(page===0),new ButtonBuilder().setCustomId(`line:roster:${id}:${page+1}`).setLabel('Next').setStyle(ButtonStyle.Secondary).setDisabled((page+1)*20>=view.members.length));await i.editReply({content:slice.map(m=>`${m.status==='ready'?'✓':'…'} <@${m.userId}>${m.userId===view.ownerId?' · Host':''}`).join('\n'),components:[buttons],allowedMentions:{parse:[]}});return;}
  if(!i.deferred)await i.deferUpdate();const c={guildId:i.guildId,channelId:i.channelId,userId:i.user.id,requestKey:i.id};
  if(action==='ready'||action==='waiting'){const member=await i.guild.members.fetch(i.user.id);await this.repo.checkIn(c,id,member.displayName,action);}
  else if(action==='extend')await this.repo.extend(c,id);
  else if(action==='start'){
   const shameEnabled=await this.config.get(i.guildId,'line.shame_enabled')===true,preview=await this.repo.previewCountdown(c,id,shameEnabled),current=await this.repo.publicView(id);
   const payload=this.readyFinale(current)??await this.payload({...current,state:'SETTLING',elapsedMs:0,shame:preview.shame});
   const previous=this.refreshes.get(id)??Promise.resolve(),publish=previous.catch(()=>{}).then(async()=>{
    await this.repo.countdown(c,id,shameEnabled,preview);
    await i.message.edit(payload);this.publishedVersions.set(id,JSON.stringify(['SETTLING',current.members,current.extensionUsed,null]));
   });this.refreshes.set(id,publish);try{await publish;}finally{if(this.refreshes.get(id)===publish)this.refreshes.delete(id);}
  }
  else if(action==='cancel')await this.repo.cancel(c,id);
  else throw new DomainError('LINE_CONTROL','This Line control is unavailable.');
  try{await this.refresh(i.client,id);}catch{await i.followUp({ephemeral:true,content:'Your action is saved. The public update is pending.'});}
 }catch(error){const content=error instanceof DomainError?error.message:'The Line update could not be completed. Check its saved state before retrying.';if(i.replied||i.deferred)await i.followUp({ephemeral:true,content});else await i.reply({ephemeral:true,content});}}
 async payload(view:LineView,callout?:string,options:{imageUrl?:string}={}){
  const live=view.state==='SETTLING'&&view.elapsedMs<(view.durationMs??LINE_DURATION_MS),sequence=live?lineSequence(view,'wide',true):null,animated=Boolean(sequence&&sequence.frames.length>1),waiting=view.state==='OPEN'&&view.remainingMs>0;
  let image:Buffer|undefined;
  if(!options.imageUrl){
   if(sequence&&animated)image=await rasterizeSequence(sequence.frames,sequence.delays,sequence.assets);
   else image=await rasterizeSvg(renderLine(view,view.elapsedMs,'wide',callout));
  }
  const filename=animated?'line-live.gif':'line.png',components:ActionRowBuilder<ButtonBuilder>[]=[];
  const roster=new ButtonBuilder().setCustomId('line:roster:'+view.id+':0').setLabel('Check-ins').setStyle(ButtonStyle.Secondary);
  if(view.state==='OPEN')components.push(new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId('line:ready:'+view.id).setLabel('I’m In').setStyle(ButtonStyle.Success),new ButtonBuilder().setCustomId('line:waiting:'+view.id).setLabel('I Need a Second').setStyle(ButtonStyle.Secondary)));
  if(['OPEN','LOCKED'].includes(view.state))components.push(new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId('line:start:'+view.id).setLabel('Start Countdown').setStyle(ButtonStyle.Primary),...(view.state==='OPEN'?[new ButtonBuilder().setCustomId('line:extend:'+view.id).setLabel('+30 Seconds').setStyle(ButtonStyle.Secondary).setDisabled(view.extensionUsed)]:[roster]),new ButtonBuilder().setCustomId('line:cancel:'+view.id).setLabel('Cancel Line').setStyle(ButtonStyle.Danger)));
  if(live)components.push(new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId('line:status:'+view.id).setLabel('Countdown live').setStyle(ButtonStyle.Secondary).setDisabled(true)));
  if(['CLOSED','CANCELLED'].includes(view.state))components.push(new ActionRowBuilder<ButtonBuilder>().addComponents(roster));
  const statusRoster=(status:'ready'|'waiting')=>{const members=view.members.filter(m=>m.status===status),names=members.slice(0,6).map(m=>m.name.replace(/[`*_~>|@\r\n]/g,'').slice(0,24));return names.join(' · ')+(members.length>6?` · +${members.length-6} more`:'' )||'None yet';};
  const countdown=view.state==='OPEN'&&view.expiresAt?`**READINESS CLOSES <t:${Math.floor(view.expiresAt.getTime()/1000)}:R>** · ${view.extensionUsed?'extension used':'extension available'}\n**Ready:** ${statusRoster('ready')}\n**Need a second:** ${statusRoster('waiting')}`:undefined;
  return eventWindow({title:'Line Time',description:view.state==='OPEN'?'Check in before the live timer reaches zero.':view.state==='LOCKED'?'Preparing the countdown.':view.state==='CANCELLED'?'Line cancelled.':view.state==='CLOSED'?'Line complete.':'Five seconds. One shared moment.',filename,...(image?{image}:{}),rows:components,accent:0xa469e2,...(options.imageUrl?{imageUrl:options.imageUrl}:{}),...(countdown?{countdown}:{}),...(callout?{callout}:{})});
 }
 async refresh(client:Client,id:string){const previous=this.refreshes.get(id)??Promise.resolve(),current=previous.catch(()=>{}).then(async()=>{let view=await this.repo.publicView(id);if(!view.messageId)return;let key=JSON.stringify([view.state,view.members,view.extensionUsed,view.state==='OPEN'?view.expiresAt:null]);if(this.publishedVersions.get(id)===key)return;const channel=await client.channels.fetch(view.channelId);if(!channel?.isTextBased()||!('messages' in channel))throw new Error('Line channel unavailable.');const message=await channel.messages.fetch(view.messageId);if(message.author.id!==client.user?.id)throw new Error('Line message author mismatch.');if(view.state==='SETTLING'&&message.attachments?.some(a=>a.name==='line-live.gif')){this.publishedVersions.set(id,key);return;}let payload=await this.payload(view);if(view.state==='OPEN'){const latest=await this.repo.publicView(id);if(latest.state!==view.state||latest.expiresAt?.getTime()!==view.expiresAt?.getTime()){view=latest;key=JSON.stringify([view.state,view.members,view.extensionUsed,view.state==='OPEN'?view.expiresAt:null]);payload=await this.payload(view);}}if(view.state==='SETTLING'){const latest=await this.repo.publicView(id);if(latest.state==='SETTLING'&&latest.elapsedMs>=(latest.durationMs??LINE_DURATION_MS)){await this.repo.complete(latest.guildId,id);payload=await this.payload(await this.repo.publicView(id));}else if(latest.state!=='SETTLING')payload=await this.payload(latest);}await eventTiming('line.edit-upload',()=>message.edit(payload));this.publishedVersions.set(id,key);this.prepareFinale(view);});this.refreshes.set(id,current);try{await current;}finally{if(this.refreshes.get(id)===current)this.refreshes.delete(id);}}
 async advance(client:Client,guildId:string,id:string,complete:boolean){if(complete){await this.repo.complete(guildId,id);await this.refresh(client,id);return;}
  const previous=this.refreshes.get(id)??Promise.resolve(),current=previous.catch(()=>{}).then(async()=>{const before=await this.repo.publicView(id);if(!['OPEN','LOCKED'].includes(before.state))return;
   // Prepare the complete one-shot before starting the persisted clock, just like host start.
   const prepared=this.readyFinale(before)??await this.payload({...before,state:'SETTLING',elapsedMs:0,durationMs:LINE_DURATION_MS});await this.repo.lock(guildId,id,await this.config.get(guildId,'line.shame_enabled')===true);const latest=await this.repo.publicView(id);if(!latest.messageId)return;
   const channel=await client.channels.fetch(latest.channelId);if(!channel?.isTextBased()||!('messages' in channel))throw new Error('Line channel unavailable.');const message=await channel.messages.fetch(latest.messageId);if(message.author.id!==client.user?.id)throw new Error('Line message author mismatch.');
   if(latest.state==='SETTLING'&&message.attachments?.some(a=>a.name==='line-live.gif'))return;
   await message.edit(latest.state==='SETTLING'&&latest.elapsedMs<500?prepared:await this.payload(latest));this.publishedVersions.set(id,JSON.stringify([latest.state,latest.members,latest.extensionUsed,latest.state==='OPEN'?latest.expiresAt:null]));
  });this.refreshes.set(id,current);try{await current;}finally{if(this.refreshes.get(id)===current)this.refreshes.delete(id);}}
 async sweep(client:Client){if(this.sweeping)return;this.sweeping=true;try{for(const row of await this.repo.active()){try{if(row.state==='LOCKED'||row.expiresAt&&row.expiresAt<=new Date())await this.advance(client,row.guildId,row.id,row.state==='SETTLING');else await this.refresh(client,row.id);}catch(error){const code=error&&typeof error==='object'&&'code'in error?(error as {code?:unknown}).code:null;console.warn('Line recovery item pending; other active Lines continue.',JSON.stringify({state:row.state,code:typeof code==='number'||typeof code==='string'?code:null}));}}}finally{this.sweeping=false;}}
}
