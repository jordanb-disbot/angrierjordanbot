import {ActionRowBuilder,AttachmentBuilder,ButtonBuilder,ButtonStyle,type ChatInputCommandInteraction,type MessageContextMenuCommandInteraction,type ButtonInteraction} from 'discord.js';
import {DomainError,type ConfigService} from '../../../../packages/core/src/index.js';
import {parseChairismLink,normalizeQuoteText,chairismOptions,chairismJump} from '../../../../packages/features-chairisms/src/domain.js';
import type {ChairismSecurity,ChairismPublisher,ChairismBrowser,ChairismContext,ChairismReference,ChairismBrowseQuery} from '../../../../packages/features-chairisms/src/interfaces.js';
import {rasterizeSvg} from '../../../../packages/renderer/src/raster.js';
import {renderChairismNotice,renderChairismBrowser} from '../../../../packages/features-chairisms/src/presentation.js';
import {memberArt} from './member-art.js';
async function notice(message:string){return [new AttachmentBuilder(await rasterizeSvg(renderChairismNotice(message)),{name:'chairisms-window.png'})];}
export const CHAIRISM_COMMANDS=new Set(['quote','chairisms','Create Chairism']);
type Interaction=ChatInputCommandInteraction|MessageContextMenuCommandInteraction|ButtonInteraction;
/** Security and durable publication are required injected boundaries: no permissive default. */
export class DiscordChairismsCoordinator {
 constructor(private readonly security:ChairismSecurity,private readonly publication:ChairismPublisher,private readonly browser:ChairismBrowser,private readonly config:ConfigService,private readonly canUse:(guildId:string,userId:string)=>Promise<boolean>){}
 async handle(i:Interaction){try{
  if(!i.guildId||!i.guild||!i.channelId)throw new DomainError('SERVER_ONLY','Create and browse Chairisms in the server.');
  if(i.isButton()&&i.customId.split(':')[2]===i.user.id&&typeof i.deferUpdate==='function')await i.deferUpdate();else await i.deferReply({ephemeral:true});
  if(await this.config.get(i.guildId,'features.chairisms')!==true)throw new DomainError('CHAIRISMS_DISABLED','Chairisms are not enabled yet.');
  if(!await this.canUse(i.guildId,i.user.id))throw new DomainError('CHAIRISMS_RESTRICTED','Chairisms are unavailable to you here.');
  const c:ChairismContext={guildId:i.guildId,channelId:i.channelId,userId:i.user.id,requestKey:i.id};
  if(i.isButton()){
   const parts=i.customId.split(':');if(parts[0]!=='chairism'||parts[2]!==i.user.id)throw new DomainError('CHAIRISM_OWNER','Open your own Chairism controls.');
   if(parts[1]==='browse'){const mode=parts[3];if(mode!=='recent'&&mode!=='member')throw new DomainError('CHAIRISM_PAGE','Open the Chairisms browser again.');const beforeId=Number(parts[4]);if(!Number.isSafeInteger(beforeId)||beforeId<1)throw new DomainError('CHAIRISM_PAGE','Open the Chairisms browser again.');await this.browse(i,c,{mode,beforeId,...(mode==='member'?{memberId:parts[5]!}:{})});return;}
   const reference:ChairismReference={channelId:parts[3]??'',messageId:parts[4]??''};if(!/^\d{17,20}$/.test(reference.channelId)||!/^\d{17,20}$/.test(reference.messageId))throw new DomainError('CHAIRISM_LINK','Open the source message again.');
   const action=parts[1]??'',confirmed=action.startsWith('publish_'),mode=confirmed?action.slice(8):action;
   const options=chairismOptions(mode);
   if(!confirmed){const inspected=await this.security.inspectMessage(c,reference);if(options.includeReply&&!inspected.hasReply||options.includeImage&&!inspected.hasImage)throw new DomainError('CHAIRISM_OPTION','That source context is no longer available.');await i.editReply({content:'',files:await notice('Ready to preserve this moment? Confirm to publish your selected quote to Chairisms.'),components:[new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId(`chairism:publish_${mode}:${c.userId}:${reference.channelId}:${reference.messageId}`).setLabel('Publish Chairism').setStyle(ButtonStyle.Primary))],allowedMentions:{parse:[]}});return;}
   const snapshot=await this.security.captureMessage(c,reference,options);if(mode==='short'||mode==='long')snapshot.layout=mode;
   // Repeated clicks on the same confirmation reuse the durable publication receipt.
   if(i.message?.id)c.requestKey='confirmation:'+i.message.id;
   const published=await this.publication.publish(c,snapshot);await i.editReply({content:`Chairism created: ${chairismJump(c.guildId,published.outputChannelId,published.outputMessageId)}`,files:[],attachments:[],components:[],allowedMentions:{parse:[]}});return;
  }
  if(i.isChatInputCommand()&&i.commandName==='chairisms'){const mode=i.options.getSubcommand();if(!['recent','member','random'].includes(mode))throw new DomainError('CHAIRISM_BROWSER','Choose recent, member or random.');const member=mode==='member'?i.options.getUser('member',true):null;await this.browse(i,c,{mode:mode as ChairismBrowseQuery['mode'],...(member?{memberId:member.id}:{})});return;}
  if(i.isChatInputCommand()&&i.commandName==='quote'&&i.options.getSubcommand()==='text'){
   const snapshot=await this.security.captureSelf(c,normalizeQuoteText(i.options.getString('text',true)));const published=await this.publication.publish(c,snapshot);await i.editReply({content:`Chairism created: ${chairismJump(c.guildId,published.outputChannelId,published.outputMessageId)}`,files:[],attachments:[],components:[],allowedMentions:{parse:[]}});return;
  }
  const ref=i.isMessageContextMenuCommand()?{channelId:i.targetMessage.channelId,messageId:i.targetId}:parseChairismLink(i.options.getString('message_link',true),c.guildId),inspection=await this.security.inspectMessage(c,ref);
  const row=new ActionRowBuilder<ButtonBuilder>(),button=(mode:string,label:string)=>new ButtonBuilder().setCustomId(`chairism:${mode}:${i.user.id}:${inspection.reference.channelId}:${inspection.reference.messageId}`).setLabel(label).setStyle(mode==='short'?ButtonStyle.Primary:ButtonStyle.Secondary);
  row.addComponents(button('short','Short Quote'),button('long','Long Quote'),button('reply','Quote with Reply').setDisabled(!inspection.hasReply),button('image','Quote with Image').setDisabled(!inspection.hasImage));
  await i.editReply({content:'',files:await notice('Choose what to preserve. The source and permissions are checked again before publication.'),components:[row],allowedMentions:{parse:[]}});
 }catch(error){const content=error instanceof DomainError?error.message:'This Chairism could not be completed. If publication was interrupted, its saved delivery must be checked before retrying.';if(i.deferred&&!i.replied)await i.editReply({content,files:await notice(content),components:[]});else if(i.replied)await i.followUp({ephemeral:true,content,files:await notice(content)});else await i.reply({ephemeral:true,content,files:await notice(content)});}}
 private async browse(i:Interaction,c:ChairismContext,query:ChairismBrowseQuery){if(query.memberId&&!/^\d{17,20}$/.test(query.memberId))throw new DomainError('CHAIRISM_MEMBER','Choose a server member.');await this.security.assertCanBrowse(c,query.memberId?[query.memberId]:[]);const rows=await this.browser.list(c,query);await this.security.assertCanBrowse(c,rows.map(row=>row.sourceUserId));
  const components:ActionRowBuilder<ButtonBuilder>[]=[];
  for(let n=0;n<rows.length;n+=5)components.push(new ActionRowBuilder<ButtonBuilder>().addComponents(...rows.slice(n,n+5).map(row=>new ButtonBuilder().setLabel('Chairism #'+row.chairismId).setURL(chairismJump(c.guildId,row.outputChannelId,row.outputMessageId)).setStyle(ButtonStyle.Link))));
  if(rows.length===10&&query.mode!=='random')components.push(new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId('chairism:browse:'+c.userId+':'+query.mode+':'+rows.at(-1)!.chairismId+':'+(query.memberId??'0')).setLabel('Older Chairisms').setStyle(ButtonStyle.Secondary)));
  const art=new Map<string,ReturnType<typeof memberArt>>();for(const row of rows)if(i.client&&!art.has(row.sourceUserId))art.set(row.sourceUserId,memberArt(i.client,c.guildId,row.sourceUserId));
  await i.editReply({content:'',embeds:[],files:[new AttachmentBuilder(await rasterizeSvg(renderChairismBrowser(await Promise.all(rows.map(async row=>({...row,...await art.get(row.sourceUserId)}))),query.mode)),{name:'chairisms-archive.png'})],components,allowedMentions:{parse:[]}});
 }
}
