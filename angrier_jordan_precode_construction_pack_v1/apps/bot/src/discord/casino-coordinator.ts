import {createHash} from 'node:crypto';
import {displayFrames,wideDisplay,type DisplayFrame,type DisplayControl} from './wide-display.js';
import {memberArt} from './member-art.js';
import type {CasinoVisual} from '../../../../packages/features-casino/src/game-art.js';
import {renderCasinoResult} from '../../../../packages/features-casino/src/render.js';
import casinoHelp from '../../../../packages/content/help/casino.json' with {type:'json'};
import {ActionRowBuilder,ButtonBuilder,ButtonStyle,ModalBuilder,TextInputBuilder,TextInputStyle,type Client,type ButtonInteraction,type ChatInputCommandInteraction,type ModalSubmitInteraction} from 'discord.js';
import {DomainError,PermissionEngine,type ConfigService} from '../../../../packages/core/src/index.js';
import {CAPABILITY_MATRIX} from '../../../../packages/contracts/src/generated/capabilities.js';
import {PrismaCasinoRepository,type CasinoContext,type CasinoPolicy} from '../../../../packages/features-casino/src/prisma-repository.js';
import {PrismaLotteryRepository} from '../../../../packages/features-casino/src/lottery-repository.js';
import {interactiveGameChannelAllowed} from './interactive-game-channels.js';
import {cardLabel,handValue,type CasinoGame,type ChairSymbol} from '../../../../packages/features-casino/src/domain.js';
type Interaction=ChatInputCommandInteraction|ButtonInteraction|ModalSubmitInteraction;
export const CASINO_COMMANDS=new Set(['casino','lottery']);
export class DiscordCasinoCoordinator {
 constructor(private readonly casino:PrismaCasinoRepository,private readonly lottery:PrismaLotteryRepository,private readonly config:ConfigService,private readonly eligible:(g:string,u:string)=>Promise<boolean>,private readonly onRoundClosed?:(guildId:string,userId:string,sessionId:string)=>Promise<void>,private readonly maximumWager?:(guildId:string)=>Promise<bigint|undefined>,private readonly lotteryTicketPrice?:(guildId:string)=>Promise<bigint|undefined>){}
 private identities=new Map<string,{expires:number;value:ReturnType<typeof memberArt>}>();
 private identity(client:Client,guildId:string,userId:string){const key=guildId+':'+userId,old=this.identities.get(key);if(old&&old.expires>Date.now())return old.value;const value=memberArt(client,guildId,userId);this.identities.set(key,{expires:Date.now()+60000,value});if(this.identities.size>64)this.identities.delete(this.identities.keys().next().value!);return value;}
 private artwork=new Map<string,Promise<DisplayFrame[]>>();
 private async presentation(input:Parameters<typeof renderCasinoResult>[0],controls:DisplayControl[]=[],existing?:Iterable<{id:string;name:string}>){const svg=renderCasinoResult(input),key=createHash('sha256').update(svg).digest('hex').slice(0,24);let frames=this.artwork.get(key);if(!frames){frames=displayFrames(svg,'casino-'+key,[input.title,input.memberName??'',input.subtitle,input.amountLabel+' '+input.amount,...input.details.map(d=>d.label+': '+d.value)].join(' · '));this.artwork.set(key,frames);if(this.artwork.size>32)this.artwork.delete(this.artwork.keys().next().value!);frames.catch(()=>this.artwork.delete(key));}return wideDisplay(await frames,controls,undefined,existing);}
 private async policy(guildId:string):Promise<CasinoPolicy>{
  const keys=['casino.min_bet','casino.max_bet','casino.chair_pot_contribution_percent','casino.chair_symbols','casino.slots_wagers','casino.roulette_choices','casino.dice_choices'];const v=await Promise.all(keys.map(k=>this.config.get(guildId,k)));
  if(!Array.isArray(v[3])||!Array.isArray(v[4])||!Array.isArray(v[5])||!Array.isArray(v[6]))throw new DomainError('CASINO_CONFIG','Casino configuration is unavailable.');
  const configured=BigInt(Number(v[1])),adaptive=await this.maximumWager?.(guildId);return{minBet:BigInt(Number(v[0])),maxBet:adaptive===undefined?configured:adaptive<configured?adaptive:configured,chairPotPercent:Number(v[2]),symbols:v[3] as ChairSymbol[],slotsWagers:v[4].map(n=>BigInt(Number(n))).filter(n=>adaptive===undefined||n<=adaptive),rouletteChoices:v[5].map(String),diceChoices:v[6].map(String)};
 }
 private modal(userId:string,game:string,lottery=false){
  const amount=new TextInputBuilder().setCustomId('amount').setLabel(lottery?'Tickets (1–20 per week)':'Wager in Ottomans').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(7);
  const modal=new ModalBuilder().setCustomId(`casino:${lottery?'tickets':'bet'}:${userId}:${game}`).setTitle(lottery?'Weekly Lottery':`Casino · ${game}`).addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(amount));
  if(['coinflip','roulette','dice'].includes(game)){const choice=new TextInputBuilder().setCustomId('selection').setLabel(game==='coinflip'?'heads or tails':game==='dice'?'Mode: high':'red/black/odd/even/low/high/number:0–36').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(20);if(game==='dice')choice.setValue('high');modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(choice));}
  return modal;
 }
 async handle(i:Interaction){let validated=false;try{
  if(!i.guildId||!i.guild||!i.channelId)throw new DomainError('SERVER_ONLY','Use casino controls in the server.');
  const parts=i.isChatInputCommand()?[]:i.customId.split(':'),isLottery=i.isChatInputCommand()?i.commandName==='lottery':(['lottery','tickets'].includes(parts[1]??'')||(parts[1]==='help'&&parts[3]==='lottery'));
  const opensModal=i.isChatInputCommand()&&i.commandName==='casino'||i.isButton()&&parts[1]==='lottery';
  if(!opensModal){if(i.isButton()&&parts[1]==='act'||i.isModalSubmit()&&isLottery&&i.isFromMessage())await i.deferUpdate();else await i.deferReply({ephemeral:true});}
  if(await this.config.get(i.guildId,isLottery?'features.lottery':'features.casino')!==true)throw new DomainError('CASINO_DISABLED',`${isLottery?'Lottery':'Casino'} controls are not enabled yet.`);
  const capability=isLottery?'lottery.use':'casino.use';if(!new PermissionEngine({[capability]:CAPABILITY_MATRIX.capabilities[capability]}).can('member',capability)||!await this.eligible(i.guildId,i.user.id))throw new DomainError('CASINO_RESTRICTED','Wager controls are unavailable while restricted.');
  if(parts.length&&parts[2]!==i.user.id)throw new DomainError('OWNER_ONLY','Open your own wager controls.');
  if(!await interactiveGameChannelAllowed(this.config,i.guildId,i.channelId))throw new DomainError('CASINO_CHANNEL','Use casino and lottery commands in Gaming Chair or Bots Don’t Sit.');
  validated=true;
  if(i.isButton()&&parts[1]==='help'){
   const game=parts[3] as keyof typeof casinoHelp.games;
   const policy=game==='lottery'?undefined:await this.policy(i.guildId);
   const limits=policy?(game==='slots'?'Available wagers: '+policy.slotsWagers.join(', '):'Wager range: '+policy.minBet+'–'+policy.maxBet)+' Ottomans.':String(await this.ticketPrice(i.guildId))+' Ottomans per ticket · up to 20 per week.';
   const rules=game==='slots'?'Three matching symbols return the gross multiplier shown above. Marked jackpot symbols also pay Chair Pot. '+policy!.chairPotPercent+'% of each slot wager funds the pot.':casinoHelp.games[game]??'';
   await i.editReply(await this.presentation({title:'Table Rules',subtitle:'Casino · '+game,amount:'',amountLabel:'',visual:{kind:'rules',game,...(policy?{table:policy.symbols}:{})},details:[{label:'Current table limits',value:limits},{label:'How it works',value:rules},{label:'Before you play',value:casinoHelp.body}]}));return;
  }
  if(i.isChatInputCommand()&&i.commandName==='casino'){const game=i.options.getSubcommand(),modal=this.modal(i.user.id,game);if(game==='slots'){const sizes=await this.config.get(i.guildId,'casino.slots_wagers');if(Array.isArray(sizes)){const input=(modal.components[0] as ActionRowBuilder<TextInputBuilder>).components[0]!;input.setPlaceholder(sizes.join(', ').slice(0,100));}}await i.showModal(modal);return;}
  if(i.isButton()&&parts[1]==='lottery'){await i.showModal(this.modal(i.user.id,'lottery',true));return;}

  const c:CasinoContext={guildId:i.guildId,userId:i.user.id,channelId:i.channelId,requestKey:i.id};
  if(isLottery){
   const price=await this.ticketPrice(i.guildId);
   if(i.isModalSubmit()){const raw=i.fields.getTextInputValue('amount');if(!/^\d{1,2}$/.test(raw))throw new DomainError('TICKET_QUANTITY','Enter a whole ticket quantity.');await this.lottery.buy(c,Number(raw),price);}
   const state=await this.lottery.current(i.guildId,i.user.id);await i.editReply(await this.presentation({title:'Weekly Lottery',subtitle:'Your tickets · private',visual:{kind:'lottery',tickets:state.memberTickets,price:String(price),drawAt:state.drawAt.toISOString().replace('T',' ').replace('.000Z',' UTC')},amount:String(state.round?.pot??0n),amountLabel:'Ticket-funded pot',details:[{label:'Your entry',value:state.memberTickets+' / 20 tickets · '+price+' Ottomans each'},{label:'Draw',value:state.drawAt.toISOString().replace('T',' ').replace('.000Z',' UTC')},{label:'Prize',value:'One winner receives the full pot. No rake or rollover.'}]},[new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId('casino:lottery:'+i.user.id).setLabel('Buy Tickets').setStyle(ButtonStyle.Primary).setDisabled(state.memberTickets>=20),new ButtonBuilder().setCustomId('casino:help:'+i.user.id+':lottery').setLabel('Rules').setStyle(ButtonStyle.Secondary))]));return;
  }
 private async ticketPrice(guildId:string){const adaptive=await this.lotteryTicketPrice?.(guildId);if(adaptive!==undefined&&adaptive>0n)return adaptive;return BigInt(Number(await this.config.get(guildId,'lottery.ticket_price')));}
  const policy=await this.policy(i.guildId);let id:string;
  if(i.isModalSubmit()){
   const raw=i.fields.getTextInputValue('amount');if(!/^\d{1,7}$/.test(raw))throw new DomainError('WAGER_INTEGER','Enter a positive whole Ottoman wager.');const game=parts[3] as CasinoGame,selection=['coinflip','roulette','dice'].includes(game)?i.fields.getTextInputValue('selection').trim().toLowerCase():'';
   id=(await this.casino.start(c,game,BigInt(raw),selection,policy)).sessionId;
  }else if(i.isButton()&&parts[1]==='again'){
   const previous=await this.casino.get(parts[3]!);if(previous.guildId!==i.guildId||previous.ownerUserId!==i.user.id||previous.state!=='CLOSED')throw new DomainError('REPLAY_ROUND','Replay requires your completed round.');
   id=(await this.casino.start(c,previous.data.game,BigInt(previous.data.stake),previous.data.selection,policy)).sessionId;
  }else if(i.isButton()&&parts[1]==='act')id=(await this.casino.action(c,parts[3]!,Number(parts[4]),parts[5] as 'hit'|'stand'|'double'|'split',policy)).sessionId;
  else throw new DomainError('CASINO_CONTROL','Open a casino game to continue.');
  const message=await i.editReply(await this.roundPayload(id,i.client,i.isButton()&&i.customId.startsWith('casino:act:')?i.message?.attachments?.values():undefined));await this.casino.linkMessage(id,i.guildId,i.user.id,message.id);
  const round=await this.casino.get(id);if(round.state==='CLOSED')await this.onRoundClosed?.(round.guildId,round.ownerUserId!,round.id);
 }catch(error){const content=error instanceof DomainError?error.message:'The wager could not be completed. Your saved round can be checked before retrying.';if(i.deferred){if(!validated){if(!(i.isButton()&&i.customId.startsWith('casino:act:')||i.isModalSubmit()&&i.isFromMessage()))await i.deleteReply();await i.followUp({ephemeral:true,content});}else if(i.isButton()&&i.customId.startsWith('casino:act:'))await i.followUp({ephemeral:true,content});else await i.editReply(await this.presentation({title:'Wager unavailable',subtitle:'No new result confirmed',amount:'',amountLabel:'',details:[{label:'What happened',value:content}]}));}else await i.reply({ephemeral:true,content});}}
 private async roundPayload(id:string,client?:Client,existing?:Iterable<{id:string;name:string}>){
  const round=await this.casino.get(id),policy=await this.policy(round.guildId),ownerId=round.ownerUserId!,d=round.data,closed=round.state==='CLOSED';
  const controls=new ActionRowBuilder<ButtonBuilder>();if(closed)controls.addComponents(new ButtonBuilder().setCustomId(`casino:again:${ownerId}:${id}`).setLabel('Play Again').setStyle(ButtonStyle.Primary));else for(const action of ['hit','stand','double','split'])controls.addComponents(new ButtonBuilder().setCustomId(`casino:act:${ownerId}:${id}:${round.version}:${action}`).setLabel(action[0]!.toUpperCase()+action.slice(1)).setStyle(action==='stand'?ButtonStyle.Secondary:ButtonStyle.Primary));
  controls.addComponents(new ButtonBuilder().setCustomId('casino:help:'+ownerId+':'+d.game).setLabel('Rules').setStyle(ButtonStyle.Secondary));
  const identity=client?await this.identity(client,round.guildId,ownerId):undefined;
  const committed=d.blackjack?d.blackjack.hands.reduce((sum,h)=>sum+BigInt(h.stake),0n).toString():d.stake;
  const details=[{label:'Wager',value:committed+' Ottomans'+(d.selection?' · '+d.selection:'')}];
  if(d.blackjack){details.push({label:'Dealer',value:closed?d.blackjack.dealer.map(cardLabel).join(' '):cardLabel(d.blackjack.dealer[0]!)+' · hidden'});for(const [n,h] of d.blackjack.hands.entries())details.push({label:'Hand '+(n+1)+(n===d.blackjack.active&&!closed?' · your move':''),value:h.cards.map(cardLabel).join(' ')+' · '+handValue(h.cards).total+' points · '+h.stake+' Ottomans'});if(!closed)details.push({label:'At the table',value:'Hit · Stand · Double · Split. Timeout stands remaining hands.'});}
  else details.push({label:'Result',value:(d.symbols??[]).map(symbol=>policy.symbols.find(x=>x.id===symbol)?.name??symbol).join(' · ')});
  let visual:CasinoVisual;
  if(d.blackjack)visual={kind:'blackjack',dealer:d.blackjack.dealer,hands:d.blackjack.hands,active:d.blackjack.active,closed,result:d.outcome};
  else if(d.game==='slots')visual={kind:'slots',symbols:d.symbols??[],table:policy.symbols,jackpot:d.jackpot};
  else if(d.game==='roulette')visual={kind:'roulette',number:Number(d.symbols?.[0]),color:d.symbols?.[1]??'',selection:d.selection};
  else if(d.game==='dice')visual={kind:'dice',player:Number(d.symbols?.[0]),house:Number(d.symbols?.[1]),selection:d.selection};
  else visual={kind:'coinflip',landed:d.symbols?.[0]??'',selection:d.selection};
  const net=closed?BigInt(d.payout??'0')-BigInt(committed):undefined;
  return this.presentation({visual,wager:committed,...(net===undefined?{}:{net:(net>0n?'+':'')+net}),memberName:identity?.name??'Member',avatarData:identity?.avatarData??'',title:d.game[0]!.toUpperCase()+d.game.slice(1)+(closed?' Result':' · Your Turn'),subtitle:closed?'Settled · '+(d.outcome??'Complete'):'Round in progress',amount:closed?d.payout??'0':committed,amountLabel:closed?'Returned':'Wager',details},[controls],existing);
 }
 async refresh(client:Client,id:string){const round=await this.casino.get(id);if(!round.messageId)return;const channel=await client.channels.fetch(round.channelId);if(!channel?.isTextBased()||!('messages' in channel))throw new Error('Casino message channel unavailable.');const message=await channel.messages.fetch(round.messageId);if(message.author.id!==client.user?.id)throw new Error('Casino message owner mismatch.');const payload=await this.roundPayload(id,client,message.attachments.values());if(payload.files.length===0&&JSON.stringify(message.components.map(c=>c.toJSON()))===JSON.stringify(payload.components.map(c=>c.toJSON())))return;await message.edit(payload);}

}
