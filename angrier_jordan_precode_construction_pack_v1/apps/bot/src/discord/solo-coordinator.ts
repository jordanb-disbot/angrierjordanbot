import {ActionRowBuilder,AttachmentBuilder,ButtonBuilder,ButtonStyle,EmbedBuilder,ModalBuilder,TextInputBuilder,TextInputStyle,type Client,type ButtonInteraction,type ChatInputCommandInteraction,type ModalSubmitInteraction} from 'discord.js';
import {DomainError,type ConfigService} from '../../../../packages/core/src/index.js';
import {PrismaSoloRepository,type SoloContext,type SoloPolicy} from '../../../../packages/features-solo/src/prisma-repository.js';
import {SOLO_GAMES,type SoloGame,type SoloAction} from '../../../../packages/features-solo/src/domain.js';
import {renderSolo,soloDescription,SOLO_RULES,SOLO_TITLES} from '../../../../packages/features-solo/src/render.js';
import {rasterizeSvg} from '../../../../packages/renderer/src/raster.js';
type Interaction=ChatInputCommandInteraction|ButtonInteraction|ModalSubmitInteraction;
export const SOLO_COMMANDS=new Set<string>(SOLO_GAMES);
export function parseSoloCell(raw:string,size:number){if(!/^\d{1,2}$/.test(raw.trim()))throw new DomainError('SOLO_CELL','Enter the numbered cell shown on the board.');const cell=Number(raw)-1;if(cell<0||cell>=size*size)throw new DomainError('SOLO_CELL','Choose a numbered cell on this board.');return cell;}
export class DiscordSoloCoordinator {
 constructor(private readonly repo:PrismaSoloRepository,private readonly config:ConfigService,private readonly eligible:(g:string,u:string)=>Promise<boolean>){}
 private async policy(guildId:string):Promise<SoloPolicy>{return{enabled:await this.config.get(guildId,'features.solo_games')===true,reward:BigInt(Number(await this.config.get(guildId,'solo.reward'))),dailyRewardCap:BigInt(Number(await this.config.get(guildId,'solo.daily_reward_cap'))),timeoutSeconds:Number(await this.config.get(guildId,'solo.timeout_seconds'))};}
 async handle(i:Interaction){let updating=false;try{
  if(!i.guildId||!i.guild||!i.channelId)throw new DomainError('SERVER_ONLY','Use solo games in the server.');
  if(await this.config.get(i.guildId,'features.solo_games')!==true)throw new DomainError('SOLO_DISABLED','Solo games are not enabled yet.');
  if(!await this.eligible(i.guildId,i.user.id))throw new DomainError('SOLO_RESTRICTED','Solo games are unavailable while restricted.');
  const configured=await this.config.get(i.guildId,'channels.games_channel');if(typeof configured!=='string'||!configured||configured!==i.channelId)throw new DomainError('SOLO_CHANNEL','Use the configured games channel.');
  const parts=i.isChatInputCommand()?[]:i.customId.split(':'),c:SoloContext={guildId:i.guildId,channelId:i.channelId,userId:i.user.id,requestKey:i.id};
  if(parts.length&&parts[2]!==i.user.id)throw new DomainError('SOLO_OWNER','Only the member who started this puzzle can use these controls.');
  if(i.isButton()&&parts[1]==='rules'){const view=await this.repo.view(parts[3]!);if(view.guildId!==i.guildId||view.channelId!==i.channelId||view.ownerId!==i.user.id)throw new DomainError('SOLO_MISSING','Use the original puzzle message.');await i.reply({ephemeral:true,content:SOLO_RULES[view.puzzle.game]+'\nRounds expire at the shown time. Wins pay a small reward within a shared rolling 24-hour cap. Play Again creates a new puzzle.'});return;}
  if(i.isButton()&&['guess','reveal','flag'].includes(parts[1]??'')){
   const view=await this.repo.view(parts[3]!);if(view.guildId!==i.guildId||view.channelId!==i.channelId||view.ownerId!==i.user.id||view.state!=='OPEN'||view.version!==Number(parts[4]))throw new DomainError('SOLO_CHANGED','Use the latest puzzle controls.');
   const input=new TextInputBuilder().setCustomId('value').setLabel(parts[1]==='guess'?(view.puzzle.game==='mastermind'?'Four digits, each 1–6':view.puzzle.game==='hangman'?'One letter':'Your word'):'Cell number shown on the board').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(parts[1]==='guess'?20:2);
   await i.showModal(new ModalBuilder().setCustomId(i.customId).setTitle(SOLO_TITLES[view.puzzle.game]).addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input)));return;
  }
  updating=i.isModalSubmit()&&i.isFromMessage()||i.isButton()&&parts[1]==='quit';if(updating)await (i as ButtonInteraction|ModalSubmitInteraction).deferUpdate();else await i.deferReply();
  let id:string;if(i.isChatInputCommand()){const game=i.commandName as SoloGame,board=game==='minesweeper'?i.options.getInteger('size'):null;id=(await this.repo.start(c,game,board===null?{}:{boardSize:board as 4|5},await this.policy(i.guildId))).sessionId;}
  else if(i.isButton()&&parts[1]==='again')id=(await this.repo.replay(c,parts[3]!,await this.policy(i.guildId))).sessionId;
  else{let action:SoloAction;if(i.isButton()&&parts[1]==='quit')action={kind:'quit'};else if(i.isModalSubmit()){const raw=i.fields.getTextInputValue('value');if(parts[1]==='guess')action={kind:'guess',value:raw};else if(parts[1]==='reveal'||parts[1]==='flag'){const view=await this.repo.view(parts[3]!);action={kind:parts[1],cell:parseSoloCell(raw,view.puzzle.options.boardSize??0)};}else throw new DomainError('SOLO_CONTROL','Open a solo game to play.');}else throw new DomainError('SOLO_CONTROL','Open a solo game to play.');id=(await this.repo.act(c,parts[3]!,Number(parts[4]),action)).sessionId;}
  const message=await i.editReply(await this.payload(id));await this.repo.linkMessage(id,i.guildId,i.user.id,message.id);
 }catch(error){const content=error instanceof DomainError?error.message:'The puzzle could not be updated. Your saved round is unchanged unless its last action completed.';if(i.deferred&&!updating&&!i.replied)await i.editReply({content});else if(i.deferred||i.replied)await i.followUp({ephemeral:true,content});else await i.reply({ephemeral:true,content});}}
 async payload(id:string){const view=await this.repo.view(id),p=view.puzzle,row=new ActionRowBuilder<ButtonBuilder>(),button=(action:string,label:string,style=ButtonStyle.Secondary)=>new ButtonBuilder().setCustomId(`solo:${action}:${view.ownerId}:${id}:${view.version}`).setLabel(label).setStyle(style);
  if(p.outcome!=='playing')row.addComponents(button('again','Play Again',ButtonStyle.Primary));else{if(p.game==='minesweeper')row.addComponents(button('reveal','Reveal Cell',ButtonStyle.Primary),button('flag','Toggle Flag'));else row.addComponents(button('guess','Guess',ButtonStyle.Primary));row.addComponents(button('quit','Quit'));}row.addComponents(button('rules','Rules'));
  const file=new AttachmentBuilder(await rasterizeSvg(renderSolo(view)),{name:'solo.png',description:soloDescription(view).slice(0,1024)}),embed=new EmbedBuilder().setAuthor({name:'Angrier Jordan'}).setTitle(SOLO_TITLES[p.game]).setColor(0x10B981).setImage('attachment://solo.png').setDescription(p.outcome==='playing'?`<@${view.ownerId}> · Ends <t:${Math.floor(view.expiresAt!.getTime()/1000)}:R>`:`${p.outcome} · ${view.paid} Ottomans awarded`).setFooter({text:'solo:'+id});
  return{embeds:[embed],files:[file],attachments:[],components:[row],allowedMentions:{parse:[] as never[]}};
 }
 async refresh(client:Client,id:string){const view=await this.repo.view(id);if(!view.messageId)return;const channel=await client.channels.fetch(view.channelId);if(!channel?.isTextBased()||!('messages' in channel))throw new Error('Solo game channel unavailable.');const message=await channel.messages.fetch(view.messageId);if(message.author.id!==client.user?.id)throw new Error('Solo game message owner mismatch.');await message.edit(await this.payload(id));}
 async recover(client:Client){for(const row of await this.repo.active()){if(row.expiresAt&&row.expiresAt<=new Date())await this.repo.expire(row.guildId,row.id);await this.refresh(client,row.id);}}
}
