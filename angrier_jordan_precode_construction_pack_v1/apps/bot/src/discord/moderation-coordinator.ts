import {createCipheriv,createHash,randomBytes} from 'node:crypto';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  type ButtonInteraction,
  type ModalSubmitInteraction,
  type ChatInputCommandInteraction,
  type Client,
  type Guild,
  type GuildMember,
  type TextBasedChannel,
} from 'discord.js';
import type {ConfigService} from '../../../../packages/core/src/index.js';
import {DomainError} from '../../../../packages/core/src/index.js';
import {ModerationService,parseBanDuration,parseTimeoutDuration,parseSlowmodeDuration,type ModerationCaseRecord} from '../../../../packages/features-moderation/src/index.js';

type StaffLevel='member'|'recliner'|'chaise_lounge'|'throne';
const rank:Record<StaffLevel,number>={member:0,recliner:1,chaise_lounge:2,throne:3};
const roleId=async(config:ConfigService,serverId:string,key:string)=>{const v=await config.get(serverId,key);return typeof v==='string'&&v?v:null;};
const discordTime=(date:Date)=>`<t:${Math.floor(date.getTime()/1000)}:F> (<t:${Math.floor(date.getTime()/1000)}:R>)`;

export class DiscordModerationCoordinator {
  constructor(private readonly service:ModerationService,private readonly config:ConfigService){}

  async handleCommand(interaction:ChatInputCommandInteraction):Promise<void>{
    if(!interaction.guildId||!interaction.guild){await interaction.reply({ephemeral:true,content:'This command is only available in the server.'});return;}
    const group=interaction.options.getSubcommandGroup(false);
    const sub=interaction.options.getSubcommand();
    if(group==='case'){
      if(sub==='view')return this.caseView(interaction);
      if(sub==='edit')return this.caseEdit(interaction);
      if(sub==='reverse')return this.caseReverse(interaction);
    }
    if(sub==='warn')return this.warn(interaction);
    if(sub==='timeout')return this.timeout(interaction);
    if(sub==='untimeout')return this.untimeout(interaction);
    if(sub==='kick')return this.kick(interaction);
    if(sub==='ban')return this.ban(interaction);
    if(sub==='unban')return this.unban(interaction);
    if(sub==='purge')return this.purge(interaction);
    if(sub==='note')return this.note(interaction);
    if(sub==='history')return this.history(interaction);
    if(sub==='lock')return this.lock(interaction);
    if(sub==='unlock')return this.unlock(interaction);
    if(sub==='slowmode')return this.slowmode(interaction);
    if(sub==='quarantine')return this.quarantine(interaction);
    if(sub==='staff-alert')return this.staffAlert(interaction);
    if(sub==='modstats')return this.modstats(interaction);
    await interaction.reply({ephemeral:true,content:'That moderation action is not implemented yet.'});
  }

  async handleReviewButton(interaction:ButtonInteraction):Promise<void>{
    const caseId=Number(interaction.customId.split(':')[2]??'0');
    if(!Number.isInteger(caseId)||caseId<=0){await interaction.reply({ephemeral:true,content:'That review request is no longer valid.'});return;}
    try{const r=await this.service.requestReview(caseId,interaction.user.id);const c=await this.service.requireCase(caseId);if(!r.existing&&interaction.guild){await this.postAppealForReview(interaction.guild,r.appealId,c).catch(()=>undefined);}await interaction.reply({ephemeral:true,content:r.existing?`A review request for case #${r.caseId} is already pending.`:`Review requested for moderation case #${r.caseId}. Staff will review it independently.`});}
    catch(error){await interaction.reply({ephemeral:true,content:error instanceof DomainError?error.message:'The review request could not be created.'});}
  }

  async handleExpiryJob(client:Client,jobType:string,payload:unknown):Promise<void>{
    const data=payload&&typeof payload==='object'?payload as Record<string,unknown>:{};
    const caseId=typeof data.caseId==='number'?data.caseId:Number(data.caseId??0);
    const userId=typeof data.userId==='string'?data.userId:'';
    if(jobType==='moderation.evidence_expire'){const evidenceId=typeof data.evidenceId==='string'?data.evidenceId:'';if(evidenceId)await this.service.purgeEvidence(evidenceId);return;}
    if(!caseId||!userId)return;
    const c=await this.service.requireCase(caseId).catch(()=>null);if(!c||!['ACTIVE','APPEALED'].includes(c.status))return;
    const server=client.guilds.cache.get(c.guildId);if(!server){await this.service.expire(caseId,'Temporary moderation action expired while server was unavailable.');return;}
    if(jobType==='moderation.temp_ban_expire'){
      const ban=await server.bans.fetch(userId).catch(()=>null);
      if(ban)await server.members.unban(userId,`Temporary ban expired — case #${caseId}`).catch(error=>{throw error;});
      await this.service.expire(caseId,'Temporary ban expired.',{autoUnbanned:Boolean(ban)});return;
    }
    if(jobType==='moderation.timeout_expire'){
      await this.service.expire(caseId,'Timeout expired.');
    }
  }

  private async warn(i:ChatInputCommandInteraction){
    const actor=await this.actor(i,'recliner');const target=await this.target(i);await this.validateTarget(actor,target,false);
    const reason=i.options.getString('reason',true);const c=await this.service.prepare({guildId:i.guildId!,subjectUserId:target.id,actorUserId:actor.id,actionType:'WARN',reason,sourceChannelId:i.channelId});
    await this.service.finalize(c.id,'OPEN',{actorUserId:actor.id,eventKind:'WARNING_ISSUED'});
    await this.notifyMember(target,c,'Warning',reason).catch(()=>undefined);
    await i.reply({ephemeral:true,content:`${target} was warned. Case #${c.id}.`});
  }

  private async timeout(i:ChatInputCommandInteraction){
    const actor=await this.actor(i,'recliner');const target=await this.target(i);await this.validateTarget(actor,target,true);
    const reason=i.options.getString('reason',true);const parsed=parseTimeoutDuration(i.options.getString('duration',true));const seconds=parsed.seconds!;
    const c=await this.service.prepare({guildId:i.guildId!,subjectUserId:target.id,actorUserId:actor.id,actionType:'TIMEOUT',reason,sourceChannelId:i.channelId,durationSeconds:seconds});
    try{await target.timeout(seconds*1000,`${reason} — case #${c.id}`);await this.service.finalize(c.id,'ACTIVE',{actorUserId:actor.id,eventKind:'TIMEOUT_APPLIED',metadata:{endsAt:new Date(Date.now()+seconds*1000).toISOString()}});const due=await this.service.scheduleTemporaryCase(c,target.id,seconds,'moderation.timeout_expire');await this.notifyMember(target,c,'Timeout',`${reason}\nDuration: ${parsed.label}\nEnds: ${discordTime(due)}`).catch(()=>undefined);await i.reply({ephemeral:true,content:`${target} was timed out for ${parsed.label}. Case #${c.id}.`});}
    catch(error){await target.timeout(null,'Rolling back failed timeout case persistence.').catch(()=>undefined);await this.service.enforcementFailed(c.id,actor.id,reason,error);throw error;}
  }

  private async untimeout(i:ChatInputCommandInteraction){
    const actor=await this.actor(i,'recliner');const target=await this.target(i);await this.validateTarget(actor,target,true);
    const reason=i.options.getString('reason',true);const c=await this.service.prepare({guildId:i.guildId!,subjectUserId:target.id,actorUserId:actor.id,actionType:'UNTIMEOUT',reason,sourceChannelId:i.channelId});
    try{await target.timeout(null,`${reason} — case #${c.id}`);await this.service.finalize(c.id,'OPEN',{actorUserId:actor.id,eventKind:'TIMEOUT_REMOVED'});await this.service.closeActiveCases(i.guildId!,target.id,['TIMEOUT'],actor.id,`Timeout removed: ${reason}`);await i.reply({ephemeral:true,content:`${target}'s timeout was removed. Case #${c.id}.`});}
    catch(error){await this.service.enforcementFailed(c.id,actor.id,reason,error);throw error;}
  }

  private async kick(i:ChatInputCommandInteraction){
    const actor=await this.actor(i,'chaise_lounge');const target=await this.target(i);await this.validateTarget(actor,target,true);if(!target.kickable)throw new DomainError('TARGET_NOT_KICKABLE','Angrier Jordan cannot kick that member because of the server role hierarchy.');
    const reason=i.options.getString('reason',true);const c=await this.service.prepare({guildId:i.guildId!,subjectUserId:target.id,actorUserId:actor.id,actionType:'KICK',reason,sourceChannelId:i.channelId});
    await this.notifyMember(target,c,'Kick',reason).catch(()=>undefined);
    try{await target.kick(`${reason} — case #${c.id}`);await this.service.finalize(c.id,'OPEN',{actorUserId:actor.id,eventKind:'MEMBER_KICKED'});await i.reply({ephemeral:true,content:`${target.user.tag} was kicked. Case #${c.id}.`});}
    catch(error){await this.service.enforcementFailed(c.id,actor.id,reason,error);throw error;}
  }

  private async ban(i:ChatInputCommandInteraction){
    const actor=await this.actor(i,'chaise_lounge');const target=await this.target(i);await this.validateTarget(actor,target,true);if(!target.bannable)throw new DomainError('TARGET_NOT_BANNABLE','Angrier Jordan cannot ban that member because of the server role hierarchy.');
    const reason=i.options.getString('reason',true);const parsed=parseBanDuration(i.options.getString('duration',false));const c=await this.service.prepare({guildId:i.guildId!,subjectUserId:target.id,actorUserId:actor.id,actionType:'BAN',reason,sourceChannelId:i.channelId,...(parsed.seconds?{durationSeconds:parsed.seconds}:{metadata:{permanent:true}})});
    await this.notifyMember(target,c,'Ban',`${reason}\nDuration: ${parsed.label}`).catch(()=>undefined);
    try{await i.guild!.members.ban(target.id,{reason:`${reason} — case #${c.id}`});await this.service.finalize(c.id,'ACTIVE',{actorUserId:actor.id,eventKind:'MEMBER_BANNED',metadata:{permanent:parsed.permanent}});if(parsed.seconds)await this.service.scheduleTemporaryCase(c,target.id,parsed.seconds,'moderation.temp_ban_expire');await i.reply({ephemeral:true,content:`${target.user.tag} was banned (${parsed.label}). Case #${c.id}.`});}
    catch(error){await this.service.enforcementFailed(c.id,actor.id,reason,error);throw error;}
  }

  private async unban(i:ChatInputCommandInteraction){
    const actor=await this.actor(i,'chaise_lounge');const userId=i.options.getString('user_id',true).trim();if(!/^\d{15,22}$/.test(userId))throw new DomainError('INVALID_USER_ID','Provide a valid Discord user ID.');const reason=i.options.getString('reason',true);
    const c=await this.service.prepare({guildId:i.guildId!,subjectUserId:userId,actorUserId:actor.id,actionType:'UNBAN',reason,sourceChannelId:i.channelId});
    try{await i.guild!.members.unban(userId,`${reason} — case #${c.id}`);await this.service.finalize(c.id,'OPEN',{actorUserId:actor.id,eventKind:'MEMBER_UNBANNED'});await this.service.closeActiveCases(i.guildId!,userId,['BAN'],actor.id,`Ban removed: ${reason}`);await i.reply({ephemeral:true,content:`User ${userId} was unbanned. Case #${c.id}.`});}
    catch(error){await this.service.enforcementFailed(c.id,actor.id,reason,error);throw error;}
  }

  private async purge(i:ChatInputCommandInteraction){
    const actor=await this.actor(i,'recliner');const count=i.options.getInteger('count',true);const member=i.options.getUser('member',false);const reason=i.options.getString('reason',true);
    const channel=i.channel;if(!channel?.isTextBased()||channel.type===ChannelType.DM||!('messages'in channel)||!('bulkDelete'in channel))throw new DomainError('PURGE_CHANNEL_UNSUPPORTED','This channel does not support bulk message cleanup.');
    const c=await this.service.prepare({guildId:i.guildId!,...(member?{subjectUserId:member.id}:{}),actorUserId:actor.id,actionType:'PURGE',reason,sourceChannelId:i.channelId,metadata:{requestedCount:count,memberId:member?.id??null}});
    try{const fetched=await channel.messages.fetch({limit:100});const selected=[...fetched.values()].filter(m=>!member||m.author.id===member.id).slice(0,count);const deleted=await channel.bulkDelete(selected,true);await this.service.finalize(c.id,'OPEN',{actorUserId:actor.id,eventKind:'MESSAGES_PURGED',metadata:{requestedCount:count,deletedCount:deleted.size,memberId:member?.id??null}});await i.reply({ephemeral:true,content:`Deleted ${deleted.size} eligible message${deleted.size===1?'':'s'}. Case #${c.id}.`});}
    catch(error){await this.service.enforcementFailed(c.id,actor.id,reason,error);throw error;}
  }

  private async note(i:ChatInputCommandInteraction){const actor=await this.actor(i,'recliner');const target=await this.target(i);await this.validateTarget(actor,target,false);const n=await this.service.note(i.guildId!,target.id,actor.id,i.options.getString('text',true));await i.reply({ephemeral:true,content:`Staff note ${n.id} added for ${target}.`});}

  private async history(i:ChatInputCommandInteraction){const actor=await this.actor(i,'recliner');const target=await this.target(i);const h=await this.service.history(i.guildId!,target.id,15);const cases=h.cases.length?h.cases.map(c=>`#${c.id} • ${c.actionType} • ${c.status} • ${c.reason}`).join('\n'):'No moderation cases.';const notes=h.notes.length?h.notes.map(n=>`• ${n.text} — <@${n.authorUserId}>`).join('\n'):'No staff notes.';await i.reply({ephemeral:true,content:`**Moderation history — ${target.displayName}**\n${cases}\n\n**Staff notes**\n${notes}`.slice(0,1900)});}

  private async caseView(i:ChatInputCommandInteraction){await this.actor(i,'recliner');const id=i.options.getInteger('case_id',true);const {caseRecord:c,events}=await this.service.caseView(id);const eventText=events.slice(-8).map(e=>`• ${e.kind}${e.reason?` — ${e.reason}`:''}`).join('\n')||'No case events.';await i.reply({ephemeral:true,content:`**Case #${c.id} — ${c.actionType}**\nStatus: **${c.status}**\nSubject: ${c.subjectUserId?`<@${c.subjectUserId}>`:'Server/channel action'}\nReason: ${c.reason}\nActor: ${c.actorUserId?`<@${c.actorUserId}>`:c.actorType}\nCreated: ${discordTime(c.createdAt)}\n\n**History**\n${eventText}`.slice(0,1900)});}

  private async caseEdit(i:ChatInputCommandInteraction){const actor=await this.actor(i,'chaise_lounge');const id=i.options.getInteger('case_id',true);const c=await this.service.editReason(id,actor.id,i.options.getString('reason',true));await i.reply({ephemeral:true,content:`Case #${c.id} reason updated. Status is now ${c.status}.`});}

  private async caseReverse(i:ChatInputCommandInteraction){const actor=await this.actor(i,'chaise_lounge');const id=i.options.getInteger('case_id',true);const reason=i.options.getString('reason',true);const c=await this.service.requireCase(id);if(c.guildId!==i.guildId)throw new DomainError('CASE_WRONG_SERVER','That case belongs to a different server.');
    if(c.actionType==='TIMEOUT'&&c.subjectUserId){const member=await i.guild!.members.fetch(c.subjectUserId).catch(()=>null);if(member)await member.timeout(null,`Case #${id} reversed: ${reason}`);}
    else if(c.actionType==='BAN'&&c.subjectUserId){await i.guild!.members.unban(c.subjectUserId,`Case #${id} reversed: ${reason}`).catch(async error=>{const stillBanned=await i.guild!.bans.fetch(c.subjectUserId!).catch(()=>null);if(stillBanned)throw error;});}
    const reversed=await this.service.reverse(id,actor.id,reason,{discordReversalApplied:true});await i.reply({ephemeral:true,content:`Case #${reversed.id} was reversed.`});}

  async handleAppealButton(interaction:ButtonInteraction):Promise<void>{
    if(!interaction.guild){await interaction.reply({ephemeral:true,content:'This review control is only available in the server.'});return;}
    const [, , outcomeRaw, appealId]=interaction.customId.split(':');const outcome=(outcomeRaw??'').toUpperCase();if(!['UPHELD','MODIFIED','REVERSED'].includes(outcome)||!appealId){await interaction.reply({ephemeral:true,content:'That appeal control is no longer valid.'});return;}
    const actor=await interaction.guild.members.fetch(interaction.user.id);if(rank[await this.staffLevel(actor)]<rank.recliner){await interaction.reply({ephemeral:true,content:'You do not have permission to review moderation appeals.'});return;}
    const modal=new ModalBuilder().setCustomId(`moderation:appeal_submit:${outcome}:${appealId}`).setTitle(`Appeal ${outcome.toLowerCase()}`);
    const rationale=new TextInputBuilder().setCustomId('rationale').setLabel('Review rationale').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(1000);
    const rows=[new ActionRowBuilder<TextInputBuilder>().addComponents(rationale)];
    if(outcome==='MODIFIED'){const modification=new TextInputBuilder().setCustomId('modification').setLabel('New duration (optional)').setPlaceholder('e.g. 30m, 2h, permanent').setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(32);rows.push(new ActionRowBuilder<TextInputBuilder>().addComponents(modification));}
    modal.addComponents(...rows);await interaction.showModal(modal);
  }

  async handleAppealModal(interaction:ModalSubmitInteraction):Promise<void>{
    if(!interaction.guild){await interaction.reply({ephemeral:true,content:'This review control is only available in the server.'});return;}
    const [, , outcomeRaw, appealId]=interaction.customId.split(':');const outcome=(outcomeRaw??'').toUpperCase() as 'UPHELD'|'MODIFIED'|'REVERSED';const rationale=interaction.fields.getTextInputValue('rationale').trim();const actor=await interaction.guild.members.fetch(interaction.user.id);if(rank[await this.staffLevel(actor)]<rank.recliner)throw new DomainError('STAFF_PERMISSION_REQUIRED','You do not have permission to review moderation appeals.');
    const appeal=await this.service.requireAppeal(appealId!);const c=await this.service.requireCase(appeal.caseId);if(c.guildId!==interaction.guildId)throw new DomainError('CASE_WRONG_SERVER','That case belongs to another server.');let externalUndoApplied=false;let durationSeconds: number|null|undefined=undefined;
    if(outcome==='REVERSED'&&c.subjectUserId){if(c.actionType==='TIMEOUT'){const m=await interaction.guild.members.fetch(c.subjectUserId).catch(()=>null);if(m){await m.timeout(null,`Appeal reversed case #${c.id}: ${rationale}`);externalUndoApplied=true;}}else if(c.actionType==='BAN'){const ban=await interaction.guild.bans.fetch(c.subjectUserId).catch(()=>null);if(ban){await interaction.guild.members.unban(c.subjectUserId,`Appeal reversed case #${c.id}: ${rationale}`);externalUndoApplied=true;}}}
    if(outcome==='MODIFIED'){const raw=interaction.fields.fields.has('modification')?interaction.fields.getTextInputValue('modification').trim():'';if(c.actionType==='TIMEOUT'&&c.subjectUserId&&raw){const parsed=parseTimeoutDuration(raw);durationSeconds=parsed.seconds!;const m=await interaction.guild.members.fetch(c.subjectUserId);await m.timeout(durationSeconds*1000,`Appeal modified case #${c.id}: ${rationale}`);}else if(c.actionType==='BAN'&&c.subjectUserId&&raw){const parsed=parseBanDuration(raw);durationSeconds=parsed.permanent?null:parsed.seconds!;} }
    const result=await this.service.resolveAppeal({appealId:appealId!,reviewerUserId:actor.id,outcome,reason:rationale,...(durationSeconds===undefined?{}:{durationSeconds}),metadata:{externalUndoApplied}});
    if(outcome==='MODIFIED'&&c.subjectUserId&&durationSeconds&&c.actionType==='TIMEOUT')await this.service.scheduleTemporaryCase(result.caseRecord,c.subjectUserId,durationSeconds,'moderation.timeout_expire');
    if(outcome==='MODIFIED'&&c.subjectUserId&&c.actionType==='BAN'){if(durationSeconds)await this.service.scheduleTemporaryCase(result.caseRecord,c.subjectUserId,durationSeconds,'moderation.temp_ban_expire');else await this.service.cancelExpiryForCase(result.caseRecord.id);}
    await interaction.reply({ephemeral:true,content:`Appeal for case #${c.id} resolved as **${outcome}**.`});
  }

  private async lock(i:ChatInputCommandInteraction){const actor=await this.actor(i,'chaise_lounge');const channel:any=i.options.getChannel('channel',false)??i.channel;if(!channel||!channel.permissionOverwrites)throw new DomainError('CHANNEL_UNSUPPORTED','That channel cannot be locked.');const reason=i.options.getString('reason',true);const everyone=i.guild!.roles.everyone;const ow=channel.permissionOverwrites.cache.get(everyone.id);const send=ow?.allow.has(PermissionFlagsBits.SendMessages)?'allow':ow?.deny.has(PermissionFlagsBits.SendMessages)?'deny':'inherit';const c=await this.service.prepare({guildId:i.guildId!,actorUserId:actor.id,actionType:'CHANNEL_LOCK',reason,sourceChannelId:channel.id,metadata:{channelId:channel.id}});await this.service.saveChannelLock(i.guildId!,channel.id,send,Boolean(ow),actor.id);try{await channel.permissionOverwrites.edit(everyone,{SendMessages:false},{reason:`${reason} — case #${c.id}`});await this.service.finalize(c.id,'OPEN',{actorUserId:actor.id,eventKind:'CHANNEL_LOCKED',metadata:{previousSendMessages:send}});await i.reply({ephemeral:true,content:`${channel} is locked. Case #${c.id}.`});}catch(error){await this.service.clearChannelLock(i.guildId!,channel.id,actor.id).catch(()=>undefined);await this.service.enforcementFailed(c.id,actor.id,reason,error);throw error;}}
  private async unlock(i:ChatInputCommandInteraction){const actor=await this.actor(i,'chaise_lounge');const channel:any=i.options.getChannel('channel',false)??i.channel;if(!channel||!channel.permissionOverwrites)throw new DomainError('CHANNEL_UNSUPPORTED','That channel cannot be unlocked.');const snap=await this.service.getChannelLock(i.guildId!,channel.id);const reason='Restore tracked pre-lock channel state.';const c=await this.service.prepare({guildId:i.guildId!,actorUserId:actor.id,actionType:'CHANNEL_UNLOCK',reason,sourceChannelId:channel.id,metadata:{channelId:channel.id}});const value=snap.snapshot.sendMessages==='allow'?true:snap.snapshot.sendMessages==='deny'?false:null;try{await channel.permissionOverwrites.edit(i.guild!.roles.everyone,{SendMessages:value},{reason:`Unlock — case #${c.id}`});await this.service.clearChannelLock(i.guildId!,channel.id,actor.id);await this.service.finalize(c.id,'OPEN',{actorUserId:actor.id,eventKind:'CHANNEL_UNLOCKED',metadata:{restoredSendMessages:snap.snapshot.sendMessages}});await i.reply({ephemeral:true,content:`${channel} was restored to its tracked pre-lock state. Case #${c.id}.`});}catch(error){await this.service.enforcementFailed(c.id,actor.id,reason,error);throw error;}}
  private async slowmode(i:ChatInputCommandInteraction){const actor=await this.actor(i,'recliner');const channel:any=i.options.getChannel('channel',false)??i.channel;if(!channel||typeof channel.setRateLimitPerUser!=='function')throw new DomainError('SLOWMODE_UNSUPPORTED','That channel does not support slowmode.');const parsed=parseSlowmodeDuration(i.options.getString('duration',true));const previous=channel.rateLimitPerUser??0;const reason=`Slowmode set to ${parsed.label}.`;const c=await this.service.prepare({guildId:i.guildId!,actorUserId:actor.id,actionType:'SLOWMODE',reason,sourceChannelId:channel.id,...(parsed.seconds===undefined?{}:{durationSeconds:parsed.seconds}),metadata:{previousSeconds:previous}});try{await channel.setRateLimitPerUser(parsed.seconds??0,`${reason} Case #${c.id}`);await this.service.finalize(c.id,'OPEN',{actorUserId:actor.id,eventKind:'SLOWMODE_CHANGED',metadata:{previousSeconds:previous,newSeconds:parsed.seconds??0}});await i.reply({ephemeral:true,content:`Slowmode for ${channel} is now **${parsed.label}**. Previous value: ${previous}s. Case #${c.id}.`});}catch(error){await this.service.enforcementFailed(c.id,actor.id,reason,error);throw error;}}
  private async quarantine(i:ChatInputCommandInteraction){const actor=await this.actor(i,'recliner');const link=i.options.getString('message_link',true);const reason=i.options.getString('reason',true);const m=/https?:\/\/(?:www\.)?discord(?:app)?\.com\/channels\/(\d+)\/(\d+)\/(\d+)/.exec(link);if(!m||m[1]!==i.guildId)throw new DomainError('INVALID_MESSAGE_LINK','Provide a message link from this server.');const channel:any=await i.guild!.channels.fetch(m[2]!).catch(()=>null);if(!channel?.messages)throw new DomainError('MESSAGE_NOT_FOUND','The linked message channel is unavailable.');const target=await channel.messages.fetch(m[3]!);const around=await channel.messages.fetch({around:target.id,limit:7});const c=await this.service.prepare({guildId:i.guildId!,subjectUserId:target.author.id,actorUserId:actor.id,actionType:'QUARANTINE',reason,sourceChannelId:channel.id,sourceMessageId:target.id});const secret=process.env.EVIDENCE_ENCRYPTION_KEY??'';const payload=[...around.values()].sort((a:any,b:any)=>a.createdTimestamp-b.createdTimestamp).map((x:any)=>({id:x.id,authorId:x.author.id,createdAt:new Date(x.createdTimestamp).toISOString(),content:x.content,attachments:[...x.attachments.values()].map((a:any)=>({name:a.name,url:a.url,contentType:a.contentType}))}));const cipher=this.encryptEvidencePayload(payload,secret);const retentionRaw=await this.config.get(i.guildId!,'moderation.evidence_retention_days');const retention=typeof retentionRaw==='number'?retentionRaw:30;const e=await this.service.storeEvidence({caseRecord:c,contentCiphertext:cipher,context:{channelId:channel.id,messageId:target.id,authorId:target.author.id,capturedMessages:payload.length},retentionDays:retention});try{await target.delete();await this.service.finalize(c.id,'OPEN',{actorUserId:actor.id,eventKind:'MESSAGE_QUARANTINED',metadata:{evidenceId:e.id,evidenceExpiresAt:e.expiresAt?.toISOString()}});await this.postStaffLog(i.guild!,`**Message quarantined — case #${c.id}**\nMember: <@${target.author.id}>\nChannel: <#${channel.id}>\nReason: ${reason}\nEvidence: ${e.id}`).catch(()=>undefined);await i.reply({ephemeral:true,content:`Message quarantined and restricted evidence retained for ${retention} days. Case #${c.id}.`});}catch(error){await this.service.enforcementFailed(c.id,actor.id,reason,error);throw error;}}
  private async staffAlert(i:ChatInputCommandInteraction){const actor=await this.actor(i,'recliner');const target=await this.target(i);const reason=i.options.getString('reason',true);const alert=await this.service.staffAlert(i.guildId!,target.id,actor.id,reason);await this.postStaffLog(i.guild!,`**Staff alert**\nMember: ${target}\nRaised by: ${actor}\nReason: ${reason}\nAlert: ${alert.id}`).catch(()=>undefined);await i.reply({ephemeral:true,content:`Staff alert ${alert.id} recorded for ${target}. This is non-punitive.`});}
  private async modstats(i:ChatInputCommandInteraction){await this.actor(i,'recliner');const {label,stats}=await this.service.stats(i.guildId!,i.options.getString('period',false));const actions=Object.entries(stats.actionCounts).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([k,v])=>`${k}: ${v}`).join('\n')||'No moderation cases.';const appeals=Object.entries(stats.appealOutcomes).map(([k,v])=>`${k}: ${v}`).join(' • ')||'none';await i.reply({ephemeral:true,content:`**Moderation operations — ${label}**\nCases: **${stats.totalCases}** • Active: **${stats.activeCases}** • Appealed: **${stats.appealedCases}**\nQuarantines: **${stats.quarantines}** • Staff alerts: **${stats.staffAlerts}**\nAppeals: ${appeals}\n\n${actions}`.slice(0,1900)});}
  private async postAppealForReview(guild:Guild,appealId:string,c:ModerationCaseRecord){const row=new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId(`moderation:appeal:upheld:${appealId}`).setLabel('Uphold').setStyle(ButtonStyle.Secondary),new ButtonBuilder().setCustomId(`moderation:appeal:modified:${appealId}`).setLabel('Modify').setStyle(ButtonStyle.Primary),new ButtonBuilder().setCustomId(`moderation:appeal:reversed:${appealId}`).setLabel('Reverse').setStyle(ButtonStyle.Danger));await this.postStaffLog(guild,`**Review requested — case #${c.id}**\nMember: ${c.subjectUserId?`<@${c.subjectUserId}>`:'Unknown'}\nAction: **${c.actionType}**\nReason: ${c.reason}`,row);}
  private async postStaffLog(guild:Guild,content:string,components?:ActionRowBuilder<ButtonBuilder>){const id=await roleId(this.config,guild.id,'channels.staff_log');if(!id)return;const ch:any=await guild.channels.fetch(id).catch(()=>null);if(ch?.isTextBased())await ch.send({content,...(components?{components:[components]}:{})});}
  private encryptEvidencePayload(payload:unknown,secret:string){if(secret.length<16)throw new DomainError('EVIDENCE_KEY_REQUIRED','Set EVIDENCE_ENCRYPTION_KEY before using message quarantine.');const key=createHash('sha256').update(secret).digest();const iv=randomBytes(12);const cipher=createCipheriv('aes-256-gcm',key,iv);const body=Buffer.from(JSON.stringify(payload),'utf8');const encrypted=Buffer.concat([cipher.update(body),cipher.final()]);return `v1.${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${encrypted.toString('base64url')}`;}

  private async notifyMember(member:GuildMember,c:ModerationCaseRecord,label:string,detail:string){const row=new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId(`moderation:review:${c.id}`).setLabel('Request Review').setStyle(ButtonStyle.Secondary));await member.send({content:`**Angrier Jordan — ${label}**\n${detail}\nCase #${c.id}`,components:[row]});}

  private async actor(i:ChatInputCommandInteraction,minimum:StaffLevel){const actor=await i.guild!.members.fetch(i.user.id);const level=await this.staffLevel(actor);if(rank[level]<rank[minimum])throw new DomainError('STAFF_PERMISSION_REQUIRED','You do not have permission to use this moderation control.');return actor;}
  private async target(i:ChatInputCommandInteraction){const u=i.options.getUser('member',true);return i.guild!.members.fetch(u.id);}
  private async validateTarget(actor:GuildMember,target:GuildMember,needsDiscordManage:boolean){if(target.id===actor.id)throw new DomainError('SELF_MODERATION_BLOCKED','You cannot use this moderation action on yourself.');if(target.id===target.guild.ownerId)throw new DomainError('OWNER_PROTECTED','The server owner cannot be targeted by this moderation action.');if(actor.id!==actor.guild.ownerId&&actor.roles.highest.comparePositionTo(target.roles.highest)<=0)throw new DomainError('ROLE_HIERARCHY','You cannot moderate a member with an equal or higher server role.');if(needsDiscordManage&&!target.manageable)throw new DomainError('BOT_ROLE_HIERARCHY','Angrier Jordan cannot manage this member because of the server role hierarchy.');}
  private async staffLevel(member:GuildMember):Promise<StaffLevel>{if(member.id===member.guild.ownerId)return'throne';const [throne,chaise,recliner]=await Promise.all(['roles.throne','roles.chaise_lounge','roles.recliner'].map(k=>roleId(this.config,member.guild.id,k)));if(throne&&member.roles.cache.has(throne))return'throne';if(chaise&&member.roles.cache.has(chaise))return'chaise_lounge';if(recliner&&member.roles.cache.has(recliner))return'recliner';return'member';}
}
