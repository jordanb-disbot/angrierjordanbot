import {ChannelType,PermissionFlagsBits,type Client,type Guild,type GuildMember,type Message,type TextChannel} from 'discord.js';
import sharp from 'sharp';
import {DomainError,type ConfigService} from '../../../../packages/core/src/index.js';
import {normalizeQuoteText} from '../../../../packages/features-chairisms/src/domain.js';
import type {ChairismContext,ChairismOptions,ChairismReference,ChairismSecurity,ChairismSnapshot} from '../../../../packages/features-chairisms/src/interfaces.js';

const unavailable=()=>new DomainError('CHAIRISM_SOURCE','This source is not available for public Chairisms.');
const readBits=PermissionFlagsBits.ViewChannel|PermissionFlagsBits.ReadMessageHistory;
/** Channel mentions/Discord message links must not disclose hidden channel identifiers or names. */
export function publicQuoteText(text:string){return normalizeQuoteText(text.replace(/<#\d+>/g,'#channel').replace(/https:\/\/(?:(?:www|ptb|canary)\.)?discord(?:app)?\.com\/channels\/[^\s<>]+/gi,'[message link]'));}
export function safeChairismMediaUrl(value:string,kind:'attachment'|'avatar'){
 let u:URL;try{u=new URL(value);}catch{return false;}
 if(u.protocol!=='https:'||u.username||u.password||u.port||u.hash)return false;
 if(kind==='attachment')return ['cdn.discordapp.com','media.discordapp.net'].includes(u.hostname)&&/^\/attachments\/\d{17,20}\/\d{17,20}\/[^/]+\.(?:png|jpe?g|webp)$/i.test(u.pathname);
 return u.hostname==='cdn.discordapp.com'&&(/^\/avatars\/\d{17,20}\/[a-zA-Z0-9_]+\.(?:png|jpe?g|webp)$/.test(u.pathname)||/^\/guilds\/\d{17,20}\/users\/\d{17,20}\/avatars\/[a-zA-Z0-9_]+\.(?:png|jpe?g|webp)$/.test(u.pathname)||/^\/embed\/avatars\/\d+\.png$/.test(u.pathname));
}
/** Bound network bytes, prohibit redirects, decode under a pixel cap, and strip metadata to PNG. */
export async function fetchChairismMedia(value:string,kind:'attachment'|'avatar',fetcher:typeof fetch=fetch){
 if(!safeChairismMediaUrl(value,kind))throw unavailable();
 const response=await fetcher(value,{redirect:'error',signal:AbortSignal.timeout(8000)});
 if(!response.ok||!response.body||!/^image\/(png|jpeg|webp)(?:;|$)/i.test(response.headers.get('content-type')??''))throw unavailable();
 const cap=kind==='avatar'?1_000_000:5_000_000,length=Number(response.headers.get('content-length')??0);if(length>cap)throw unavailable();
 const reader=response.body.getReader(),chunks:Uint8Array[]=[];let size=0;
 try{while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>cap)throw unavailable();chunks.push(part.value);}}finally{await reader.cancel();}
 const input=Buffer.concat(chunks),image=sharp(input,{limitInputPixels:16_000_000,animated:false}),metadata=await image.metadata();
 if(!['png','jpeg','webp'].includes(metadata.format??'')||(metadata.pages??1)>1)throw unavailable();
 const bytes=await image.resize({width:kind==='avatar'?512:1200,height:kind==='avatar'?512:1200,fit:'inside',withoutEnlargement:true}).png().toBuffer();
 return 'data:image/png;base64,'+bytes.toString('base64');
}
export class DiscordChairismSecurity implements ChairismSecurity {
 constructor(private client:Client,private config:ConfigService,private canUse:(guildId:string,userId:string)=>Promise<boolean>,private media=fetchChairismMedia){}
 private async actor(c:ChairismContext){if(!await this.canUse(c.guildId,c.userId))throw unavailable();const guild=await this.client.guilds.fetch(c.guildId),member=await guild.members.fetch({user:c.userId,force:true});if(member.user.bot||member.isCommunicationDisabled())throw unavailable();return{guild,member};}
 /** Only ordinary server text channels; threads/forums/DMs fail closed. Fetch overwrites and roles fresh. */
 private async publicChannel(guild:Guild,member:GuildMember,id:string,output=false):Promise<TextChannel>{
  const channel=await guild.channels.fetch(id,{force:true});if(!channel||channel.guildId!==guild.id||channel.type!==ChannelType.GuildText)throw unavailable();
  const excluded=await Promise.all(['channels.staff_log','channels.hotseat_channel','chairisms.excluded_channel_ids'].map(key=>this.config.get(guild.id,key)));
  const denied=excluded.flatMap(value=>Array.isArray(value)?value:typeof value==='string'?[value]:[]);
  if(denied.includes(id)||channel.parentId&&denied.includes(channel.parentId))throw unavailable();
  const roles=await guild.roles.fetch(),baseId=await this.config.get(guild.id,'roles.member_access'),base=roles.get(typeof baseId==='string'?baseId:guild.id);
  if(!base||base.permissions.has(PermissionFlagsBits.Administrator)||!channel.permissionsFor(base).has(readBits,false))throw unavailable();
  // A regular access role must never be one of the configured staff roles.
  const staff=await Promise.all(['roles.throne','roles.chaise_lounge','roles.recliner'].map(key=>this.config.get(guild.id,key)));if(staff.includes(base.id))throw unavailable();
  const bot=await guild.members.fetch({user:this.client.user!.id,force:true});
  if(!channel.permissionsFor(member).has(readBits)||!channel.permissionsFor(bot).has(readBits|(output?PermissionFlagsBits.SendMessages|PermissionFlagsBits.AttachFiles|PermissionFlagsBits.EmbedLinks:0n)))throw unavailable();
  return channel;
 }
 async output(c:ChairismContext,expected?:string){const {guild,member}=await this.actor(c),id=await this.config.get(c.guildId,'channels.chairisms_channel');if(typeof id!=='string'||!id||expected&&expected!==id)throw unavailable();return this.publicChannel(guild,member,id,true);}
 private async source(c:ChairismContext,ref:ChairismReference){if(!/^\d{17,20}$/.test(ref.channelId)||!/^\d{17,20}$/.test(ref.messageId))throw unavailable();const {guild,member}=await this.actor(c),channel=await this.publicChannel(guild,member,ref.channelId),message=await channel.messages.fetch({message:ref.messageId,force:true});if(message.guildId!==c.guildId||message.channelId!==ref.channelId||message.id!==ref.messageId||message.author.bot||message.system||message.webhookId)throw unavailable();publicQuoteText(message.content);return message;}
 private reference(message:Message):ChairismReference|null{const r=message.reference;return r?.messageId&&r.channelId&&r.guildId===message.guildId?{channelId:r.channelId,messageId:r.messageId}:null;}
 private attachment(message:Message){return message.attachments.find(a=>a.size<=5_000_000&&['image/png','image/jpeg','image/webp'].includes(a.contentType??'')&&safeChairismMediaUrl(a.url,'attachment'));}
 async inspectMessage(c:ChairismContext,ref:ChairismReference){await this.output(c);const message=await this.source(c,ref),reply=this.reference(message);let hasReply=false;if(reply){try{await this.source(c,reply);hasReply=true;}catch{}}return{reference:ref,hasReply,hasImage:Boolean(this.attachment(message))};}
 private async quote(message:Message){const member=await message.guild!.members.fetch({user:message.author.id,force:true}).catch(()=>null),avatar=member?.displayAvatarURL({extension:'png',size:512})??message.author.displayAvatarURL({extension:'png',size:512});return{userId:message.author.id,displayName:(member?.displayName??message.author.globalName??message.author.username).slice(0,100),text:publicQuoteText(message.content),timestamp:message.createdAt.toISOString(),avatarDataUri:await this.media(avatar,'avatar')};}
 async captureMessage(c:ChairismContext,ref:ChairismReference,options:ChairismOptions):Promise<ChairismSnapshot>{await this.output(c);const message=await this.source(c,ref),snapshot:ChairismSnapshot={quote:await this.quote(message),source:ref};if(options.includeReply){const reply=this.reference(message);if(!reply)throw unavailable();snapshot.reply=await this.quote(await this.source(c,reply));snapshot.replySource=reply;}if(options.includeImage){const attachment=this.attachment(message);if(!attachment)throw unavailable();snapshot.imageDataUri=await this.media(attachment.url,'attachment');snapshot.imageAttachmentId=attachment.id;}return snapshot;}
 async captureSelf(c:ChairismContext,text:string):Promise<ChairismSnapshot>{await this.output(c);const {member}=await this.actor(c);return{quote:{userId:c.userId,displayName:member.displayName.slice(0,100),text:publicQuoteText(text),timestamp:new Date().toISOString(),avatarDataUri:await this.media(member.displayAvatarURL({extension:'png',size:512}),'avatar')}};}
 async assertCanBrowse(c:ChairismContext,_sourceUserIds:readonly string[]){await this.output(c);/* Activity/roast preferences do not govern public quotes in the canonical contract. */}
 /** Pending jobs recheck source text, selected reply/image and access just before sending. */
 async revalidate(c:ChairismContext,snapshot:ChairismSnapshot){await this.output(c);if(!snapshot.source){if(snapshot.quote.userId!==c.userId)throw unavailable();return;}const message=await this.source(c,snapshot.source);if(message.author.id!==snapshot.quote.userId||publicQuoteText(message.content)!==snapshot.quote.text||message.createdAt.toISOString()!==snapshot.quote.timestamp)throw unavailable();if(snapshot.reply){const reference=this.reference(message);if(!reference||!snapshot.replySource||reference.channelId!==snapshot.replySource.channelId||reference.messageId!==snapshot.replySource.messageId)throw unavailable();const reply=await this.source(c,reference);if(reply.author.id!==snapshot.reply.userId||publicQuoteText(reply.content)!==snapshot.reply.text)throw unavailable();}if(snapshot.imageDataUri&&this.attachment(message)?.id!==snapshot.imageAttachmentId)throw unavailable();}
 async canBrowseOutput(c:ChairismContext,channelId:string,messageId:string){try{const channel=await this.output(c,channelId),message=await channel.messages.fetch({message:messageId,force:true});return message.author.id===this.client.user?.id;}catch{return false;}}
}
