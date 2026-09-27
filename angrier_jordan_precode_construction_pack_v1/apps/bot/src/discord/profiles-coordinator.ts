import {createHash} from 'node:crypto';
import {renderPremiumProfile,renderPremiumRecords,renderPremiumLeaderboard,renderPremiumShowcase} from '../../../../packages/features-profiles/src/premium-render.js';
import {rasterizeSvg} from '../../../../packages/renderer/src/raster.js';
import {avatarData,memberArt} from './member-art.js';
import {renderSpotlight,recordTitle} from '../../../../packages/features-profiles/src/render.js';
import {weeklyCycle} from '../../../../packages/features-economy/src/service.js';
import {CAPABILITY_MATRIX} from '../../../../packages/contracts/src/generated/capabilities.js';
import {ActionRowBuilder,AttachmentBuilder,ButtonBuilder,ButtonStyle,EmbedBuilder,StringSelectMenuBuilder,type ButtonInteraction,type ChatInputCommandInteraction,type Client,type Message,type StringSelectMenuInteraction} from 'discord.js';
import {DomainError,DeliveryEngine,PermissionEngine,type ConfigService} from '../../../../packages/core/src/index.js';
import {PrismaProfilesRepository} from '../../../../packages/features-profiles/src/prisma-repository.js';
import {qualifyingVoice,fmkSummary,type SpotlightPostingSettings} from '../../../../packages/features-profiles/src/domain.js';
export const PROFILE_COMMANDS=new Set(['profile','privacy','leaderboard','records']);
const card=(title:string,description:string)=>new EmbedBuilder().setColor(0xC9A768).setAuthor({name:'Angrier Jordan'}).setTitle(title).setDescription(description.slice(0,4000));
const premiumPayload=async(svg:string,name:string,description:string)=>({embeds:[new EmbedBuilder().setColor(0xC9A768).setImage('attachment://'+name)],files:[new AttachmentBuilder(await rasterizeSvg(svg),{name,description:description.slice(0,1024)})],allowedMentions:{parse:[] as never[]}});
const categories=['wealth','collections','wins','crafting','gambling','crime','fmk_fucked','fmk_married','fmk_killed','fmk_agreement','spotlight','messages','words','voice'];
export class DiscordProfilesCoordinator {
 constructor(private readonly repo:PrismaProfilesRepository,private readonly config:ConfigService,private readonly eligible:(g:string,u:string)=>Promise<boolean>){}
 async message(m:Message){
  if(!m.guildId||m.author.bot||await this.config.get(m.guildId,'features.activity')!==true)return;
  const exclusions=[['channels.bot_channel','activity.exclude_bot_channel'],['channels.games_channel','activity.exclude_games_channel'],['channels.staff_log','activity.exclude_staff_channel']] as const;
  const excluded=await Promise.all(exclusions.map(async([channel,toggle])=>await this.config.get(m.guildId!,toggle)===true?this.config.get(m.guildId!,channel):null));
  excluded.push(await this.config.get(m.guildId,'channels.hotseat_channel'));
  await this.repo.message(m.guildId,m.author.id,m.id,m.createdAt,{content:m.content,bot:m.author.bot,command:/^\s*[!/]\w/.test(m.content),excludedChannel:excluded.includes(m.channelId)});
 }
 private async postingSettings(guildId:string):Promise<SpotlightPostingSettings>{
  const [fallbackHour,startHour,endHour]=await Promise.all(['spotlight.fallback_post_hour','spotlight.learned_post_window_start_hour','spotlight.learned_post_window_end_hour'].map(key=>this.config.get(guildId,key)));
  if(typeof fallbackHour!=='number'||typeof startHour!=='number'||typeof endHour!=='number')throw new DomainError('SPOTLIGHT_POSTING_CONFIG','Spotlight posting hours must be numeric.');
  return{fallbackHour,startHour,endHour};
 }

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
   const fmk=fmkSummary(p.games);
   const fmkText=`FMK: Fucked ${fmk.fucked} · Married ${fmk.married} · Killed ${fmk.killed}\nFMK rounds played: ${fmk.played} · Audience agreement: ${fmk.agreementRounds?fmk.averageAgreement.toFixed(1)+'% average / '+fmk.highestAgreement.toFixed(1)+'% highest / '+fmk.lowestAgreement.toFixed(1)+'% lowest':'No completed audience ballots'}`;
   const description=`${activity}\n\n${fmkText}\n\nGames: ${p.games.filter(g=>!['fmk','fmk_subject','skill_games','party_games'].includes(g.gameKey)).map(g=>`${g.gameKey} ${g.wins}W / ${g.losses}L`).join(', ')||'No results yet'}\nWork: ${work?.attempts??0} jobs · ${work?.ottomansEarned??0n} Ottomans earned\nGifts sent / received: ${p.giftsSent} / ${p.giftsReceived}\nChair Building: ${p.progress?.rank??'Apprentice'}\nActive marriages: ${p.activeMarriages}\n\n**${premium}**\nFeatured achievements: ${showcase||'None selected'}\nFeatured collectibles: ${collectibles||'None selected'}`;
   const profilePng=await rasterizeSvg(renderPremiumProfile({name:discordMember.displayName,avatarData:await avatarData(discordMember.displayAvatarURL({extension:'png',size:512})),sections:[{label:'Activity',value:activity},{label:'Games and community',value:fmkText+'\n'+(p.games.filter(g=>!['fmk','fmk_subject','skill_games','party_games'].includes(g.gameKey)).map(g=>g.gameKey+' '+g.wins+'W / '+g.losses+'L').join(', ')||'No results yet')},{label:'Economy and Family',value:'Work: '+(work?.attempts??0)+' jobs · '+(work?.ottomansEarned??0n)+' Ottomans earned\nGifts sent / received: '+p.giftsSent+' / '+p.giftsReceived+'\nChair Building: '+(p.progress?.rank??'Apprentice')+'\nActive marriages: '+p.activeMarriages},{label:'Honors and showcase',value:premium+'\nFeatured achievements: '+(showcase||'None selected')+'\nFeatured collectibles: '+(collectibles||'None selected')}] }));
   await i.editReply({embeds:[new EmbedBuilder().setColor(0xC9A768).setImage('attachment://member-profile.png')],files:[new AttachmentBuilder(profilePng,{name:'member-profile.png',description:(discordMember.displayName+'\n'+description).slice(0,1024)})],components:target.id===i.user.id?[new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId(`profile:edit:${i.user.id}`).setLabel('Edit Showcase').setStyle(ButtonStyle.Primary))]:[],allowedMentions:{parse:[]}});return;
  }
  if(i.isButton()&&parts[1]==='edit'){
   const options=await this.repo.showcaseOptions(i.guildId,i.user.id),pages=Math.max(1,Math.ceil(Math.max(options.badges.length,options.items.length)/6));
   const page=Math.max(0,Math.min(pages-1,Number(parts[3])||0)),components:(ActionRowBuilder<StringSelectMenuBuilder>|ActionRowBuilder<ButtonBuilder>)[]=[];
   for(const [kind,rows,selected] of [['badges',options.badges,options.state?.featuredAchievements??[]],['items',options.items,options.state?.featuredItems??[]]] as const){const visible=rows.slice(page*6,(page+1)*6);if(visible.length)components.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(new StringSelectMenuBuilder().setCustomId('profile:'+kind+':'+i.user.id+':'+page).setPlaceholder(kind==='badges'?'Featured achievements':'Featured collectibles').setMinValues(0).setMaxValues(Math.min(6,visible.length)).addOptions(visible.map(r=>({label:r.name,value:r.id,default:selected.includes(r.id)})))));}
   components.push(new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId('profile:edit:'+i.user.id+':'+(page-1)).setLabel('Previous').setStyle(ButtonStyle.Secondary).setDisabled(page===0),new ButtonBuilder().setCustomId('profile:edit:'+i.user.id+':'+(page+1)).setLabel('Next').setStyle(ButtonStyle.Secondary).setDisabled(page===pages-1)));
   await i.editReply({...await premiumPayload(renderPremiumShowcase({page,pages,badges:options.badges.slice(page*6,(page+1)*6).map(x=>({name:x.name,selected:(options.state?.featuredAchievements??[]).includes(x.id)})),items:options.items.slice(page*6,(page+1)*6).map(x=>({name:x.name,selected:(options.state?.featuredItems??[]).includes(x.id)}))}),'showcase.png','Private showcase. Select up to six earned badges and six owned collectibles. Changes apply immediately.'),components});return;
  }
  if(i.isStringSelectMenu()&&['badges','items'].includes(parts[1]!)){
   const options=await this.repo.showcaseOptions(i.guildId,i.user.id),page=Math.max(0,Number(parts[3])||0),badges=parts[1]==='badges',rows=badges?options.badges:options.items;
   const visible=new Set(rows.slice(page*6,(page+1)*6).map(r=>r.id));if(i.values.some(v=>!visible.has(v)))throw new DomainError('SHOWCASE_SELECTION','Choose an item on this page.');
   const selected=badges?options.state?.featuredAchievements??[]:options.state?.featuredItems??[],combined=[...selected.filter(id=>!visible.has(id)),...i.values];
   await this.repo.showcase(i.guildId,i.user.id,badges?combined:undefined,badges?undefined:combined);await i.editReply({...await premiumPayload(renderPremiumShowcase({page,pages:Math.max(1,Math.ceil(Math.max(options.badges.length,options.items.length)/6)),notice:'Showcase updated · Your selections are saved',badges:options.badges.slice(page*6,(page+1)*6).map(x=>({name:x.name,selected:(badges?combined:options.state?.featuredAchievements??[]).includes(x.id)})),items:options.items.slice(page*6,(page+1)*6).map(x=>({name:x.name,selected:(!badges?combined:options.state?.featuredItems??[]).includes(x.id)}))}),'showcase.png','Showcase updated. Your selections are saved.'),components:[new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId('profile:edit:'+i.user.id+':'+page).setLabel('Edit Showcase').setStyle(ButtonStyle.Primary))]});return;
  }
  const identity=async(userId:string|null)=>{if(!userId)return{name:'Server record',avatarData:''};const member=await i.guild!.members?.fetch(userId).catch(()=>null);const user=member?.user??await i.client?.users.fetch(userId).catch(()=>null);return{name:member?.displayName??user?.displayName??'Member',avatarData:await avatarData((member??user)?.displayAvatarURL({extension:'png',size:128}))};};
  const pageButtons=(kind:string,key:string,page:number,pages:number)=>pages>1?[new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId('profile:'+kind+':'+i.user.id+':'+key+':'+(page-1)).setLabel('Previous').setStyle(ButtonStyle.Secondary).setDisabled(page===0),new ButtonBuilder().setCustomId('profile:'+kind+':'+i.user.id+':'+key+':'+(page+1)).setLabel('Next').setStyle(ButtonStyle.Secondary).setDisabled(page===pages-1))]:[];
  if((i.isChatInputCommand()&&i.commandName==='records')||['records','recordpage'].includes(parts[1]!)){
   const scope=(i.isStringSelectMenu()?i.values[0]:parts[1]==='recordpage'?parts[3]:'alltime')??'alltime';if(!['alltime','monthly'].includes(scope))throw new DomainError('RECORD_PERIOD','Choose a supported record period.');
   const records=await this.repo.records(i.guildId,scope as 'monthly'|'alltime'),pages=Math.max(1,Math.ceil(records.length/6)),rawPage=parts[1]==='recordpage'?Number(parts[4]):0,page=Math.max(0,Math.min(pages-1,Number.isFinite(rawPage)?Math.floor(rawPage):0));
   const recordRows=await Promise.all(records.slice(page*6,page*6+6).map(async r=>{const member=await identity(r.userId);return{title:recordTitle(r.recordKey),memberName:member.name,avatarData:member.avatarData,amount:(r.value as {amount?:string}).amount??'—',achievedAt:new Intl.DateTimeFormat('en-CA',{timeZone:'America/Denver',dateStyle:'medium'}).format(r.achievedAt)};}));
   const period=scope==='monthly'?'This month · Mountain Time':'All time';
   await i.editReply({...await premiumPayload(renderPremiumRecords({scope:period,records:recordRows,page,pages}),'server-records.png',period+' records. '+recordRows.map(r=>r.title+': '+r.memberName+' · '+r.amount).join('; ')),components:[new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(new StringSelectMenuBuilder().setCustomId('profile:records:'+i.user.id).setPlaceholder('Record period').addOptions([{label:'All time',value:'alltime',default:scope==='alltime'},{label:'This month · resets at 4 AM Mountain',value:'monthly',default:scope==='monthly'}])),...pageButtons('recordpage',scope,page,pages)]});return;
  }
  const category=i.isStringSelectMenu()?i.values[0]??'wealth':parts[1]==='leaderpage'?parts[3]??'wealth':'wealth';if(!categories.includes(category))throw new DomainError('LEADERBOARD_CATEGORY','Choose a supported leaderboard category.');
  const rows=await this.repo.leaderboard(i.guildId,category),pages=Math.max(1,Math.ceil(rows.length/6)),rawPage=parts[1]==='leaderpage'?Number(parts[4]):0,page=Math.max(0,Math.min(pages-1,Number.isFinite(rawPage)?Math.floor(rawPage):0));
  const leaders=await Promise.all(rows.slice(page*6,page*6+6).map(async(r,n)=>({...await identity(r.userId),rank:page*6+n+1,value:typeof r.value==='number'&&!Number.isInteger(r.value)?r.value.toFixed(1):String(r.value)})));
  await i.editReply({...await premiumPayload(renderPremiumLeaderboard({category,rows:leaders,page,pages}),'leaderboard.png',category+' leaderboard. '+leaders.map(r=>r.rank+'. '+r.name+': '+r.value).join('; ')),components:[new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(new StringSelectMenuBuilder().setCustomId('profile:leaderboard:'+i.user.id).setPlaceholder('Choose a category').addOptions(categories.map(c=>({label:c.replaceAll('_',' '),value:c,default:c===category})))),...pageButtons('leaderpage',category,page,pages)]});
 }catch(e){const content=e instanceof DomainError?e.message:'Profile controls could not be completed.';if(i.deferred)await i.editReply({content});else await i.reply({ephemeral:true,content});}}
 async freeze(client:Client,guildId:string,at=new Date()){if(await this.config.get(guildId,'features.spotlight')!==true)throw new DomainError('SPOTLIGHT_DISABLED','Spotlight is disabled; retain scheduled work.');await this.sampleVoice(client,guildId);await this.repo.freeze(guildId,at,await this.postingSettings(guildId));await this.repo.schedule(guildId);}
 async reconcile(guildId:string){if(await this.config.get(guildId,'features.spotlight')===true)await this.repo.reconcile(guildId,new Date(),await this.postingSettings(guildId));}
 async announce(client:Client,guildId:string,weekKey:string){
  if(await this.config.get(guildId,'features.spotlight')!==true)throw new DomainError('SPOTLIGHT_DISABLED','Spotlight is disabled; retain scheduled work.');
  const frozen=await this.repo.announcement(guildId,weekKey);if(!frozen||frozen.deliveryState==='SENT')return;
  const channelId=await this.config.get(guildId,'spotlight.post_channel')||await this.config.get(guildId,'channels.main_chat');if(typeof channelId!=='string'||!channelId)throw new Error('Weekly Spotlight channel is not configured.');
  const channel=await client.channels.fetch(channelId);if(!channel?.isTextBased()||!('send' in channel))throw new Error('Weekly Spotlight requires a text channel.');
  const marker=`spotlight:${weekKey}`,filename='weekly-honors-'+createHash('sha256').update(marker).digest('hex').slice(0,24)+'.png';
  const result=frozen.snapshot as unknown as {winners:{category:string;value:number;userIds:string[]}[];tripleThreat:string[];activeMembers:number;totals:Record<string,number>};
  const names:Record<string,string>={messages:'The Loudest Chair',words:'The Wordsmith',vcSeconds:'Voice of the Lounge'};
  const awards=await this.repo.awardDetails(guildId,weekKey),identities=new Map<string,{name:string;avatarData:string}>();
  for(const userId of new Set(awards.map(a=>a.userId)))identities.set(userId,await memberArt(client,guildId,userId)??{name:'Member',avatarData:''});
  const end=weeklyCycle(new Date(weekKey+'T12:00:00Z')).next;
  const svg=renderSpotlight({weekStart:weekKey,weekEnd:new Intl.DateTimeFormat('en-CA',{timeZone:'America/Denver',year:'numeric',month:'2-digit',day:'2-digit'}).format(end),activeMembers:result.activeMembers,messages:result.totals.messages??0,words:result.totals.words??0,voiceSeconds:result.totals.vcSeconds??0,categories:result.winners.map(w=>({title:names[w.category]??w.category,winners:awards.filter(a=>a.category===w.category).map(a=>({...identities.get(a.userId)!,total:a.winningValue.toString(),lifetimeWins:a.lifetimeWins,status:a.statusLabel,tripleThreat:result.tripleThreat.includes(a.userId)}))}))});
  const png=await rasterizeSvg(svg);
  await new DeliveryEngine({
   read:async()=>{const row=await this.repo.announcement(guildId,weekKey);return{state:row?.deliveryState==='SENT'?'SENT':row?.deliveryState==='SENDING'?'SENDING':'PENDING',...(row?.messageId?{messageId:row.messageId}:{})};},
   claim:()=>this.repo.claimAnnouncement(guildId,weekKey),complete:id=>this.repo.delivered(guildId,weekKey,id)
  }).deliver(marker,{
   find:async key=>{const recent=await channel.messages.fetch({limit:100});return recent.find(m=>m.author.id===client.user?.id&&(m.embeds.some(e=>e.footer?.text===key)||m.attachments?.some(a=>a.name===filename)))?.id??null;},
   send:async key=>(await channel.send({content:'@everyone',embeds:[new EmbedBuilder().setColor(0xF59E0B).setImage('attachment://'+filename)],files:[new AttachmentBuilder(png,{name:filename})],allowedMentions:{parse:['everyone']}})).id
  });
 }
}
