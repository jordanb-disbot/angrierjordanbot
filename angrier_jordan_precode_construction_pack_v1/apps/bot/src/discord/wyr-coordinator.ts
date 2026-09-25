import { AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, type ButtonInteraction, type ChatInputCommandInteraction, type Client } from 'discord.js';
import {rasterizeSvg} from '../../../../packages/renderer/src/raster.js';
import { DeliveryEngine, DomainError, PermissionEngine, type ConfigService } from '../../../../packages/core/src/index.js';
import {CAPABILITY_MATRIX} from '../../../../packages/contracts/src/generated/capabilities.js';
import type { PrismaWyrPublicationRepository, WyrCategoryInput, WyrService } from '../../../../packages/features-wyr/src/index.js';

const validCategories=new Set<WyrCategoryInput>(['Random','Casual','Friends','Dating','Married','Spicy','Unhinged']);
const png=async(svg:string)=>rasterizeSvg(svg);
const file=(buffer:Buffer,name='wyr.png')=>new AttachmentBuilder(buffer,{name});
const openRow=(sessionId:string,extensionSeconds:number,extensionUsed:boolean)=>new ActionRowBuilder<ButtonBuilder>().addComponents(
  new ButtonBuilder().setCustomId(`wyr:vote:A:${sessionId}`).setLabel('Choose Left').setStyle(ButtonStyle.Primary),
  new ButtonBuilder().setCustomId(`wyr:vote:B:${sessionId}`).setLabel('Choose Right').setStyle(ButtonStyle.Secondary),
  new ButtonBuilder().setCustomId(`wyr:extend:${sessionId}`).setLabel(`+${extensionSeconds} Seconds`).setStyle(ButtonStyle.Secondary).setDisabled(extensionUsed||extensionSeconds===0),
);
const resultRow=(sessionId:string)=>new ActionRowBuilder<ButtonBuilder>().addComponents(
  new ButtonBuilder().setCustomId(`wyr:play:${sessionId}`).setLabel('Play Again').setStyle(ButtonStyle.Success),
);

export class DiscordWyrCoordinator {
  constructor(private readonly service:WyrService,private readonly config?:ConfigService,private readonly eligible:(g:string,u:string)=>Promise<boolean>=async()=>false,private readonly publication?:PrismaWyrPublicationRepository){}
  private async guard(i:ChatInputCommandInteraction|ButtonInteraction){if(!i.guildId||!i.guild)throw new DomainError('SERVER_ONLY','Use WYR in the server.');if(!this.config||await this.config.get(i.guildId,'features.party_games')!==true)throw new DomainError('WYR_DISABLED','Party games are not enabled yet.');if(await this.config.get(i.guildId,'channels.games_channel')!==i.channelId)throw new DomainError('WYR_CHANNEL','Use the configured games channel.');if(!new PermissionEngine({'events.use':CAPABILITY_MATRIX.capabilities['events.use']}).can('member','events.use')||!await this.eligible(i.guildId,i.user.id))throw new DomainError('WYR_RESTRICTED','Party games are unavailable while restricted.');}

  async handleSlash(interaction:ChatInputCommandInteraction):Promise<void>{
    const raw=interaction.options.getString('category')??'Random';
    const category=validCategories.has(raw as WyrCategoryInput)?raw as WyrCategoryInput:'Random';
    try{
      await this.guard(interaction);await interaction.deferReply();
      const message=await interaction.fetchReply();
      const session=await this.service.start({guildId:interaction.guildId!,channelId:interaction.channelId,ownerUserId:interaction.user.id,category,messageId:message.id});
      await this.publish(interaction.client,session.id,interaction).catch(async()=>{await interaction.followUp({ephemeral:true,content:'Your round is saved. Its original card is pending recovery.'});});
    }catch(error){await this.replyError(interaction,error);}
  }

  async handleButton(interaction:ButtonInteraction):Promise<void>{
    const [scope,action,arg,sessionIdMaybe]=interaction.customId.split(':');
    if(scope!=='wyr')return;
    try{
      await this.guard(interaction);const id=action==='vote'?sessionIdMaybe:arg;if(!id)throw new DomainError('WYR_CONTROL','Use the original WYR message.');const source=await this.service.get(id);if(source.guildId!==interaction.guildId||source.channelId!==interaction.channelId||source.messageId!==interaction.message.id)throw new DomainError('WYR_CONTROL','Use the original WYR message.');
      if(action==='vote'&&(arg==='A'||arg==='B')&&sessionIdMaybe){
        await interaction.deferReply({ephemeral:true});
        const session=await this.service.vote(sessionIdMaybe,interaction.user.id,arg);
        const label=arg==='A'?session.data.optionA:session.data.optionB;
        await interaction.editReply({content:`Vote recorded — ${label}. You can change it until voting closes.`,allowedMentions:{parse:[]}});return;
      }
      if(action==='extend'&&arg){
        if(source.ownerUserId!==interaction.user.id)throw new DomainError('NOT_ALLOWED','Only the host may extend the round.');
        await interaction.deferUpdate();
        const session=await this.service.extend(arg,interaction.user.id);
        const buffer=await png(this.service.renderOpen(session));
        await interaction.editReply({content:`Voting closes <t:${Math.floor(session.expiresAt.getTime()/1000)}:R>. Totals stay hidden until close.`,files:[file(buffer)],attachments:[],components:[openRow(session.id,session.data.extensionSeconds,session.extensionUsed)],allowedMentions:{parse:[]}});return;
      }
      if(action==='play'&&arg){
        await interaction.deferReply();
        const message=await interaction.fetchReply(),session=await this.service.replay(arg,interaction.user.id,message.id);
        await this.publish(interaction.client,session.id,interaction).catch(async()=>{await interaction.followUp({ephemeral:true,content:'Your round is saved. Its original card is pending recovery.'});});return;
      }
    }catch(error){await this.replyError(interaction,error);}
  }

  async recover(client:Client):Promise<{active:number;closed:number}>{
    const recovered=await this.service.recover();let closed=0;
    for(const session of recovered.expired){
      const result=await this.service.close(session.id);closed+=1;
      if(result.session.messageId)await this.editKnownMessage(client,result.session.guildId,result.session.channelId,result.session.messageId,result.svg,[resultRow(result.session.id)]);
    }
    for(const session of recovered.active){
      if(session.messageId)await this.editKnownMessage(client,session.guildId,session.channelId,session.messageId,this.service.renderOpen(session),[openRow(session.id,session.data.extensionSeconds,session.extensionUsed)]);
    }
    return {active:recovered.active.length,closed};
  }

  async closeDue(client:Client):Promise<number>{
    const recovered=await this.service.recover();let count=0;
    for(const session of recovered.expired){
      const result=await this.service.close(session.id);count+=1;
      if(result.session.messageId)await this.editKnownMessage(client,result.session.guildId,result.session.channelId,result.session.messageId,result.svg,[resultRow(result.session.id)]);
    }
    return count;
  }

  async advance(client:Client,sessionId:string){const result=await this.service.close(sessionId);if(result.session.messageId)await this.editKnownMessage(client,result.session.guildId,result.session.channelId,result.session.messageId,result.svg,[resultRow(result.session.id)]);}

  /** Re-editing the saved original reply is safe even after an uncertain prior edit. */
  async publish(client:Client,sessionId:string,interaction?:ChatInputCommandInteraction|ButtonInteraction){
    if(!this.publication)throw new DomainError('WYR_PUBLICATION','WYR publication recovery is not configured.');
    const job=await this.publication.jobForSession(sessionId),session=await this.service.get(sessionId),channel=await client.channels.fetch(session.channelId);
    if(!channel?.isSendable()||!('messages' in channel))throw new Error('WYR destination unavailable.');
    const marker='wyr:'+sessionId;
    const payload=async()=>{let latest=await this.service.get(sessionId);if(latest.state==='OPEN'){try{latest=(await this.service.close(sessionId)).session;}catch(error){if(!(error instanceof DomainError)||error.code!=='NOT_DUE')throw error;}}const closed=latest.state==='CLOSED',svg=closed?(await this.service.close(sessionId)).svg:this.service.renderOpen(latest);return{content:closed?'Results are in.':`Voting closes <t:${Math.floor(latest.expiresAt.getTime()/1000)}:R>. Totals stay hidden until close.`,files:[file(await png(svg))],attachments:[],embeds:[new EmbedBuilder().setFooter({text:marker})],components:[closed?resultRow(sessionId):openRow(sessionId,latest.data.extensionSeconds,latest.extensionUsed)],allowedMentions:{parse:[] as never[]}};};
    const editOriginal=async()=>{if(!session.messageId)return null;const message=await channel.messages.fetch(session.messageId);if(message.author.id!==client.user?.id)throw new Error('WYR message author mismatch.');const card=await payload();if(interaction)await interaction.editReply(card);else await message.edit(card);return message.id;};
    const messageId=await new DeliveryEngine(this.publication.delivery(job.id)).deliver(marker,{
      find:async()=>{if(session.messageId)return editOriginal();const messages=await channel.messages.fetch({limit:100});return messages.find(m=>m.author.id===client.user?.id&&m.embeds.some(e=>e.footer?.text===marker))?.id??null;},
      send:async()=>{const original=await editOriginal();if(original)return original;return(await channel.send(await payload())).id;},
    });
    if(session.messageId!==messageId)await this.service.attachMessage(sessionId,messageId);
  }

  private async editKnownMessage(client:Client,guildId:string,channelId:string,messageId:string,svg:string,components:ActionRowBuilder<ButtonBuilder>[]):Promise<void>{
    const guild=await client.guilds.fetch(guildId);const channel=await guild.channels.fetch(channelId);
    if(!channel?.isTextBased()||!('messages' in channel))return;
    const message=await channel.messages.fetch(messageId);if(message.author.id!==client.user?.id)throw new Error('WYR message author mismatch.');const buffer=await png(svg);
    const first=components[0]?.components[0]?.data;
    const isResult=first && 'custom_id' in first && first.custom_id?.includes(':play:');
    await message.edit({attachments:[],...(isResult?{content:'Results are in.'}:{}),files:[file(buffer)],components});
  }

  private async replyError(interaction:ChatInputCommandInteraction|ButtonInteraction,error:unknown):Promise<void>{
    const content=error instanceof DomainError?error.message:'Something went wrong starting that round.';
    if(interaction.deferred&&interaction.isButton()&&interaction.customId.startsWith('wyr:extend:'))await interaction.followUp({content,ephemeral:true});else if(interaction.deferred&&!interaction.replied)await interaction.editReply({content});else if(interaction.replied||interaction.deferred)await interaction.followUp({content,ephemeral:true});else await interaction.reply({content,ephemeral:true});
  }
}
