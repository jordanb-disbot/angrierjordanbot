import {ActionRowBuilder,AttachmentBuilder,ButtonBuilder,ButtonStyle,EmbedBuilder,type ChatInputCommandInteraction,type MessageContextMenuCommandInteraction,type ButtonInteraction} from 'discord.js';
import {DomainError,type ConfigService} from '../../../../packages/core/src/index.js';
import {parseChairismLink,normalizeQuoteText,chairismOptions,chairismJump} from '../../../../packages/features-chairisms/src/domain.js';
import type {ChairismSecurity,ChairismPublisher,ChairismBrowser,ChairismContext,ChairismReference,ChairismBrowseQuery} from '../../../../packages/features-chairisms/src/interfaces.js';
import {rasterizeSvg} from '../../../../packages/renderer/src/raster.js';
import {brandedNotice} from '../../../../packages/features-events/src/gate-b-visual.js';
async function notice(message:string){return [new AttachmentBuilder(await rasterizeSvg(brandedNotice('Chairisms',message,'ANGRIER JORDAN · CHAIRS')),{name:'chairisms-window.png'})];}
export const CHAIRISM_COMMANDS=new Set(['quote','chairisms','Create Chairism']);
type Interaction=ChatInputCommandInteraction|MessageContextMenuCommandInteraction|ButtonInteraction;
/** Security and durable publication are required injected boundaries: no permissive default. */
export class DiscordChairismsCoordinator {
 constructor(private readonly security:ChairismSecurity,private readonly publication:ChairismPublisher,private readonly browser:ChairismBrowser,private readonly config:ConfigService,private readonly canUse:(guildId:string,userId:string)=>Promise<boolean>){}
 async handle(i:Interaction){try{
  if(!i.guildId||!i.guild||!i.channelId)throw new DomainError('SERVER_ONLY','Create and browse Chairisms in the server.');
  if(await this.config.get(i.guildId,'features.chairisms')!==true)throw new DomainError('CHAIRISMS_DISABLED','Chairisms are not enabled yet.');
  if(!await this.canUse(i.guildId,i.user.id))throw new DomainError('CHAIRISMS_RESTRICTED','Chairisms are unavailable to you here.');
  const c:ChairismContext={guildId:i.guildId,channelId:i.channelId,userId:i.user.id,requestKey:i.id};
  if(i.isButton()){
   const parts=i.customId.split(':');if(parts[0]!=='chairism'||parts[2]!==i.user.id)throw new DomainError('CHAIRISM_OWNER','Open your own Chairism controls.');
   await i.deferReply({ephemeral:true});
   if(parts[1]==='browse'){const mode=parts[3];if(mode!=='recent'&&mode!=='member')throw new DomainError('CHAIRISM_PAGE','Open the Chairisms browser again.');const beforeId=Number(parts[4]);if(!Number.isSafeInteger(beforeId)||beforeId<1)throw new DomainError('CHAIRISM_PAGE','Open the Chairisms browser again.');await this.browse(i,c,{mode,beforeId,...(mode==='member'?{memberId:parts[5]!}:{})});return;}
   const reference:ChairismReference={channelId:parts[3]??'',messageId:parts[4]??''};if(!/^\d{17,20}$/.test(reference.channelId)||!/^\d{17,20}$/.test(reference.messageId))throw new DomainError('CHAIRISM_LINK','Open the source message again.');
   const snapshot=await this.security.captureMessage(c,reference,chairismOptions(parts[1]??''));const published=await this.publication.publish(c,snapshot);await i.editReply({content:`Chairism created: ${chairismJump(c.guildId,published.outputChannelId,published.outputMessageId)}`,files:await notice('Chairism created. Open the link to view the saved moment.'),allowedMentions:{parse:[]}});return;
  }
  await i.deferReply({ephemeral:true});
  if(i.isChatInputCommand()&&i.commandName==='chairisms'){const mode=i.options.getSubcommand();if(!['recent','member','random'].includes(mode))throw new DomainError('CHAIRISM_BROWSER','Choose recent, member or random.');const member=mode==='member'?i.options.getUser('member',true):null;await this.browse(i,c,{mode:mode as ChairismBrowseQuery['mode'],...(member?{memberId:member.id}:{})});return;}
  if(i.isChatInputCommand()&&i.commandName==='quote'&&i.options.getSubcommand()==='text'){
   const snapshot=await this.security.captureSelf(c,normalizeQuoteText(i.options.getString('text',true)));const published=await this.publication.publish(c,snapshot);await i.editReply({content:`Chairism created: ${chairismJump(c.guildId,published.outputChannelId,published.outputMessageId)}`,files:await notice('Chairism created. Open the link to view the saved moment.'),allowedMentions:{parse:[]}});return;
  }
  const ref=i.isMessageContextMenuCommand()?{channelId:i.targetMessage.channelId,messageId:i.targetId}:parseChairismLink(i.options.getString('message_link',true),c.guildId),inspection=await this.security.inspectMessage(c,ref);
  const row=new ActionRowBuilder<ButtonBuilder>(),button=(mode:string,label:string)=>new ButtonBuilder().setCustomId(`chairism:${mode}:${i.user.id}:${inspection.reference.channelId}:${inspection.reference.messageId}`).setLabel(label).setStyle(mode==='this'?ButtonStyle.Primary:ButtonStyle.Secondary);
  row.addComponents(button('this','This Message'));if(inspection.hasReply)row.addComponents(button('reply','Include Replied Message'));if(inspection.hasImage)row.addComponents(button('image','Include Image'));if(inspection.hasReply&&inspection.hasImage)row.addComponents(button('both','Include Reply + Image'));
  await i.editReply({content:'Choose what to preserve. The source and permissions are checked again before publication.',files:await notice('Choose what to preserve. The source and permissions are checked again before publication.'),components:[row],allowedMentions:{parse:[]}});
 }catch(error){const content=error instanceof DomainError?error.message:'This Chairism could not be completed. If publication was interrupted, its saved delivery must be checked before retrying.';if(i.deferred&&!i.replied)await i.editReply({content,files:await notice(content),components:[]});else if(i.replied)await i.followUp({ephemeral:true,content,files:await notice(content)});else await i.reply({ephemeral:true,content,files:await notice(content)});}}
 private async browse(i:Interaction,c:ChairismContext,query:ChairismBrowseQuery){if(query.memberId&&!/^\d{17,20}$/.test(query.memberId))throw new DomainError('CHAIRISM_MEMBER','Choose a server member.');await this.security.assertCanBrowse(c,query.memberId?[query.memberId]:[]);const rows=await this.browser.list(c,query);await this.security.assertCanBrowse(c,rows.map(row=>row.sourceUserId));
  const embed=new EmbedBuilder().setAuthor({name:'Angrier Jordan'}).setTitle(query.mode==='random'?'A Chairism from the lounge':'Chairisms').setColor(0x10B981).setDescription(rows.length?rows.map(row=>`[#${row.chairismId}](${chairismJump(c.guildId,row.outputChannelId,row.outputMessageId)}) · <@${row.sourceUserId}> · <t:${Math.floor(Date.parse(row.createdAt)/1000)}:d>`).join('\n'):'No eligible Chairisms found.');
  const components:ActionRowBuilder<ButtonBuilder>[]=[];if(rows.length===10&&query.mode!=='random')components.push(new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId(`chairism:browse:${c.userId}:${query.mode}:${rows.at(-1)!.chairismId}:${query.memberId??'0'}`).setLabel('Older Chairisms').setStyle(ButtonStyle.Secondary)));
  await i.editReply({embeds:[embed],files:await notice(rows.length?rows.map(row=>`Chairism #${row.chairismId} · ${new Date(row.createdAt).toISOString().slice(0,10)}`).join('\n'):'No eligible Chairisms found.'),components,allowedMentions:{parse:[]}});
 }
}
