import {PermissionFlagsBits,ActionRowBuilder,AttachmentBuilder,ButtonBuilder,ButtonStyle,EmbedBuilder,ModalBuilder,TextInputBuilder,TextInputStyle,type Client,type Guild,type ButtonInteraction,type ChatInputCommandInteraction,type ModalSubmitInteraction} from 'discord.js';
import {DomainError,PermissionEngine,type ConfigService,type CapabilityMap} from '../../../../packages/core/src/index.js';
import {CAPABILITY_MATRIX} from '../../../../packages/contracts/src/generated/capabilities.js';
import {PrismaPvpRepository,type PvpAction,type PvpContext,type PvpPolicy,type PvpView} from '../../../../packages/features-pvp/src/prisma-repository.js';
import {coordinate,parseFleet,gameNames,type PvpGame} from '../../../../packages/features-pvp/src/domain.js';
import {renderPvp,renderPrivatePvp,renderPvpNotice,pvpDescription,PVP_RULES} from '../../../../packages/features-pvp/src/render.js';
import {memberArt} from './member-art.js';
import type {PvpPortraits} from '../../../../packages/features-pvp/src/render.js';
import {rasterizeSvg} from '../../../../packages/renderer/src/raster.js';
import {interactiveGameChannelAllowed} from './interactive-game-channels.js';
export const PVP_COMMANDS=new Set<string>(Object.keys(gameNames));
type Interaction=ChatInputCommandInteraction|ButtonInteraction|ModalSubmitInteraction;
export class DiscordPvpCoordinator {
 private readonly refreshes=new Map<string,Promise<void>>();
 private sweeping=false;
 private readonly published=new Map<string,string>();
 private readonly art=new Map<string,{until:number;value:Promise<PvpPortraits>}>();
 private signature(v:PvpView){return JSON.stringify(v);}
 private remember(v:PvpView){if(this.published.size>=512)this.published.delete(this.published.keys().next().value!);this.published.set(v.id,this.signature(v));}
 private portraits(client:Client|undefined,v:PvpView):Promise<PvpPortraits>{if(!client)return Promise.resolve({});const key=v.guildId+':'+v.players.map(p=>p.userId).join(':');const existing=this.art.get(key);if(existing&&existing.until>Date.now())return existing.value;const value=Promise.all(v.players.map(async p=>[p.userId,await memberArt(client,v.guildId,p.userId)??{name:p.name}] as const)).then(entries=>Object.fromEntries(entries));if(this.art.size>=128)this.art.delete(this.art.keys().next().value!);this.art.set(key,{until:Date.now()+300_000,value});return value;}

 constructor(private readonly repo:PrismaPvpRepository,private readonly config:ConfigService,private readonly eligible:(g:string,u:string)=>Promise<boolean>){}
 async policy(guildId:string):Promise<PvpPolicy>{const [enabled,min,max]=await Promise.all(['features.pvp','pvp.min_wager','pvp.max_wager'].map(key=>this.config.get(guildId,key)));return{enabled:enabled===true,minWager:BigInt(Number(min)),maxWager:BigInt(Number(max))};}
 private async member(guild:Guild,userId:string,channelId:string){const member=await guild.members.fetch({user:userId,force:true});if(member.user.bot||member.isCommunicationDisabled()||!member.permissionsIn(channelId).has(PermissionFlagsBits.ViewChannel|PermissionFlagsBits.SendMessages)||!await this.eligible(guild.id,userId))throw new DomainError('PVP_RESTRICTED','Both members need access to this channel and must be eligible to play.');return member;}
 private async guard(i:Interaction){if(!i.guildId||!i.guild||!i.channelId)throw new DomainError('SERVER_ONLY','Use skill games in the server.');if(await this.config.get(i.guildId,'features.pvp')!==true)throw new DomainError('PVP_DISABLED','Skill games are not enabled yet.');if(!await interactiveGameChannelAllowed(this.config,i.guildId,i.channelId))throw new DomainError('PVP_CHANNEL','Use skill games in Gaming Chair or Bots Don’t Sit.');const capabilities:CapabilityMap=CAPABILITY_MATRIX.capabilities;if(!new PermissionEngine({'pvp.play':capabilities['pvp.play']??[]}).can('member','pvp.play'))throw new DomainError('PVP_RESTRICTED','Skill games are unavailable.');await this.member(i.guild,i.user.id,i.channelId);}
 async start(i:ChatInputCommandInteraction){return this.handle(i);}
 async handle(i:Interaction){let created:string|undefined,updateAck=false;try{
  // Acknowledge before eligibility/config/database work. Modal launch buttons cannot be deferred.
  const modalLaunch=i.isButton()&&['manual','fire'].includes(i.customId.split(':')[1]??'');
  if(!modalLaunch){const action=i.isChatInputCommand()?'':i.customId.split(':')[1];updateAck=i.isButton()&&['accept','cancel','decline','move','confirm'].includes(action??'');if(updateAck)await (i as ButtonInteraction).deferUpdate();else await i.deferReply({ephemeral:!i.isChatInputCommand()&&action!=='again'});}

  await this.guard(i);const c:PvpContext={guildId:i.guildId!,channelId:i.channelId!,userId:i.user.id,requestKey:i.id},policy=await this.policy(c.guildId);
  if(i.isChatInputCommand()){
   const game=i.options.getSubcommand() as PvpGame,target=i.options.getUser('member',true);if(!PVP_COMMANDS.has(game)||target.id===i.user.id)throw new DomainError('PVP_TARGET','Choose a skill game and another member.');const members=await Promise.all([this.member(i.guild!,i.user.id,i.channelId!),this.member(i.guild!,target.id,i.channelId!)]);created=(await this.repo.challenge(c,game,[{userId:members[0]!.id,name:members[0]!.displayName},{userId:members[1]!.id,name:members[1]!.displayName}],BigInt(i.options.getInteger('wager')??0),policy)).sessionId;const initial=await this.repo.publicView(created),sent=await i.editReply(await this.payload(initial,i.client));await this.repo.linkMessage(created,c.guildId,sent.id);this.remember({...initial,messageId:sent.id});return;
  }
  const parts=i.customId.split(':'),action=parts[1],id=parts[2],version=Number(parts[3]);if(parts[0]!=='pvp'||!id||!Number.isInteger(version))throw new DomainError('PVP_CONTROL','Open the latest skill-game controls.');const view=await this.repo.publicView(id);if(view.guildId!==c.guildId||view.channelId!==c.channelId)throw new DomainError('PVP_MISSING','Use this match in its original channel.');
  if(i.isButton()&&action==='rules'){await i.editReply(await this.notice('Match Rules',PVP_RULES+(view.game==='battleship'?'\nBattleship uses a 10×10 board and ships of length 5, 4, 3, 3 and 2. Place fleets in challenger/opponent order, with 5 minutes each. Ships may touch but cannot overlap. Turns alternate after every shot. Open Your Board for private controls.':'')));return;}
  if(!view.players.some(p=>p.userId===c.userId))throw new DomainError('PVP_PLAYER','Only the two named members may control this match.');
  if(i.isButton()&&action==='board'){await i.editReply(await this.privatePayload(c,id,i.client));return;}
  if(i.isButton()&&action==='again'){
   await Promise.all(view.players.map(p=>this.member(i.guild!,p.userId,c.channelId)));created=(await this.repo.replay(c,id,policy)).sessionId;const initial=await this.repo.publicView(created),message=await i.editReply(await this.payload(initial,i.client));await this.repo.linkMessage(created,c.guildId,message.id);this.remember({...initial,messageId:message.id});return;
  }
  if(view.version!==version)throw new DomainError('PVP_CHANGED','This match changed. Open its latest controls.');
  if(i.isButton()&&action==='forfeit'){if(view.state!=='LOCKED')throw new DomainError('PVP_ACCEPT','Forfeit is available after acceptance.');await i.editReply({...await this.notice('Forfeit Match',`Forfeit this match? Your opponent will win${view.wager==='0'?'.':` the full ${BigInt(view.wager)*2n} Ottoman pot.`}`),components:[new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId(`pvp:confirm:${id}:${version}:${i.user.id}`).setLabel('Confirm Forfeit Match').setStyle(ButtonStyle.Danger))]});return;}
  if(i.isButton()&&(action==='manual'||action==='fire')){
   if(view.state!=='LOCKED'||view.game!=='battleship'||view.players[view.turn].userId!==i.user.id||view.phase!==(action==='manual'?'placement':'playing'))throw new DomainError('PVP_TURN','Wait for your turn and open Your Board.');
   const modal=new ModalBuilder().setCustomId(`pvp:${action}:${id}:${version}:${i.user.id}`).setTitle(action==='manual'?'Place Manually':'Fire a shot');const labels=action==='manual'?['Carrier (5 cells)','Battleship (4 cells)','Cruiser (3 cells)','Submarine (3 cells)','Destroyer (2 cells)']:['Target coordinate (A1–J10)'];labels.forEach((label,n)=>modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId('value'+n).setLabel(label).setPlaceholder(action==='manual'?'A1-A5':'A1').setStyle(TextInputStyle.Short).setMaxLength(action==='manual'?9:3).setRequired(true))));await i.showModal(modal);return;
  }
  let command:PvpAction;
  if(i.isButton()&&['accept','cancel','decline'].includes(action??'')){if(action==='accept')await Promise.all(view.players.map(p=>this.member(i.guild!,p.userId,c.channelId)));command={kind:action as 'accept'|'cancel'|'decline'};}
  else if(i.isButton()&&action==='move')command={kind:'move',choice:Number(parts[4])};
  else if(i.isButton()&&action==='auto')command={kind:'place'};
  else if(i.isButton()&&action==='confirm'&&parts[4]===i.user.id)command={kind:'forfeit',confirmed:true};
  else if(i.isModalSubmit()&&parts[4]===i.user.id&&action==='manual')command={kind:'place',fleet:parseFleet(Array.from({length:5},(_,n)=>i.fields.getTextInputValue('value'+n)))};
  else if(i.isModalSubmit()&&parts[4]===i.user.id&&action==='fire')command={kind:'move',choice:coordinate(i.fields.getTextInputValue('value0'))};
  else throw new DomainError('PVP_CONTROL','Use your latest skill-game controls.');
  await this.repo.act(c,id,version,command,policy);if(view.game==='battleship'&&['place','move'].includes(command.kind))await i.editReply(await this.privatePayload(c,id,i.client));else if(!updateAck)await i.deleteReply();else if(action==='confirm')await i.deleteReply();try{await this.refresh(i.client,id);}catch{await i.followUp({ephemeral:true,content:'Your action is saved. The public card refresh is pending.'});}
 }catch(error){if(created&&i.guildId)await this.repo.cancelUnpublished(i.guildId,created);const content=error instanceof DomainError?error.message:'The match could not be updated. Check its saved state before retrying.';if(i.replied||updateAck)await i.followUp({ephemeral:true,content});else if(i.deferred)await i.editReply({content});else await i.reply({ephemeral:true,content});}}
 private async notice(title:string,copy:string){return{content:'',embeds:[new EmbedBuilder().setImage('attachment://pvp-notice.png').setColor(0x3B82F6)],files:[new AttachmentBuilder(await rasterizeSvg(renderPvpNotice(title,copy)),{name:'pvp-notice.png',description:copy.slice(0,1024)})],attachments:[],allowedMentions:{parse:[] as never[]}};}
 async payload(v:PvpView,client?:Client){const button=(action:string,label:string,extra?:string)=>new ButtonBuilder().setCustomId(`pvp:${action}:${v.id}:${v.version}${extra===undefined?'':':'+extra}`).setLabel(label).setStyle(ButtonStyle.Secondary),rows:ActionRowBuilder<ButtonBuilder>[]=[],controls=new ActionRowBuilder<ButtonBuilder>();
  if(v.state==='OPEN')controls.addComponents(button('accept','Accept',undefined).setStyle(ButtonStyle.Success),button('decline','Decline'),button('cancel','Cancel Challenge'));
  else if(v.state==='CLOSED')controls.addComponents(button('again','Play Again').setStyle(ButtonStyle.Primary));
  else if(v.state==='LOCKED'){
   if(v.game==='battleship')controls.addComponents(button('board','Your Board').setStyle(ButtonStyle.Primary));
   else if(v.game==='tictactoe')for(let y=0;y<3;y++)rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(...Array.from({length:3},(_,x)=>{const cell=y*3+x;return button('move',v.cells[cell]===1?'X':v.cells[cell]===2?'O':String(cell+1),String(cell)).setDisabled(v.cells[cell]!==0);})));else for(let start=0;start<7;start+=4)rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(...Array.from({length:Math.min(4,7-start)},(_,i)=>button('move','Column '+(start+i+1),String(start+i)).setDisabled(v.cells[start+i]!==0))));controls.addComponents(button('forfeit','Forfeit Match'));
  }
  controls.addComponents(button('rules','Rules'));rows.push(controls);
  const content=v.expiresAt&&v.phase!=='finished'?'Deadline <t:'+Math.floor(v.expiresAt.getTime()/1000)+':R>.':'';
  return{content,embeds:[new EmbedBuilder().setColor(0x3B82F6).setImage('attachment://pvp.png')],files:[new AttachmentBuilder(await rasterizeSvg(renderPvp(v,await this.portraits(client,v))),{name:'pvp.png',description:pvpDescription(v).slice(0,1024)})],attachments:[],components:rows,allowedMentions:{parse:[] as never[]}};
 }
 async privatePayload(c:PvpContext,id:string,client?:Client){const v=await this.repo.privateView(c,id);if(v.game!=='battleship')throw new DomainError('PVP_BOARD','This game uses a public board.');const buttons:ButtonBuilder[]=[],button=(action:string,label:string)=>new ButtonBuilder().setCustomId(`pvp:${action}:${id}:${v.version}:${c.userId}`).setLabel(label).setStyle(ButtonStyle.Secondary);if(v.turn===v.seat&&v.phase==='placement')buttons.push(button('auto','Auto Place'),button('manual','Place Manually'));if(v.turn===v.seat&&v.phase==='playing')buttons.push(button('fire','Fire').setStyle(ButtonStyle.Primary));buttons.push(button('board','Refresh Your Board'));return{content:'',embeds:[new EmbedBuilder().setImage('attachment://pvp-private.png').setColor(0x3B82F6)],files:[new AttachmentBuilder(await rasterizeSvg(renderPrivatePvp(v,client?await memberArt(client,c.guildId,c.userId):undefined)),{name:'pvp-private.png'})],attachments:[],components:[new ActionRowBuilder<ButtonBuilder>().addComponents(...buttons)],allowedMentions:{parse:[] as never[]}};}
 async refresh(client:Client,id:string){const previous=this.refreshes.get(id)??Promise.resolve(),current=previous.catch(()=>{}).then(async()=>{const v=await this.repo.publicView(id);if(!v.messageId||this.published.get(id)===this.signature(v))return;const channel=await client.channels.fetch(v.channelId);if(!channel?.isTextBased()||!('messages' in channel))throw new Error('Skill-game channel unavailable.');const message=await channel.messages.fetch(v.messageId);if(message.author.id!==client.user?.id)throw new Error('Skill-game message owner mismatch.');await message.edit(await this.payload(v,client));this.remember(v);});this.refreshes.set(id,current);try{await current;}finally{if(this.refreshes.get(id)===current)this.refreshes.delete(id);}}
 async advance(client:Client,guildId:string,id:string,version:number){await this.repo.expire(guildId,id,version);await this.refresh(client,id);}
 async sweep(client:Client){if(this.sweeping)return;this.sweeping=true;try{for(const row of await this.repo.active()){if(row.expiresAt&&row.expiresAt<=new Date())await this.repo.expire(row.guildId,row.id,row.version);await this.refresh(client,row.id);}}finally{this.sweeping=false;}}
}
