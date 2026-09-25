import {randomInt} from 'node:crypto';
import {ActionRowBuilder,AttachmentBuilder,ButtonBuilder,ButtonStyle,EmbedBuilder,type Client,type Message,type ButtonInteraction} from 'discord.js';
import {DeliveryEngine,DomainError,PermissionEngine,type ConfigService} from '../../../../packages/core/src/index.js';
import {CAPABILITY_MATRIX} from '../../../../packages/contracts/src/generated/capabilities.js';
import {PrismaSpecialRepository,type LineView} from '../../../../packages/features-special/src/prisma-repository.js';
import {validateBuiltinRoleMap,validateCustomSpecialCommands,mayInvokeSpecial,specialNotificationRole,type SpecialCommand} from '../../../../packages/features-special/src/domain.js';
import {renderLine,lineSequence} from '../../../../packages/features-special/src/render.js';
import {rasterizeSvg,rasterizeSequence} from '../../../../packages/renderer/src/raster.js';
import builtinCallouts from '../../../../packages/features-special/content/builtin_callouts.json' with {type:'json'};
export class DiscordSpecialCoordinator {
 private readonly refreshes=new Map<string,Promise<void>>();
 private readonly publishedVersions=new Map<string,string>();
 private sweeping=false;
 constructor(private readonly repo:PrismaSpecialRepository,private readonly config:ConfigService,private readonly eligible:(g:string,u:string)=>Promise<boolean>){}
 private async guard(guildId:string,userId:string,channelId:string,line=true){
  if(await this.config.get(guildId,'features.special_commands')!==true||await this.config.get(guildId,'special_commands.enabled')!==true||line&&await this.config.get(guildId,'features.line')!==true)throw new DomainError('SPECIAL_DISABLED','Special Commands are not enabled yet.');
  if(channelId!==await this.config.get(guildId,'channels.main_chat'))throw new DomainError('SPECIAL_CHANNEL','Use Special Commands in the configured main chat.');
  if(!new PermissionEngine({'events.use':CAPABILITY_MATRIX.capabilities['events.use']}).can('member','events.use')||!await this.eligible(guildId,userId))throw new DomainError('SPECIAL_RESTRICTED','Special Command controls are unavailable while restricted.');
 }
 async definitions(guildId:string):Promise<SpecialCommand[]>{
  const custom=validateCustomSpecialCommands(await this.config.get(guildId,'special_commands.custom_commands'));
  const roles=validateBuiltinRoleMap(await this.config.get(guildId,'special_commands.builtin_role_map')),access=await this.config.get(guildId,'special_commands.access_roles') as Record<string,unknown>,pools=await this.config.get(guildId,'special_commands.builtin_response_pools') as Record<string,unknown>;
  return [...(['!line','!vc','!chess'] as const).map(trigger=>{const allowed=access?.[trigger],pool=pools?.[trigger];if(!Array.isArray(allowed)||allowed.some(r=>typeof r!=='string')||!Array.isArray(pool)||pool.some(s=>typeof s!=='string'||!s.trim()||s.length>1500))throw new DomainError('SPECIAL_CONFIG','Invalid built-in Special Command configuration.');return{trigger,notificationRoleId:typeof roles?.[trigger]==='string'?roles[trigger] as string:null,responsePool:pool.length?pool as string[]:builtinCallouts[trigger],enabled:true,allowedRoleIds:allowed as string[]};}),...custom];
 }
 async visibleCommands(guildId:string,roleIds:ReadonlySet<string>){if(await this.config.get(guildId,'features.special_commands')!==true||await this.config.get(guildId,'special_commands.enabled')!==true)return[];const lineEnabled=await this.config.get(guildId,'features.line')===true;return(await this.definitions(guildId)).filter(d=>d.enabled&&d.responsePool.length&&mayInvokeSpecial(d.allowedRoleIds,roleIds)&&(d.trigger!=='!line'||lineEnabled));}
 async message(message:Message){
  const trigger=message.content.trim();if(!/^![a-z][a-z0-9_-]{0,31}$/.test(trigger)||trigger==='!race'||message.author.bot||!message.guildId||!message.guild)return;
  const definition=(await this.definitions(message.guildId)).find(d=>d.trigger===trigger);if(!definition)return;
  // Known unauthorized triggers are always removed, including wrong-channel triggers.
  await message.delete();if(!definition.enabled)return;
  const member=await message.guild.members.fetch({user:message.author.id,force:true});if(!mayInvokeSpecial(definition.allowedRoleIds,new Set(member.roles.cache.keys())))return;
  try{await this.guard(message.guildId,message.author.id,message.channelId,trigger==='!line');}catch{return;}
  if(!definition.responsePool.length)throw new DomainError('SPECIAL_CONTENT','Configure an authored response pool before enabling this Special Command.');
  if(!message.channel.isSendable())return;
  const context={guildId:message.guildId,channelId:message.channelId,userId:message.author.id,requestKey:message.id};
  const role=definition.notificationRoleId?await message.guild.roles.fetch(definition.notificationRoleId):null,notification=specialNotificationRole(role??undefined,message.guildId)??null;
  const content=definition.responsePool[randomInt(definition.responsePool.length)]!;
  if(trigger==='!line'){try{const started=await this.repo.start(context,member.displayName,{content,notificationRoleId:notification});if(started.jobId)await this.deliver(message.client,started.jobId);return;}catch(error){if(error instanceof DomainError&&error.code==='LINE_ACTIVE')return;throw error;}}
  const {jobId}=await this.repo.queueCallout(context,content,notification);await this.deliver(message.client,jobId);
 }
 async deliver(client:Client,jobId:string){const{payload:p}=await this.repo.callout(jobId),channel=await client.channels.fetch(p.channelId);if(!channel?.isSendable()||!('messages' in channel))throw new Error('Special Command destination unavailable.');
  const guild=await client.guilds.fetch(p.guildId),role=p.notificationRoleId?await guild.roles.fetch(p.notificationRoleId):null,notification=specialNotificationRole(role??undefined,p.guildId);
  const marker='special:'+jobId;
  const messageId=await new DeliveryEngine(this.repo.delivery(jobId)).deliver(marker,{
   find:async marker=>{const messages=await channel.messages.fetch({limit:100});return messages.find(m=>m.author.id===client.user?.id&&m.embeds.some(e=>e.footer?.text===marker))?.id??null;},
   send:async marker=>{const line=p.sessionId?await this.payload(await this.repo.publicView(p.sessionId)):null;const embed=line?.embeds[0]??new EmbedBuilder().setAuthor({name:'Angrier Jordan'}).setTitle('Chairs, assemble.').setColor(0x0ea5a6);embed.setFooter({text:marker});const message=await channel.send({...line,embeds:[embed],content:`${notification?'<@&'+notification+'> ':''}${p.content}`,allowedMentions:{parse:[],roles:notification?[notification]:[]}});return message.id;}
  });if(p.sessionId)await this.repo.linkMessage(p.sessionId,p.guildId,messageId);
 }
 async handle(i:ButtonInteraction){try{
  if(!i.guildId||!i.guild||!i.channelId)throw new DomainError('SERVER_ONLY','Use Line in the server.');await this.guard(i.guildId,i.user.id,i.channelId);
  const[prefix,action,id,pageRaw]=i.customId.split(':');if(prefix!=='line'||!id)throw new DomainError('LINE_CONTROL','This Line control is unavailable.');const view=await this.repo.publicView(id);if(view.guildId!==i.guildId||view.channelId!==i.channelId||(action!=='roster'&&view.messageId!==i.message.id))throw new DomainError('LINE_CONTROL','Use this Line’s original message.');
  if(action==='roster'){const page=Math.max(0,Math.min(Math.floor((view.members.length-1)/20),Number(pageRaw)||0)),slice=view.members.slice(page*20,page*20+20);const buttons=new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId(`line:roster:${id}:${Math.max(0,page-1)}`).setLabel('Previous').setStyle(ButtonStyle.Secondary).setDisabled(page===0),new ButtonBuilder().setCustomId(`line:roster:${id}:${page+1}`).setLabel('Next').setStyle(ButtonStyle.Secondary).setDisabled((page+1)*20>=view.members.length));await i.reply({ephemeral:true,content:slice.map(m=>`${m.status==='ready'?'✓':'…'} <@${m.userId}>${m.userId===view.ownerId?' · Host':''}`).join('\n'),components:[buttons],allowedMentions:{parse:[]}});return;}
  await i.deferReply({ephemeral:true});const c={guildId:i.guildId,channelId:i.channelId,userId:i.user.id,requestKey:i.id};
  if(action==='ready'||action==='waiting'){const member=await i.guild.members.fetch(i.user.id);await this.repo.checkIn(c,id,member.displayName,action);}
  else if(action==='extend')await this.repo.extend(c,id);
  else if(action==='start'){
   const shameEnabled=await this.config.get(i.guildId,'line.shame_enabled')===true,preview=await this.repo.previewCountdown(c,id,shameEnabled),current=await this.repo.publicView(id);
   const payload=await this.payload({...current,state:'SETTLING',elapsedMs:0,shame:preview.shame});
   const previous=this.refreshes.get(id)??Promise.resolve(),publish=previous.catch(()=>{}).then(async()=>{
    await this.repo.countdown(c,id,shameEnabled,preview);
    if(i.message.embeds[0]?.footer)payload.embeds[0]!.setFooter({text:i.message.embeds[0].footer.text});
    await i.message.edit(payload);this.publishedVersions.set(id,JSON.stringify(['SETTLING',current.members,current.extensionUsed,null]));
   });this.refreshes.set(id,publish);try{await publish;}finally{if(this.refreshes.get(id)===publish)this.refreshes.delete(id);}
  }
  else if(action==='cancel')await this.repo.cancel(c,id);
  else throw new DomainError('LINE_CONTROL','This Line control is unavailable.');
  await i.editReply({content:action==='start'?'The countdown has started.':action==='cancel'?'Line cancelled.':action==='extend'?'Readiness extended by 30 seconds.':'Your check-in is saved.'});
  try{await this.refresh(i.client,id);}catch{await i.followUp({ephemeral:true,content:'Your action is saved. The public update is pending.'});}
 }catch(error){const content=error instanceof DomainError?error.message:'The Line update could not be completed. Check its saved state before retrying.';if(i.replied)await i.followUp({ephemeral:true,content});else if(i.deferred)await i.editReply({content});else await i.reply({ephemeral:true,content});}}
 async payload(view:LineView){const live=view.state==='SETTLING'&&view.elapsedMs<5800,sequence=live?lineSequence(view):null,animated=Boolean(sequence&&sequence.frames.length>1),image=sequence&&animated?await rasterizeSequence(sequence.frames,sequence.delays):await rasterizeSvg(renderLine(view)),filename=animated?'line.gif':'line.png',components:ActionRowBuilder<ButtonBuilder>[]=[];
  if(view.state==='OPEN')components.push(new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId('line:ready:'+view.id).setLabel('I’m In').setStyle(ButtonStyle.Primary),new ButtonBuilder().setCustomId('line:waiting:'+view.id).setLabel('I Need a Second').setStyle(ButtonStyle.Secondary)));
  if(['OPEN','LOCKED'].includes(view.state))components.push(new ActionRowBuilder<ButtonBuilder>().addComponents(...(view.state==='OPEN'?[new ButtonBuilder().setCustomId('line:extend:'+view.id).setLabel('+30 Seconds').setStyle(ButtonStyle.Secondary).setDisabled(view.extensionUsed)]:[]),new ButtonBuilder().setCustomId('line:start:'+view.id).setLabel('Start Countdown').setStyle(ButtonStyle.Primary),new ButtonBuilder().setCustomId('line:cancel:'+view.id).setLabel('Cancel Line').setStyle(ButtonStyle.Secondary)));
  if(!live)components.push(new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId('line:roster:'+view.id+':0').setLabel('Check-ins').setStyle(ButtonStyle.Secondary)));
  return{embeds:[new EmbedBuilder().setAuthor({name:'Angrier Jordan'}).setTitle('Line Time').setDescription(view.state==='OPEN'?`Readiness closes <t:${Math.floor(view.expiresAt!.getTime()/1000)}:R>. The host may start early.`:view.state==='LOCKED'?'Entries locked. Check-ins saved. The host may start or cancel.':view.state==='CANCELLED'?'Line cancelled.':view.state==='CLOSED'?'Line complete.':'5 → 4 → 3 → 2 → 1 · one shared moment.').setColor(0xa469e2).setImage('attachment://'+filename)],files:[new AttachmentBuilder(image,{name:filename})],attachments:[],components,allowedMentions:{parse:[] as never[]}};
 }
 async refresh(client:Client,id:string){const previous=this.refreshes.get(id)??Promise.resolve(),current=previous.catch(()=>{}).then(async()=>{const view=await this.repo.publicView(id);if(!view.messageId)return;const key=JSON.stringify([view.state,view.members,view.extensionUsed,view.state==='OPEN'?Math.ceil(view.remainingMs/10000):null]);if(this.publishedVersions.get(id)===key)return;const channel=await client.channels.fetch(view.channelId);if(!channel?.isTextBased()||!('messages' in channel))throw new Error('Line channel unavailable.');const message=await channel.messages.fetch(view.messageId);if(message.author.id!==client.user?.id)throw new Error('Line message author mismatch.');let payload=await this.payload(view);if(view.state==='SETTLING'){const latest=await this.repo.publicView(id);if(latest.state==='SETTLING'&&latest.elapsedMs>=5800){await this.repo.complete(latest.guildId,id);payload=await this.payload(await this.repo.publicView(id));}else if(latest.state!=='SETTLING')payload=await this.payload(latest);}if(message.embeds[0]?.footer)payload.embeds[0]!.setFooter({text:message.embeds[0].footer.text});await message.edit(payload);this.publishedVersions.set(id,key);});this.refreshes.set(id,current);try{await current;}finally{if(this.refreshes.get(id)===current)this.refreshes.delete(id);}}
 async advance(client:Client,guildId:string,id:string,complete:boolean){if(complete)await this.repo.complete(guildId,id);else await this.repo.lock(guildId,id);await this.refresh(client,id);}
 async sweep(client:Client){if(this.sweeping)return;this.sweeping=true;try{for(const row of await this.repo.active()){if(row.expiresAt&&row.expiresAt<=new Date()&&row.state!=='LOCKED')await this.advance(client,row.guildId,row.id,row.state==='SETTLING');else await this.refresh(client,row.id);}}finally{this.sweeping=false;}}
}
