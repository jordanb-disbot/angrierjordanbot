import {
  AuditLogEvent,ChannelType,PermissionFlagsBits,
  type Guild,type GuildAuditLogsEntry,type GuildBan,type GuildBasedChannel,type GuildMember,type PartialGuildMember,type Message,type PartialMessage,
  type Role,type VoiceState,
} from 'discord.js';
import type {ConfigService} from '../../../../packages/core/src/index.js';
import {rasterizeSvg} from '../../../../packages/renderer/src/raster.js';
import {createDisplay,wideDisplay} from './wide-display.js';
import {renderActivityCard} from './activity-card.js';

type Snapshot={authorId:string;channelId:string;content:string;at:number};
const limit=(value:string,max=900)=>value.length>max?`${value.slice(0,max-1)}…`:value;
const safe=(value:string|undefined|null,max=900)=>value?.trim()?limit(value.trim(),max):'[text unavailable]';
const displayName=(member:{displayName?:string|null;nickname?:string|null;user?:{globalName?:string|null;username?:string|null}}|null|undefined)=>member?.displayName?.trim()||member?.nickname?.trim()||member?.user?.globalName?.trim()||member?.user?.username?.trim()||null;

/** Staff-only activity feed. Message snapshots are bounded and remain in memory. */
export class DiscordActivityLogger {
  private readonly messages=new Map<string,Snapshot>();
  private configured:{id:string|null;until:number}|null=null;
  constructor(private readonly config:ConfigService,private readonly guildId:string,private readonly now:()=>number=Date.now){}

  private async logChannelId(){
    if(this.configured&&this.configured.until>this.now())return this.configured.id;
    const value=await this.config.get(this.guildId,'channels.staff_log');
    const id=typeof value==='string'&&/^\d{17,20}$/.test(value)?value:null;
    this.configured={id,until:this.now()+60_000};return id;
  }

  private async destination(guild:Guild){
    if(guild.id!==this.guildId)return null;
    const id=await this.logChannelId();if(!id)return null;
    const channel=guild.channels.cache.get(id)??await guild.channels.fetch(id).catch(()=>null);
    if(!channel||channel.type!==ChannelType.GuildText)return null;
    if(channel.permissionsFor(guild.roles.everyone)?.has(PermissionFlagsBits.ViewChannel))throw Error('ACTIVITY_LOG_CHANNEL_PUBLIC');
    const me=guild.members.me??await guild.members.fetchMe();
    for(const scope of [channel.parent,channel]){
      if(!scope||!('permissionOverwrites' in scope))continue;
      for(const overwrite of scope.permissionOverwrites.cache.values()){
        if(!overwrite.allow.has(PermissionFlagsBits.ViewChannel))continue;
        const role=guild.roles.cache.get(overwrite.id);
        if(!role||(!role.permissions.has(PermissionFlagsBits.Administrator)&&!me.roles.cache.has(role.id)))throw Error('ACTIVITY_LOG_CHANNEL_NOT_ADMIN_ONLY');
      }
    }
    if(!channel.permissionsFor(me)?.has(PermissionFlagsBits.ViewChannel)||!channel.permissionsFor(me)?.has(PermissionFlagsBits.SendMessages))throw Error('ACTIVITY_LOG_CHANNEL_UNWRITABLE');
    return channel;
  }

  async preflight(guild:Guild){if(!await this.destination(guild))throw Error('ACTIVITY_LOG_CHANNEL_MISSING');}

  private async memberName(guild:Guild,id:string|undefined,fallback?:string|null){
    if(!id)return fallback??'Unknown member';
    const member=guild.members.cache.get(id)??await guild.members.fetch(id).catch(()=>null);
    return displayName(member)??fallback??'Former member';
  }

  private async auditTarget(guild:Guild,entry:GuildAuditLogsEntry){
    const target=entry.target as unknown as {displayName?:string;nickname?:string;name?:string;username?:string;user?:{globalName?:string;username?:string}}|null;
    const direct=displayName(target)??target?.name?.trim()??target?.username?.trim();
    if(direct)return direct;
    if(entry.targetId){const role=guild.roles.cache.get(entry.targetId);if(role)return role.name;const channel=guild.channels.cache.get(entry.targetId);if(channel)return '#'+channel.name;return this.memberName(guild,entry.targetId);}
    return 'Server settings';
  }

  private auditAction(action:number){const name=Object.entries(AuditLogEvent).find(([,value])=>value===action)?.[0]??'Server change';return name.replace(/([a-z])([A-Z])/g,'$1 $2').replace(/([A-Z])([A-Z][a-z])/g,'$1 $2');}

  private async post(guild:Guild,title:string,body:string,color=0x0EA5A6){
    const channel=await this.destination(guild);if(!channel)return;
    const accent='#'+color.toString(16).padStart(6,'0').toUpperCase(),svg=renderActivityCard(title,limit(body,3800),accent),name='staff-activity-'+title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')+'.png';
    await channel.send(createDisplay(wideDisplay([{name,data:await rasterizeSvg(svg),width:1200,height:Number(/<svg[^>]*height="(\d+)"/.exec(svg)?.[1]??0),description:(title+' · '+body).slice(0,1024)}])));
  }

  private remember(message:Message|PartialMessage){
    if(!message.guild||message.guild.id!==this.guildId||message.author?.bot||!message.author?.id)return;
    this.messages.delete(message.id);
    this.messages.set(message.id,{authorId:message.author.id,channelId:message.channelId,content:message.content??'',at:this.now()});
    const cutoff=this.now()-24*60*60*1000;
    while(this.messages.size>5000||(this.messages.values().next().value?.at??Infinity)<cutoff)this.messages.delete(this.messages.keys().next().value!);
  }

  async messageCreate(message:Message){if(message.guild&&message.channelId!==await this.logChannelId())this.remember(message);}

  async messageUpdate(before:Message|PartialMessage,after:Message|PartialMessage){
    if(!after.guild||after.guild.id!==this.guildId||after.author?.bot||after.channelId===await this.logChannelId())return;
    const prior=this.messages.get(after.id),oldText=before.content??prior?.content,newText=after.content;
    if(newText===undefined||newText===null||oldText===newText)return;
    this.remember(after);
    const author=await this.memberName(after.guild,after.author?.id??prior?.authorId,displayName(after.member));
    await this.post(after.guild,'MESSAGE EDITED',`${author} · <#${after.channelId}> · [Jump to message](${after.url})\n**Before**\n${safe(oldText)}\n**After**\n${safe(newText)}`,0xF4C542);
  }

  async messageDelete(message:Message|PartialMessage){
    if(!message.guild||message.guild.id!==this.guildId||message.channelId===await this.logChannelId())return;
    const prior=this.messages.get(message.id);this.messages.delete(message.id);
    if(message.author?.bot)return;
    const author=await this.memberName(message.guild,message.author?.id??prior?.authorId,displayName(message.member));
    await this.post(message.guild,'MESSAGE DELETED',`${author} · <#${message.channelId}>\n**Text**\n${safe(message.content??prior?.content)}`,0xB42318);
  }

  async messageDeleteBulk(messages:ReadonlyMap<string,Message|PartialMessage>){
    const first=messages.values().next().value,guild=first?.guild;if(!first||!guild||guild.id!==this.guildId)return;
    if(first.channelId===await this.logChannelId())return;
    const excerpts=await Promise.all([...messages.values()].slice(0,5).map(async message=>{
      const prior=this.messages.get(message.id),author=message.author?.id??prior?.authorId;
      return `${await this.memberName(guild,author,displayName(message.member))}: ${safe(message.content??prior?.content,250)}`;
    }));
    for(const message of messages.values())this.messages.delete(message.id);
    await this.post(guild,'MESSAGES BULK DELETED',`${messages.size} messages removed from <#${first.channelId}>.\n${excerpts.join('\n')}${messages.size>5?'\n…additional messages omitted.':''}`,0xB42318);
  }

  async memberJoin(member:GuildMember){if(!member.user.bot)await this.post(member.guild,'MEMBER JOINED',`${displayName(member)??'Member'} joined the server.`,0x10B981);}
  async memberLeave(member:GuildMember|PartialGuildMember){if(!member.user.bot)await this.post(member.guild,'MEMBER LEFT',`${displayName(member)??'Former member'} left the server.`,0xF4C542);}
  async memberUpdate(before:GuildMember|PartialGuildMember,after:GuildMember){
    if(after.user.bot)return;
    const added=after.roles.cache.filter(role=>!before.roles.cache.has(role.id)&&role.id!==after.guild.id),removed=before.roles.cache.filter(role=>!after.roles.cache.has(role.id)&&role.id!==after.guild.id);
    const lines=[...added.map(role=>`Role added: **${safe(role.name,100)}**`),...removed.map(role=>`Role removed: **${safe(role.name,100)}**`)];
    if(before.nickname!==after.nickname)lines.push(`Nickname: **${safe(before.nickname,100)}** → **${safe(after.nickname,100)}**`);
    if(Boolean(before.premiumSince)!==Boolean(after.premiumSince))lines.push(after.premiumSince?'Boost started':'Boost ended');
    if(before.communicationDisabledUntilTimestamp!==after.communicationDisabledUntilTimestamp)lines.push(after.communicationDisabledUntilTimestamp?'Timeout applied or changed':'Timeout cleared');
    if(lines.length)await this.post(after.guild,'MEMBER UPDATED',`${displayName(after)??'Member'}\n${lines.join('\n')}`);
  }
  async banAdded(ban:GuildBan){await this.post(ban.guild,'MEMBER BANNED',`${ban.user.globalName??ban.user.username} was banned.`,0xB42318);}
  async banRemoved(ban:GuildBan){await this.post(ban.guild,'MEMBER UNBANNED',`${ban.user.globalName??ban.user.username} was unbanned.`,0x10B981);}
  async voiceUpdate(before:VoiceState,after:VoiceState){
    if(before.channelId===after.channelId)return;
    const detail=before.channelId&&after.channelId?`moved from <#${before.channelId}> to <#${after.channelId}>`:after.channelId?`joined <#${after.channelId}>`:`left <#${before.channelId}>`;
    await this.post(after.guild,'VOICE ACTIVITY',`${await this.memberName(after.guild,after.id)} ${detail}.`);
  }
  async channelCreated(channel:GuildBasedChannel){await this.post(channel.guild,'CHANNEL CREATED',`**${safe(channel.name,100)}** · <#${channel.id}>`);}
  async channelDeleted(channel:GuildBasedChannel){await this.post(channel.guild,'CHANNEL DELETED',`**${safe(channel.name,100)}**`,0xB42318);}
  async channelUpdated(before:GuildBasedChannel,after:GuildBasedChannel){
    const overwrites=(channel:GuildBasedChannel)=>'permissionOverwrites' in channel?[...channel.permissionOverwrites.cache.values()].map(row=>`${row.id}:${row.allow.bitfield}:${row.deny.bitfield}`).sort().join('|'):'';
    if(before.name===after.name&&before.parentId===after.parentId&&overwrites(before)===overwrites(after))return;
    await this.post(after.guild,'CHANNEL UPDATED',`<#${after.id}> · **${safe(before.name,100)}** → **${safe(after.name,100)}**`);
  }
  async roleCreated(role:Role){await this.post(role.guild,'ROLE CREATED',`**${safe(role.name,100)}**`);}
  async roleDeleted(role:Role){await this.post(role.guild,'ROLE DELETED',`**${safe(role.name,100)}**`,0xB42318);}
  async roleUpdated(before:Role,after:Role){
    if(before.name===after.name&&before.permissions.bitfield===after.permissions.bitfield&&before.position===after.position)return;
    await this.post(after.guild,'ROLE UPDATED',`**${safe(before.name,100)}** → **${safe(after.name,100)}**`);
  }
  async auditEntry(entry:GuildAuditLogsEntry,guild:Guild){
    const [actor,target]=await Promise.all([this.memberName(guild,entry.executorId??undefined),this.auditTarget(guild,entry)]);
    await this.post(guild,'SERVER AUDIT',`${this.auditAction(entry.action)}\n**Changed by:** ${actor}\n**Target:** ${target}`,0xF4C542);
  }
}
