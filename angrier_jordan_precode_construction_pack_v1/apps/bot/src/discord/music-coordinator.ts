import {createHash} from 'node:crypto';
import {ActionRowBuilder,AttachmentBuilder,ButtonBuilder,ButtonStyle,ChannelType,EmbedBuilder,MessageFlags,PermissionFlagsBits,StringSelectMenuBuilder,type AutocompleteInteraction,type ButtonInteraction,type ChatInputCommandInteraction,type Guild,type GuildMember,type StringSelectMenuInteraction} from 'discord.js';
import {DomainError,type ConfigService} from '../../../../packages/core/src/index.js';
import {PrismaMusicRepository,type MusicRequest} from '../../../../packages/features-music/src/prisma-repository.js';
import {AuthorizedMusicCatalog} from '../../../../packages/features-music/src/catalog.js';
import {assertMusicActor,musicEntry,musicPolicy,type MusicControl} from '../../../../packages/features-music/src/domain.js';
import type {MusicActor,MusicPolicy,MusicState} from '../../../../packages/features-music/src/interfaces.js';
import {renderMusicController} from '../../../../packages/features-music/src/render.js';
import {brandedNotice} from '../../../../packages/features-events/src/gate-b-visual.js';
import {rasterizeSvg} from '../../../../packages/renderer/src/raster.js';

type Interaction=ChatInputCommandInteraction|ButtonInteraction|StringSelectMenuInteraction;
type AnyInteraction=Interaction|AutocompleteInteraction;
export type MusicAccessResolver=(guild:Guild,member:GuildMember)=>Promise<{eligible:boolean;isDj:boolean}>;
export const MUSIC_COMMANDS=new Set(['play','music','playlist']);
type Rows=(ActionRowBuilder<ButtonBuilder>|ActionRowBuilder<StringSelectMenuBuilder>)[];
const whole=(value:string,label:string)=>{if(!/^\d+$/.test(value)||!Number.isSafeInteger(Number(value)))throw new DomainError('MUSIC_VALUE',`Enter a whole ${label}.`);return Number(value);};
function seekPosition(value:string){if(!/^\d+(?::[0-5]\d){0,2}$/.test(value))throw new DomainError('MUSIC_SEEK','Use seconds, minutes:seconds or hours:minutes:seconds.');const seconds=value.split(':').reduce((total,part)=>total*60+Number(part),0);if(!Number.isSafeInteger(seconds*1000))throw new DomainError('MUSIC_SEEK','Choose a valid playback position.');return seconds*1000;}
/** Saves intents and renders actual persisted state. It never connects to a music provider or claims an intent played audio. */
export class DiscordMusicCoordinator {
 constructor(private repo:PrismaMusicRepository,private config:ConfigService,private loadCatalog:()=>Promise<AuthorizedMusicCatalog>,private resolveActor:MusicAccessResolver,private now=()=>Date.now()){}
 private async context(i:AnyInteraction):Promise<MusicActor>{
  if(!i.guildId||!i.guild||!i.channelId)throw new DomainError('SERVER_ONLY','Use music in a server voice channel’s text chat.');
  if(await this.config.get(i.guildId,'music.enabled')!==true)throw new DomainError('MUSIC_DISABLED','Music is not enabled yet.');
  const channel=await i.guild.channels.fetch(i.channelId,{force:true});if(!channel||channel.type!==ChannelType.GuildVoice)throw new DomainError('MUSIC_LOCATION','Join a voice channel and open its embedded text chat to use music.');
  const member=await i.guild.members.fetch({user:i.user.id,force:true}),voice=await i.guild.voiceStates.fetch(i.user.id,{force:true});
  if(member.user.bot||member.isCommunicationDisabled()||voice.channelId!==channel.id||!member.permissionsIn(channel).has(PermissionFlagsBits.ViewChannel|PermissionFlagsBits.Connect))throw new DomainError('MUSIC_LOCATION','Join this voice channel with current access before using its music controls.');
  const access=await this.resolveActor(i.guild,member);if(!access.eligible)throw new DomainError('MUSIC_RESTRICTED','Music is unavailable to you here.');
  return{guildId:i.guildId,userId:i.user.id,voiceChannelId:voice.channelId,textChannelId:channel.id,eligible:true,isDj:access.isDj};
 }
 private async policy(guildId:string):Promise<MusicPolicy>{return musicPolicy({queueMaxTracks:Number(await this.config.get(guildId,'music.queue_max_tracks')),defaultVolume:Number(await this.config.get(guildId,'music.default_volume')),defaultLoop:await this.config.get(guildId,'music.loop_default') as MusicPolicy['defaultLoop'],defaultAutoplay:await this.config.get(guildId,'music.autoplay_default')===true});}
 async autocomplete(i:AutocompleteInteraction){try{if(i.commandName!=='play'){await i.respond([]);return;}await this.context(i);const catalog=await this.loadCatalog();await i.respond(catalog.autocomplete(String(i.options.getFocused())));}catch{if(!i.responded)await i.respond([]);}}
 private async notice(i:Interaction,title:string,message:string,components:Rows=[]){await i.editReply({content:message,embeds:[],files:[new AttachmentBuilder(await rasterizeSvg(brandedNotice(title,message,'ANGRIER JORDAN · THE JUKEBOX')),{name:'music-notice.png'})],components,allowedMentions:{parse:[]}});}
 private async player(actor:MusicActor,allowOtherVoice=false){const saved=await this.repo.read(actor.guildId);if(!saved)throw new DomainError('MUSIC_EMPTY','The jukebox is empty. Use /play and choose an authorized catalog track.');assertMusicActor(saved.state,actor,allowOtherVoice);return saved;}
 private async listeners(i:Interaction,actor:MusicActor):Promise<string[]>{
  const candidates=[...i.guild!.voiceStates.cache.values()].filter(v=>v.channelId===actor.voiceChannelId).map(v=>v.id);if(!candidates.includes(actor.userId))candidates.push(actor.userId);
  const eligible=await Promise.all([...new Set(candidates)].map(async id=>{try{const member=await i.guild!.members.fetch({user:id,force:true}),voice=await i.guild!.voiceStates.fetch(id,{force:true});if(member.user.bot||member.isCommunicationDisabled()||voice.channelId!==actor.voiceChannelId||voice.selfDeaf||voice.serverDeaf||!member.permissionsIn(actor.textChannelId).has(PermissionFlagsBits.ViewChannel|PermissionFlagsBits.Connect))return null;return(await this.resolveActor(i.guild!,member)).eligible?id:null;}catch{return null;}}));return eligible.filter((id):id is string=>id!==null);
 }
 async handle(i:Interaction){try{
  await i.deferReply({ephemeral:true});const actor=await this.context(i),request:MusicRequest={actor,requestKey:i.id};
  if(i.isStringSelectMenu()){
   const [prefix,action,owner]=i.customId.split(':');if(prefix!=='music'||action!=='pick'||owner!==actor.userId||i.values.length!==1||i.message.author.id!==i.client.user.id||!i.message.flags.has(MessageFlags.Ephemeral))throw new DomainError('MUSIC_OWNER','Open your own current music search.');await this.enqueueSelection(i,request,i.values[0]!);return;
  }
  if(i.isButton()){
   const [prefix,action,guildId,revisionText,generationText,control,owner]=i.customId.split(':');if(prefix!=='music'||action!=='control'||guildId!==actor.guildId||!control||!owner)throw new DomainError('MUSIC_CONTROL','Open the current music controls.');
   if(owner!=='public'&&owner!==actor.userId)throw new DomainError('MUSIC_OWNER','Open your own private music controls.');const saved=await this.player(actor,['stop','leave'].includes(control));
   if(i.message.author.id!==i.client.user.id||owner==='public'&&(i.message.id!==saved.controllerMessageId||i.message.flags.has(MessageFlags.Ephemeral)))throw new DomainError('MUSIC_CONTROLLER','Use the current authoritative music controller.');
   if(owner!=='public'&&!i.message.flags.has(MessageFlags.Ephemeral))throw new DomainError('MUSIC_CONTROLLER','Open your own private music controls.');
   const revision=whole(revisionText??'','player revision'),generation=whole(generationText??'','track generation');
   if(control==='queue'){await this.queue(i,saved.state);return;}if(control==='nowplaying'){await this.showPlayer(i,actor);return;}
   if(control==='skip'){const result=await this.repo.skip(request,generation,await this.listeners(i,actor));await this.showPlayer(i,actor,result.skipped?'Skip requested; waiting for playback confirmation.':`Vote Skip: ${result.votes}/${result.needed} current listeners.`);return;}
   if(saved.state.revision!==revision||saved.state.generation!==generation)throw new DomainError('MUSIC_STALE','The player changed. Open its current controls.');
   if(control==='volume'){await this.volumeChoices(i,actor,saved.state);return;}
   const operation=control==='shuffle'?this.shuffle(saved.state,i.id):this.buttonControl(control,saved.state);await this.repo.control(request,revision,operation);await this.showPlayer(i,actor,'Music control saved; playback changes await transport confirmation.');return;
  }
  if(i.commandName==='play'){
   const value=i.options.getString('query_or_link',true).trim();if(value.startsWith('catalog:')||/^[a-z][a-z0-9+.-]*:/i.test(value)||value.startsWith('//')){await this.enqueueSelection(i,request,value);return;}
   const catalog=await this.loadCatalog(),matches=catalog.search(value);if(!matches.length){await this.notice(i,'Track unavailable','No available authorized catalog tracks match this search. Try another title or artist.');return;}
   const picker=new StringSelectMenuBuilder().setCustomId('music:pick:'+actor.userId).setPlaceholder('Choose the exact recording').addOptions(matches.map(track=>({label:track.metadata.title.slice(0,100),description:track.metadata.artist.slice(0,100),value:'catalog:'+track.id})));
   await this.notice(i,'Choose a recording','Choose the exact authorized recording to add. Search results do not start playback automatically.',[new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(picker)]);return;
  }
  if(i.commandName==='playlist'){
   if(i.options.getSubcommand()==='view'){const playlists=await this.repo.playlists(actor.guildId,actor.userId),name=i.options.getString('name');if(name){const row=playlists.find(p=>p.name===name);if(!row)throw new DomainError('MUSIC_PLAYLIST','This saved playlist is unavailable.');const playlist=await this.repo.readPlaylist(request,row.id);await this.notice(i,playlist.name,playlist.tracks.length?playlist.tracks.slice(0,20).map((track,n)=>`${n+1}. ${track.title} · ${track.artist}`).join('\n').slice(0,1800):'This playlist is empty.');return;}await this.notice(i,'Your playlists',playlists.length?playlists.map(p=>p.name).join('\n').slice(0,1800):'You have no saved playlists.');return;}
   throw new DomainError('MUSIC_PLAYLIST_UI_UNAVAILABLE','Playlist editing and playback are not available in this controller yet. Your saved playlists are unchanged.');
  }
  if(i.commandName!=='music')throw new DomainError('MUSIC_CONTROL','Choose a supported music command.');const command=i.options.getSubcommand();
  if(command==='help'){await this.notice(i,'Music help','Use /play in your voice channel’s text chat. Select an authorized catalog recording. Links only match explicitly listed catalog recordings. Requesters can skip their own track; other listeners vote; DJs can force skip. Previous, Replay and Seek require the requester or a DJ.');return;}
  if(command==='join'){await this.repo.join(request,await this.policy(actor.guildId));await this.showPlayer(i,actor,'Voice connection requested; waiting for transport confirmation.');return;}
  const saved=await this.player(actor,['stop','leave'].includes(command));if(command==='nowplaying'){await this.showPlayer(i,actor);return;}if(command==='queue'){await this.queue(i,saved.state);return;}
  if(command==='history'){const history=await this.repo.confirmedHistory(actor.guildId,20);await this.notice(i,'Played history',history.length?history.map((row,n)=>{const metadata=row.metadata as {title?:string;artist?:string};return`${n+1}. ${metadata.title??'Track'} · ${metadata.artist??'Artist'}`;}).join('\n').slice(0,1800):'No playback has been confirmed yet.');return;}
  if(command==='skip'){const result=await this.repo.skip(request,saved.state.generation,await this.listeners(i,actor));await this.showPlayer(i,actor,result.skipped?'Skip requested; waiting for playback confirmation.':`Vote Skip: ${result.votes}/${result.needed} current listeners.`);return;}
  let control:MusicControl;
  if(command==='seek')control={kind:'seek',positionMs:seekPosition(i.options.getString('time',true))};
  else if(command==='volume')control={kind:'volume',percent:i.options.getInteger('percent',true)};
  else if(command==='remove'||command==='jump')control={kind:command,entryId:this.entryAt(saved.state,String(i.options.getInteger('position',true)))};
  else if(command==='move')control={kind:'move',entryId:this.entryAt(saved.state,String(i.options.getInteger('position',true))),position:i.options.getInteger('to',true)};
  else if(command==='loop')control={kind:'loop',mode:i.options.getString('mode',true) as 'off'|'track'|'queue'};
  else if(command==='autoplay')control={kind:'autoplay',enabled:i.options.getBoolean('enabled',true)};
  else if(command==='shuffle')control=this.shuffle(saved.state,i.id);
  else control=this.buttonControl(command,saved.state);
  await this.repo.control(request,saved.state.revision,control);await this.showPlayer(i,actor,'Music control saved; playback changes await transport confirmation.');
 }catch(error){const message=error instanceof DomainError?(error.code==='MUSIC_DUPLICATE'?'That recording is already selected. Duplicate confirmation is not available yet; no additional track was added.':error.message):'Music could not be completed. No playback success has been assumed.';try{if(i.deferred||i.replied)await this.notice(i,'Music unavailable',message);else await i.reply({ephemeral:true,content:message,allowedMentions:{parse:[]}});}catch{/* Discord may have expired the interaction; never log private source data. */}}}
 private buttonControl(control:string,state:MusicState):MusicControl {if(['pause','resume','previous','replay','stop','leave','clear'].includes(control))return{kind:control as 'pause'|'resume'|'previous'|'replay'|'stop'|'leave'|'clear'};if(control==='loop')return{kind:'loop',mode:state.loop==='off'?'track':state.loop==='track'?'queue':'off'};if(control==='autoplay')return{kind:'autoplay',enabled:!state.autoplay};if(/^volume_\d+$/.test(control))return{kind:'volume',percent:whole(control.slice(7),'volume')};throw new DomainError('MUSIC_CONTROL','Use a supported music control.');}
 private shuffle(state:MusicState,seed:string):MusicControl{return{kind:'shuffle',entryIds:[...state.queue].sort((a,b)=>createHash('sha256').update(seed+':'+a.id).digest('hex').localeCompare(createHash('sha256').update(seed+':'+b.id).digest('hex'))).map(entry=>entry.id)};}
 private entryAt(state:MusicState,value:string){const position=whole(value,'queue position');const entry=state.queue[position-1];if(position<1||!entry)throw new DomainError('MUSIC_POSITION','Choose a current queue track number.');return entry.id;}
 private async enqueueSelection(i:Interaction,request:MusicRequest,reference:string){const catalog=await this.loadCatalog(),match=catalog.resolve(reference);if(match.status!=='available'){await this.notice(i,match.notice.title,match.notice.message);return;}await this.repo.enqueue(request,[musicEntry('music-'+i.id,request.actor.userId,match.track.metadata)],await this.policy(request.actor.guildId));await this.showPlayer(i,request.actor,'The authorized recording was added to the saved queue. Playback is shown only after transport confirmation.');}
 private async queue(i:Interaction,state:MusicState){await this.notice(i,'Music queue',state.queue.length?state.queue.slice(0,20).map((entry,n)=>`${n+1}. ${entry.track.title} · ${entry.track.artist}`).join('\n').slice(0,1800)+(state.queue.length>20?`\n${state.queue.length-20} more tracks are saved.`:''):'The queue is empty. Use /play to choose an authorized recording.');}
 private async showPlayer(i:Interaction,actor:MusicActor,message?:string){const saved=await this.repo.read(actor.guildId);if(!saved)throw new DomainError('MUSIC_EMPTY','The jukebox is empty. Use /play to choose a recording.');const channel=i.guild!.channels.cache.get(saved.state.voiceChannelId),requester=saved.state.current?.requesterUserId;const name=requester?i.guild!.members.cache.get(requester)?.displayName??'Member':'Autoplay';await i.editReply({...await this.payload(saved.state,{ownerId:actor.userId,requesterName:name,...(channel?{voiceChannelName:channel.name}:{})}),...(message?{content:message}:{content:null})});}
 private async volumeChoices(i:Interaction,actor:MusicActor,state:MusicState){if(!actor.isDj)throw new DomainError('MUSIC_DJ','Volume requires DJ authority.');await this.notice(i,'Player volume','Choose a volume level.',[new ActionRowBuilder<ButtonBuilder>().addComponents([25,50,65,80,100].map(percent=>this.button(state,'volume_'+percent,percent+'%',actor.userId)))]);}
 private button(state:MusicState,action:string,label:string,ownerId:string){return new ButtonBuilder().setCustomId(`music:control:${state.guildId}:${state.revision}:${state.generation}:${action}:${ownerId}`).setLabel(label).setStyle(ButtonStyle.Secondary);}
 async payload(state:MusicState,options:{ownerId?:string;requesterName?:string;voiceChannelName?:string}={}){const owner=options.ownerId??'public',paused=state.desiredStatus==='PAUSED',controls=[['previous','Previous'],[paused?'resume':'pause',paused?'Resume':'Pause'],['skip','Skip'],['stop','Stop'],['shuffle','Shuffle'],['loop','Loop'],['queue','Queue'],['volume','Volume'],['autoplay','Autoplay'],['nowplaying','Refresh']];const rows:ActionRowBuilder<ButtonBuilder>[]=[];for(let n=0;n<controls.length;n+=5)rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(controls.slice(n,n+5).map(([action,label])=>this.button(state,action!,label!,owner))));return{embeds:[new EmbedBuilder().setAuthor({name:'Angrier Jordan'}).setTitle('The Jukebox').setColor(0x10b981).setImage('attachment://music-controller.png').setFooter({text:`music:${state.guildId}:${state.generation}`})],files:[new AttachmentBuilder(await rasterizeSvg(renderMusicController(state,this.now(),options.requesterName??'Member',undefined,options.voiceChannelName)),{name:'music-controller.png'})],components:rows,attachments:[],allowedMentions:{parse:[] as never[]}};}
}
