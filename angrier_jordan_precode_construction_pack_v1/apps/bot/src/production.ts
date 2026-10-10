import {runWithEventAcknowledgement} from './discord/event-interaction-ack.js';
import {alwaysRegisteredCommand,chairismRegistrationEnabled,validateRegisteredCommands} from './command-registration.js';
import {startupDiagnostics as startup} from './startup-diagnostics.js';
import {runWithJailSendAcknowledgement} from './discord/jail-interaction-ack.js';
import {runWithDailyAcknowledgement,replyDailyRestriction} from './discord/daily-interaction-ack.js';
import {DiscordServerBootstrap} from './discord/server-bootstrap.js';
import {PrismaServerBootstrapRepository} from '../../../packages/database/src/prisma-server-bootstrap.js';
import {DiscordSocialCoordinator,SOCIAL_COMMANDS} from './discord/social-coordinator.js';
import {PrismaSocialRepository} from '../../../packages/features-social/src/prisma-repository.js';
import {seedSocialContent} from '../../../packages/features-social/src/content.js';
import {DiscordIntroductionsCoordinator,INTRODUCTION_COMMANDS} from './discord/introductions-coordinator.js';
import {PrismaIntroductionsRepository} from '../../../packages/features-introductions/src/prisma-repository.js';
import {DiscordLearningCoordinator} from './discord/learning-coordinator.js';
import {PrismaLearningRepository} from '../../../packages/features-learning/src/prisma-repository.js';
import {DiscordChairismsCoordinator,CHAIRISM_COMMANDS} from './discord/chairisms-coordinator.js';
import {DiscordChairismSecurity} from './discord/chairisms-security.js';
import {DiscordChairismPublication} from './discord/chairisms-publication.js';
import {PrismaChairismRepository} from '../../../packages/features-chairisms/src/prisma-repository.js';
import {DiscordCommunityCoordinator,COMMUNITY_COMMANDS} from './discord/community-coordinator.js';
import {DiscordFamilyCoordinator} from './discord/family-coordinator.js';
import {FamilyMembershipRecovery,applyFamilyGatewayReturn,discordFamilyMembershipCensus,prismaFamilyMembershipStore,reconcileFamilyMembership} from './discord/family-membership.js';
import {PrismaFamilyRepository} from '../../../packages/features-family/src/prisma-repository.js';
import {DEFAULT_FAMILY_POLICY,type FamilyPolicy} from '../../../packages/features-family/src/domain.js';
import {PrismaCommunityRepository} from '../../../packages/features-community/src/prisma-repository.js';
import {DiscordCrimeCoordinator} from './discord/crime-coordinator.js';
import {PrismaCrimeRepository} from '../../../packages/features-crime/src/prisma-repository.js';
import {isCrimeBailRequest} from '../../../packages/features-crime/src/domain.js';
import {DiscordPartyCoordinator,PARTY_COMMANDS} from './discord/party-coordinator.js';
import {PrismaPartyRepository} from '../../../packages/features-party/src/prisma-repository.js';
import {seedPartyContent} from '../../../packages/features-party/src/content.js';
import {DiscordChannelGamesCoordinator} from './discord/channel-games-coordinator.js';
import {PrismaChannelGamesRepository} from '../../../packages/features-channel-games/src/prisma-repository.js';
import {DiscordPvpCoordinator} from './discord/pvp-coordinator.js';
import {PrismaPvpRepository} from '../../../packages/features-pvp/src/prisma-repository.js';
import {DiscordChairmateCoordinator} from './discord/chairmate-coordinator.js';
import {ChairmateRepository,HttpLichessAdapter} from '../../../packages/features-chairmate/src/index.js';
import {DiscordEventsCoordinator} from './discord/events-coordinator.js';
import {DiscordSpecialCoordinator} from './discord/special-coordinator.js';
import {PrismaSpecialRepository} from '../../../packages/features-special/src/prisma-repository.js';
import {DiscordSoloCoordinator,SOLO_COMMANDS} from './discord/solo-coordinator.js';
import {PrismaSoloRepository} from '../../../packages/features-solo/src/prisma-repository.js';
import {PermissionEngine} from '../../../packages/core/src/permissions.js';
import {CAPABILITY_MATRIX} from '../../../packages/contracts/src/generated/capabilities.js';
import {PrismaEventsRepository} from '../../../packages/features-events/src/prisma-repository.js';
import {PrismaFullyFurnishedRepository,type FullyFurnishedProgressView} from '../../../packages/features-events/src/fully-furnished.js';
import {FULLY_FURNISHED_ANNOUNCEMENT_CHANNEL,fullyFurnishedCompletionAnnouncement} from './discord/fully-furnished-announcement.js';
import {DiscordCasinoCoordinator,CASINO_COMMANDS} from './discord/casino-coordinator.js';
import {DiscordPokerCoordinator} from './discord/poker-coordinator.js';
import {DiscordCasinoAnnouncements} from './discord/casino-announcements.js';
import {PrismaCasinoRepository} from '../../../packages/features-casino/src/prisma-repository.js';
import {PrismaLotteryRepository} from '../../../packages/features-casino/src/lottery-repository.js';
import {PrismaPokerRepository} from '../../../packages/features-casino/src/poker-repository.js';
import {DiscordRecordAnnouncements} from './discord/record-announcements.js';
import {DiscordProfilesCoordinator,PROFILE_COMMANDS} from './discord/profiles-coordinator.js';
import {PrismaProfilesRepository} from '../../../packages/features-profiles/src/prisma-repository.js';
import {DiscordItemsCoordinator,ITEM_COMMANDS} from './discord/items-coordinator.js';
import {PrismaItemRepository} from '../../../packages/features-economy/src/items-prisma.js';
import fs from 'node:fs';
import { Client, DiscordAPIError, EmbedBuilder, Events, GatewayIntentBits, Partials, REST, Routes, type ClientEvents, type Guild } from 'discord.js';
import {validateRuntimeEnvironment} from '../../../packages/core/src/runtime-environment.js';
import {RuntimeLifecycle} from '../../../packages/core/src/runtime-lifecycle.js';
import {startRuntimeHealth} from './runtime-health.js';
import { AuditService, ConfigService, DeliveryEngine, DomainError, HealthService, IdempotentScheduler, SchedulerWorker } from '../../../packages/core/src/index.js';
import { SETTINGS } from '../../../packages/contracts/src/generated/settings.js';
import { PrismaAuditSink, PrismaConfigRepository, PrismaJobRepository, createPrismaHealthProbe } from '../../../packages/database/src/prisma-adapters.js';
import {PrismaJobDeliveryRepository} from '../../../packages/database/src/job-delivery.js';
import { PrismaOnboardingRepository, OnboardingService } from '../../../packages/features-onboarding/src/index.js';
import { PrismaJailRepository, JailService } from '../../../packages/features-jail/src/index.js';
import { PrismaModerationRepository, ModerationService } from '../../../packages/features-moderation/src/index.js';
import { PrismaSecurityRepository, SecurityService } from '../../../packages/features-security/src/index.js';
import { PrismaEconomyRepository, EconomyService, type FortuneEntry } from '../../../packages/features-economy/src/index.js';
import { getPrismaClient, disconnectPrisma } from '../../../packages/database/src/client.js';
import {MemberDirectoryService,directoryRecord,nextDirectoryReconciliation,type DirectoryMemberInput} from '../../../packages/database/src/member-directory.js';
import { PrismaWyrPromptRepository, PrismaWyrSessionRepository, PrismaWyrPublicationRepository, WyrService } from '../../../packages/features-wyr/src/index.js';
import { SystemClock } from '../../../packages/core/src/time.js';
import { DiscordWyrCoordinator } from './discord/wyr-coordinator.js';
import { TypeShitResponder } from './discord/type-shit-responder.js';
import { DiscordOnboardingCoordinator } from './discord/onboarding-coordinator.js';
import { DiscordJailCoordinator } from './discord/jail-coordinator.js';
import { DiscordModerationCoordinator } from './discord/moderation-coordinator.js';
import { DiscordSecurityCoordinator } from './discord/security-coordinator.js';
import { DiscordActivityLogger } from './discord/activity-logger.js';
import { DiscordEconomyCoordinator } from './discord/economy-coordinator.js';
import {DiscordEmojiStealCoordinator,EMOJI_STEAL_COMMANDS,EMOJI_STEAL_CONTEXT_COMMANDS} from './discord/emoji-steal-coordinator.js';
import {DiscordDmsCoordinator} from './discord/dms-coordinator.js';

class CuidLikeIds {next(prefix:string){return `${prefix}_${crypto.randomUUID()}`;}}
const required=(name:string)=>{const value=process.env[name]?.trim();if(!value)throw new Error(`Missing required environment variable ${name}`);return value;};
const ECONOMY_COMMANDS=new Set(['daily','weekly','work','fish','dig','scavenge','statement','inventory','bank','transfer']);
const POKER_COMMANDS=new Set(['holdem','omaha','join_game']);

export async function startProductionBot():Promise<void>{
  startup.mark('runtime-config-validation');
  const runtime=validateRuntimeEnvironment(process.env,'worker');
  const lifecycle=new RuntimeLifecycle();
  let initialized=false;
  const token=required('DISCORD_TOKEN');const guildId=required('DISCORD_GUILD_ID');
  const enableLearningSmoke=process.env.ENABLE_LEARNING_SMOKE==='true';
  const enableSocialSmoke=process.env.ENABLE_SOCIAL_SMOKE==='true';
  const enableIntroductionsSmoke=process.env.ENABLE_INTRODUCTIONS_SMOKE==='true';
  const enableWyrSmoke=process.env.ENABLE_WYR_SMOKE==='true';
  const enableOnboardingSmoke=process.env.ENABLE_ONBOARDING_SMOKE==='true';
  const enableJailSmoke=process.env.ENABLE_JAIL_SMOKE==='true';
  const enableModerationSmoke=process.env.ENABLE_MODERATION_SMOKE==='true';
  const enableSecuritySmoke=process.env.ENABLE_SECURITY_SMOKE==='true';
  const enableActivityLoggingSmoke=process.env.ENABLE_ACTIVITY_LOGGING_SMOKE==='true';
  const enableEventsSmoke=process.env.ENABLE_EVENTS_SMOKE==='true';
  const enableSpecialSmoke=process.env.ENABLE_SPECIAL_SMOKE==='true';
  const enableCommunitySmoke=process.env.ENABLE_COMMUNITY_SMOKE==='true';
  const enableChairismsSmoke=process.env.ENABLE_CHAIRISMS_SMOKE==='true';
  const enableFamilySmoke=process.env.ENABLE_FAMILY_SMOKE==='true';
  const enableCrimeSmoke=process.env.ENABLE_CRIME_SMOKE==='true';
  const enablePartySmoke=process.env.ENABLE_PARTY_SMOKE==='true';
  const enableChannelGamesSmoke=process.env.ENABLE_CHANNEL_GAMES_SMOKE==='true';
  const enablePvpSmoke=process.env.ENABLE_PVP_SMOKE==='true';
  const enableSoloSmoke=process.env.ENABLE_SOLO_SMOKE==='true';
  const enableCasinoSmoke=process.env.ENABLE_CASINO_SMOKE==='true';
  const enableProfilesSmoke=process.env.ENABLE_PROFILES_SMOKE==='true';
  const enableItemsSmoke=process.env.ENABLE_ITEMS_SMOKE==='true';
  const enableEconomySmoke=process.env.ENABLE_ECONOMY_SMOKE==='true';
  // Application remains off during shadow measurement unless explicitly set.
  const enableEconomyActivityPayouts=enableEconomySmoke&&process.env.ENABLE_ECONOMY_ACTIVITY_PAYOUTS==='true';
  // This flag is intentionally separate from economy smoke. It has no effect
  // until a valid ACTIVE policy exists after the seven-day shadow gate.
  const enableEconomyAdaptiveApplication=enableEconomySmoke&&process.env.ENABLE_ECONOMY_ADAPTIVE_APPLICATION==='true';
  const economyAdaptivePaused=process.env.ECONOMY_ADAPTIVE_PAUSED==='true';
  const enableFullyFurnishedSmoke=process.env.ENABLE_FULLY_FURNISHED_SMOKE==='true';
  startup.mark('database-client-construction (connection is lazy)');
  const db=getPrismaClient();
  const directoryStore={
    upsert:async(input:ReturnType<typeof directoryRecord>)=>{await db.memberDirectory.upsert({where:{guildId_userId:{guildId:input.guildId,userId:input.userId}},create:input,update:{nickname:input.nickname,displayName:input.displayName,username:input.username,normalizedAliases:input.normalizedAliases,searchText:input.searchText,lastSyncedAt:input.lastSyncedAt,archivedAt:null}});},
    archive:async(guild:string,userId:string,at:Date)=>{await db.memberDirectory.updateMany({where:{guildId:guild,userId,archivedAt:null},data:{archivedAt:at}});},
    active:async(guild:string)=>db.memberDirectory.findMany({where:{guildId:guild,archivedAt:null}}),
  };
  const memberDirectory=new MemberDirectoryService(directoryStore);
  const directoryInput=(member:{guild:{id:string};id:string;nickname?:string|null;displayName?:string|null;user:{username:string;bot?:boolean}}):DirectoryMemberInput=>({guildId:member.guild.id,userId:member.id,nickname:member.nickname??null,displayName:member.displayName??null,username:member.user.username});
  const reconcileMemberDirectory=async(guild:Guild)=>{
    const members=await guild.members.fetch();
    await memberDirectory.reconcile(guild.id,[...members.values()].filter(member=>!member.user.bot).map(directoryInput));
    return new Map([...members].map(([id,member])=>[id,{bot:member.user.bot,joinedAt:member.joinedAt}]));
  };
  const scheduleMemberDirectoryReconciliation=async(guild:string)=>{
    const dueAt=nextDirectoryReconciliation(new Date());
    const executionKey=`member_directory.reconcile:${guild}:${dueAt.toISOString()}`;
    await db.scheduledJob.upsert({where:{executionKey},create:{guildId:guild,jobType:'member_directory.reconcile',executionKey,dueAt,status:'PENDING',payload:{guildId:guild}},update:{dueAt,status:'PENDING',payload:{guildId:guild},lastError:null,completedAt:null}});
  };
  const serverBootstrap=new DiscordServerBootstrap(new PrismaServerBootstrapRepository(db),{onFailure:error=>{if(!initialized)startup.fail(error);}});
  const audit=new AuditService(new PrismaAuditSink(db));
  const dms=new DiscordDmsCoordinator(db,audit);
  const config=new ConfigService(SETTINGS,new PrismaConfigRepository(db),audit);
  // Music is owned by a separate bot.  Do not claim its historical jobs.
  const jobRepo=new PrismaJobRepository(db,{notIn:['music.reconcile','music.controller.publish','music.controller.cleanup','music.controller.refresh']});
  startup.mark('discord-client-construction');
  const client=new Client({intents:[GatewayIntentBits.Guilds,GatewayIntentBits.GuildMembers,GatewayIntentBits.GuildMessages,GatewayIntentBits.GuildMessageReactions,GatewayIntentBits.MessageContent,GatewayIntentBits.GuildVoiceStates,GatewayIntentBits.GuildModeration],partials:[Partials.Message,Partials.Reaction]});
  const fullyFurnishedRepo=new PrismaFullyFurnishedRepository(db);
  const announceFullyFurnishedCompletion=async(guildId:string,userId:string)=>{
    const [channel,ids,guild]=await Promise.all([client.channels.fetch(FULLY_FURNISHED_ANNOUNCEMENT_CHANNEL),fullyFurnishedRepo.completers(guildId),client.guilds.fetch(guildId)]);
    if(!channel?.isSendable())throw new Error('Fully Furnished announcement channel is unavailable.');
    const members=await Promise.all(ids.map(async id=>(await guild.members.fetch({user:id,force:true}).catch(()=>null))?.displayName??'Former member'));
    const winner=(await guild.members.fetch({user:userId,force:true}).catch(()=>null))?.displayName??'A member';
    await channel.send(fullyFurnishedCompletionAnnouncement(winner,members));
  };
  const deliverFullyFurnished=async(guildId:string,userId:string,progress:FullyFurnishedProgressView)=>{
    if(!progress.rolePending||!progress.roleId)return;
    const guild=await client.guilds.fetch(guildId),role=await guild.roles.fetch(progress.roleId).catch(()=>null);
    if(!role||!role.editable)throw new Error('Fully Furnished role is unavailable or above the bot role.');
    const member=await guild.members.fetch({user:userId,force:true});
    await member.roles.add(role,'Fully Furnished launch event completion');
    await fullyFurnishedRepo.markRoleGranted(guildId,userId);
  };
  const recordFullyFurnished=async(eventGuildId:string,userId:string,action:()=>Promise<{progress:FullyFurnishedProgressView;unlock?:unknown}>)=>{
    if(!enableFullyFurnishedSmoke)return;
    try{const result=await action();await deliverFullyFurnished(eventGuildId,userId,result.progress);if(result.unlock)await announceFullyFurnishedCompletion(eventGuildId,userId);}
    catch(error){console.error('Fully Furnished progress delivery pending.',error instanceof Error?error.message:'unknown');}
  };
  const recordSuccessfulCommand=async(interaction:{guildId:string|null;user:{id:string};id:string;commandName:string})=>{
    if(interaction.guildId)await recordFullyFurnished(interaction.guildId,interaction.user.id,()=>fullyFurnishedRepo.recordCommand(interaction.guildId!,interaction.user.id,interaction.commandName,interaction.id));
  };
  const health=new HealthService([createPrismaHealthProbe(db),async()=>({name:'discord',status:client.isReady()&&!lifecycle.isStopping?'ok' as const:'down' as const})]);
  const on=<E extends keyof ClientEvents>(event:E,listener:(...args:ClientEvents[E])=>unknown|Promise<unknown>)=>{
    client.on(event,(...args)=>lifecycle.run(()=>runWithEventAcknowledgement(event,args,{events:enableEventsSmoke,special:enableSpecialSmoke},()=>runWithDailyAcknowledgement(event,args,enableEconomySmoke,()=>runWithJailSendAcknowledgement(event,args,enableJailSmoke,()=>serverBootstrap.run(event,args,()=>listener(...args)))),i=>events.handle(i)),()=>console.error('Discord event processing failed; persisted recovery remains available.')));
  };
  startup.mark('feature-construction');
  const promptRepo=new PrismaWyrPromptRepository(db);
  const sessionRepo=new PrismaWyrSessionRepository(db);
  const wyrService=new WyrService(promptRepo,sessionRepo,new SystemClock(),new CuidLikeIds());
  const wyr=new DiscordWyrCoordinator(wyrService,config,(g,u)=>eligibleGame(g,u,'events.use'),new PrismaWyrPublicationRepository(db));
  const canSendDirectMessage=async(g:string,u:string)=>(await db.member.findUnique({where:{guildId_userId:{guildId:g,userId:u}},select:{dmsEnabled:true}}))?.dmsEnabled??true;
  const onboardingService=new OnboardingService(new PrismaOnboardingRepository(db),audit,new SystemClock());
  const learningRepo=new PrismaLearningRepository(db);
  const onboarding=new DiscordOnboardingCoordinator(onboardingService,config,{eligible:(g,u)=>enableLearningSmoke?eligibleGame(g,u,'learning.use'):Promise.resolve(false),loreAvailable:async()=> (await learningRepo.chapters()).length===3,canSendDirectMessage});
  const jailService=new JailService(new PrismaJailRepository(db),audit,new SystemClock());
  const jail=new DiscordJailCoordinator(jailService,config,onboarding);
  const moderationService=new ModerationService(new PrismaModerationRepository(db),audit,new SystemClock());
  const moderation=new DiscordModerationCoordinator(moderationService,config,canSendDirectMessage);
  const securityService=new SecurityService(new PrismaSecurityRepository(db),audit,new SystemClock());
  const security=new DiscordSecurityCoordinator(securityService,moderationService,config);
  const activityLogger=enableActivityLoggingSmoke?new DiscordActivityLogger(config,guildId):null;
  const fortunes=JSON.parse(fs.readFileSync(new URL('../../../packages/content/economy/fortune_300.json',import.meta.url),'utf8')) as FortuneEntry[];
  const economyService=new EconomyService(new PrismaEconomyRepository(db),audit,new SystemClock(),undefined,fortunes);
  const adaptiveApplicationFor=async(guildId:string)=>enableEconomyAdaptiveApplication&&!economyAdaptivePaused&&await config.get(guildId,'economy.adaptive_paused')!==true;
  const economy=new DiscordEconomyCoordinator(economyService,config,adaptiveApplicationFor);
  const emojiSteal=new DiscordEmojiStealCoordinator(audit);
  const crimeRepo=new PrismaCrimeRepository(db);
  const items=new DiscordItemsCoordinator(new PrismaItemRepository(db),config,async(g,u)=>{
    if(await jail.isModerationJailed(g,u)||await security.isRestricted(g,u)||await crimeRepo.isJailed(g,u))return false;
    const state=await securityService.state(g);return !state.panicActive&&state.mode!=='LOCKDOWN';
  },undefined,async g=>economyService.runtimePolicy(g,await adaptiveApplicationFor(g)).then(policy=>policy.shopPriceMultiplierBps));
  const profileRepo=new PrismaProfilesRepository(db);
  const profiles=new DiscordProfilesCoordinator(profileRepo,config,async(g,u)=>!await jail.isModerationJailed(g,u)&&!await security.isRestricted(g,u)&&!await crimeRepo.isJailed(g,u));
  const sampleProfileVoice=async()=>{const sample=await profiles.sampleVoice(client,guildId);if(enableEconomyActivityPayouts&&sample.accruals.length)await economy.handleQualifiedVoiceAccruals(guildId,sample.at,sample.accruals);return sample;};
  const recordAnnouncements=new DiscordRecordAnnouncements(db,config);
  const casinoRepo=new PrismaCasinoRepository(db),lotteryRepo=new PrismaLotteryRepository(db),pokerRepo=new PrismaPokerRepository(db);
  const casino=new DiscordCasinoCoordinator(casinoRepo,lotteryRepo,config,async(g,u)=>{if(await jail.isModerationJailed(g,u)||await security.isRestricted(g,u)||await crimeRepo.isJailed(g,u))return false;const state=await securityService.state(g);return !state.panicActive&&state.mode!=='LOCKDOWN';},(g,u,id)=>recordFullyFurnished(g,u,()=>fullyFurnishedRepo.recordCasinoRound(g,u,id)),async g=>economyService.maximumWager(g,await adaptiveApplicationFor(g)),async g=>economyService.lotteryTicketPrice(g,await adaptiveApplicationFor(g)));
  const poker=new DiscordPokerCoordinator(pokerRepo,async g=>{const configured=await config.get(g,'channels.poker_channel');return typeof configured==='string'&&/^\d{17,20}$/.test(configured)?configured:undefined;});
  const casinoAnnouncements=new DiscordCasinoAnnouncements(db,config);
  const eventsRepo=new PrismaEventsRepository(db);
  const events=new DiscordEventsCoordinator(eventsRepo,config,async(g,u)=>{if(await jail.isModerationJailed(g,u)||await security.isRestricted(g,u)||await crimeRepo.isJailed(g,u))return false;const state=await securityService.state(g);return !state.panicActive&&state.mode!=='LOCKDOWN';},async g=>economyService.maximumWager(g,await adaptiveApplicationFor(g)));
  const eligibleGame=async(g:string,u:string,capability?:string)=>{if((capability!==undefined&&!new PermissionEngine(CAPABILITY_MATRIX.capabilities).can('member',capability))||await jail.isModerationJailed(g,u)||await security.isRestricted(g,u)||await crimeRepo.isJailed(g,u))return false;const state=await securityService.state(g);return !state.panicActive&&state.mode!=='LOCKDOWN';};
  const social=new DiscordSocialCoordinator(new PrismaSocialRepository(db),config,(g,u)=>eligibleGame(g,u,'social.use'));
  const learning=new DiscordLearningCoordinator(learningRepo,config,(g,u)=>eligibleGame(g,u,'learning.use'),flag=>({economy:enableEconomySmoke,roles:enableOnboardingSmoke,jail:enableJailSmoke,moderation:enableModerationSmoke,security:enableSecuritySmoke,profile:enableProfilesSmoke,casino:enableCasinoSmoke,race:enableEventsSmoke,fight:enableEventsSmoke,line:enableSpecialSmoke,social:enableSocialSmoke,introductions:enableIntroductionsSmoke,core:enableLearningSmoke,tutorial:enableLearningSmoke,lore:enableLearningSmoke,special_commands:enableSpecialSmoke,items:enableItemsSmoke,tools:enableItemsSmoke,collections:enableItemsSmoke,solo_games:enableSoloSmoke,pvp:enablePvpSmoke,party_games:enablePartySmoke,channel_games:enableChannelGamesSmoke,family:enableFamilySmoke,crime:enableCrimeSmoke,community:enableCommunitySmoke,chairisms:enableChairismsSmoke}[flag]??false),(g,u,roles)=>enableSpecialSmoke?eligibleGame(g,u,'special.use').then(allowed=>allowed?special.visibleCommands(g,roles):[]):Promise.resolve([]),(g,u,chapter)=>recordFullyFurnished(g,u,()=>fullyFurnishedRepo.recordLoreChapter(g,u,chapter)));
  const introductions=new DiscordIntroductionsCoordinator(new PrismaIntroductionsRepository(db),config,(g,u)=>eligibleGame(g,u,'introductions.use'),async(g,u)=>{const server=await client.guilds.fetch(g),member=await server.members.fetch({user:u,force:true});return server.ownerId===u||member.permissions.has('Administrator');},(g,u,id)=>recordFullyFurnished(g,u,()=>fullyFurnishedRepo.recordIntroduction(g,u,id)));
  const special=new DiscordSpecialCoordinator(new PrismaSpecialRepository(db),config,(g,u)=>eligibleGame(g,u,'special.use'));
  const soloRepo=new PrismaSoloRepository(db),solo=new DiscordSoloCoordinator(soloRepo,config,(g,u)=>eligibleGame(g,u,'solo.use'));
  const pvp=new DiscordPvpCoordinator(new PrismaPvpRepository(db),config,(g,u)=>eligibleGame(g,u,'pvp.play'));
  const chairmate=new DiscordChairmateCoordinator(new ChairmateRepository(db),new HttpLichessAdapter(required('LICHESS_API_TOKEN')),(g,u)=>eligibleGame(g,u,'pvp.play'),config);
  const party=new DiscordPartyCoordinator(new PrismaPartyRepository(db),config,(g,u)=>eligibleGame(g,u,'events.use'));
  const channelGames=new DiscordChannelGamesCoordinator(new PrismaChannelGamesRepository(db),config,(g,u)=>eligibleGame(g,u,'channel_games.play'));
  const crime=new DiscordCrimeCoordinator(crimeRepo,config,async(g,u)=>{if(await jail.isModerationJailed(g,u)||await security.isRestricted(g,u))return false;const state=await securityService.state(g);return !state.panicActive&&state.mode!=='LOCKDOWN';});
  const communityRepo=new PrismaCommunityRepository(db);
  const community=new DiscordCommunityCoordinator(communityRepo,config,(g,u)=>eligibleGame(g,u,'community.use'),(g,u,id)=>recordFullyFurnished(g,u,()=>fullyFurnishedRepo.recordSuggestion(g,u,id)),async(client,view)=>{const winners=view.winners??[];const channel=await client.channels.fetch(view.channelId).catch(()=>null);if(channel?.isTextBased()&&'send' in channel&&winners.length)await channel.send({content:`Giveaway complete: ${winners.map(w=>`<@${w.id}>`).join(', ')} won **${view.prize?.label??'the prize'}**.`,allowedMentions:{users:winners.map(w=>w.id)}});});
  const notifyGiveawayOwner=async(job:{id:string;guildId:string;executionKey:string;payload?:unknown})=>{
    const payload=job.payload as {guildId?:unknown;sessionId?:unknown};
    if(payload?.guildId!==job.guildId||typeof payload.sessionId!=='string')throw new Error('Invalid giveaway owner-notice job.');
    const view=await communityRepo.publicView(payload.sessionId);
    if(view.kind!=='giveaway'||view.guildId!==job.guildId||view.state!=='CLOSED')return;
    const guild=await client.guilds.fetch(job.guildId),owner=await client.users.fetch(guild.ownerId),marker=`giveaway-owner-notice:${view.id}`;
    const winnerText=(view.winners??[]).length?(view.winners??[]).map(w=>`<@${w.id}> (${w.name})`).join(', '):'No eligible entries';
    const original=view.messageId?`https://discord.com/channels/${view.guildId}/${view.channelId}/${view.messageId}`:`<#${view.channelId}>`;
    try{
      await new DeliveryEngine(new PrismaJobDeliveryRepository(db,job.id)).deliver(marker,{
        find:async()=>{const dm=await owner.createDM(),messages=await dm.messages.fetch({limit:100});return messages.find(message=>message.author.id===client.user?.id&&message.embeds.some(embed=>embed.footer?.text===marker))?.id??null;},
        send:async()=>{const message=await owner.send({embeds:[new EmbedBuilder().setColor(0x10B981).setTitle('Giveaway completed').setDescription(`**${view.prize?.label??view.title}**\nWinner(s): ${winnerText}\nOriginal: ${original}\nCompleted: <t:${Math.floor(Date.now()/1000)}:F>`).setFooter({text:marker})],allowedMentions:{users:(view.winners??[]).map(w=>w.id)}});return message.id;},
      });
    }catch(error){
      // A privacy-blocked DM is operationally visible without affecting the
      // completed settlement.  An uncertain send is left for scheduler
      // recovery, which reconciles the marker before attempting another DM.
      if(error instanceof DomainError&&error.code==='DELIVERY_UNCERTAIN')throw error;
      await db.auditEvent.create({data:{guildId:job.guildId,source:'discord',action:'community.giveaway_owner_notification_failed',targetType:'community',targetId:view.id,after:{jobId:job.id,ownerUserId:guild.ownerId},requestId:job.executionKey}});
    }
  };
  const chairismCanUse=(g:string,u:string)=>eligibleGame(g,u,'chairisms.use');
  const chairismSecurity=new DiscordChairismSecurity(client,config,chairismCanUse);
  const chairismPublication=new DiscordChairismPublication(client,new PrismaChairismRepository(db),chairismSecurity,config);
  const chairisms=new DiscordChairismsCoordinator(chairismSecurity,chairismPublication,chairismPublication,config,chairismCanUse);
  // Passive inheritance eligibility must not inherit command-confinement restrictions.
  const familyHuman=async(g:string,u:string)=>{
    if(g!==guildId)return false;
    const guild=await client.guilds.fetch(g);
    try{return !(await guild.members.fetch({user:u,force:true})).user.bot;}
    catch(error){if(error instanceof DiscordAPIError&&error.code===10007)return false;throw error;}
  };
  const familyCanAct=async(g:string,u:string)=>await familyHuman(g,u)&&await eligibleGame(g,u,'family.use');
  const familyCache=new Map<string,{fingerprint:string;repository:PrismaFamilyRepository;coordinator:DiscordFamilyCoordinator}>();
  const familyMembership=new FamilyMembershipRecovery();
  const familyMembershipStore=prismaFamilyMembershipStore(db);
  const familyEnabled=async()=>{const enabled=enableFamilySmoke&&await config.get(guildId,'features.family')===true;if(!enabled)familyMembership.suspend();return enabled;};
  const familyFor=async(g:string)=>{
    if(g!==guildId)throw new Error('Family runtime server mismatch.');
    const setting=async(key:string,fallback:unknown)=>SETTINGS.some(definition=>definition.key===key)?config.get(g,key):fallback;
    const integer=async(key:string,fallback:number,min:number,max:number)=>{const value=await setting(key,fallback);if(typeof value!=='number'||!Number.isInteger(value)||value<min||value>max)throw new Error('Invalid family setting: '+key);return value;};
    const [proposalHours,divorceMinDays,remarryDays,graceHours,auctionMinHours,auctionMaxHours,childSlotDays,marriageVoteHours,cooldownBaseSeconds,cooldownMaxSeconds,cooldownQuietHours]=await Promise.all([
      Promise.resolve(DEFAULT_FAMILY_POLICY.proposalHours),Promise.resolve(DEFAULT_FAMILY_POLICY.divorceMinDays),Promise.resolve(DEFAULT_FAMILY_POLICY.remarryDays),Promise.resolve(DEFAULT_FAMILY_POLICY.graceHours),integer('family.auction_min_hours',1,1,72),integer('family.auction_max_hours',72,1,72),Promise.resolve([...DEFAULT_FAMILY_POLICY.childSlotDays]),integer('family.marriage_vote_hours',3,1,24),integer('family.cooldown_base_seconds',1800,1,86400),integer('family.cooldown_max_seconds',86400,1,604800),integer('family.cooldown_quiet_hours',168,1,8760),
    ]);
    if(!Array.isArray(childSlotDays)||childSlotDays.length!==5||childSlotDays.some((value,index)=>typeof value!=='number'||!Number.isInteger(value)||value<0||value>3650||(index>0&&value<=childSlotDays[index-1]!)))throw new Error('Invalid family setting: family.adoption_slot_days');
    if(auctionMinHours>auctionMaxHours||cooldownBaseSeconds>cooldownMaxSeconds)throw new Error('Invalid family setting ranges.');
    const policy:FamilyPolicy={proposalHours,divorceMinDays,remarryDays,graceHours,auctionMinHours,auctionMaxHours,childSlotDays:[...childSlotDays] as number[],marriageVoteHours,cooldownBaseSeconds,cooldownMaxSeconds,cooldownQuietHours},fingerprint=JSON.stringify(policy),prior=familyCache.get(g);
    if(prior?.fingerprint===fingerprint)return prior;
    const repository=new PrismaFamilyRepository(db,process.env.FAMILY_COMPATIBILITY_SECRET??'',familyHuman,policy,undefined,undefined,familyCanAct,()=>familyMembership.transactionGeneration()),entry={fingerprint,repository,coordinator:new DiscordFamilyCoordinator(repository,config,familyCanAct,async(directoryGuildId,userId)=>{const row=await db.memberDirectory.findUnique({where:{guildId_userId:{guildId:directoryGuildId,userId}},select:{displayName:true}});return row?.displayName;})};
    familyCache.set(g,entry);return entry;
  };
  let familyRecovery:Promise<void>|undefined;
  let startupFamilyCensus:Map<string,{bot:boolean;joinedAt:Date|null}>|undefined;
  const familyRecoveryFailure=(error:unknown)=>{
    // This path intentionally reports only an operational message: recovery
    // failures must be actionable without exposing environment configuration.
    const detail=error instanceof Error?error.message:'Unknown recovery failure.';
    console.error(`Family membership recovery is pending: ${detail}`);
  };
  const ensureFamilyMembership=async()=>{
    if(familyMembership.ready)return;
    if(!familyRecovery)familyRecovery=(async()=>{
      const channelId=await config.get(guildId,'channels.bot_channel');
      if(typeof channelId!=='string'||!/^\d{17,20}$/.test(channelId))throw new Error('Family bot channel is not configured.');
      const guild=await client.guilds.fetch(guildId),family=await familyFor(guildId),seed=startupFamilyCensus;
      startupFamilyCensus=undefined;
      await familyMembership.initialize(assertCurrent=>reconcileFamilyMembership({guildId,channelId,store:familyMembershipStore,census:discordFamilyMembershipCensus(guild,seed),repository:family.repository,assertCurrent}));
    })().finally(()=>{familyRecovery=undefined;});
    await familyRecovery;
  };
  const familyJob=async(kind:string,job:{guildId:string;executionKey:string;payload?:unknown})=>{
    if(job.guildId!==guildId||!await familyEnabled())throw new Error('Family runtime disabled; retain pending work.');
    await ensureFamilyMembership();
    return familyMembership.scheduled(async()=>{
    const p=job.payload as {guildId?:unknown;sessionId?:unknown};if(p?.guildId!==job.guildId||typeof p.sessionId!=='string')throw new Error('Invalid family job.');
    const family=await familyFor(job.guildId);
    if(kind==='estate_execute'){
      const session=await family.repository.get(p.sessionId);
      // A missed member-add event or disabled onboarding must not execute an estate against a returned member.
      if(session.ownerUserId){
        const membership=await discordFamilyMembershipCensus(await client.guilds.fetch(job.guildId)).lookup(session.ownerUserId);
        if(membership.present&&!membership.bot){
          if(!membership.joinedAt)throw new Error('Family member has no authoritative join timestamp.');
          await family.repository.rejoin({guildId:job.guildId,channelId:session.channelId,userId:session.ownerUserId,requestKey:'estate-presence-v2:'+job.executionKey},membership.joinedAt,true);return;
        }
      }
    }
    await family.coordinator.advance(client,kind,job.guildId,p.sessionId);
    },familyEnabled);
  };
  const snapshotLatenessAlerts=new Set<string>();
  const alertSnapshotLateness=async(job:{guildId:string;executionKey:string;dueAt:Date},error:unknown)=>{
    if(!(error instanceof DomainError)||error.code!=='ECONOMY_SNAPSHOT_LATE'||snapshotLatenessAlerts.has(job.executionKey))return;
    snapshotLatenessAlerts.add(job.executionKey);
    console.error('Economy snapshot lateness alert',JSON.stringify({guildId:job.guildId,executionKey:job.executionKey,dueAt:job.dueAt.toISOString(),code:error.code}));
    const channelId=await config.get(job.guildId,'channels.staff_log');
    if(typeof channelId!=='string'||!channelId)return;
    const channel:any=await client.channels.fetch(channelId).catch(()=>null);
    if(channel?.isTextBased())await channel.send({content:`⚠️ Economy snapshot missed its 10-minute capture window. No late snapshot was written; the job remains failed for operator review. Scheduled boundary: <t:${Math.floor(job.dueAt.getTime()/1000)}:F>.`,allowedMentions:{parse:[]}}).catch(()=>undefined);
  };
  const scheduler=new IdempotentScheduler(jobRepo,{
    'chairism.publish':async job=>{if(!enableChairismsSmoke)throw new Error('Chairisms runtime disabled; retain pending delivery.');await chairismPublication.deliver(job.id);},
    'family.publish':async job=>{if(job.guildId!==guildId||!await familyEnabled())throw new Error('Family runtime disabled; retain pending delivery.');await ensureFamilyMembership();await familyMembership.scheduled(async()=>{await(await familyFor(job.guildId)).coordinator.publish(client,job.id);},familyEnabled);},
    'family.proposal_expire':async job=>{await familyJob('proposal_expire',job);},
    'family.marriage_close':async job=>{await familyJob('marriage_close',job);},
    'family.adoption_expire':async job=>{await familyJob('adoption_expire',job);},
    'family.auction_close':async job=>{await familyJob('auction_close',job);},
    'family.estate_execute':async job=>{await familyJob('estate_execute',job);},
    'special.callout':async job=>{if(!enableSpecialSmoke)throw new Error('Special Commands disabled; retain pending delivery.');await special.deliver(client,job.id);},
    'special.line_lock':async job=>{const p=job.payload as {guildId:string;sessionId:string};await special.advance(client,p.guildId,p.sessionId,false);},
    'special.line_complete':async job=>{const p=job.payload as {guildId:string;sessionId:string};await special.advance(client,p.guildId,p.sessionId,true);},
    'community.publish':async job=>{if(!enableCommunitySmoke)throw new Error('Community runtime disabled; retain pending delivery.');await community.publish(client,job.id);},
    'community.advance':async job=>{if(!enableCommunitySmoke)throw new Error('Community runtime disabled; retain pending work.');const p=job.payload as {guildId:string;sessionId:string;round:number};await community.advance(client,p.guildId,p.sessionId,p.round);},
    'community.giveaway_owner_notice':async job=>{if(!enableCommunitySmoke)throw new Error('Community runtime disabled; retain pending owner notification.');await notifyGiveawayOwner(job);},
    'crime.refresh':async job=>{const p=job.payload as {sessionId:string};await crime.refresh(client,p.sessionId);},
    'crime.publish':async job=>{if(!enableCrimeSmoke||await config.get(job.guildId,'features.crime')!==true)throw new Error('Crime publication disabled; retain pending delivery.');await crime.deliver(client,job.id);},
    'crime.close':async job=>{const p=job.payload as {guildId:string;sessionId:string};await crime.advance(client,p.guildId,p.sessionId);},
    'crime.release':async job=>{const p=job.payload as {guildId:string;sentenceId:string};await crimeRepo.release(p.guildId,p.sentenceId);},
    'crime.decay':async job=>{const p=job.payload as {guildId:string;userId:string};await crimeRepo.decay(p.guildId,p.userId,await crime.policy(p.guildId));},
    'crime.records':async job=>{const p=job.payload as {guildId:string;sessionId:string};await crimeRepo.records(p.guildId,p.sessionId);},
    'channelgame.announce':async job=>{await channelGames.deliver(client,job.id);},
    'party.publish':async job=>{if(!enablePartySmoke||await config.get(job.guildId,'features.party_games')!==true)throw new Error('Party publication disabled; retain pending delivery.');await party.publish(client,job.id);},
    'party.advance':async job=>{const p=job.payload as {guildId:string;sessionId:string;round:number};await party.advance(client,p.guildId,p.sessionId,p.round);},
    'wyr.publish':async job=>{const p=job.payload as {sessionId:string};await wyr.publish(client,p.sessionId);},
    'wyr.close':async job=>{const p=job.payload as {sessionId:string};await wyr.advance(client,p.sessionId);},
    'pvp.expire':async job=>{const p=job.payload as {guildId:string;sessionId:string;version:number};await pvp.advance(client,p.guildId,p.sessionId,p.version);},
    'solo.expire':async job=>{const p=job.payload as {guildId:string;sessionId:string};await soloRepo.expire(p.guildId,p.sessionId);await solo.refresh(client,p.sessionId);},
    'events.close_betting':async job=>{const p=job.payload as {guildId:string;sessionId:string};await events.advance(client,p.guildId,p.sessionId,false);},
    'events.settle':async job=>{const p=job.payload as {guildId:string;sessionId:string};await events.advance(client,p.guildId,p.sessionId,true);},
    'casino.expire':async job=>{const p=job.payload as {guildId:string;sessionId:string};await casinoRepo.expire(p.guildId,p.sessionId);await casino.refresh(client,p.sessionId);},
    'poker.timeout':async job=>{const p=job.payload as {guildId:string;sessionId:string};await pokerRepo.timeout(p.guildId,p.sessionId);},
    'poker.action_timeout':async job=>{const p=job.payload as {guildId:string;sessionId:string;handId:string};await pokerRepo.actionTimeout(p.guildId,p.sessionId,p.handId);},
    'social.publish':async job=>{if(!enableSocialSmoke)throw new Error('Social runtime disabled; retain delivery.');await social.deliver(client,job.id);},
    'intro.publish':async job=>{if(!enableIntroductionsSmoke)throw new Error('Introduction runtime disabled; retain delivery.');await introductions.publish(client,job.id);},
    'intro.panel':async job=>{if(!enableIntroductionsSmoke)throw new Error('Introduction runtime disabled; retain delivery.');await introductions.publishPanel(client,job.id);},
    'lottery.draw':async job=>{const p=job.payload as {guildId:string;roundId:string};await lotteryRepo.draw(p.guildId,p.roundId);if(enableCasinoSmoke&&await config.get(p.guildId,'features.lottery')===true)await lotteryRepo.schedule(p.guildId);},
    'casino.jackpot_announce':async job=>{if(!enableCasinoSmoke)throw new Error('Casino runtime disabled; retain pending delivery.');await casinoAnnouncements.deliver(client,job);},
    'lottery.announce':async job=>{if(!enableCasinoSmoke)throw new Error('Casino runtime disabled; retain pending delivery.');await casinoAnnouncements.deliver(client,job);},
    'records.observe':async job=>{const p=job.payload as {guildId:string;userId:string;records:Record<string,string>;occurredAt:string};if(p.guildId!==job.guildId)throw new Error('Record server mismatch.');for(const [key,value] of Object.entries(p.records)){if(BigInt(value)>0n)await profileRepo.record(p.guildId,p.userId,key,BigInt(value),job.executionKey+':'+key,new Date(p.occurredAt));}await profileRepo.refreshAchievements(p.guildId,p.userId);},
    'record.announce':async job=>{if(!enableProfilesSmoke)throw new Error('Record runtime disabled; retain job.');await recordAnnouncements.deliver(client,job);},
    'spotlight.freeze':async job=>{const p=job.payload as {guildId?:unknown};if(typeof p?.guildId!=='string')throw new Error('Invalid Spotlight job.');if(!enableProfilesSmoke)throw new Error('Spotlight runtime disabled; retain job for retry.');await profiles.freeze(client,p.guildId,job.dueAt);},
    'spotlight.announce':async job=>{const p=job.payload as {guildId?:unknown;weekKey?:unknown};if(typeof p?.guildId!=='string'||typeof p.weekKey!=='string')throw new Error('Invalid Spotlight job.');if(!enableProfilesSmoke)throw new Error('Spotlight runtime disabled; retain job for retry.');await profiles.announce(client,p.guildId,p.weekKey);},
    'wyr.close_due':async()=>{await wyr.closeDue(client);},
    'jail.expire':async job=>{await jail.handleExpiryJob(client,job.payload);},
    'moderation.timeout_expire':async job=>{await moderation.handleExpiryJob(client,job.jobType,job.payload);},
    'moderation.temp_ban_expire':async job=>{await moderation.handleExpiryJob(client,job.jobType,job.payload);},
    'moderation.evidence_expire':async job=>{await moderation.handleExpiryJob(client,job.jobType,job.payload);},
    'security.state_expire':async job=>{await security.handleExpiryJob(job.payload);},
    'economy.bank_interest_weekly':async job=>{await economy.handleInterestJob(job.payload);},
    'economy.snapshot_daily':async job=>{try{await economy.handleSnapshotJob(job.payload,job.dueAt);}catch(error){await alertSnapshotLateness(job,error);throw error;}},
    'economy.policy_weekly':async job=>{await economy.handlePolicyJob(job.payload);},
    'economy.streak_installment':async job=>{await economy.handleStreakInstallmentJob(job.payload);},
    'member_directory.reconcile':async job=>{if(job.guildId!==guildId)throw new Error('Member directory server mismatch.');const guild=await client.guilds.fetch(job.guildId);await reconcileMemberDirectory(guild);await scheduleMemberDirectoryReconciliation(job.guildId);},
  });
  startup.mark('scheduled-job-construction');
  const worker=new SchedulerWorker(scheduler,5_000);
  let introSweep:ReturnType<typeof setInterval>|undefined;
  let eventSweep:ReturnType<typeof setInterval>|undefined;
  let voiceSweep:ReturnType<typeof setInterval>|undefined;
  let wyrSweep:ReturnType<typeof setInterval>|undefined;
  let specialSweep:ReturnType<typeof setInterval>|undefined;
  let communitySweep:ReturnType<typeof setInterval>|undefined;
  let crimeSweep:ReturnType<typeof setInterval>|undefined;
  let partySweep:ReturnType<typeof setInterval>|undefined;
  let pvpSweep:ReturnType<typeof setInterval>|undefined;
  let chairmateSweep:ReturnType<typeof setInterval>|undefined;
  let soloSweep:ReturnType<typeof setInterval>|undefined;
  let familySweep:ReturnType<typeof setInterval>|undefined;

  on(Events.GuildCreate,async()=>{}); // The shared event boundary commits the observed server first.
  client.once(Events.ClientReady,ready=>lifecycle.run(async()=>{
    try{
    startup.mark('discord-ready-guild-fetch');
    const configuredServer=ready.guilds.cache.get(guildId)??await ready.guilds.fetch({guild:guildId,force:true});
    await startup.run('database-connection-schema-bootstrap (migrations external)',()=>serverBootstrap.census([...ready.guilds.cache.values(),configuredServer]));
    startupFamilyCensus=await startup.run('member-directory-reconciliation',()=>reconcileMemberDirectory(configuredServer));
    await startup.run('member-directory-schedule',()=>scheduleMemberDirectoryReconciliation(guildId));
    if(activityLogger)await startup.run('activity-log-private-channel-preflight',()=>activityLogger.preflight(configuredServer));
    if(lifecycle.isStopping)return;
    if(enablePartySmoke||enableWyrSmoke)await startup.run('party-content-bootstrap',()=>seedPartyContent(db));
    if(enableSocialSmoke)await startup.run('social-content-bootstrap',()=>seedSocialContent(db));
    if(enableIntroductionsSmoke)await startup.run('introductions-bootstrap',()=>introductions.sweep(ready));
    if(enableOnboardingSmoke)await startup.run('roles-panel-bootstrap',()=>onboarding.sweepRolePanel(ready,guildId));
    startup.mark('command-registration-load');
    const registration=JSON.parse(fs.readFileSync(new URL('../../../generated/discord/application_commands.json',import.meta.url),'utf8'));
    const enabled=registration.filter((c:{name?:string;type?:number})=>chairismRegistrationEnabled(c,enableChairismsSmoke)||(enableCommunitySmoke&&c.type===3&&Boolean(c.name&&EMOJI_STEAL_CONTEXT_COMMANDS.has(c.name)))||c.type===1&&(c.name==='chess'||alwaysRegisteredCommand(c)||(enableSocialSmoke&&Boolean(c.name&&SOCIAL_COMMANDS.has(c.name)))||(enableIntroductionsSmoke&&Boolean(c.name&&INTRODUCTION_COMMANDS.has(c.name)))||(enableLearningSmoke&&Boolean(c.name&&['help','tutorial','lore','tldr'].includes(c.name)))||(enableFamilySmoke&&c.name==='family')||(enableCommunitySmoke&&Boolean(c.name&&(COMMUNITY_COMMANDS.has(c.name)||c.name==='steal')))||(enableCrimeSmoke&&c.name==='crime')||(enablePartySmoke&&Boolean(c.name&&PARTY_COMMANDS.has(c.name)))||(enablePvpSmoke&&c.name==='game')||(enableSoloSmoke&&Boolean(c.name&&SOLO_COMMANDS.has(c.name)))||(enableEventsSmoke&&(c.name==='fight'||c.name==='race'))||(enableCasinoSmoke&&Boolean(c.name&&CASINO_COMMANDS.has(c.name)))||(enableCasinoSmoke&&Boolean(c.name&&POKER_COMMANDS.has(c.name)))||(enableProfilesSmoke&&Boolean(c.name&&PROFILE_COMMANDS.has(c.name)))||(enableItemsSmoke&&Boolean(c.name&&ITEM_COMMANDS.has(c.name)))||(enableWyrSmoke&&c.name==='wyr')||(enableOnboardingSmoke&&(c.name==='rules'||c.name==='roles'))||(enableJailSmoke&&c.name==='jail')||(enableModerationSmoke&&c.name==='mod')||(enableSecuritySmoke&&c.name==='panic')||(enableEconomySmoke&&Boolean(c.name&&ECONOMY_COMMANDS.has(c.name)))));
    let commandRegistrationStage='bulk';
    let useIncrementalRegistration=false;
    const registerCommands=async():Promise<'complete'|'partial'>=>{
      commandRegistrationStage='bulk';
      const applicationId=ready.user.id;
      if(!/^\d{17,20}$/.test(applicationId))throw new Error('Discord bot identity is invalid.');
      const rest=new REST({version:'10'}).setToken(token);
      const route=Routes.applicationGuildCommands(applicationId,guildId);
      const request=async<T>(work:(signal:AbortSignal)=>Promise<T>,timeoutMs=30_000)=>{
        const controller=new AbortController();
        const timeout=setTimeout(()=>controller.abort(),timeoutMs);
        timeout.unref();
        try{return await work(controller.signal);}
        finally{clearTimeout(timeout);}
      };
      if(!useIncrementalRegistration){
        try{
          const registered=await request(signal=>rest.put(route,{body:enabled,signal}));
          validateRegisteredCommands(enabled,registered);
          return 'complete';
        }catch(error){
          if(!(error instanceof DOMException&&error.name==='AbortError'))throw error;
          useIncrementalRegistration=true;
        }
        console.warn('Bulk command registration timed out; registering missing commands gradually.',JSON.stringify({commands:enabled.length}));
      }
      // Use a direct request for recovery. discord.js REST keeps route work
      // queued after an aborted bulk PUT, which otherwise prevents progress.
      const endpoint=`https://discord.com/api/v10/applications/${applicationId}/guilds/${guildId}/commands`;
      const discordRequest=async<T>(method:'GET'|'POST',body?:unknown,timeoutMs=30_000)=>request(async signal=>{
        const init:RequestInit={method,headers:{Authorization:`Bot ${token}`,...(body===undefined?{}:{'Content-Type':'application/json'})},signal};
        if(body!==undefined)init.body=JSON.stringify(body);
        const response=await fetch(endpoint,init);
        if(!response.ok){
          const detail=response.status===429?await response.json().catch(()=>null):null;
          const retryAfterSeconds=detail&&typeof detail==='object'&&'retry_after' in detail&&typeof detail.retry_after==='number'?detail.retry_after:null;
          throw Object.assign(new Error('Discord command registration request was rejected.'),{status:response.status,retryAfterSeconds});
        }
        return await response.json() as T;
      },timeoutMs);
      const commandKey=(command:{name?:unknown;type?:unknown})=>typeof command.name==='string'&&Number.isInteger(command.type)?`${command.type}:${command.name}`:null;
      commandRegistrationStage='inventory';
      const current=await discordRequest<unknown>('GET');
      if(!Array.isArray(current))throw new Error('Discord command inventory is invalid.');
      const existing=new Set(current.map(commandKey).filter((key):key is string=>key!==null));
      const missing=enabled.find((command:{name?:unknown;type?:unknown})=>{const key=commandKey(command);return key!==null&&!existing.has(key);});
      if(!missing)return 'complete';
      const key=commandKey(missing);
      if(!key)throw new Error('Command registration payload is invalid.');
      commandRegistrationStage=`create:${key}`;
      await discordRequest('POST',missing);
      return 'partial';
    };
    const retryCommandRegistration=()=>lifecycle.run(async()=>{try{const result=await registerCommands();if(result==='complete'){console.info('Bot command registration completed.',JSON.stringify({commands:enabled.length}));return;}const retrySeconds=5;console.info('Bot command registration made progress; continuing gradually.',JSON.stringify({commands:enabled.length,retrySeconds,stage:commandRegistrationStage}));if(!lifecycle.isStopping){const retry=setTimeout(retryCommandRegistration,retrySeconds*1_000);retry.unref();}}catch(error){const failure=error as {name?:unknown;code?:unknown;status?:unknown;retryAfterSeconds?:unknown;message?:unknown;rawError?:unknown};const retrySeconds=Math.max(60,typeof failure.retryAfterSeconds==='number'&&Number.isFinite(failure.retryAfterSeconds)?Math.ceil(failure.retryAfterSeconds)+10:60);console.warn('Bot command registration is pending; the bot remains available and will retry.',JSON.stringify({commands:enabled.length,retrySeconds,stage:commandRegistrationStage,errorName:typeof failure.name==='string'?failure.name:'unknown',errorCode:typeof failure.code==='number'||typeof failure.code==='string'?failure.code:null,httpStatus:typeof failure.status==='number'?failure.status:null,errorMessage:typeof failure.message==='string'?failure.message.slice(0,500):null,errorDetail:failure.rawError&&typeof failure.rawError==='object'?failure.rawError:null}));if(!lifecycle.isStopping){const retry=setTimeout(retryCommandRegistration,retrySeconds*1_000);retry.unref();}}});
    startup.mark('command-registration');retryCommandRegistration();console.info('Bot startup diagnostic',JSON.stringify({stage:'command-registration',event:'deferred'}));
    startup.mark('family-bootstrap');
    if(await familyEnabled()){
      try{await ensureFamilyMembership();}
      catch(error){familyRecoveryFailure(error);}
    }
    if(enableFamilySmoke&&!lifecycle.isStopping)familySweep=setInterval(()=>lifecycle.run(async()=>{if(await familyEnabled()&&!familyMembership.ready)try{await ensureFamilyMembership();}catch(error){familyRecoveryFailure(error);}}),30_000);
    if(enableProfilesSmoke){await startup.run('profile-voice-reset',()=>profileRepo.resetVoiceAfterRestart(guildId));await startup.run('profiles-bootstrap',()=>profiles.reconcile(guildId));await startup.run('profile-voice-sample',()=>sampleProfileVoice());if(!lifecycle.isStopping)voiceSweep=setInterval(()=>lifecycle.run(()=>sampleProfileVoice(),()=>console.error('Activity voice sampling failed.')),30_000);}
    if(enableCasinoSmoke&&await config.get(guildId,'features.lottery')===true)await startup.run('lottery-schedule',()=>lotteryRepo.schedule(guildId));
    if(enableFullyFurnishedSmoke)await startup.run('fully-furnished-role-recovery',async()=>{for(const pending of await fullyFurnishedRepo.pendingRoleGrants(guildId))await deliverFullyFurnished(guildId,pending.userId,pending.progress);});
    const recovered=await startup.run('wyr-recovery',()=>wyr.recover(ready));await startup.run('poker-recovery',()=>pokerRepo.recover(guildId));if(enableJailSmoke){await startup.run('jail-schedules',()=>jail.reconcileSchedules(guildId));const guild=ready.guilds.cache.get(guildId);if(guild)await startup.run('jail-permissions',()=>jail.reconcileGuild(guild));}if(enableEconomySmoke)await startup.run('economy-schedule',async()=>{await economy.reconcileInterestSchedule(guildId);await economy.reconcileEconomySnapshotSchedule(guildId);await economy.reconcileEconomyPolicySchedule(guildId);});if(lifecycle.isStopping)return;await startup.run('scheduled-job-initialization',()=>worker.runOnce());if(lifecycle.isStopping)return;worker.start();
    await startup.run('events-bootstrap',()=>events.sweep(ready));if(lifecycle.isStopping)return;
    eventSweep=setInterval(()=>lifecycle.run(()=>events.sweep(ready),()=>console.error('Event recovery or rendering failed; durable jobs retained.')),1000);
    wyrSweep=setInterval(()=>lifecycle.run(()=>wyr.closeDue(ready),()=>console.error('WYR close failed; persisted recovery retained.')),5_000);
    await startup.run('special-bootstrap',()=>special.sweep(ready));await startup.run('solo-bootstrap',()=>solo.recover(ready));await startup.run('pvp-bootstrap',()=>pvp.sweep(ready));await startup.run('chairmate-bootstrap',()=>chairmate.sweep(ready));await startup.run('party-bootstrap',()=>party.sweep(ready));await startup.run('crime-bootstrap',()=>crime.sweep(ready));if(enableCommunitySmoke)await startup.run('community-bootstrap',()=>community.sweep(ready));if(lifecycle.isStopping)return;
    specialSweep=setInterval(()=>lifecycle.run(()=>special.sweep(ready),()=>console.error('Line recovery pending.')),1000);
    soloSweep=setInterval(()=>lifecycle.run(()=>solo.recover(ready),()=>console.error('Solo recovery pending.')),10_000);
    pvpSweep=setInterval(()=>lifecycle.run(()=>pvp.sweep(ready),()=>console.error('Skill-game recovery pending.')),10_000);
    chairmateSweep=setInterval(()=>lifecycle.run(()=>chairmate.sweep(ready),()=>console.error('Chairmate Lichess recovery pending.')),15_000);
    partySweep=setInterval(()=>lifecycle.run(()=>party.sweep(ready),()=>console.error('Party recovery pending.')),5000);
    crimeSweep=setInterval(()=>lifecycle.run(()=>crime.sweep(ready),()=>console.error('Crime recovery pending.')),5000);
    if(enableIntroductionsSmoke)introSweep=setInterval(()=>lifecycle.run(()=>introductions.sweep(ready),()=>console.error('Introduction recovery pending.')),10000);
    if(enableCommunitySmoke)communitySweep=setInterval(()=>lifecycle.run(()=>community.sweep(ready),()=>console.error('Community recovery pending.')),5000);
    const snapshot=await startup.run('readiness-health-check',()=>health.check());
    console.log(`Angrier Jordan online as ${ready.user.tag}. WYR recovery active=${recovered.active} closed=${recovered.closed}. Onboarding=${enableOnboardingSmoke?'enabled':'disabled'}. Hotseat=${enableJailSmoke?'enabled':'disabled'}. Moderation=${enableModerationSmoke?'enabled':'disabled'}. Security=${enableSecuritySmoke?'enabled':'disabled'}. ActivityLogging=${enableActivityLoggingSmoke?'enabled':'disabled'}. Economy=${enableEconomySmoke?'enabled':'disabled'}. Health=${snapshot.status}.`);
    initialized=true;
    }catch(error){startup.fail(error);throw error;}
  },()=>{console.error('Bot initialization failed; readiness remains unavailable.');process.exitCode=1;void shutdown();}));

  const settleHandlers=async(tasks:Promise<unknown>[])=>{const results=await Promise.allSettled(tasks);if(results.some(result=>result.status==='rejected'))console.error('A Discord feature handler failed; durable recovery remains available.');};
  const familyDeparture=async(g:string,u:string,reason:'leave'|'ban',departedName?:string)=>{
    if(g!==guildId||!await familyEnabled())return;
    if(!await db.member.findUnique({where:{guildId_userId:{guildId:g,userId:u}}}))return;
    if(await familyHuman(g,u))return; // A queued remove/ban must not act against a returned member.
    const presence=await familyMembershipStore.markAbsent(g,u,new Date());
    const existing=await db.gameSession.findFirst({where:{guildId:g,ownerUserId:u,type:'family_estate',...(presence.joinedAt?{OR:[{state:{in:['OPEN','LOCKED','SETTLING']}},{createdAt:{gte:presence.joinedAt}}]}:{})}});
    if(existing)return;
    const channelId=await config.get(g,'channels.bot_channel');if(typeof channelId!=='string'||!/^\d{17,20}$/.test(channelId))throw new Error('Family bot channel is not configured.');
    await(await familyFor(g)).repository.depart({guildId:g,channelId,userId:u,requestKey:'membership-absence:'+u+':'+presence.leftAt!.toISOString()},reason,departedName);
  };
  client.on(Events.GuildMemberAdd,member=>{
    if(lifecycle.isStopping)return;
    const tracked=member.guild.id===guildId&&!member.user.bot,observation=tracked?familyMembership.observe():undefined;
    const observedJoin=member.joinedAt?new Date(member.joinedAt.getTime()):null;
    // Enqueue synchronously: lifecycle.run tracks this promise without delaying the transition's place in the queue.
    const pending=familyMembership.live(async()=>{
    await serverBootstrap.beforeEvent(Events.GuildMemberAdd,[member]);
    if(member.guild.id===guildId&&!member.user.bot)await memberDirectory.memberObserved(directoryInput(member));
    const familyActive=tracked&&await familyEnabled();
    if(familyActive){
      if(!observedJoin)throw new Error('Family member has no authoritative join timestamp.');
      if(await db.member.findUnique({where:{guildId_userId:{guildId,userId:member.id}}})){
        const prior=await db.memberPresenceState.findUnique({where:{guildId_userId:{guildId,userId:member.id}},select:{userId:true,joinedAt:true,leftAt:true}});
        const estate=await db.gameSession.findFirst({where:{guildId,ownerUserId:member.id,type:'family_estate',state:{in:['OPEN','LOCKED','SETTLING']}}});
        const channelId=estate?.channelId??await config.get(guildId,'channels.bot_channel');
        if(typeof channelId!=='string'||!/^\d{17,20}$/.test(channelId))throw new Error('Family bot channel is not configured.');
        await applyFamilyGatewayReturn({guildId,channelId,userId:member.id,joinedAt:observedJoin,prior,estates:estate?[estate]:[],store:familyMembershipStore,repository:(await familyFor(guildId)).repository});
      }
      const current=await discordFamilyMembershipCensus(member.guild).lookup(member.id);
      if(!current.present||current.bot||current.joinedAt?.getTime()!==observedJoin.getTime())return;
    }
    if(!member.user.bot&&observedJoin)await db.member.upsert({where:{guildId_userId:{guildId,userId:member.id}},create:{guildId,userId:member.id,joinedAt:observedJoin},update:{joinedAt:observedJoin}});
    await settleHandlers([...(enableOnboardingSmoke?[onboarding.handleMemberAdd(member)]:[]),...(enableSecuritySmoke?[security.handleMemberAdd(member)]:[]),...(activityLogger?[activityLogger.memberJoin(member)]:[])]);
    if(familyActive&&observedJoin&&await db.member.findUnique({where:{guildId_userId:{guildId,userId:member.id}}})){
      const prior=await db.memberPresenceState.findUnique({where:{guildId_userId:{guildId,userId:member.id}},select:{userId:true,joinedAt:true,leftAt:true}});
      await familyMembershipStore.markPresent(guildId,member.id,prior,observedJoin);
    }
    if(enableEconomySmoke)await settleHandlers([economy.handleMemberAdd(member)]);
    },observation);
    lifecycle.run(()=>pending,()=>console.error('Member return processing failed; recovery remains pending.'));
  });
  client.on(Events.GuildMemberRemove,member=>{
    if(lifecycle.isStopping)return;
    const observation=member.guild.id===guildId&&!member.user.bot?familyMembership.observe():undefined;
    const pending=familyMembership.live(async()=>{await serverBootstrap.beforeEvent(Events.GuildMemberRemove,[member]);if(member.guild.id===guildId&&!member.user.bot)await memberDirectory.memberLeft(guildId,member.id);if(member.guild.id===guildId&&!member.user.bot&&await familyEnabled()&&await familyHuman(guildId,member.id))return;await settleHandlers([events.memberLeft(client,member.guild.id,member.id),...(enableOnboardingSmoke?[onboarding.handleMemberRemove(member)]:[])]);if(!member.user.bot)await familyDeparture(member.guild.id,member.id,'leave',member.displayName);},observation);
    lifecycle.run(()=>pending,()=>console.error('Member departure processing failed; recovery remains pending.'));
    if(activityLogger)lifecycle.run(()=>activityLogger.memberLeave(member),()=>console.error('Member departure logging failed.'));
  });
  client.on(Events.GuildBanAdd,ban=>{
    if(lifecycle.isStopping)return;
    const observation=ban.guild.id===guildId&&!ban.user.bot?familyMembership.observe():undefined;
    const pending=familyMembership.live(async()=>{await serverBootstrap.beforeEvent(Events.GuildBanAdd,[ban]);if(!ban.user.bot)await familyDeparture(ban.guild.id,ban.user.id,'ban');},observation);
    lifecycle.run(()=>pending,()=>console.error('Member ban processing failed; recovery remains pending.'));
    if(activityLogger)lifecycle.run(()=>activityLogger.banAdded(ban),()=>console.error('Member ban logging failed.'));
  });
  on(Events.ChannelCreate,async channel=>{await settleHandlers([...(enableJailSmoke?[jail.reconcileNewChannel(channel)]:[]),...(activityLogger?[activityLogger.channelCreated(channel)]:[])]);});
  const typeShitReplies=new TypeShitResponder();
  // Legacy !line/!race are prefix commands. Their coordinators perform the
  // feature/channel/role checks themselves, so the message listener must not
  // be disabled by the optional smoke flags used for newer modules.
  on(Events.MessageCreate,async message=>{await settleHandlers([typeShitReplies.message(message),...(activityLogger?[activityLogger.messageCreate(message)]:[]),...(enableSocialSmoke?[social.message(message)]:[]),...(enableChannelGamesSmoke?[channelGames.message(message)]:[]),special.message(message),events.message(message),...(enableProfilesSmoke?[profiles.message(message)]:[]),...(enableEconomyActivityPayouts?[economy.handleActivityMessage(message)]:[]),...(enableSecuritySmoke?[security.handleMessage(message)]:[])]);});
  on(Events.MessageReactionAdd,async(reaction,user)=>{await typeShitReplies.reaction(reaction,user);});
  on(Events.GuildMemberUpdate,async(_before,after)=>{if(after.guild.id===guildId&&!after.user.bot)await memberDirectory.memberObserved(directoryInput(after));});
  on(Events.UserUpdate,async(_before,after)=>{const guild=client.guilds.cache.get(guildId);if(!guild||after.bot)return;const member=await guild.members.fetch({user:after.id,force:true}).catch(()=>null);if(member)await memberDirectory.memberObserved(directoryInput(member));});
  if(activityLogger){
    on(Events.MessageUpdate,(before,after)=>activityLogger.messageUpdate(before,after));
    on(Events.MessageDelete,message=>activityLogger.messageDelete(message));
    on(Events.MessageBulkDelete,messages=>activityLogger.messageDeleteBulk(messages));
    on(Events.GuildMemberUpdate,(before,after)=>activityLogger.memberUpdate(before,after));
    on(Events.GuildBanRemove,ban=>activityLogger.banRemoved(ban));
    on(Events.ChannelDelete,channel=>'guild' in channel?activityLogger.channelDeleted(channel):undefined);
    on(Events.ChannelUpdate,(before,after)=>'guild' in before&&'guild' in after?activityLogger.channelUpdated(before,after):undefined);
    on(Events.GuildRoleCreate,role=>activityLogger.roleCreated(role));
    on(Events.GuildRoleDelete,role=>activityLogger.roleDeleted(role));
    on(Events.GuildRoleUpdate,(before,after)=>activityLogger.roleUpdated(before,after));
  }
  on(Events.GuildAuditLogEntryCreate,async(entry,guild)=>{await settleHandlers([...(enableSecuritySmoke?[security.handleAuditEntry(entry,guild)]:[]),...(activityLogger?[activityLogger.auditEntry(entry,guild)]:[])]);});

  on(Events.VoiceStateUpdate,async(before,after)=>{const sample=async()=>{const observed=await profiles.sampleVoice(client,after.guild.id);if(enableEconomyActivityPayouts&&observed.accruals.length)await economy.handleQualifiedVoiceAccruals(after.guild.id,observed.at,observed.accruals);};await settleHandlers([...(enableProfilesSmoke?[sample()]:[]),...(activityLogger?[activityLogger.voiceUpdate(before,after)]:[])]);});
  on(Events.InteractionCreate,async interaction=>{
    try{
      // Coordinators acknowledge before their own complete eligibility checks. Avoid duplicate slow global reads.
      if(enableEventsSmoke&&interaction.isChatInputCommand()&&interaction.commandName==='race'){if(enableProfilesSmoke)lifecycle.run(()=>profiles.recordCommand(interaction),()=>console.error('Command activity recording failed.'));await events.startRace(interaction);return;}
      if(enableEventsSmoke&&(interaction.isButton()||interaction.isModalSubmit())&&(interaction.customId.startsWith('event:')||interaction.customId.startsWith('fight:'))){await events.handle(interaction);return;}
      if(interaction.isButton()&&interaction.customId.startsWith('line:')){await special.handle(interaction);return;}
      if((interaction.isChatInputCommand()&&interaction.commandName==='chess')||(interaction.isButton()&&interaction.customId.startsWith('chess:'))){await chairmate.handle(interaction);return;}
      if(interaction.isChatInputCommand()&&interaction.commandName==='race'){await interaction.reply({ephemeral:true,content:'Race is not enabled yet.'});return;}
      if(interaction.isAutocomplete()){if(enableSocialSmoke&&interaction.commandName==='social')await social.autocomplete(interaction);else if(enableLearningSmoke&&interaction.commandName==='help')await learning.autocomplete(interaction);else await interaction.respond([]);return;}
      if(interaction.guildId&&interaction.isRepliable()){
        const command=interaction.isChatInputCommand()?interaction.commandName:undefined;
        const subcommand=interaction.isChatInputCommand()?interaction.options.getSubcommand(false)??undefined:undefined;
        const component='customId' in interaction?interaction.customId:undefined;
        const moderationSafe=component==='onboard:ack_rules'||command==='rules'||command==='help'||(command==='jail'&&(subcommand==='status'||subcommand==='reason'));
        if(!moderationSafe&&await jail.isModerationJailed(interaction.guildId,interaction.user.id)){await replyDailyRestriction(interaction,'You are currently in moderation Hotseat. Only jail-safe commands are available until release.');return;}
        if(command!=='rules'&&component!=='onboard:ack_rules'&&!isCrimeBailRequest(command,subcommand,component)&&await crimeRepo.isJailed(interaction.guildId,interaction.user.id)){await replyDailyRestriction(interaction,'You are in crime jail. Use /crime bail, or ask another member to pay your bail.');return;}
      }
      if((interaction.isChatInputCommand()&&SOCIAL_COMMANDS.has(interaction.commandName))||(interaction.isButton()&&interaction.customId.startsWith('social:'))){if(!enableSocialSmoke){await interaction.reply({ephemeral:true,content:'Social features are not enabled yet.'});return;}await social.handle(interaction);if(interaction.isChatInputCommand())await recordSuccessfulCommand(interaction);return;}
      if((interaction.isChatInputCommand()&&INTRODUCTION_COMMANDS.has(interaction.commandName))||((interaction.isButton()||interaction.isModalSubmit())&&interaction.customId.startsWith('intro:'))){if(!enableIntroductionsSmoke){await interaction.reply({ephemeral:true,content:'Introductions are not enabled yet.'});return;}await introductions.handle(interaction);return;}
      if((interaction.isMessageContextMenuCommand()&&EMOJI_STEAL_CONTEXT_COMMANDS.has(interaction.commandName))||((interaction.isStringSelectMenu()||interaction.isModalSubmit())&&interaction.customId.startsWith('emoji-steal:'))){if(!enableCommunitySmoke){await interaction.reply({ephemeral:true,content:'Community tools are not enabled yet.'});return;}await emojiSteal.handle(interaction);return;}
      if((interaction.isChatInputCommand()&&['help','tutorial','lore','tldr'].includes(interaction.commandName))||((interaction.isButton()||interaction.isStringSelectMenu())&&interaction.customId.startsWith('learn:'))){if(!enableLearningSmoke){await interaction.reply({ephemeral:true,content:'Learning features are not enabled yet.'});return;}await learning.handle(interaction);return;}
      if(((interaction.isChatInputCommand()||interaction.isMessageContextMenuCommand())&&CHAIRISM_COMMANDS.has(interaction.commandName))||(interaction.isButton()&&interaction.customId.startsWith('chairism:'))){if(!enableChairismsSmoke){await interaction.reply({ephemeral:true,content:'Chairisms are not enabled yet.'});return;}await chairisms.handle(interaction);return;}
      if((interaction.isChatInputCommand()&&interaction.commandName==='family')||((interaction.isButton()||interaction.isModalSubmit())&&interaction.customId.startsWith('family:'))){if(!enableFamilySmoke){await interaction.reply({ephemeral:true,content:'Family features are not enabled yet.'});return;}if(!interaction.guildId){await interaction.reply({ephemeral:true,content:'Use family features in the server.'});return;}if(await config.get(interaction.guildId,'features.family')===true&&!familyMembership.ready){await interaction.reply({ephemeral:true,content:'Family membership recovery is in progress. Please try again shortly.'});lifecycle.run(async()=>{try{await ensureFamilyMembership();}catch(error){familyRecoveryFailure(error);}});return;}await(await familyFor(interaction.guildId)).coordinator.handle(interaction);if(interaction.isChatInputCommand())await recordSuccessfulCommand(interaction);return;}
      if((interaction.isChatInputCommand()&&COMMUNITY_COMMANDS.has(interaction.commandName))||((interaction.isButton()||interaction.isModalSubmit()||interaction.isStringSelectMenu()||interaction.isUserSelectMenu())&&interaction.customId.startsWith('community:'))){if(!enableCommunitySmoke){await interaction.reply({ephemeral:true,content:'Community tools are not enabled yet.'});return;}await community.handle(interaction);return;}
      if((interaction.isChatInputCommand()&&interaction.commandName==='crime')||((interaction.isButton()||interaction.isStringSelectMenu()||interaction.isUserSelectMenu())&&interaction.customId.startsWith('crime:'))){if(!enableCrimeSmoke){await interaction.reply({ephemeral:true,content:'Crime controls are not enabled yet.'});return;}await crime.handle(interaction);return;}

      if(enableProfilesSmoke&&interaction.isChatInputCommand())lifecycle.run(()=>profiles.recordCommand(interaction),()=>console.error('Command activity recording failed.'));
      if(interaction.isButton()&&interaction.customId.startsWith('channelgame:')){if(!enableChannelGamesSmoke){await interaction.reply({ephemeral:true,content:'Channel games are not enabled yet.'});return;}await channelGames.handle(interaction);return;}
      if((interaction.isChatInputCommand()&&PARTY_COMMANDS.has(interaction.commandName))||((interaction.isButton()||interaction.isModalSubmit()||interaction.isStringSelectMenu())&&interaction.customId.startsWith('party:'))){if(!enablePartySmoke){await interaction.reply({ephemeral:true,content:'Party games are not enabled yet.'});return;}await party.handle(interaction);if(interaction.isChatInputCommand())await recordSuccessfulCommand(interaction);return;}
      if((interaction.isChatInputCommand()&&interaction.commandName==='game')||((interaction.isButton()||interaction.isModalSubmit())&&interaction.customId.startsWith('pvp:'))){if(!enablePvpSmoke){await interaction.reply({ephemeral:true,content:'Skill games are not enabled yet.'});return;}await pvp.handle(interaction);if(interaction.isChatInputCommand())await recordSuccessfulCommand(interaction);return;}
      if(interaction.isButton()&&interaction.customId.startsWith('line:')){await special.handle(interaction);return;}
      if((interaction.isChatInputCommand()&&SOLO_COMMANDS.has(interaction.commandName))||((interaction.isButton()||interaction.isModalSubmit())&&interaction.customId.startsWith('solo:'))){if(!enableSoloSmoke){await interaction.reply({ephemeral:true,content:'Solo games are not enabled yet.'});return;}await solo.handle(interaction);if(interaction.isChatInputCommand())await recordSuccessfulCommand(interaction);return;}

      if((interaction.isButton()||interaction.isModalSubmit())&&(interaction.customId.startsWith('event:')||interaction.customId.startsWith('fight:'))){if(!enableEventsSmoke){await interaction.reply({ephemeral:true,content:'Event controls are not enabled yet.'});return;}await events.handle(interaction);return;}
      if(interaction.isChatInputCommand()&&interaction.commandName==='fight'){if(!enableEventsSmoke){await interaction.reply({ephemeral:true,content:'Fight is not enabled yet.'});return;}await events.startFight(interaction);await recordSuccessfulCommand(interaction);return;}
      if((interaction.isChatInputCommand()&&CASINO_COMMANDS.has(interaction.commandName))||((interaction.isButton()||interaction.isModalSubmit())&&interaction.customId.startsWith('casino:'))){if(!enableCasinoSmoke){await interaction.reply({ephemeral:true,content:'Casino controls are not enabled yet.'});return;}await casino.handle(interaction);if(interaction.isChatInputCommand())await recordSuccessfulCommand(interaction);return;}
      if((interaction.isChatInputCommand()&&POKER_COMMANDS.has(interaction.commandName))||((interaction.isButton()||interaction.isModalSubmit())&&interaction.customId.startsWith('poker:'))){if(!enableCasinoSmoke){await interaction.reply({ephemeral:true,content:'Poker Room is not enabled yet.'});return;}await poker.handle(interaction);if(interaction.isChatInputCommand())await recordSuccessfulCommand(interaction);return;}
      if((interaction.isChatInputCommand()&&PROFILE_COMMANDS.has(interaction.commandName))||((interaction.isButton()||interaction.isStringSelectMenu())&&interaction.customId.startsWith('profile:'))){
        if(!enableProfilesSmoke){await interaction.reply({ephemeral:true,content:'Profile controls are not enabled yet.'});return;}
        await profiles.handle(interaction);return;
      }
      if((interaction.isChatInputCommand()&&ITEM_COMMANDS.has(interaction.commandName)&&(interaction.commandName!=='inventory'||enableItemsSmoke))||((interaction.isButton()||interaction.isStringSelectMenu()||interaction.isModalSubmit())&&interaction.customId.startsWith('items:'))){
        if(!enableItemsSmoke){await interaction.reply({ephemeral:true,content:'Item controls are not enabled yet.'});return;}
        await items.handle(interaction);if(interaction.isChatInputCommand())await recordSuccessfulCommand(interaction);return;
      }
      if(interaction.isChatInputCommand()){
        if(interaction.commandName==='dms'){await dms.handle(interaction);return;}
        if(enableJailSmoke&&interaction.guildId){
          const active=await jail.isModerationJailed(interaction.guildId,interaction.user.id);
          if(active){
            const jailSub=interaction.commandName==='jail'?interaction.options.getSubcommand(false):null;
            const safe=interaction.commandName==='rules'||interaction.commandName==='help'||(interaction.commandName==='jail'&&(jailSub==='status'||jailSub==='reason'));
            if(!safe){const content='You are currently in moderation Hotseat. Only jail-safe commands are available until release.';if(interaction.deferred)await interaction.editReply({content});else await interaction.reply({ephemeral:true,content});return;}
          }
        }
        if(interaction.commandName==='jail'){if(!enableJailSmoke){await interaction.reply({ephemeral:true,content:'Hotseat is not enabled yet.'});return;}await jail.handleCommand(interaction);return;}
        if(interaction.commandName==='mod'){if(!enableModerationSmoke){await interaction.reply({ephemeral:true,content:'Moderation controls are not enabled yet.'});return;}await moderation.handleCommand(interaction);return;}
        if(interaction.commandName==='panic'){if(!enableSecuritySmoke){await interaction.reply({ephemeral:true,content:'Security controls are not enabled yet.'});return;}await security.handlePanicCommand(interaction);return;}
        if(ECONOMY_COMMANDS.has(interaction.commandName)){if(!enableEconomySmoke){await interaction.reply({ephemeral:true,content:'Economy controls are not enabled yet.'});return;}if(enableSecuritySmoke&&interaction.guildId&&await security.isRestricted(interaction.guildId,interaction.user.id)){await interaction.reply({ephemeral:true,content:'Join Gate verification is required before economy controls are available.'});return;}if(enableSecuritySmoke&&interaction.guildId){const state=await securityService.state(interaction.guildId);if(state.panicActive||state.mode==='LOCKDOWN'){await interaction.reply({ephemeral:true,content:'Economy controls are temporarily disabled while the server is in Lockdown.'});return;}}await economy.handleCommand(interaction);await recordSuccessfulCommand(interaction);return;}
        if(enableSecuritySmoke&&interaction.guildId&&interaction.commandName==='wyr'){const s=await securityService.state(interaction.guildId);if(s.panicActive||s.mode==='LOCKDOWN'){await interaction.reply({ephemeral:true,content:'Interactive games are temporarily disabled while the server is in Lockdown.'});return;}}
        if(interaction.commandName==='wyr'){if(!enableWyrSmoke){await interaction.reply({ephemeral:true,content:'Would You Rather is not enabled yet.'});return;}await wyr.handleSlash(interaction);await recordSuccessfulCommand(interaction);return;}
        if(interaction.commandName==='rules'&&enableOnboardingSmoke){await onboarding.handleRulesCommand(interaction);return;}
        if(EMOJI_STEAL_COMMANDS.has(interaction.commandName)){await emojiSteal.handle(interaction);return;}
        if(interaction.commandName==='roles'&&enableOnboardingSmoke){await onboarding.handleRolesCommand(interaction);return;}
        if(interaction.commandName==='announce'){
          if(!interaction.guild){await interaction.reply({ephemeral:true,content:'Use /announce in the server.'});return;}
          const announcer=await interaction.guild.members.fetch(interaction.user.id);
          if(!announcer.permissions.has('Administrator')){await interaction.reply({ephemeral:true,content:'Discord Administrator permission is required to post an announcement.'});return;}
          const message=interaction.options.getString('message',true).trim();
          if(interaction.channelId!==FULLY_FURNISHED_ANNOUNCEMENT_CHANNEL){await interaction.reply({ephemeral:true,content:'Use /announce in the main chat.'});return;}
          if(!message||message.length>2000||!interaction.channel?.isSendable()){await interaction.reply({ephemeral:true,content:'Use a message up to 2,000 characters in the main chat.'});return;}
          const sent=await interaction.channel.send({content:message,allowedMentions:{parse:[]}});
          await audit.record({guildId:interaction.guildId!,actorUserId:interaction.user.id,source:'discord',action:'core.announce',targetType:'channel',targetId:interaction.channelId,after:{messageId:sent.id,length:message.length},requestId:interaction.id,createdAt:new Date()});
          await interaction.reply({ephemeral:true,content:'Announcement posted.'});return;
        }
        if(interaction.commandName==='status'){
          const snapshot=await health.check();
          await interaction.reply({ephemeral:true,content:`Angrier Jordan status: ${snapshot.status.toUpperCase()}\n${snapshot.checks.map(c=>`${c.status==='ok'?'✓':'!'} ${c.name}${c.latencyMs===undefined?'':` ${c.latencyMs}ms`}`).join('\n')}`});return;
        }
      }
      if(enableJailSmoke&&interaction.guildId&&(interaction.isButton()||interaction.isStringSelectMenu())){
        const isRulesAck=interaction.isButton()&&interaction.customId==='onboard:ack_rules';
        const isReview=interaction.isButton()&&(interaction.customId.startsWith('jail:review:')||interaction.customId.startsWith('moderation:review:'));
        if(!isRulesAck&&!isReview&&await jail.isModerationJailed(interaction.guildId,interaction.user.id)){
          await replyDailyRestriction(interaction,'You are currently in moderation Hotseat. Interactive game, role, and community controls are unavailable until release.');return;
        }
      }
      if(enableSecuritySmoke&&interaction.guildId&&(interaction.isButton()||interaction.isStringSelectMenu())){const securitySafe=interaction.isButton()&&(interaction.customId==='security:verify'||interaction.customId==='security:panic_deactivate_confirm'||interaction.customId.startsWith('moderation:review:')||interaction.customId==='onboard:ack_rules');if(!securitySafe&&await security.isRestricted(interaction.guildId,interaction.user.id)){await replyDailyRestriction(interaction,'Join Gate verification is required before interactive controls are available.');return;}}
      if(enableEconomySmoke&&interaction.isButton()&&interaction.customId.startsWith('economy:')){if(enableSecuritySmoke&&interaction.guildId&&await security.isRestricted(interaction.guildId,interaction.user.id)){await replyDailyRestriction(interaction,'Join Gate verification is required before economy controls are available.');return;}await economy.handleButton(interaction);return;}
      if(enableEconomySmoke&&interaction.isModalSubmit()&&interaction.customId.startsWith('economy:')){if(enableJailSmoke&&interaction.guildId&&await jail.isModerationJailed(interaction.guildId,interaction.user.id)){await interaction.reply({ephemeral:true,content:'You are currently in moderation Hotseat. Economy controls are unavailable until release.'});return;}if(enableSecuritySmoke&&interaction.guildId&&await security.isRestricted(interaction.guildId,interaction.user.id)){await interaction.reply({ephemeral:true,content:'Join Gate verification is required before economy controls are available.'});return;}await economy.handleModal(interaction);return;}
            if(interaction.isButton()&&interaction.customId.startsWith('wyr:')){await wyr.handleButton(interaction);return;}
      if(enableSecuritySmoke&&interaction.isButton()&&interaction.customId==='security:verify'){await security.handleVerifyButton(interaction);if(enableOnboardingSmoke&&interaction.guild){const member=await interaction.guild.members.fetch(interaction.user.id);await onboarding.restoreAfterPunishment(member).catch(()=>undefined);}return;}
      if(enableSecuritySmoke&&interaction.isButton()&&interaction.customId==='security:panic_deactivate_confirm'){await security.handlePanicDeactivateConfirm(interaction);return;}
      if(enableJailSmoke&&interaction.isButton()&&interaction.customId.startsWith('jail:review:')){await jail.handleReviewButton(interaction);return;}
      if(enableModerationSmoke&&interaction.isButton()&&interaction.customId.startsWith('moderation:review:')){await moderation.handleReviewButton(interaction);return;}
      if(enableModerationSmoke&&interaction.isButton()&&interaction.customId.startsWith('moderation:appeal:')){await moderation.handleAppealButton(interaction);return;}
      if(enableModerationSmoke&&interaction.isModalSubmit()&&interaction.customId.startsWith('moderation:appeal_submit:')){await moderation.handleAppealModal(interaction);return;}
      if(enableOnboardingSmoke&&interaction.isButton()&&interaction.customId==='onboard:ack_rules'){await onboarding.handleRulesAck(interaction);if(enableJailSmoke&&interaction.guildId)await jail.reconcileMember(interaction.guildId,interaction.user.id);if(enableSecuritySmoke&&interaction.guild){const member=await interaction.guild.members.fetch(interaction.user.id);await security.enforceAfterRulesAck(member,interaction);}return;}
      if(enableOnboardingSmoke&&interaction.isButton()&&interaction.customId==='roles:panel:open'){await onboarding.handleRolePanelOpen(interaction);return;}
      if(enableOnboardingSmoke&&interaction.isButton()&&interaction.customId.startsWith('roles:card:edit:')){await onboarding.handleRoleCardEdit(interaction);return;}
      if(enableOnboardingSmoke&&interaction.isButton()&&interaction.customId==='roles:publish'){await onboarding.handleRolePublish(interaction);return;}
      if(enableOnboardingSmoke&&interaction.isStringSelectMenu()&&interaction.customId.startsWith('roles:select:')){await onboarding.handleRoleSelect(interaction);return;}
    }catch(error){
      console.error('Interaction failed; response withheld or marked unsuccessful.');
      const content='That action could not be completed. Angrier Jordan logged the failure.';
      if(interaction.isRepliable()){
        if(interaction.deferred&&!interaction.replied&&interaction.isChatInputCommand()&&interaction.commandName==='jail'&&interaction.options.getSubcommand(false)==='send')await interaction.editReply({content}).catch(()=>undefined);
        else if(interaction.deferred||interaction.replied)await interaction.followUp({ephemeral:true,content}).catch(()=>undefined);
        else await interaction.reply({ephemeral:true,content}).catch(()=>undefined);
      }
    }
  });

  const server=await startup.run('http-readiness-server-startup',()=>startRuntimeHealth(runtime.port,()=>initialized&&client.isReady()&&!lifecycle.isStopping,()=>db.$queryRaw`SELECT 1`));
  let shutdownPromise:Promise<void>|undefined;
  const shutdown=()=>shutdownPromise??(shutdownPromise=(async()=>{
    lifecycle.stopAdmission();initialized=false;worker.stop();
    if(introSweep)clearInterval(introSweep);if(eventSweep)clearInterval(eventSweep);if(voiceSweep)clearInterval(voiceSweep);if(wyrSweep)clearInterval(wyrSweep);
    if(familySweep)clearInterval(familySweep);if(communitySweep)clearInterval(communitySweep);if(crimeSweep)clearInterval(crimeSweep);if(partySweep)clearInterval(partySweep);if(pvpSweep)clearInterval(pvpSweep);if(chairmateSweep)clearInterval(chairmateSweep);if(specialSweep)clearInterval(specialSweep);if(soloSweep)clearInterval(soloSweep);
    const deadline=setTimeout(()=>{console.error('Shutdown deadline reached; durable work will recover on restart.');process.exit(1);},25_000);deadline.unref();
    try{
      await Promise.allSettled([lifecycle.drain(20_000),worker.stopAndDrain()]);
      client.destroy();await new Promise<void>(resolve=>server.close(()=>resolve()));await disconnectPrisma();
    }finally{clearTimeout(deadline);}
  })());
  process.once('SIGINT',()=>{void shutdown();});process.once('SIGTERM',()=>{void shutdown();});
  try{await startup.run('discord-login',()=>client.login(token));}catch{await shutdown();throw new Error('Discord login failed.');}
}
