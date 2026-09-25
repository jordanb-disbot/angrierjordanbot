import sharp from 'sharp';
import {renderSpotlight} from '../../../../packages/features-profiles/src/render.js';
import {weeklyCycle} from '../../../../packages/features-economy/src/service.js';
import {CAPABILITY_MATRIX} from '../../../../packages/contracts/src/generated/capabilities.js';
import {ActionRowBuilder,AttachmentBuilder,ButtonBuilder,ButtonStyle,EmbedBuilder,StringSelectMenuBuilder,type ButtonInteraction,type ChatInputCommandInteraction,type Client,type Message,type StringSelectMenuInteraction} from 'discord.js';
import {DomainError,DeliveryEngine,PermissionEngine,type ConfigService} from '../../../../packages/core/src/index.js';
import {PrismaProfilesRepository} from '../../../../packages/features-profiles/src/prisma-repository.js';
import {qualifyingVoice} from '../../../../packages/features-profiles/src/domain.js';
export const PROFILE_COMMANDS=new Set(['profile','privacy','leaderboard','records']);
const card=(title:string,description:string)=>new EmbedBuilder().setColor(0xC9A768).setAuthor({name:'Angrier Jordan'}).setTitle(title).setDescription(description.slice(0,4000));
const categories=['wealth','collections','wins','crafting','gambling','crime','spotlight','messages','words','voice'];
export class DiscordProfilesCoordinator {
 constructor(private readonly repo:PrismaProfilesRepository,private readonly config:ConfigService,private readonly eligible:(g:string,u:string)=>Promise<boolean>){}
 async message(m:Message){if(!m.guildId||m.author.bot||await this.config.get(m.guildId,'features.activity')!==true)return;const excluded=await Promise.all(['channels.bot_channel','channels.games_channel','channels.staff_log','channels.hotseat_channel'].map(k=>this.config.get(m.guildId!,k)));await this.repo.message(m.guildId,m.author.id,m.id,m.createdAt,{content:m.content,bot:m.author.bot,command:/^\s*[!/]\w/.test(m.content),excludedChannel:excluded.includes(m.channelId)});}
 async sampleVoice(client:Client,guildId:string){if(await this.config.get(guildId,'features.activity')!==true)return;const guild=await client.guilds.fetch(guildId),snapshot:{userId:string;channelId:string;qualified:boolean}[]=[];for(const channel of guild.channels.cache.values()){if(!channel.isVoiceBased())continue;const members=[...channel.members.values()].map(m=>({userId:m.id,bot:m.user.bot,selfMuted:m.voice.selfMute===true,selfDeafened:m.voice.selfDeaf===true})),qualified=new Set(qualifyingVoice(members,channel.id===guild.afkChannelId));for(const m of members.filter(m=>!m.bot))snapshot.push({userId:m.userId,channelId:channel.id,qualified:qualified.has(m.userId)});}await this.repo.voice(guildId,snapshot,new Date());}
 async recordCommand(i:ChatInputCommandInteraction){if(i.guildId&&await this.config.get(i.guildId,'features.activity')===true)await this.repo.command(i.guildId,i.user.id,i.id,[i.commandName,i.options.getSubcommandGroup(false),i.options.getSubcommand(false)].filter(Boolean).join(' '),new Date());}
 async handle(i:ChatInputCommandInteraction|ButtonInteraction|StringSelectMenuInteraction){try{
  if(!i.guildId||!i.guild)throw new DomainError('SERVER_ONLY','Use this in the server.');
  if(await this.config.get(i.guildId,'features.profiles')!==true)throw new DomainError('PROFILE_DISABLED','Profiles are not enabled yet.');
  if(!new PermissionEngine({'profiles.use':CAPABILITY_MATRIX.capabilities['profiles.use']}).can('member','profiles.use')||!await this.eligible(i.guildId,i.user.id))throw new DomainError('PROFILE_RESTRICTED','Profile controls are unavailable while restricted.');
  const parts=i.isChatInputCommand()?[]:i.customId.split(':');if(parts.length&&parts[2]!==i.user.id)throw new DomainError('OWNER_ONLY','Open your own profile controls.');
  await i.deferReply({ephemeral:!(i.isChatInputCommand()&&i.commandName==='profile')});
  if(i.isChatInputCommand()&&i.commandName==='privacy'){const kind=i.options.getSubcommand() as 'activity'|'roast';const state=i.options.getString('state',true);await this.repo.privacy(i.guildId,i.user.id,kind,state==='visible'||state==='allow');await i.editReply({content:`${kind==='activity'?'Activity visibility':'Roast targeting'}: ${state}.`});return;}
  if(i.isChatInputCommand()&&i.commandName==='profile'){
   const target=i.options.getUser('member')??i.user;const discordMember=await i.guild.members.fetch(target.id);await this.repo.refreshAchievements(i.guildId,target.id);const p=await this.repo.profile(i.guildId,target.id),options=await this.repo.showcaseOptions(i.guildId,target.id);
   const activity=p.activity?`Activity this month / all time\nMessages: ${p.activity.month.messages} / ${p.activity.allTime.messages}\nWords: ${p.activity.month.words} / ${p.activity.allTime.words}\nVoice seconds: ${p.activity.month.vcSeconds} / ${p.activity.allTime.vcSeconds}\nMost-used word: ${p.activity.mostWord}\nMost-used command: ${p.activity.mostCommand}`:'Activity statistics are private.';
   const work=p.economy.find(x=>x.activity==='work');const showcase=p.state.featuredAchievements.map(id=>options.badges.find(b=>b.id===id)?.name).filter(Boolean).join(', ');const collectibles=p.state.featuredItems.map(id=>options.items.find(x=>x.id===id)?.name).filter(Boolean).join(', ');
   const premium=p.state.tripleThreatAt?'Triple Threat · permanent':p.spotlight.filter(s=>s.weekStart.getTime()===p.spotlight[0]?.weekStart.getTime()).map(s=>s.category).join(', ')||'No Weekly Spotlight title yet';
   const description=`${activity}\n\nGames: ${p.games.map(g=>`${g.gameKey} ${g.wins}W / ${g.losses}L`).join(', ')||'No results yet'}\nWork: ${work?.attempts??0} jobs · ${work?.ottomansEarned??0n} Ottomans earned\nGifts sent / received: ${p.giftsSent} / ${p.giftsReceived}\nChair Building: ${p.progress?.rank??'Apprentice'}\nActive marriages: ${p.activeMarriages}\n\n**${premium}**\nFeatured achievements: ${showcase||'None selected'}\nFeatured collectibles: ${collectibles||'None selected'}`;
   await i.editReply({embeds:[card(discordMember.displayName,description).setThumbnail(discordMember.displayAvatarURL())],components:target.id===i.user.id?[new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId(`profile:edit:${i.user.id}`).setLabel('Edit Showcase').setStyle(ButtonStyle.Primary))]:[],allowedMentions:{parse:[]}});return;
  }
  if(i.isButton()&&parts[1]==='edit'){
   const options=await this.repo.showcaseOptions(i.guildId,i.user.id),pages=Math.max(1,Math.ceil(Math.max(options.badges.length,options.items.length)/25));
   const page=Math.max(0,Math.min(pages-1,Number(parts[3])||0)),components:(ActionRowBuilder<StringSelectMenuBuilder>|ActionRowBuilder<ButtonBuilder>)[]=[];
   for(const [kind,rows,selected] of [['badges',options.badges,options.state?.featuredAchievements??[]],['items',options.items,options.state?.featuredItems??[]]] as const){const visible=rows.slice(page*25,(page+1)*25);if(visible.length)components.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(new StringSelectMenuBuilder().setCustomId('profile:'+kind+':'+i.user.id+':'+page).setPlaceholder(kind==='badges'?'Featured achievements':'Featured collectibles').setMinValues(0).setMaxValues(Math.min(6,visible.length)).addOptions(visible.map(r=>({label:r.name,value:r.id,default:selected.includes(r.id)})))));}
   components.push(new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId('profile:edit:'+i.user.id+':'+(page-1)).setLabel('Previous').setStyle(ButtonStyle.Secondary).setDisabled(page===0),new ButtonBuilder().setCustomId('profile:edit:'+i.user.id+':'+(page+1)).setLabel('Next').setStyle(ButtonStyle.Secondary).setDisabled(page===pages-1)));
   await i.editReply({embeds:[card('Edit Showcase · '+(page+1)+' / '+pages,'Select up to six earned badges and six owned collectibles across all pages. Changes apply immediately. Triple Threat permanently retains the premium slot.')],components});return;
  }
  if(i.isStringSelectMenu()&&['badges','items'].includes(parts[1]!)){
   const options=await this.repo.showcaseOptions(i.guildId,i.user.id),page=Math.max(0,Number(parts[3])||0),badges=parts[1]==='badges',rows=badges?options.badges:options.items;
   const visible=new Set(rows.slice(page*25,(page+1)*25).map(r=>r.id));if(i.values.some(v=>!visible.has(v)))throw new DomainError('SHOWCASE_SELECTION','Choose an item on this page.');
   const selected=badges?options.state?.featuredAchievements??[]:options.state?.featuredItems??[],combined=[...selected.filter(id=>!visible.has(id)),...i.values];
   await this.repo.showcase(i.guildId,i.user.id,badges?combined:undefined,badges?undefined:combined);await i.editReply({content:'Showcase updated.'});return;
  }
  if((i.isChatInputCommand()&&i.commandName==='records')||parts[1]==='records'){
   const scope=i.isStringSelectMenu()&&i.values[0]==='monthly'?'monthly':'alltime';const records=await this.repo.records(i.guildId,scope);
   await i.editReply({embeds:[card('Server Records · '+(scope==='monthly'?'This month':'All time'),records.map(r=>{const value=r.value as {amount?:string};return '**'+r.recordKey+'** · '+(value.amount??'—')+' · <@'+r.userId+'>\nSet <t:'+Math.floor(r.achievedAt.getTime()/1000)+':R>';}).join('\n\n')||'No records yet.')],components:[new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(new StringSelectMenuBuilder().setCustomId('profile:records:'+i.user.id).setPlaceholder('Record period').addOptions([{label:'All time',value:'alltime'},{label:'This month · resets at 4 AM Mountain',value:'monthly'}]))],allowedMentions:{parse:[]}});return;
  }
  const category=i.isStringSelectMenu()?i.values[0]??'wealth':'wealth';const rows=await this.repo.leaderboard(i.guildId,category);
  await i.editReply({embeds:[card(`${i.isChatInputCommand()&&i.commandName==='records'?'Server Records':'Leaderboard'} · ${category}`,rows.slice(0,20).map((r,n)=>`${n+1}. <@${r.userId}> · ${r.value}`).join('\n')||'No records yet.')],components:[new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(new StringSelectMenuBuilder().setCustomId(`profile:leaderboard:${i.user.id}`).setPlaceholder('Choose a category').addOptions(categories.map(c=>({label:c,value:c}))))],allowedMentions:{parse:[]}});
 }catch(e){const content=e instanceof DomainError?e.message:'Profile controls could not be completed.';if(i.deferred)await i.editReply({content});else await i.reply({ephemeral:true,content});}}
 async freeze(client:Client,guildId:string,at=new Date()){if(await this.config.get(guildId,'features.spotlight')!==true)throw new DomainError('SPOTLIGHT_DISABLED','Spotlight is disabled; retain scheduled work.');await this.sampleVoice(client,guildId);await this.repo.freeze(guildId,at);await this.repo.schedule(guildId);}
 async reconcile(guildId:string){if(await this.config.get(guildId,'features.spotlight')===true)await this.repo.reconcile(guildId);}
 async announce(client:Client,guildId:string,weekKey:string){
  if(await this.config.get(guildId,'features.spotlight')!==true)return;
  const frozen=await this.repo.announcement(guildId,weekKey);if(!frozen||frozen.deliveryState==='SENT')return;
  const channelId=await this.config.get(guildId,'spotlight.post_channel')||await this.config.get(guildId,'channels.main_chat');if(typeof channelId!=='string'||!channelId)throw new Error('Weekly Spotlight channel is not configured.');
  const channel=await client.channels.fetch(channelId);if(!channel?.isTextBased()||!('send' in channel))throw new Error('Weekly Spotlight requires a text channel.');
  const marker=`spotlight:${weekKey}`;
  const result=frozen.snapshot as unknown as {winners:{category:string;value:number;userIds:string[]}[];tripleThreat:string[];activeMembers:number;totals:Record<string,number>};
  const names:Record<string,string>={messages:'The Loudest Chair',words:'The Wordsmith',vcSeconds:'Voice of the Lounge'};
  const description=result.winners.map(w=>`**${names[w.category]}**\n${w.userIds.map(id=>`<@${id}>`).join(', ')||'No qualifying winner'} · ${w.value}`).join('\n\n')+`\n\nActive members: ${result.activeMembers}\nServer totals: ${result.totals.messages} messages · ${result.totals.words} words · ${result.totals.vcSeconds} voice seconds${result.tripleThreat.length?'\nTriple Threat: '+result.tripleThreat.map(id=>`<@${id}>`).join(', '):''}`;
  const awards=await this.repo.awardDetails(guildId,weekKey),guild=await client.guilds.fetch(guildId),identities=new Map<string,{name:string;avatarData:string}>();
  for(const userId of new Set(awards.map(a=>a.userId))){const member=await guild.members.fetch(userId).catch(()=>null),user=member?.user??await client.users.fetch(userId);const response=await fetch(member?member.displayAvatarURL({extension:'png',size:128}):user.displayAvatarURL({extension:'png',size:128}),{signal:AbortSignal.timeout(10000)});if(!response.ok)throw new Error('Spotlight avatar is unavailable.');const avatarData='data:image/png;base64,'+Buffer.from(await response.arrayBuffer()).toString('base64');identities.set(userId,{name:member?.displayName??user.displayName,avatarData});}
  const end=weeklyCycle(new Date(weekKey+'T12:00:00Z')).next;
  const svg=renderSpotlight({weekStart:weekKey,weekEnd:new Intl.DateTimeFormat('en-CA',{timeZone:'America/Denver',year:'numeric',month:'2-digit',day:'2-digit'}).format(end),activeMembers:result.activeMembers,messages:result.totals.messages??0,words:result.totals.words??0,voiceSeconds:result.totals.vcSeconds??0,categories:result.winners.map(w=>({title:names[w.category]??w.category,winners:awards.filter(a=>a.category===w.category).map(a=>({...identities.get(a.userId)!,total:a.winningValue.toString(),lifetimeWins:a.lifetimeWins,status:a.statusLabel,tripleThreat:result.tripleThreat.includes(a.userId)}))}))});
  const png=await sharp(Buffer.from(svg)).png().toBuffer();
  await new DeliveryEngine({
   read:async()=>{const row=await this.repo.announcement(guildId,weekKey);return{state:row?.deliveryState==='SENT'?'SENT':row?.deliveryState==='SENDING'?'SENDING':'PENDING',...(row?.messageId?{messageId:row.messageId}:{})};},
   claim:()=>this.repo.claimAnnouncement(guildId,weekKey),complete:id=>this.repo.delivered(guildId,weekKey,id)
  }).deliver(marker,{
   find:async key=>{const recent=await channel.messages.fetch({limit:100});return recent.find(m=>m.author.id===client.user?.id&&m.embeds.some(e=>e.footer?.text===key))?.id??null;},
   send:async key=>(await channel.send({content:'@everyone',embeds:[card('Weekly Spotlight · '+weekKey,description).setImage('attachment://weekly-spotlight.png').setFooter({text:key})],files:[new AttachmentBuilder(png,{name:'weekly-spotlight.png'})],allowedMentions:{parse:['everyone']}})).id
  });
 }
}
