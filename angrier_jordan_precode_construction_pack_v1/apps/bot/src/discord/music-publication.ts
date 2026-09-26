import {memberArt} from './member-art.js';
import {ChannelType,EmbedBuilder,PermissionFlagsBits,type Client,type VoiceChannel,type Message} from 'discord.js';
import {DeliveryEngine,type DeliveryRepository} from '../../../../packages/core/src/delivery.js';
import type {PrismaMusicRepository} from '../../../../packages/features-music/src/prisma-repository.js';
import type {MusicState} from '../../../../packages/features-music/src/interfaces.js';
import type {DiscordMusicCoordinator} from './music-coordinator.js';

type Repository=Pick<PrismaMusicRepository,'read'|'reserveController'|'controllerPublication'|'finalizeController'|'controllerCleanupIntent'>;
type PayloadFactory=DiscordMusicCoordinator['payload'];
export type MusicPublicationResult={kind:'published'|'refreshed'|'retired'|'obsolete'|'missing';messageId?:string};
export class MusicPublicationError extends Error {constructor(public readonly code:string){super('The music controller update could not be confirmed.');this.name='MusicPublicationError';}}
const fail=(code:string):never=>{throw new MusicPublicationError(code);};
const missing=(error:unknown)=>typeof error==='object'&&error!==null&&'code'in error&&error.code===10008;
const safeCodes=new Set(['MUSIC_DISABLED','MUSIC_CHANNEL','MUSIC_PERMISSIONS','MUSIC_AUTHOR','MUSIC_MARKER','MUSIC_STALE','MUSIC_MISSING','MUSIC_PAYLOAD','MUSIC_PUBLICATION','DELIVERY_UNCERTAIN','DELIVERY_BUSY']);
const same=(state:MusicState,other:MusicState)=>state.guildId===other.guildId&&state.textChannelId===other.textChannelId&&state.revision===other.revision&&state.generation===other.generation;

/** Durable send recovery, authoritative pointer refresh and non-destructive retirement.
 * Shared job leases remain the cross-process scheduler's responsibility. A Discord edit
 * cannot be transactional with a database move; each action rechecks the pointer, and
 * relocation's durable cleanup intent retires any late edit/send. Never blindly resend.
 */
export class DiscordMusicPublication {
 #tails=new Map<string,Promise<unknown>>();
 constructor(private repo:Repository,private deliveryForJob:(jobId:string)=>DeliveryRepository,private payloadFactory:PayloadFactory,private enabled:(guildId:string)=>Promise<boolean>){}
 private async boundary<T>(work:()=>Promise<T>):Promise<T>{try{return await work();}catch(error){const code=error instanceof Error&&'code'in error&&typeof error.code==='string'&&safeCodes.has(error.code)?error.code:'MUSIC_PUBLICATION';throw new MusicPublicationError(code);}}
 private serial<T>(guildId:string,work:()=>Promise<T>):Promise<T>{const pending=(this.#tails.get(guildId)??Promise.resolve()).catch(()=>{}).then(work);this.#tails.set(guildId,pending);void pending.finally(()=>{if(this.#tails.get(guildId)===pending)this.#tails.delete(guildId);}).catch(()=>{});return pending;}
 private async channel(client:Client,guildId:string,channelId:string,write=false):Promise<VoiceChannel>{
  if(!client.user)fail('MUSIC_AUTHOR');const guild=await client.guilds.fetch({guild:guildId,force:true}),channel=await guild.channels.fetch(channelId,{force:true});
  if(!channel||channel.id!==channelId||channel.guildId!==guildId||channel.type!==ChannelType.GuildVoice||!channel.isSendable())fail('MUSIC_CHANNEL');
  const bot=await guild.members.fetchMe({force:true}),required=PermissionFlagsBits.ViewChannel|PermissionFlagsBits.ReadMessageHistory|(write?PermissionFlagsBits.SendMessages|PermissionFlagsBits.AttachFiles|PermissionFlagsBits.EmbedLinks|PermissionFlagsBits.PinMessages:0n);
  if(bot.id!==client.user!.id||!channel!.permissionsFor(bot)?.has(required))fail('MUSIC_PERMISSIONS');return channel as VoiceChannel;
 }
 private author(client:Client,message:Message,guildId:string,channelId:string){if(message.author.id!==client.user?.id||message.guildId!==guildId||message.channelId!==channelId)fail('MUSIC_AUTHOR');}
 private async message(client:Client,channel:VoiceChannel,id:string):Promise<Message|null>{try{const message=await channel.messages.fetch({message:id,force:true,cache:false});this.author(client,message,channel.guildId,channel.id);return message;}catch(error){if(missing(error))return null;throw error;}}
 private async active(guildId:string,channelId:string,messageId:string){const current=await this.repo.read(guildId);return current?.state.textChannelId===channelId&&current.controllerMessageId===messageId?current:null;}
 private async rendered(state:MusicState,marker:string,channel:VoiceChannel){
  const requester=state.current?.requesterUserId,art=requester&&channel.client?await memberArt(channel.client,state.guildId,requester):undefined;
  const payload=await this.payloadFactory(state,{compact:true,voiceChannelName:channel.name,requesterName:art?.name??(requester?'Member':'Autoplay'),requesterAvatarData:art?.avatarData??''});if(!payload.embeds.length)fail('MUSIC_PAYLOAD');
  return{...payload,embeds:payload.embeds.map((embed,index)=>index===0?EmbedBuilder.from(embed).setFooter({text:marker}):EmbedBuilder.from(embed)),allowedMentions:{parse:[] as never[]}};
 }
 private async allowed(guildId:string){if(await this.enabled(guildId)!==true)fail('MUSIC_DISABLED');}
 async ensure(client:Client,guildId:string):Promise<MusicPublicationResult>{return this.boundary(()=>this.serial(guildId,()=>this.ensureInternal(client,guildId)));}
 private async ensureInternal(client:Client,guildId:string):Promise<MusicPublicationResult>{
  await this.allowed(guildId);const saved=await this.repo.read(guildId);if(!saved)return{kind:'missing'};
  if(saved.controllerMessageId)return this.refreshInternal(client,guildId);
  const reserved=await this.repo.reserveController(guildId,saved.state.revision);return reserved.kind==='publication'?this.publishInternal(client,reserved.jobId):this.refreshInternal(client,guildId);
 }
 async publish(client:Client,jobId:string):Promise<MusicPublicationResult>{return this.boundary(async()=>{const p=await this.repo.controllerPublication(jobId);return this.serial(p.job.guildId,()=>this.publishInternal(client,jobId));});}
 private async publishInternal(client:Client,jobId:string):Promise<MusicPublicationResult>{
  let publication=await this.repo.controllerPublication(jobId);const guildId=publication.job.guildId;
  if(publication.obsolete&&publication.payload.deliveryState==='PENDING')return{kind:'obsolete'};
  // Even after disable/relocation, reconcile an already-started send so its confirmed
  // message gets a durable cleanup intent. This never authorizes a new disabled send.
  if(publication.payload.deliveryState==='PENDING')await this.allowed(guildId);
  const channel=await this.channel(client,guildId,publication.payload.channelId,publication.payload.deliveryState==='PENDING');
  const marker=publication.marker;if(marker!=='music-controller:'+jobId)fail('MUSIC_MARKER');
  const messageId=await new DeliveryEngine(this.deliveryForJob(jobId)).deliver(marker,{
   find:async key=>{
    let before:string|undefined;let found:string|null=null;
    for(let page=0;page<10;page++){
     const messages=await channel.messages.fetch({limit:100,...(before?{before}:{}),cache:false});if(!messages.size)break;
     for(const message of messages.values())if(message.author.id===client.user?.id&&message.guildId===guildId&&message.channelId===channel.id&&message.embeds.some(embed=>embed.footer?.text===key)){if(found&&found!==message.id)fail('MUSIC_MARKER');found=message.id;}
     const next=messages.last()?.id;if(messages.size<100||!next||next===before)break;before=next;
    }
    return found;
   },
   send:async key=>{
    publication=await this.repo.controllerPublication(jobId);await this.allowed(guildId);if(publication.obsolete||!publication.state)fail('MUSIC_STALE');
    const destination=await this.channel(client,guildId,publication.payload.channelId,true),payload=await this.rendered(publication.state!,key,destination);
    await this.allowed(guildId);const fresh=await this.repo.controllerPublication(jobId);if(fresh.obsolete||!fresh.state||!same(publication.state!,fresh.state))fail('MUSIC_STALE');
    const sent=await destination.send(payload);this.author(client,sent,guildId,destination.id);if(!sent.embeds.some(embed=>embed.footer?.text===key))fail('MUSIC_MARKER');return sent.id;
   }
  });
  const message=await this.message(client,channel,messageId);if(message&&!message.embeds.some(embed=>embed.footer?.text===marker))fail('MUSIC_MARKER');
  // SENT is durable proof of the original delivery. A positively deleted post can
  // be linked then replaced through the expected-message CAS, never blind resent.
  const finalized=await this.repo.finalizeController(jobId,messageId);if(!finalized.linked)return{kind:'obsolete',messageId};
  // A retry recovers and pins this exact confirmed message before doing any fresh
  // rendering. A failed pin never creates another post or repeats an earlier edit.
  if(await this.enabled(guildId)!==true)return{kind:'published',messageId};
  if(!message)return this.refreshInternal(client,guildId);
  if(!message.pinned){await this.channel(client,guildId,channel.id,true);await this.allowed(guildId);if(!await this.active(guildId,channel.id,messageId))return{kind:'obsolete',messageId};await message.pin('Current music controller');}
  await this.refreshInternal(client,guildId);return{kind:'published',messageId};
 }
 async refresh(client:Client,guildId:string):Promise<MusicPublicationResult>{return this.boundary(()=>this.serial(guildId,()=>this.refreshInternal(client,guildId)));}
 private async refreshInternal(client:Client,guildId:string):Promise<MusicPublicationResult>{
  await this.allowed(guildId);const saved=await this.repo.read(guildId);if(!saved)return{kind:'missing'};if(!saved.controllerMessageId)return this.ensureInternal(client,guildId);
  const channel=await this.channel(client,guildId,saved.state.textChannelId,true),messageId=saved.controllerMessageId,message=await this.message(client,channel,messageId);
  if(!message){const current=await this.active(guildId,channel.id,messageId);if(!current)return{kind:'obsolete'};const reserved=await this.repo.reserveController(guildId,current.state.revision,messageId);return reserved.kind==='publication'?this.publishInternal(client,reserved.jobId):{kind:'obsolete'};}
  const marker=message.embeds.map(embed=>embed.footer?.text).find(text=>/^music-controller:[a-zA-Z0-9_-]{1,100}$/.test(text??''));if(!marker)fail('MUSIC_MARKER');
  const publication=await this.repo.controllerPublication(marker!.slice('music-controller:'.length));if(publication.marker!==marker||publication.job.guildId!==guildId||publication.payload.channelId!==channel.id||publication.payload.deliveryState!=='SENT'||publication.payload.deliveryMessageId!==messageId||publication.obsolete)fail('MUSIC_MARKER');
  const payload=await this.rendered(saved.state,marker!,channel);await this.allowed(guildId);const fresh=await this.active(guildId,channel.id,messageId);if(!fresh||!same(saved.state,fresh.state))fail('MUSIC_STALE');
  await message.edit(payload);
  if(!await this.active(guildId,channel.id,messageId))return{kind:'obsolete',messageId};
  if(!message.pinned){await this.allowed(guildId);if(!await this.active(guildId,channel.id,messageId))return{kind:'obsolete',messageId};await message.pin('Current music controller');}
  return{kind:'refreshed',messageId};
 }
 async cleanup(client:Client,jobId:string):Promise<MusicPublicationResult>{return this.boundary(async()=>{const intent=await this.repo.controllerCleanupIntent(jobId);return this.serial(intent.job.guildId,async()=>{
  const current=await this.repo.controllerCleanupIntent(jobId);if(current.obsolete)return{kind:'obsolete'};
  const channel=await this.channel(client,current.job.guildId,current.payload.channelId),message=await this.message(client,channel,current.payload.messageId);if(!message)return{kind:'missing'};
  if((await this.repo.controllerCleanupIntent(jobId)).obsolete)return{kind:'obsolete'};
  // Keep approved art/history; only retire interaction controls and the pin.
  await message.edit({components:[],allowedMentions:{parse:[]}});
  if((await this.repo.controllerCleanupIntent(jobId)).obsolete)return{kind:'obsolete'};
  if(message.pinned){const bot=await channel.guild.members.fetchMe({force:true});if(!channel.permissionsFor(bot)?.has(PermissionFlagsBits.PinMessages))fail('MUSIC_PERMISSIONS');if((await this.repo.controllerCleanupIntent(jobId)).obsolete)return{kind:'obsolete'};await message.unpin('Retired music controller');}
  return{kind:'retired',messageId:message.id};
 });});}
}
