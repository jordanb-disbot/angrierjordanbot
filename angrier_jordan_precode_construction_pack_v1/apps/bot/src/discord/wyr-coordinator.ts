import { AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, type ButtonInteraction, type ChatInputCommandInteraction, type Client } from 'discord.js';
import sharp from 'sharp';
import { DomainError } from '../../../../packages/core/src/index.js';
import type { WyrCategoryInput, WyrService } from '../../../../packages/features-wyr/src/index.js';

const validCategories=new Set<WyrCategoryInput>(['Random','Casual','Friends','Dating','Married','Spicy','Unhinged']);
const png=async(svg:string)=>sharp(Buffer.from(svg)).png().toBuffer();
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
  constructor(private readonly service:WyrService){}

  async handleSlash(interaction:ChatInputCommandInteraction):Promise<void>{
    const raw=interaction.options.getString('category')??'Random';
    const category=validCategories.has(raw as WyrCategoryInput)?raw as WyrCategoryInput:'Random';
    try{
      let session=await this.service.start({guildId:interaction.guildId!,channelId:interaction.channelId,ownerUserId:interaction.user.id,category});
      const buffer=await png(this.service.renderOpen(session));
      await interaction.reply({content:`Voting closes <t:${Math.floor(session.expiresAt.getTime()/1000)}:R>. Totals stay hidden until close.`,files:[file(buffer)],components:[openRow(session.id,session.data.extensionSeconds,session.extensionUsed)]});
      const message=await interaction.fetchReply();
      session=await this.service.attachMessage(session.id,message.id);
    }catch(error){await this.replyError(interaction,error);}
  }

  async handleButton(interaction:ButtonInteraction):Promise<void>{
    const [scope,action,arg,sessionIdMaybe]=interaction.customId.split(':');
    if(scope!=='wyr')return;
    try{
      if(action==='vote'&&(arg==='A'||arg==='B')&&sessionIdMaybe){
        const session=await this.service.vote(sessionIdMaybe,interaction.user.id,arg);
        const label=arg==='A'?session.data.optionA:session.data.optionB;
        await interaction.reply({content:`Vote recorded — ${label}. You can change it until voting closes.`,ephemeral:true});return;
      }
      if(action==='extend'&&arg){
        const isStaff=interaction.memberPermissions?.has('ManageMessages')??false;
        const session=await this.service.extend(arg,interaction.user.id,isStaff);
        const buffer=await png(this.service.renderOpen(session));
        await interaction.update({content:`Voting closes <t:${Math.floor(session.expiresAt.getTime()/1000)}:R>. Totals stay hidden until close.`,files:[file(buffer)],components:[openRow(session.id,session.data.extensionSeconds,session.extensionUsed)]});return;
      }
      if(action==='play'&&arg){
        let session=await this.service.replay(arg,interaction.user.id);
        const buffer=await png(this.service.renderOpen(session));
        await interaction.reply({content:`Voting closes <t:${Math.floor(session.expiresAt.getTime()/1000)}:R>. Totals stay hidden until close.`,files:[file(buffer)],components:[openRow(session.id,session.data.extensionSeconds,session.extensionUsed)]});
        const message=await interaction.fetchReply();session=await this.service.attachMessage(session.id,message.id);return;
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

  private async editKnownMessage(client:Client,guildId:string,channelId:string,messageId:string,svg:string,components:ActionRowBuilder<ButtonBuilder>[]):Promise<void>{
    const guild=await client.guilds.fetch(guildId);const channel=await guild.channels.fetch(channelId);
    if(!channel?.isTextBased()||!('messages' in channel))return;
    const message=await channel.messages.fetch(messageId);const buffer=await png(svg);
    const first=components[0]?.components[0]?.data;
    const isResult=first && 'custom_id' in first && first.custom_id?.includes(':play:');
    await message.edit({attachments:[],...(isResult?{content:'Results are in.'}:{}),files:[file(buffer)],components});
  }

  private async replyError(interaction:ChatInputCommandInteraction|ButtonInteraction,error:unknown):Promise<void>{
    const content=error instanceof DomainError?error.message:'Something went wrong starting that round.';
    if(interaction.replied||interaction.deferred)await interaction.followUp({content,ephemeral:true});else await interaction.reply({content,ephemeral:true});
  }
}
