import {DomainError,type AuditService} from '../../../../packages/core/src/index.js';
import type {ChatInputCommandInteraction} from 'discord.js';

export const EMOJI_STEAL_COMMANDS=new Set(['steal']);
const MAX_EMOJI_BYTES=256*1024;
const sourcePattern=/^<(a?):[A-Za-z0-9_]{2,32}:(\d{17,20})>$/;
type FetchLike=(input:string,init?:RequestInit)=>Promise<{ok:boolean;status:number;headers:{get(name:string):string|null};arrayBuffer():Promise<ArrayBuffer>}>;
function validImage(data:Buffer,animated:boolean){const png=data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));const head=data.subarray(0,6).toString('ascii');return animated?head==='GIF87a'||head==='GIF89a':png;}
function emojiName(raw:string){const value=raw.trim().toLowerCase().replace(/[^a-z0-9_]/g,'_').replace(/_+/g,'_').replace(/^_+|_+$/g,'');if(value.length<2||value.length>32)throw new DomainError('EMOJI_NAME','Emoji names must contain 2–32 letters, numbers, or underscores.');return value;}

export class DiscordEmojiStealCoordinator {
 constructor(private readonly audit:AuditService,private readonly request:FetchLike=fetch){}
 async handle(interaction:ChatInputCommandInteraction):Promise<void>{
  if(!interaction.guild){await interaction.reply({ephemeral:true,content:'Use this command in Chairs.'});return;}
  const raw=interaction.options.getString('emoji',true).trim(),match=sourcePattern.exec(raw);
  if(!match){await interaction.reply({ephemeral:true,content:'Use a custom Discord emoji such as <:chair:123…> or <a:chair:123…>.'});return;}
  const animated=match[1]==='a',sourceId=match[2]!,sourceName=/^<a?:([^:]+):/.exec(raw)?.[1]??'emoji',name=emojiName(interaction.options.getString('name')??sourceName);
  await interaction.deferReply({ephemeral:true});
  try{
   const emojis=await interaction.guild.emojis.fetch();
   if([...emojis.values()].some(emoji=>emoji.name?.toLowerCase()===name))throw new DomainError('EMOJI_DUPLICATE','An emoji named **'+name+'** already exists in this server.');
   const slotLimit=interaction.guild.premiumTier===3?250:interaction.guild.premiumTier===2?150:interaction.guild.premiumTier===1?100:50;
   if(emojis.size>=slotLimit)throw new DomainError('EMOJI_SLOTS','The server has no open custom-emoji slots.');
   const response=await this.request('https://cdn.discordapp.com/emojis/'+sourceId+'.'+(animated?'gif':'png')+'?quality=lossless',{signal:AbortSignal.timeout(10_000)});
   if(!response.ok)throw new DomainError('EMOJI_DOWNLOAD','That emoji could not be downloaded from Discord.');
   if(Number(response.headers.get('content-length')??'0')>MAX_EMOJI_BYTES)throw new DomainError('EMOJI_SIZE','That emoji is larger than Discord’s 256 KB upload limit.');
   const data=Buffer.from(await response.arrayBuffer());
   if(!data.length||data.length>MAX_EMOJI_BYTES||!validImage(data,animated))throw new DomainError('EMOJI_FILE','That emoji is not a valid '+(animated?'GIF':'PNG')+' within Discord’s 256 KB limit.');
   const created=await interaction.guild.emojis.create({attachment:data,name,reason:'Copied by '+interaction.user.tag+' with /steal'});
   await this.audit.record({guildId:interaction.guildId!,actorUserId:interaction.user.id,source:'discord',action:'emoji.steal',targetType:'emoji',targetId:created.id,before:{sourceEmojiId:sourceId},after:{name:created.name,animated,sizeBytes:data.length},requestId:interaction.id,createdAt:new Date()});
   await interaction.editReply({content:'Added '+created+' as **'+created.name+'**.',allowedMentions:{parse:[]}});
  }catch(error){await interaction.editReply({content:error instanceof DomainError?error.message:'That emoji could not be copied. Nothing was added.',allowedMentions:{parse:[]}}).catch(()=>undefined);}
 }
}
