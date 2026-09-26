import {ActionRowBuilder,AttachmentBuilder,ButtonBuilder,ButtonStyle,EmbedBuilder,type AutocompleteInteraction,type ButtonInteraction,type ChatInputCommandInteraction,type Client,type Guild,type Message} from 'discord.js';
import {DeliveryEngine,DomainError,type ConfigService} from '../../../../packages/core/src/index.js';
import {COMMANDS} from '../../../../packages/contracts/src/generated/commands.js';
import {PrismaSocialRepository} from '../../../../packages/features-social/src/prisma-repository.js';
import {SOCIAL_ACTIONS,detectHaiku,sampleHaiku,validateSocialPolicy} from '../../../../packages/features-social/src/domain.js';
import type {SocialContext,SocialJob,SocialPolicy} from '../../../../packages/features-social/src/interfaces.js';
import {renderSocialResponse} from '../../../../packages/features-social/src/render.js';
import {rasterizeSvg} from '../../../../packages/renderer/src/raster.js';
import brand from '../../../../production/theme/brand.json' with {type:'json'};
export const SOCIAL_COMMANDS=new Set(['social','haiku']);
type SocialInteraction=ChatInputCommandInteraction|ButtonInteraction;
interface ActionContract {id:string;name?:string;description?:string;aliases?:readonly string[];command?:string;permissions?:readonly string[];channels?:readonly string[];options?:readonly {name:string;required?:boolean}[];}
/** Action records remain in the generated command contract after the Discord registration consolidation. */
export function registeredSocialActions(){const root=(COMMANDS as unknown as readonly {id:string;actions?:readonly ActionContract[]}[]).find(c=>c.id==='social_react');return(root?.actions??[]).map(c=>({...c,action:c.id.replace(/^social_/, '')})).filter(c=>SOCIAL_ACTIONS.some(a=>a===c.action));}
const normalizeSearch=(value:string)=>value.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
export function socialActionChoices(query:string){const needle=normalizeSearch(query);return registeredSocialActions().filter(c=>(!c.permissions?.length||c.permissions.includes('member'))&&[c.action,c.name??'',...(c.aliases??[]),c.description??''].some(s=>normalizeSearch(s).includes(needle))).sort((a,b)=>{const rank=(c:ReturnType<typeof registeredSocialActions>[number])=>[c.action,c.name??'',...(c.aliases??[])].some(s=>normalizeSearch(s)===needle)?0:[c.action,c.name??'',...(c.aliases??[])].some(s=>normalizeSearch(s).startsWith(needle))?1:2;return rank(a)-rank(b);}).slice(0,25).map(c=>({name:(c.aliases?.find(alias=>alias.includes(' '))??c.name??c.action).slice(0,100),value:c.action}));}
export class DiscordSocialCoordinator {
 constructor(private readonly repo:PrismaSocialRepository,private readonly config:ConfigService,private readonly eligible:(g:string,u:string)=>Promise<boolean>){}
 private async policy(guildId:string):Promise<SocialPolicy>{const p={throttleSeconds:Number(await this.config.get(guildId,'social.throttle_seconds')),roastBackSeconds:Number(await this.config.get(guildId,'social.roast_back_seconds'))};validateSocialPolicy(p);return p;}
 private async guard(guildId:string,userId:string,channelId:string,haiku=false){
  if(await this.config.get(guildId,haiku?'features.haiku':'features.social')!==true)throw new DomainError('SOCIAL_DISABLED',haiku?'Haiku is not enabled yet.':'Social commands are not enabled yet.');
  if(!haiku){const channel=await this.config.get(guildId,'channels.main_chat');if(channelId!==channel)throw new DomainError('SOCIAL_CHANNEL',typeof channel==='string'?`Use social commands in <#${channel}>.`:'The main chat channel has not been configured.');}
  if(!await this.eligible(guildId,userId))throw new DomainError('SOCIAL_RESTRICTED','Social commands are unavailable while restricted.');
 }
 private async member(guild:Guild,userId:string){const member=await guild.members.fetch({user:userId,force:true});if(member.user.bot||!await this.eligible(guild.id,userId))throw new DomainError('SOCIAL_MEMBER','Choose an eligible server member.');return member;}
 async autocomplete(i:AutocompleteInteraction){
  try{if(!i.guildId||!i.channelId||i.commandName!=='social'||i.options.getSubcommand(false)!=='react'||i.options.getFocused(true).name!=='action'){await i.respond([]);return;}await this.guard(i.guildId,i.user.id,i.channelId);await i.respond(socialActionChoices(String(i.options.getFocused())));}catch{if(!i.responded)await i.respond([]);}
 }
 async handle(i:SocialInteraction){
  let publicReply=false;
  try{
   if(!i.guildId||!i.guild||!i.channelId)throw new DomainError('SOCIAL_SERVER','Use social commands in the server.');
   const haiku=i.isChatInputCommand()&&i.commandName==='haiku',notmad=i.isChatInputCommand()&&i.commandName==='social'&&i.options.getSubcommand(false)==='notmad';
   publicReply=haiku||notmad;await i.deferReply({ephemeral:!publicReply});
   await this.guard(i.guildId,i.user.id,i.channelId,haiku);await this.member(i.guild,i.user.id);
   const c:SocialContext={guildId:i.guildId,channelId:i.channelId,userId:i.user.id,requestKey:i.id};
   if(haiku||notmad){
    // Newest owner instruction: notmad is actual server-owner only, independent of role names.
    if(notmad&&(await i.guild.fetch()).ownerId!==i.user.id)throw new DomainError('SOCIAL_OWNER','Only the server owner may use notmad.');
    if(notmad&&i.isChatInputCommand()){const target=i.options.getUser('member');if(target)await this.member(i.guild,target.id);}
    const result=await this.repo.exact(c,haiku?'haiku':'notmad',Number(await this.config.get(i.guildId,'social.throttle_seconds')));
    await i.editReply({content:result.content,allowedMentions:{parse:[]}});return;
   }
   const policy=await this.policy(i.guildId);let result:{jobId:string};
   if(i.isButton()){
    const parts=i.customId.split(':');if(parts.length!==3||parts[0]!=='social'||parts[1]!=='back'||!parts[2])throw new DomainError('ROAST_CONTROL','This Roast Back control is unavailable.');
    if(i.message.author.id!==i.client.user.id)throw new DomainError('ROAST_CONTROL','Use the original Angrier Jordan message.');
    const data=await this.repo.retaliation(c,parts[2],i.message.id);await this.member(i.guild,data.actorId);
    result=await this.repo.queue(c,'roast',data.actorId,policy,{sessionId:parts[2],messageId:i.message.id});
   }else{
    if(i.commandName!=='social')throw new DomainError('SOCIAL_ACTION','Choose a social command.');
    const sub=i.options.getSubcommand(),action=sub==='roast'?'roast':sub==='react'?i.options.getString('action',true):'';
    const contract=action==='roast'?null:registeredSocialActions().find(c=>c.action===action);
    if(action!=='roast'&&(!contract||contract.permissions?.length&&!contract.permissions.includes('member')))throw new DomainError('SOCIAL_ACTION','Choose an available social action.');
    const target=i.options.getUser('member');if(target)await this.member(i.guild,target.id);
    if(contract?.options?.some(o=>o.name==='member'&&o.required)&&!target)throw new DomainError('SOCIAL_MEMBER','Choose a server member for this action.');
    result=await this.repo.queue(c,action,target?.id??null,policy);
   }
   const messageId=await this.deliver(i.client,result.jobId);
   await i.editReply({content:messageId?`Posted: https://discord.com/channels/${i.guildId}/${i.channelId}/${messageId}`:'This response is no longer eligible to be posted.',allowedMentions:{parse:[]}});
   if(i.isButton()&&messageId){try{await i.message.edit({components:[]});}catch{/* The durable consumed grant still rejects every repeated click. */}}
  }catch(error){
   const content=error instanceof DomainError?error.message:'The response could not be confirmed. Pending publication will be reconciled before any retry.';
   if(i.deferred&&publicReply){try{await i.deleteReply();}catch{}await i.followUp({ephemeral:true,content,allowedMentions:{parse:[]}});}
   else if(i.deferred||i.replied)await i.editReply({content,allowedMentions:{parse:[]}});else await i.reply({ephemeral:true,content,allowedMentions:{parse:[]}});
  }
 }
 private async canPublish(client:Client,p:SocialJob){
  const haiku=p.action==='haiku.passive';if(await this.config.get(p.guildId,haiku?'features.haiku':'features.social')!==true)throw new DomainError('SOCIAL_DISABLED','Social publication remains disabled.');
  if(p.channelId!==await this.config.get(p.guildId,'channels.main_chat'))return false;
  const guild=await client.guilds.fetch(p.guildId);
  try{await this.member(guild,p.actorId);if(p.targetId)await this.member(guild,p.targetId);}catch{return false;}
  return p.action!=='roast'||Boolean(p.targetId&&await this.repo.roastAllowed(p.guildId,p.targetId));
 }
 async deliver(client:Client,jobId:string):Promise<string|null>{
  const job=await this.repo.job(jobId),p=job.payload;if(p.cancelled)return null;
  if(p.deliveryState==='PENDING'&&!await this.canPublish(client,p)){await this.repo.cancel(jobId);return null;}
  const channel=await client.channels.fetch(p.channelId);if(!channel?.isSendable()||!('messages' in channel)||!('guildId' in channel)||channel.guildId!==p.guildId)throw new DomainError('SOCIAL_CHANNEL','The social destination is unavailable.');
  const marker='social:'+jobId,messageId=await new DeliveryEngine(this.repo.delivery(jobId)).deliver(marker,{
   find:async marker=>{const recent=await channel.messages.fetch({limit:100});return recent.find(m=>m.author.id===client.user?.id&&m.embeds.some(e=>e.footer?.text===marker))?.id??null;},
   send:async marker=>{
    if((await this.repo.job(jobId)).payload.cancelled)throw new DomainError('SOCIAL_RESTRICTED','This response was cancelled.');
    if(!await this.canPublish(client,p))throw new DomainError('SOCIAL_RESTRICTED','This response is no longer eligible to be posted.');
    const guild=await client.guilds.fetch(p.guildId),names:Record<string,string>={};for(const id of [p.actorId,p.targetId].filter((v):v is string=>Boolean(v)))names[id]=(await this.member(guild,id)).displayName;
    const card=await rasterizeSvg(renderSocialResponse(p.action,p.content,names)),file=new AttachmentBuilder(card,{name:'social.png',description:p.content.replace(/<@!?(\d+)>/g,(_match,id:string)=>names[id]??'Member').slice(0,1024)});
    const embed=new EmbedBuilder().setAuthor({name:'Angrier Jordan'}).setColor(brand.palette.teal as `#${string}`).setImage('attachment://social.png').setFooter({text:marker});
    const components=p.sessionId?[new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId('social:back:'+p.sessionId).setLabel('Roast Back').setStyle(ButtonStyle.Secondary))]:[];
    return(await channel.send({embeds:[embed],files:[file],components,allowedMentions:{parse:[]}})).id;
   }
  });await this.repo.finalize(jobId,messageId);return messageId;
 }
 async message(message:Message){
  if(message.author.bot||message.system||message.webhookId||!message.guildId||!message.guild||!message.channelId||!detectHaiku(message.content))return;
  if(await this.config.get(message.guildId,'features.haiku')!==true||message.channelId!==await this.config.get(message.guildId,'channels.main_chat'))return;
  if(!sampleHaiku(message.id,Number(await this.config.get(message.guildId,'haiku.response_probability')))||!await this.eligible(message.guildId,message.author.id))return;
  try{const queued=await this.repo.queueHaiku({guildId:message.guildId,channelId:message.channelId,userId:message.author.id,requestKey:message.id},Number(await this.config.get(message.guildId,'haiku.channel_cooldown_seconds')));await this.deliver(message.client,queued.jobId);}catch(error){if(error instanceof DomainError&&['SOCIAL_THROTTLED','SOCIAL_DISABLED','SOCIAL_RESTRICTED'].includes(error.code))return;throw error;}
 }
}
