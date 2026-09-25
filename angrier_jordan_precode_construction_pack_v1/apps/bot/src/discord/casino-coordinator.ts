import casinoHelp from '../../../../packages/content/help/casino.json' with {type:'json'};
import {ActionRowBuilder,ButtonBuilder,ButtonStyle,EmbedBuilder,ModalBuilder,TextInputBuilder,TextInputStyle,type Client,type ButtonInteraction,type ChatInputCommandInteraction,type ModalSubmitInteraction} from 'discord.js';
import {DomainError,PermissionEngine,type ConfigService} from '../../../../packages/core/src/index.js';
import {CAPABILITY_MATRIX} from '../../../../packages/contracts/src/generated/capabilities.js';
import {PrismaCasinoRepository,type CasinoContext,type CasinoPolicy} from '../../../../packages/features-casino/src/prisma-repository.js';
import {PrismaLotteryRepository} from '../../../../packages/features-casino/src/lottery-repository.js';
import {cardLabel,handValue,type CasinoGame,type ChairSymbol} from '../../../../packages/features-casino/src/domain.js';
type Interaction=ChatInputCommandInteraction|ButtonInteraction|ModalSubmitInteraction;
export const CASINO_COMMANDS=new Set(['casino','lottery']);
const card=(title:string,description:string)=>new EmbedBuilder().setAuthor({name:'Angrier Jordan'}).setTitle(title).setDescription(description).setColor(0x14B8A6);
export class DiscordCasinoCoordinator {
 constructor(private readonly casino:PrismaCasinoRepository,private readonly lottery:PrismaLotteryRepository,private readonly config:ConfigService,private readonly eligible:(g:string,u:string)=>Promise<boolean>){}
 private async policy(guildId:string):Promise<CasinoPolicy>{
  const keys=['casino.min_bet','casino.max_bet','casino.chair_pot_contribution_percent','casino.chair_symbols','casino.slots_wagers','casino.roulette_choices','casino.dice_choices'];const v=await Promise.all(keys.map(k=>this.config.get(guildId,k)));
  if(!Array.isArray(v[3])||!Array.isArray(v[4])||!Array.isArray(v[5])||!Array.isArray(v[6]))throw new DomainError('CASINO_CONFIG','Casino configuration is unavailable.');
  return{minBet:BigInt(Number(v[0])),maxBet:BigInt(Number(v[1])),chairPotPercent:Number(v[2]),symbols:v[3] as ChairSymbol[],slotsWagers:v[4].map(n=>BigInt(Number(n))),rouletteChoices:v[5].map(String),diceChoices:v[6].map(String)};
 }
 private modal(userId:string,game:string,lottery=false){
  const amount=new TextInputBuilder().setCustomId('amount').setLabel(lottery?'Tickets (1–20 per week)':'Wager in Ottomans').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(7);
  const modal=new ModalBuilder().setCustomId(`casino:${lottery?'tickets':'bet'}:${userId}:${game}`).setTitle(lottery?'Weekly Lottery':`Casino · ${game}`).addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(amount));
  if(['coinflip','roulette','dice'].includes(game)){const choice=new TextInputBuilder().setCustomId('selection').setLabel(game==='coinflip'?'heads or tails':game==='dice'?'Mode: high':'red/black/odd/even/low/high/number:0–36').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(20);if(game==='dice')choice.setValue('high');modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(choice));}
  return modal;
 }
 async handle(i:Interaction){try{
  if(!i.guildId||!i.guild||!i.channelId)throw new DomainError('SERVER_ONLY','Use casino controls in the server.');
  const parts=i.isChatInputCommand()?[]:i.customId.split(':'),isLottery=i.isChatInputCommand()?i.commandName==='lottery':(['lottery','tickets'].includes(parts[1]??'')||(parts[1]==='help'&&parts[3]==='lottery'));
  if(await this.config.get(i.guildId,isLottery?'features.lottery':'features.casino')!==true)throw new DomainError('CASINO_DISABLED',`${isLottery?'Lottery':'Casino'} controls are not enabled yet.`);
  const capability=isLottery?'lottery.use':'casino.use';if(!new PermissionEngine({[capability]:CAPABILITY_MATRIX.capabilities[capability]}).can('member',capability)||!await this.eligible(i.guildId,i.user.id))throw new DomainError('CASINO_RESTRICTED','Wager controls are unavailable while restricted.');
  if(parts.length&&parts[2]!==i.user.id)throw new DomainError('OWNER_ONLY','Open your own wager controls.');
  const channel=await this.config.get(i.guildId,'channels.bot_channel');if(channel&&channel!==i.channelId)throw new DomainError('CASINO_CHANNEL','Use casino and lottery commands in the configured bot channel.');
  if(i.isButton()&&parts[1]==='help'){const game=parts[3] as keyof typeof casinoHelp.games;await i.reply({ephemeral:true,embeds:[card(casinoHelp.title,casinoHelp.body+'\n\n'+(casinoHelp.games[game]??''))]});return;}
  if(i.isChatInputCommand()&&i.commandName==='casino'){const game=i.options.getSubcommand(),modal=this.modal(i.user.id,game);if(game==='slots'){const sizes=await this.config.get(i.guildId,'casino.slots_wagers');if(Array.isArray(sizes)){const input=(modal.components[0] as ActionRowBuilder<TextInputBuilder>).components[0]!;input.setPlaceholder(sizes.join(', ').slice(0,100));}}await i.showModal(modal);return;}
  if(i.isButton()&&parts[1]==='lottery'){await i.showModal(this.modal(i.user.id,'lottery',true));return;}
  const update=i.isButton()&&parts[1]==='act';if(update)await i.deferUpdate();else await i.deferReply({ephemeral:isLottery});
  const c:CasinoContext={guildId:i.guildId,userId:i.user.id,channelId:i.channelId,requestKey:i.id};
  if(isLottery){
   const price=BigInt(Number(await this.config.get(i.guildId,'lottery.ticket_price')));
   if(i.isModalSubmit()){const raw=i.fields.getTextInputValue('amount');if(!/^\d{1,2}$/.test(raw))throw new DomainError('TICKET_QUANTITY','Enter a whole ticket quantity.');await this.lottery.buy(c,Number(raw),price);}
   const state=await this.lottery.current(i.guildId,i.user.id);await i.editReply({embeds:[card('Weekly Lottery',`Ticket price: **${price} Ottomans**\nYour tickets: **${state.memberTickets} / 20**\nTicket-funded pot: **${state.round?.pot??0n} Ottomans**\nDraw: <t:${Math.floor(state.drawAt.getTime()/1000)}:F>\nOne winner receives the full pot. No rake or rollover.`)],components:[new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId('casino:lottery:'+i.user.id).setLabel('Buy Tickets').setStyle(ButtonStyle.Primary).setDisabled(state.memberTickets>=20))]});return;
  }
  const policy=await this.policy(i.guildId);let id:string;
  if(i.isModalSubmit()){
   const raw=i.fields.getTextInputValue('amount');if(!/^\d{1,7}$/.test(raw))throw new DomainError('WAGER_INTEGER','Enter a positive whole Ottoman wager.');const game=parts[3] as CasinoGame,selection=['coinflip','roulette','dice'].includes(game)?i.fields.getTextInputValue('selection').trim().toLowerCase():'';
   id=(await this.casino.start(c,game,BigInt(raw),selection,policy)).sessionId;
  }else if(i.isButton()&&parts[1]==='again'){
   const previous=await this.casino.get(parts[3]!);if(previous.guildId!==i.guildId||previous.ownerUserId!==i.user.id||previous.state!=='CLOSED')throw new DomainError('REPLAY_ROUND','Replay requires your completed round.');
   id=(await this.casino.start(c,previous.data.game,BigInt(previous.data.stake),previous.data.selection,policy)).sessionId;
  }else if(i.isButton()&&parts[1]==='act')id=(await this.casino.action(c,parts[3]!,Number(parts[4]),parts[5] as 'hit'|'stand'|'double'|'split',policy)).sessionId;
  else throw new DomainError('CASINO_CONTROL','Open a casino game to continue.');
  const message=await i.editReply(await this.roundPayload(id));await this.casino.linkMessage(id,i.guildId,i.user.id,message.id);
 }catch(error){const content=error instanceof DomainError?error.message:'The wager could not be completed. Your saved round can be checked before retrying.';if(i.deferred){if(i.isButton()&&i.customId.startsWith('casino:act:'))await i.followUp({ephemeral:true,content});else await i.editReply({content});}else await i.reply({ephemeral:true,content});}}
 private async roundPayload(id:string){
  const round=await this.casino.get(id),policy=await this.policy(round.guildId),ownerId=round.ownerUserId!,d=round.data,closed=round.state==='CLOSED';let text=`Wager: **${d.stake} Ottomans**\n`;
  if(d.blackjack){text+=`Dealer: ${closed?d.blackjack.dealer.map(cardLabel).join(' '):cardLabel(d.blackjack.dealer[0]!)+' · hidden'}\n`;text+=d.blackjack.hands.map((h,n)=>`${n===d.blackjack!.active&&!closed?'→ ':''}Hand ${n+1}: ${h.cards.map(cardLabel).join(' ')} · ${handValue(h.cards).total} · ${h.stake} Ottomans`).join('\n');if(!closed)text+='\nTimeout automatically stands remaining hands.';}
  else text+=`Result: ${(d.symbols??[]).map(s=>policy.symbols.find(x=>x.id===s)?.name??s).join(' · ')}\n`;
  if(closed)text+=`\n**${d.outcome}** · Returned: **${d.payout} Ottomans**`;
  const controls=new ActionRowBuilder<ButtonBuilder>();if(closed)controls.addComponents(new ButtonBuilder().setCustomId(`casino:again:${ownerId}:${id}`).setLabel('Play Again').setStyle(ButtonStyle.Primary));else for(const action of ['hit','stand','double','split'])controls.addComponents(new ButtonBuilder().setCustomId(`casino:act:${ownerId}:${id}:${round.version}:${action}`).setLabel(action[0]!.toUpperCase()+action.slice(1)).setStyle(action==='stand'?ButtonStyle.Secondary:ButtonStyle.Primary));
  controls.addComponents(new ButtonBuilder().setCustomId('casino:help:'+ownerId+':'+d.game).setLabel('Rules').setStyle(ButtonStyle.Secondary));
  return{embeds:[card('Casino · '+d.game,text).setFooter({text:'casino:'+id})],components:[controls],allowedMentions:{parse:[] as never[]}};
 }
 async refresh(client:Client,id:string){const round=await this.casino.get(id);if(!round.messageId)return;const channel=await client.channels.fetch(round.channelId);if(!channel?.isTextBased()||!('messages' in channel))throw new Error('Casino message channel unavailable.');const message=await channel.messages.fetch(round.messageId);if(message.author.id!==client.user?.id)throw new Error('Casino message owner mismatch.');await message.edit(await this.roundPayload(id));}

}
