import {createHash} from 'node:crypto';
import { AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, type ButtonInteraction, type ChatInputCommandInteraction, type Client } from 'discord.js';
import {rasterizeSvg} from '../../../../packages/renderer/src/raster.js';
import { DeliveryEngine, DomainError, PermissionEngine, type ConfigService } from '../../../../packages/core/src/index.js';
import {CAPABILITY_MATRIX} from '../../../../packages/contracts/src/generated/capabilities.js';
import type { PrismaWyrPublicationRepository, WyrCategoryInput, WyrService } from '../../../../packages/features-wyr/src/index.js';
import {funChannelAllowed} from './fun-channels.js';

const validCategories=new Set<WyrCategoryInput>(['Random','Casual','Friends','Dating','Married','Spicy','Unhinged']);
const png=async(svg:string)=>rasterizeSvg(svg);
const file=(buffer:Buffer,name='wyr.png')=>new AttachmentBuilder(buffer,{name});
const openRow=(sessionId:string,extensionSeconds:number,extensionUsed:boolean,privateCard=false)=>new ActionRowBuilder<ButtonBuilder>().addComponents(
  new ButtonBuilder().setCustomId(`wyr:vote:A:${sessionId}`).setLabel('Choose Left').setStyle(ButtonStyle.Primary),
  new ButtonBuilder().setCustomId(`wyr:vote:B:${sessionId}`).setLabel('Choose Right').setStyle(ButtonStyle.Secondary),
  ...(privateCard?[]:[new ButtonBuilder().setCustomId(`wyr:extend:${sessionId}`).setLabel(`+${extensionSeconds} Seconds`).setStyle(ButtonStyle.Secondary).setDisabled(extensionUsed||extensionSeconds===0)]),
);
const resultRow=(sessionId:string)=>new ActionRowBuilder<ButtonBuilder>().addComponents(
  new ButtonBuilder().setCustomId(`wyr:play:${sessionId}`).setLabel('Play Again').setStyle(ButtonStyle.Success),
);
const modeRow=(userId:string,category:WyrCategoryInput)=>new ActionRowBuilder<ButtonBuilder>().addComponents(
  new ButtonBuilder().setCustomId(`wyr:mode:${userId}:private:${category}`).setLabel('Private').setStyle(ButtonStyle.Primary),
  new ButtonBuilder().setCustomId(`wyr:mode:${userId}:public:${category}`).setLabel('Multiplayer').setStyle(ButtonStyle.Secondary),
);

export class DiscordWyrCoordinator {
  private readonly rendered=new Map<string,string>();
  private readonly updates=new Map<string,Promise<void>>();
  constructor(private readonly service:WyrService,private readonly config?:ConfigService,private readonly eligible:(g:string,u:string)=>Promise<boolean>=async()=>false,private readonly publication?:PrismaWyrPublicationRepository){}
  private async guard(i:ChatInputCommandInteraction|ButtonInteraction){if(!i.guildId||!i.guild)throw new DomainError('SERVER_ONLY','Use WYR in the server.');if(!this.config||await this.config.get(i.guildId,'features.party_games')!==true)throw new DomainError('WYR_DISABLED','Party games are not enabled yet.');if(!await funChannelAllowed(this.config,i.guildId,i.channelId,'party'))throw new DomainError('WYR_CHANNEL','Use an approved games channel.');if(!new PermissionEngine({'events.use':CAPABILITY_MATRIX.capabilities['events.use']}).can('member','events.use')||!await this.eligible(i.guildId,i.user.id))throw new DomainError('WYR_RESTRICTED','Party games are unavailable while restricted.');}

  async handleSlash(interaction:ChatInputCommandInteraction):Promise<void>{
    const raw=interaction.options.getString('category')??'Random';
    const category=validCategories.has(raw as WyrCategoryInput)?raw as WyrCategoryInput:'Random';
    try{
      await interaction.deferReply({ephemeral:true});await this.guard(interaction);
      await interaction.editReply({content:'Choose how to play this WYR round.',components:[modeRow(interaction.user.id,category)],allowedMentions:{parse:[]}});
    }catch(error){await this.replyError(interaction,error);}
  }

  async handleButton(interaction:ButtonInteraction):Promise<void>{
    const [scope,action,arg,sessionIdMaybe]=interaction.customId.split(':');
    if(scope!=='wyr')return;
    let stage='validate-component';
    try{
      if(action==='mode'){const[, ,owner,visibility,category]=interaction.customId.split(':');if((visibility!=='private'&&visibility!=='public')||!category||owner!==interaction.user.id)throw new DomainError('WYR_MODE','Open your own WYR mode selector.');stage='defer-mode';await interaction.deferUpdate();stage='guard-mode';await this.guard(interaction);stage='create-session';const session=await this.service.start({guildId:interaction.guildId!,channelId:interaction.channelId,ownerUserId:interaction.user.id,category:validCategories.has(category as WyrCategoryInput)?category as WyrCategoryInput:'Random',enforceSinglePublicRound:visibility==='public',visibility});if(visibility==='public'){stage='publish-public';await this.publish(interaction.client,session.id);stage='confirm-public';await interaction.editReply({content:'The multiplayer WYR round is ready in this channel.',components:[]});return;}stage='render-private';const card=await this.payload(session);stage='write-private';const message=await interaction.editReply(card);stage='attach-private';await this.service.attachMessage(session.id,message.id);return;}
      const id=action==='vote'?sessionIdMaybe:arg;if(!id)throw new DomainError('WYR_CONTROL','Use the original WYR message.');const source=await this.service.get(id),privateRound=source.data?.visibility==='private';
      if(action==='vote')await (privateRound?interaction.deferUpdate():interaction.deferReply({ephemeral:true}));else if(action==='extend')await interaction.deferUpdate();else if(action==='play')await (privateRound?interaction.deferUpdate():interaction.deferReply());
      await this.guard(interaction);if(source.guildId!==interaction.guildId||source.channelId!==interaction.channelId||source.messageId!==interaction.message.id)throw new DomainError('WYR_CONTROL','Use the original WYR message.');if(privateRound&&source.ownerUserId!==interaction.user.id)throw new DomainError('OWNER_ONLY','Open your own private WYR round.');
      if(action==='vote'&&(arg==='A'||arg==='B')&&sessionIdMaybe){
        const session=privateRound?await this.service.choosePrivate(sessionIdMaybe,interaction.user.id,arg):await this.service.vote(sessionIdMaybe,interaction.user.id,arg);
        if(privateRound){await interaction.editReply(await this.payload(session));return;}
        const label=arg==='A'?session.data.optionA:session.data.optionB;await interaction.editReply({content:`Vote recorded — ${label}. You can change it until voting closes.`,allowedMentions:{parse:[]}});return;
      }
      if(action==='extend'&&arg){
        if(source.ownerUserId!==interaction.user.id)throw new DomainError('NOT_ALLOWED','Only the host may extend the round.');
        const session=await this.service.extend(arg,interaction.user.id);
        await this.editKnownMessage(interaction.client,session.guildId,session.channelId,session.messageId!,this.service.renderOpen(session),[openRow(session.id,session.data.extensionSeconds,session.extensionUsed)]);return;
      }
      if(action==='play'&&arg){
        const session=await this.service.replay(arg,interaction.user.id,undefined,privateRound?'private':'public');
        if(privateRound){const message=await interaction.editReply(await this.payload(session));await this.service.attachMessage(session.id,message.id);return;}
        await this.publish(interaction.client,session.id,interaction).catch(async()=>{await interaction.followUp({ephemeral:true,content:'Your round is saved. Its original card is pending recovery.'});});return;
      }
    }catch(error){this.logFailure(stage,interaction,error);await this.replyError(interaction,error);}
  }

  async recover(client:Client):Promise<{active:number;closed:number}>{
    const recovered=await this.service.recover();let closed=0;
    for(const session of recovered.expired){
      const result=await this.service.close(session.id);closed+=1;
      if(result.session.messageId&&result.session.data.visibility!=='private')await this.editKnownMessage(client,result.session.guildId,result.session.channelId,result.session.messageId,result.svg,[resultRow(result.session.id)]);
    }
    for(const session of recovered.active){
      if(session.messageId&&session.data.visibility!=='private')await this.editKnownMessage(client,session.guildId,session.channelId,session.messageId,this.service.renderOpen(session),[openRow(session.id,session.data.extensionSeconds,session.extensionUsed)]);
    }
    return {active:recovered.active.length,closed};
  }

  async closeDue(client:Client):Promise<number>{
    const recovered=await this.service.recover();let count=0;
    for(const session of recovered.expired){
      const result=await this.service.close(session.id);count+=1;
      if(result.session.messageId&&result.session.data.visibility!=='private')await this.editKnownMessage(client,result.session.guildId,result.session.channelId,result.session.messageId,result.svg,[resultRow(result.session.id)]);
    }
    return count;
  }

  async advance(client:Client,sessionId:string){const result=await this.service.close(sessionId);if(result.session.messageId)await this.editKnownMessage(client,result.session.guildId,result.session.channelId,result.session.messageId,result.svg,[resultRow(result.session.id)]);}

  /** Re-editing the saved original reply is safe even after an uncertain prior edit. */
  private async payload(session:Awaited<ReturnType<WyrService['get']>>){const closed=session.state==='CLOSED',privateCard=session.data.visibility==='private',svg=closed?(await this.service.close(session.id)).svg:this.service.renderOpen(session);return{content:closed?'':privateCard?'Choose one option to save your answer.':`Voting closes <t:${Math.floor(session.expiresAt.getTime()/1000)}:R>.`,files:[file(await png(svg))],attachments:[],embeds:[new EmbedBuilder().setImage('attachment://wyr.png').setColor(0x3B82F6)],components:[closed?resultRow(session.id):openRow(session.id,session.data.extensionSeconds,session.extensionUsed,privateCard)],allowedMentions:{parse:[] as never[]}};}
  async publish(client:Client,sessionId:string,interaction?:ChatInputCommandInteraction|ButtonInteraction){
    if(!this.publication)throw new DomainError('WYR_PUBLICATION','WYR publication recovery is not configured.');
    const job=await this.publication.jobForSession(sessionId),session=await this.service.get(sessionId),channel=await client.channels.fetch(session.channelId);
    if(!channel?.isSendable()||!('messages' in channel))throw new Error('WYR destination unavailable.');
    const marker='wyr:'+sessionId;
    const payload=async()=>{let latest=await this.service.get(sessionId);if(latest.state==='OPEN'){try{latest=(await this.service.close(sessionId)).session;}catch(error){if(!(error instanceof DomainError)||error.code!=='NOT_DUE')throw error;}}const closed=latest.state==='CLOSED',svg=closed?(await this.service.close(sessionId)).svg:this.service.renderOpen(latest);return{content:closed?'':`Voting closes <t:${Math.floor(latest.expiresAt.getTime()/1000)}:R>.`,files:[file(await png(svg))],attachments:[],embeds:[new EmbedBuilder().setImage('attachment://wyr.png').setColor(0x3B82F6)],components:[closed?resultRow(sessionId):openRow(sessionId,latest.data.extensionSeconds,latest.extensionUsed)],allowedMentions:{parse:[] as never[]}};};
    const editOriginal=async()=>{if(!session.messageId)return null;const message=await channel.messages.fetch(session.messageId);if(message.author.id!==client.user?.id)throw new Error('WYR message author mismatch.');const card=await payload();if(interaction)await interaction.editReply(card);else await message.edit(card);return message.id;};
    const messageId=await new DeliveryEngine(this.publication.delivery(job.id)).deliver(marker,{
      find:async()=>{if(session.messageId)return editOriginal();const messages=await channel.messages.fetch({limit:100});return messages.find(m=>m.author.id===client.user?.id&&(m.components?.some(row=>'components' in row&&row.components.some(c=>'customId' in c&&['wyr:vote:A:'+sessionId,'wyr:play:'+sessionId].includes(c.customId??'')))||m.embeds.some(e=>e.footer?.text===marker)))?.id??null;},
      send:async()=>{const original=await editOriginal();if(original)return original;return(await channel.send(await payload())).id;},
    });
    if(session.messageId!==messageId)await this.service.attachMessage(sessionId,messageId);
  }

  private async editKnownMessage(client:Client,guildId:string,channelId:string,messageId:string,_svg:string,components:ActionRowBuilder<ButtonBuilder>[]):Promise<void>{
    const previous=this.updates.get(messageId)??Promise.resolve(),pending=previous.catch(()=>{}).then(async()=>{
      const first=components[0]?.components[0]?.data,id=first&&'custom_id' in first?first.custom_id?.split(':').at(-1):undefined;
      if(!id)return;
      const current=await this.service.get(id),closed=current.state==='CLOSED';
      const svg=closed?(await this.service.close(id)).svg:this.service.renderOpen(current),rows=[closed?resultRow(id):openRow(id,current.data.extensionSeconds,current.extensionUsed)];
      const content=closed?'':`Voting closes <t:${Math.floor(current.expiresAt.getTime()/1000)}:R>.`,key=createHash('sha256').update(svg+content+JSON.stringify(rows)).digest('hex');
      if(this.rendered.get(messageId)===key)return;
      const guild=await client.guilds.fetch(guildId),channel=await guild.channels.fetch(channelId);
      if(!channel?.isTextBased()||!('messages' in channel))return;
      const message=await channel.messages.fetch(messageId);if(message.author.id!==client.user?.id)throw new Error('WYR message author mismatch.');
      await message.edit({content,attachments:[],embeds:[new EmbedBuilder().setImage('attachment://wyr.png').setColor(0x3B82F6)],files:[file(await png(svg))],components:rows,allowedMentions:{parse:[]}});
      this.rendered.delete(messageId);this.rendered.set(messageId,key);if(this.rendered.size>256)this.rendered.delete(this.rendered.keys().next().value!);
    });this.updates.set(messageId,pending);try{await pending;}finally{if(this.updates.get(messageId)===pending)this.updates.delete(messageId);}
  }

  private async replyError(interaction:ChatInputCommandInteraction|ButtonInteraction,error:unknown):Promise<void>{
    const content=error instanceof DomainError?error.message:'Something went wrong starting that round.';
    if(interaction.deferred&&interaction.isButton()&&interaction.customId.startsWith('wyr:extend:'))await interaction.followUp({content,ephemeral:true});else if(interaction.deferred&&!interaction.replied)await interaction.editReply({content});else if(interaction.replied||interaction.deferred)await interaction.followUp({content,ephemeral:true});else await interaction.reply({content,ephemeral:true});
  }

  /** Keeps operational failures actionable without exposing internal details to members. */
  private logFailure(stage:string,interaction:ButtonInteraction,error:unknown):void{
    const record=error!==null&&typeof error==='object'?error as Record<string,unknown>:{};
    const errorCode=typeof record.code==='string'||typeof record.code==='number'?record.code:null;
    const meta=record.meta!==null&&typeof record.meta==='object'?record.meta as Record<string,unknown>:{};
    const target=typeof meta.target==='string'||Array.isArray(meta.target)?meta.target:null;
    const details=error instanceof DomainError?{name:error.name,code:error.code}:{name:error instanceof Error?error.name:'UnknownError',code:errorCode,target};
    console.error('WYR interaction diagnostic',JSON.stringify({stage,action:interaction.customId.split(':')[1]??null,guildId:interaction.guildId,channelId:interaction.channelId,...details}));
  }
}
