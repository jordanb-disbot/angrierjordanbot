import {runWithDailyAcknowledgement,replyDailyRestriction} from './discord/daily-interaction-ack.js';
import {DiscordServerBootstrap} from './discord/server-bootstrap.js';
import {PrismaServerBootstrapRepository} from '../../../packages/database/src/prisma-server-bootstrap.js';
import {MusicApplication} from './music/music-application.js';
import {musicAccess} from './music/music-access.js';
import {MUSIC_COMMANDS} from './discord/music-coordinator.js';
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
import {DiscordEventsCoordinator} from './discord/events-coordinator.js';
import {DiscordSpecialCoordinator} from './discord/special-coordinator.js';
import {PrismaSpecialRepository} from '../../../packages/features-special/src/prisma-repository.js';
import {DiscordSoloCoordinator,SOLO_COMMANDS} from './discord/solo-coordinator.js';
import {PrismaSoloRepository} from '../../../packages/features-solo/src/prisma-repository.js';
import {PermissionEngine} from '../../../packages/core/src/permissions.js';
import {CAPABILITY_MATRIX} from '../../../packages/contracts/src/generated/capabilities.js';
import {PrismaEventsRepository} from '../../../packages/features-events/src/prisma-repository.js';
import {DiscordCasinoCoordinator,CASINO_COMMANDS} from './discord/casino-coordinator.js';
import {DiscordCasinoAnnouncements} from './discord/casino-announcements.js';
import {PrismaCasinoRepository} from '../../../packages/features-casino/src/prisma-repository.js';
import {PrismaLotteryRepository} from '../../../packages/features-casino/src/lottery-repository.js';
import {DiscordRecordAnnouncements} from './discord/record-announcements.js';
import {DiscordProfilesCoordinator,PROFILE_COMMANDS} from './discord/profiles-coordinator.js';
import {PrismaProfilesRepository} from '../../../packages/features-profiles/src/prisma-repository.js';
import {DiscordItemsCoordinator,ITEM_COMMANDS} from './discord/items-coordinator.js';
import {PrismaItemRepository} from '../../../packages/features-economy/src/items-prisma.js';
import fs from 'node:fs';
import { Client, DiscordAPIError, Events, GatewayIntentBits, REST, Routes, type ClientEvents } from 'discord.js';
import {validateRuntimeEnvironment} from '../../../packages/core/src/runtime-environment.js';
import {RuntimeLifecycle} from '../../../packages/core/src/runtime-lifecycle.js';
import {startRuntimeHealth} from './runtime-health.js';
import { AuditService, ConfigService, HealthService, IdempotentScheduler, SchedulerWorker } from '../../../packages/core/src/index.js';
import { SETTINGS } from '../../../packages/contracts/src/generated/settings.js';
import { PrismaAuditSink, PrismaConfigRepository, PrismaJobRepository, createPrismaHealthProbe } from '../../../packages/database/src/prisma-adapters.js';
import { PrismaOnboardingRepository, OnboardingService } from '../../../packages/features-onboarding/src/index.js';
import { PrismaJailRepository, JailService } from '../../../packages/features-jail/src/index.js';
import { PrismaModerationRepository, ModerationService } from '../../../packages/features-moderation/src/index.js';
import { PrismaSecurityRepository, SecurityService } from '../../../packages/features-security/src/index.js';
import { PrismaEconomyRepository, EconomyService, type FortuneEntry } from '../../../packages/features-economy/src/index.js';
import { getPrismaClient, disconnectPrisma } from '../../../packages/database/src/client.js';
import { PrismaWyrPromptRepository, PrismaWyrSessionRepository, PrismaWyrPublicationRepository, WyrService } from '../../../packages/features-wyr/src/index.js';
import { SystemClock } from '../../../packages/core/src/time.js';
import { DiscordWyrCoordinator } from './discord/wyr-coordinator.js';
import { DiscordOnboardingCoordinator } from './discord/onboarding-coordinator.js';
import { DiscordJailCoordinator } from './discord/jail-coordinator.js';
import { DiscordModerationCoordinator } from './discord/moderation-coordinator.js';
import { DiscordSecurityCoordinator } from './discord/security-coordinator.js';
import { DiscordEconomyCoordinator } from './discord/economy-coordinator.js';

class CuidLikeIds {next(prefix:string){return `${prefix}_${crypto.randomUUID()}`;}}
const required=(name:string)=>{const value=process.env[name];if(!value)throw new Error(`Missing required environment variable ${name}`);return value;};
const ECONOMY_COMMANDS=new Set(['daily','weekly','work','fish','dig','scavenge','statement','inventory','bank','transfer']);

export async function startProductionBot():Promise<void>{
  const runtime=validateRuntimeEnvironment(process.env,'worker');
  const lifecycle=new RuntimeLifecycle();
  let initialized=false;
  const token=required('DISCORD_TOKEN');const applicationId=required('DISCORD_APPLICATION_ID');const guildId=required('DISCORD_GUILD_ID');
  const enableMusicSmoke=process.env.ENABLE_MUSIC_SMOKE==='true';
  const enableLearningSmoke=process.env.ENABLE_LEARNING_SMOKE==='true';
  const enableSocialSmoke=process.env.ENABLE_SOCIAL_SMOKE==='true';
  const enableIntroductionsSmoke=process.env.ENABLE_INTRODUCTIONS_SMOKE==='true';
  const enableWyrSmoke=process.env.ENABLE_WYR_SMOKE==='true';
  const enableOnboardingSmoke=process.env.ENABLE_ONBOARDING_SMOKE==='true';
  const enableJailSmoke=process.env.ENABLE_JAIL_SMOKE==='true';
  const enableModerationSmoke=process.env.ENABLE_MODERATION_SMOKE==='true';
  const enableSecuritySmoke=process.env.ENABLE_SECURITY_SMOKE==='true';
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
  const db=getPrismaClient();
  const serverBootstrap=new DiscordServerBootstrap(new PrismaServerBootstrapRepository(db));
  const audit=new AuditService(new PrismaAuditSink(db));
  const config=new ConfigService(SETTINGS,new PrismaConfigRepository(db),audit);
  const jobRepo=new PrismaJobRepository(db,{notIn:['music.reconcile']});
  const client=new Client({intents:[GatewayIntentBits.Guilds,GatewayIntentBits.GuildMembers,GatewayIntentBits.GuildMessages,GatewayIntentBits.MessageContent,GatewayIntentBits.GuildVoiceStates,GatewayIntentBits.GuildModeration]});
  const health=new HealthService([createPrismaHealthProbe(db),async()=>({name:'discord',status:client.isReady()&&!lifecycle.isStopping?'ok' as const:'down' as const}),async()=>{try{return{name:'music',status:!music||await config.get(guildId,'music.enabled')!==true||music.ready?'ok' as const:'degraded' as const};}catch{return{name:'music',status:'degraded' as const};}}]);
  const on=<E extends keyof ClientEvents>(event:E,listener:(...args:ClientEvents[E])=>unknown|Promise<unknown>)=>{
    client.on(event,(...args)=>lifecycle.run(()=>runWithDailyAcknowledgement(event,args,enableEconomySmoke,()=>serverBootstrap.run(event,args,()=>listener(...args))),()=>console.error('Discord event processing failed; persisted recovery remains available.')));
  };
  const promptRepo=new PrismaWyrPromptRepository(db);
  const sessionRepo=new PrismaWyrSessionRepository(db);
  const wyrService=new WyrService(promptRepo,sessionRepo,new SystemClock(),new CuidLikeIds());
  const wyr=new DiscordWyrCoordinator(wyrService,config,(g,u)=>eligibleGame(g,u,'events.use'),new PrismaWyrPublicationRepository(db));
  const onboardingService=new OnboardingService(new PrismaOnboardingRepository(db),audit,new SystemClock());
  const learningRepo=new PrismaLearningRepository(db);
  const onboarding=new DiscordOnboardingCoordinator(onboardingService,config,{eligible:(g,u)=>enableLearningSmoke?eligibleGame(g,u,'learning.use'):Promise.resolve(false),loreAvailable:async()=> (await learningRepo.chapters()).length===3});
  const jailService=new JailService(new PrismaJailRepository(db),audit,new SystemClock());
  const jail=new DiscordJailCoordinator(jailService,config,onboarding);
  const moderationService=new ModerationService(new PrismaModerationRepository(db),audit,new SystemClock());
  const moderation=new DiscordModerationCoordinator(moderationService,config);
  const securityService=new SecurityService(new PrismaSecurityRepository(db),audit,new SystemClock());
  const security=new DiscordSecurityCoordinator(securityService,moderationService,config);
  const fortunes=JSON.parse(fs.readFileSync(new URL('../../../packages/content/economy/fortune_300.json',import.meta.url),'utf8')) as FortuneEntry[];
  const economyService=new EconomyService(new PrismaEconomyRepository(db),audit,new SystemClock(),undefined,fortunes);
  const economy=new DiscordEconomyCoordinator(economyService,config);
  const crimeRepo=new PrismaCrimeRepository(db);
  const items=new DiscordItemsCoordinator(new PrismaItemRepository(db),config,async(g,u)=>{
    if(await jail.isModerationJailed(g,u)||await security.isRestricted(g,u)||await crimeRepo.isJailed(g,u))return false;
    const state=await securityService.state(g);return !state.panicActive&&state.mode!=='LOCKDOWN';
  });
  const profileRepo=new PrismaProfilesRepository(db);
  const profiles=new DiscordProfilesCoordinator(profileRepo,config,async(g,u)=>!await jail.isModerationJailed(g,u)&&!await security.isRestricted(g,u)&&!await crimeRepo.isJailed(g,u));
  const recordAnnouncements=new DiscordRecordAnnouncements(db,config);
  const casinoRepo=new PrismaCasinoRepository(db),lotteryRepo=new PrismaLotteryRepository(db);
  const casino=new DiscordCasinoCoordinator(casinoRepo,lotteryRepo,config,async(g,u)=>{if(await jail.isModerationJailed(g,u)||await security.isRestricted(g,u)||await crimeRepo.isJailed(g,u))return false;const state=await securityService.state(g);return !state.panicActive&&state.mode!=='LOCKDOWN';});
  const casinoAnnouncements=new DiscordCasinoAnnouncements(db,config);
  const eventsRepo=new PrismaEventsRepository(db);
  const events=new DiscordEventsCoordinator(eventsRepo,config,async(g,u)=>{if(await jail.isModerationJailed(g,u)||await security.isRestricted(g,u)||await crimeRepo.isJailed(g,u))return false;const state=await securityService.state(g);return !state.panicActive&&state.mode!=='LOCKDOWN';});
  const eligibleGame=async(g:string,u:string,capability?:string)=>{if((capability!==undefined&&!new PermissionEngine(CAPABILITY_MATRIX.capabilities).can('member',capability))||await jail.isModerationJailed(g,u)||await security.isRestricted(g,u)||await crimeRepo.isJailed(g,u))return false;const state=await securityService.state(g);return !state.panicActive&&state.mode!=='LOCKDOWN';};
  const music=enableMusicSmoke?new MusicApplication({client,db,config,guildId,wakeMusic:()=>musicWorker.wake(),endpoint:required('LAVALINK_URL'),password:required('LAVALINK_PASSWORD'),allowInsecureHttp:process.env.LAVALINK_ALLOW_INSECURE_HTTP==='true',metadataSources:[...(process.env.MUSIC_SPOTIFY_METADATA==='true'?['spotify' as const]:[]),...(process.env.MUSIC_APPLE_METADATA==='true'?['applemusic' as const]:[])],directAudio:process.env.MUSIC_DIRECT_AUDIO==='true',access:(g,m)=>musicAccess(g,m,config,(id,member)=>eligibleGame(id,member))}):null;
  const social=new DiscordSocialCoordinator(new PrismaSocialRepository(db),config,(g,u)=>eligibleGame(g,u,'social.use'));
  const learning=new DiscordLearningCoordinator(learningRepo,config,(g,u)=>eligibleGame(g,u,'learning.use'),flag=>({economy:enableEconomySmoke,roles:enableOnboardingSmoke,jail:enableJailSmoke,moderation:enableModerationSmoke,security:enableSecuritySmoke,profile:enableProfilesSmoke,casino:enableCasinoSmoke,race:enableEventsSmoke,fight:enableEventsSmoke,line:enableSpecialSmoke,social:enableSocialSmoke,introductions:enableIntroductionsSmoke,core:enableLearningSmoke,tutorial:enableLearningSmoke,lore:enableLearningSmoke,special_commands:enableSpecialSmoke,items:enableItemsSmoke,tools:enableItemsSmoke,collections:enableItemsSmoke,solo_games:enableSoloSmoke,pvp:enablePvpSmoke,party_games:enablePartySmoke,channel_games:enableChannelGamesSmoke,family:enableFamilySmoke,crime:enableCrimeSmoke,community:enableCommunitySmoke,chairisms:enableChairismsSmoke,music:enableMusicSmoke}[flag]??false),(g,u,roles)=>enableSpecialSmoke?eligibleGame(g,u,'special.use').then(allowed=>allowed?special.visibleCommands(g,roles):[]):Promise.resolve([]));
  const introductions=new DiscordIntroductionsCoordinator(new PrismaIntroductionsRepository(db),config,(g,u)=>eligibleGame(g,u,'introductions.use'),async(g,u)=>{const server=await client.guilds.fetch(g),member=await server.members.fetch({user:u,force:true});return server.ownerId===u||member.permissions.has('Administrator');});
  const special=new DiscordSpecialCoordinator(new PrismaSpecialRepository(db),config,(g,u)=>eligibleGame(g,u,'special.use'));
  const soloRepo=new PrismaSoloRepository(db),solo=new DiscordSoloCoordinator(soloRepo,config,(g,u)=>eligibleGame(g,u,'solo.use'));
  const pvp=new DiscordPvpCoordinator(new PrismaPvpRepository(db),config,(g,u)=>eligibleGame(g,u,'pvp.play'));
  const party=new DiscordPartyCoordinator(new PrismaPartyRepository(db),config,(g,u)=>eligibleGame(g,u,'events.use'));
  const channelGames=new DiscordChannelGamesCoordinator(new PrismaChannelGamesRepository(db),config,(g,u)=>eligibleGame(g,u,'channel_games.play'));
  const crime=new DiscordCrimeCoordinator(crimeRepo,config,async(g,u)=>{if(await jail.isModerationJailed(g,u)||await security.isRestricted(g,u))return false;const state=await securityService.state(g);return !state.panicActive&&state.mode!=='LOCKDOWN';});
  const community=new DiscordCommunityCoordinator(new PrismaCommunityRepository(db),config,(g,u)=>eligibleGame(g,u,'community.use'));
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
    const repository=new PrismaFamilyRepository(db,process.env.FAMILY_COMPATIBILITY_SECRET??'',familyHuman,policy,undefined,undefined,familyCanAct,()=>familyMembership.transactionGeneration()),entry={fingerprint,repository,coordinator:new DiscordFamilyCoordinator(repository,config,familyCanAct)};
    familyCache.set(g,entry);return entry;
  };
  let familyRecovery:Promise<void>|undefined;
  const ensureFamilyMembership=async()=>{
    if(familyMembership.ready)return;
    if(!familyRecovery)familyRecovery=(async()=>{
      const channelId=await config.get(guildId,'channels.bot_channel');
      if(typeof channelId!=='string'||!/^\d{17,20}$/.test(channelId))throw new Error('Family bot channel is not configured.');
      const guild=await client.guilds.fetch(guildId),family=await familyFor(guildId);
      await familyMembership.initialize(assertCurrent=>reconcileFamilyMembership({guildId,channelId,store:familyMembershipStore,census:discordFamilyMembershipCensus(guild),repository:family.repository,assertCurrent}));
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
  const scheduler=new IdempotentScheduler(jobRepo,{
    'music.reconcile':async job=>{if(!music)throw new Error('Music runtime disabled.');await music.reconcile(job);},
    'music.controller.publish':async job=>{if(!music)throw new Error('Music runtime disabled.');await music.publish(job);},
    'music.controller.cleanup':async job=>{if(!music)throw new Error('Music runtime disabled.');await music.cleanup(job);},
    'music.controller.refresh':async job=>{if(!music)throw new Error('Music runtime disabled.');await music.refresh(job);},
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
  });
  const worker=new SchedulerWorker(scheduler,5_000);
  const musicWorker=new SchedulerWorker(new IdempotentScheduler(new PrismaJobRepository(db,{in:['music.reconcile']}),{'music.reconcile':async job=>{if(!music)throw new Error('Music runtime disabled.');await music.reconcile(job);}}),5_000);
  let introSweep:ReturnType<typeof setInterval>|undefined;
  let eventSweep:ReturnType<typeof setInterval>|undefined;
  let voiceSweep:ReturnType<typeof setInterval>|undefined;
  let wyrSweep:ReturnType<typeof setInterval>|undefined;
  let specialSweep:ReturnType<typeof setInterval>|undefined;
  let communitySweep:ReturnType<typeof setInterval>|undefined;
  let crimeSweep:ReturnType<typeof setInterval>|undefined;
  let partySweep:ReturnType<typeof setInterval>|undefined;
  let pvpSweep:ReturnType<typeof setInterval>|undefined;
  let soloSweep:ReturnType<typeof setInterval>|undefined;
  let familySweep:ReturnType<typeof setInterval>|undefined;

  on(Events.GuildCreate,async()=>{}); // The shared event boundary commits the observed server first.
  client.once(Events.ClientReady,ready=>lifecycle.run(async()=>{
    const configuredServer=ready.guilds.cache.get(guildId)??await ready.guilds.fetch({guild:guildId,force:true});
    await serverBootstrap.census([...ready.guilds.cache.values(),configuredServer]);
    if(lifecycle.isStopping)return;
    if(music&&await config.get(guildId,'music.enabled')===true){try{await music.start();}catch{console.error('Music node unavailable; durable recovery remains pending.');}}
    if(enablePartySmoke||enableWyrSmoke)await seedPartyContent(db);
    if(enableSocialSmoke)await seedSocialContent(db);
    if(enableIntroductionsSmoke)await introductions.sweep(ready);
    const registration=JSON.parse(fs.readFileSync(new URL('../../../generated/discord/application_commands.json',import.meta.url),'utf8'));
    const enabled=registration.filter((c:{name?:string;type?:number})=>(enableChairismsSmoke&&((c.type===3&&c.name==="Create Chairism")||(c.type===1&&(c.name==="quote"||c.name==="chairisms"))))||c.type===1&&(c.name==='status'||(enableMusicSmoke&&Boolean(c.name&&MUSIC_COMMANDS.has(c.name)))||(enableSocialSmoke&&Boolean(c.name&&SOCIAL_COMMANDS.has(c.name)))||(enableIntroductionsSmoke&&Boolean(c.name&&INTRODUCTION_COMMANDS.has(c.name)))||(enableLearningSmoke&&Boolean(c.name&&['help','tutorial','lore','tldr'].includes(c.name)))||(enableFamilySmoke&&c.name==='family')||(enableCommunitySmoke&&Boolean(c.name&&COMMUNITY_COMMANDS.has(c.name)))||(enableCrimeSmoke&&c.name==='crime')||(enablePartySmoke&&Boolean(c.name&&PARTY_COMMANDS.has(c.name)))||(enablePvpSmoke&&c.name==='game')||(enableSoloSmoke&&Boolean(c.name&&SOLO_COMMANDS.has(c.name)))||(enableEventsSmoke&&c.name==='fight')||(enableCasinoSmoke&&Boolean(c.name&&CASINO_COMMANDS.has(c.name)))||(enableProfilesSmoke&&Boolean(c.name&&PROFILE_COMMANDS.has(c.name)))||(enableItemsSmoke&&Boolean(c.name&&ITEM_COMMANDS.has(c.name)))||(enableWyrSmoke&&c.name==='wyr')||(enableOnboardingSmoke&&(c.name==='rules'||c.name==='roles'))||(enableJailSmoke&&c.name==='jail')||(enableModerationSmoke&&c.name==='mod')||(enableSecuritySmoke&&c.name==='panic')||(enableEconomySmoke&&Boolean(c.name&&ECONOMY_COMMANDS.has(c.name)))));
    await new REST({version:'10'}).setToken(token).put(Routes.applicationGuildCommands(applicationId,guildId),{body:enabled});
    if(await familyEnabled()){
      try{await ensureFamilyMembership();}
      catch{console.error('Family membership census is unavailable; Family actions remain paused for recovery.');}
    }
    if(enableFamilySmoke&&!lifecycle.isStopping)familySweep=setInterval(()=>lifecycle.run(async()=>{if(await familyEnabled()&&!familyMembership.ready)await ensureFamilyMembership();},()=>console.error('Family membership recovery remains pending.')),30_000);
    if(enableProfilesSmoke){await profileRepo.resetVoiceAfterRestart(guildId);await profiles.reconcile(guildId);await profiles.sampleVoice(ready,guildId);if(!lifecycle.isStopping)voiceSweep=setInterval(()=>lifecycle.run(()=>profiles.sampleVoice(ready,guildId),()=>console.error('Activity voice sampling failed.')),30_000);}
    if(enableCasinoSmoke&&await config.get(guildId,'features.lottery')===true)await lotteryRepo.schedule(guildId);
    const recovered=await wyr.recover(ready);if(enableJailSmoke){await jail.reconcileSchedules(guildId);const guild=ready.guilds.cache.get(guildId);if(guild)await jail.reconcileGuild(guild);}if(enableEconomySmoke)await economy.reconcileInterestSchedule(guildId);if(lifecycle.isStopping)return;await Promise.all([worker.runOnce(),musicWorker.runOnce()]);if(lifecycle.isStopping)return;worker.start();musicWorker.start();
    await events.sweep(ready);if(lifecycle.isStopping)return;
    eventSweep=setInterval(()=>lifecycle.run(()=>events.sweep(ready),()=>console.error('Event recovery or rendering failed; durable jobs retained.')),1500);
    wyrSweep=setInterval(()=>lifecycle.run(()=>wyr.closeDue(ready),()=>console.error('WYR close failed; persisted recovery retained.')),5_000);
    await special.sweep(ready);await solo.recover(ready);await pvp.sweep(ready);await party.sweep(ready);await crime.sweep(ready);if(enableCommunitySmoke)await community.sweep(ready);if(lifecycle.isStopping)return;
    specialSweep=setInterval(()=>lifecycle.run(()=>special.sweep(ready),()=>console.error('Line recovery pending.')),1000);
    soloSweep=setInterval(()=>lifecycle.run(()=>solo.recover(ready),()=>console.error('Solo recovery pending.')),10_000);
    pvpSweep=setInterval(()=>lifecycle.run(()=>pvp.sweep(ready),()=>console.error('Skill-game recovery pending.')),10_000);
    partySweep=setInterval(()=>lifecycle.run(()=>party.sweep(ready),()=>console.error('Party recovery pending.')),5000);
    crimeSweep=setInterval(()=>lifecycle.run(()=>crime.sweep(ready),()=>console.error('Crime recovery pending.')),5000);
    if(enableIntroductionsSmoke)introSweep=setInterval(()=>lifecycle.run(()=>introductions.sweep(ready),()=>console.error('Introduction recovery pending.')),10000);
    if(enableCommunitySmoke)communitySweep=setInterval(()=>lifecycle.run(()=>community.sweep(ready),()=>console.error('Community recovery pending.')),5000);
    const snapshot=await health.check();
    console.log(`Angrier Jordan online as ${ready.user.tag}. WYR recovery active=${recovered.active} closed=${recovered.closed}. Onboarding=${enableOnboardingSmoke?'enabled':'disabled'}. Hotseat=${enableJailSmoke?'enabled':'disabled'}. Moderation=${enableModerationSmoke?'enabled':'disabled'}. Security=${enableSecuritySmoke?'enabled':'disabled'}. Economy=${enableEconomySmoke?'enabled':'disabled'}. Health=${snapshot.status}.`);
    initialized=true;
  },()=>{console.error('Bot initialization failed; readiness remains unavailable.');process.exitCode=1;void shutdown();}));

  const settleHandlers=async(tasks:Promise<unknown>[])=>{const results=await Promise.allSettled(tasks);if(results.some(result=>result.status==='rejected'))console.error('A Discord feature handler failed; durable recovery remains available.');};
  const familyDeparture=async(g:string,u:string,reason:'leave'|'ban')=>{
    if(g!==guildId||!await familyEnabled())return;
    if(!await db.member.findUnique({where:{guildId_userId:{guildId:g,userId:u}}}))return;
    if(await familyHuman(g,u))return; // A queued remove/ban must not act against a returned member.
    const presence=await familyMembershipStore.markAbsent(g,u,new Date());
    const existing=await db.gameSession.findFirst({where:{guildId:g,ownerUserId:u,type:'family_estate',...(presence.joinedAt?{OR:[{state:{in:['OPEN','LOCKED','SETTLING']}},{createdAt:{gte:presence.joinedAt}}]}:{})}});
    if(existing)return;
    const channelId=await config.get(g,'channels.bot_channel');if(typeof channelId!=='string'||!/^\d{17,20}$/.test(channelId))throw new Error('Family bot channel is not configured.');
    await(await familyFor(g)).repository.depart({guildId:g,channelId,userId:u,requestKey:'membership-absence:'+u+':'+presence.leftAt!.toISOString()},reason);
  };
  client.on(Events.GuildMemberAdd,member=>{
    if(lifecycle.isStopping)return;
    const tracked=member.guild.id===guildId&&!member.user.bot,observation=tracked?familyMembership.observe():undefined;
    const observedJoin=member.joinedAt?new Date(member.joinedAt.getTime()):null;
    // Enqueue synchronously: lifecycle.run tracks this promise without delaying the transition's place in the queue.
    const pending=familyMembership.live(async()=>{
    await serverBootstrap.beforeEvent(Events.GuildMemberAdd,[member]);
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
    await settleHandlers([...(enableOnboardingSmoke?[onboarding.handleMemberAdd(member)]:[]),...(enableSecuritySmoke?[security.handleMemberAdd(member)]:[])]);
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
    const pending=familyMembership.live(async()=>{await serverBootstrap.beforeEvent(Events.GuildMemberRemove,[member]);if(member.guild.id===guildId&&!member.user.bot&&await familyEnabled()&&await familyHuman(guildId,member.id))return;await settleHandlers([events.memberLeft(client,member.guild.id,member.id),...(enableOnboardingSmoke?[onboarding.handleMemberRemove(member)]:[])]);if(!member.user.bot)await familyDeparture(member.guild.id,member.id,'leave');},observation);
    lifecycle.run(()=>pending,()=>console.error('Member departure processing failed; recovery remains pending.'));
  });
  client.on(Events.GuildBanAdd,ban=>{
    if(lifecycle.isStopping)return;
    const observation=ban.guild.id===guildId&&!ban.user.bot?familyMembership.observe():undefined;
    const pending=familyMembership.live(async()=>{await serverBootstrap.beforeEvent(Events.GuildBanAdd,[ban]);if(!ban.user.bot)await familyDeparture(ban.guild.id,ban.user.id,'ban');},observation);
    lifecycle.run(()=>pending,()=>console.error('Member ban processing failed; recovery remains pending.'));
  });
  on(Events.ChannelCreate,async channel=>{if(enableJailSmoke)await jail.reconcileNewChannel(channel);});
  on(Events.MessageCreate,async message=>{await settleHandlers([...(enableSocialSmoke?[social.message(message)]:[]),...(enableChannelGamesSmoke?[channelGames.message(message)]:[]),...(enableSpecialSmoke?[special.message(message)]:[]),...(enableEventsSmoke?[events.message(message)]:[]),...(enableProfilesSmoke?[profiles.message(message)]:[]),...(enableSecuritySmoke?[security.handleMessage(message)]:[])]);});
  on(Events.GuildAuditLogEntryCreate,async(entry,guild)=>{if(enableSecuritySmoke)await security.handleAuditEntry(entry,guild);});

  on(Events.VoiceStateUpdate,async(_before,after)=>{await settleHandlers([...(music&&after.guild.id===guildId?[music.voiceChanged(after.guild.id,after.id)]:[]),...(enableProfilesSmoke?[profiles.sampleVoice(client,after.guild.id)]:[])]);});
  on(Events.InteractionCreate,async interaction=>{
    try{
      if(interaction.isAutocomplete()){if(music&&interaction.commandName==='play')await music.coordinator.autocomplete(interaction);else if(enableSocialSmoke&&interaction.commandName==='social')await social.autocomplete(interaction);else if(enableLearningSmoke&&interaction.commandName==='help')await learning.autocomplete(interaction);else await interaction.respond([]);return;}
      if(interaction.guildId&&interaction.isRepliable()){
        const command=interaction.isChatInputCommand()?interaction.commandName:undefined;
        const subcommand=interaction.isChatInputCommand()?interaction.options.getSubcommand(false)??undefined:undefined;
        const component='customId' in interaction?interaction.customId:undefined;
        const moderationSafe=component==='onboard:ack_rules'||command==='rules'||command==='help'||(command==='jail'&&(subcommand==='status'||subcommand==='reason'));
        if(!moderationSafe&&await jail.isModerationJailed(interaction.guildId,interaction.user.id)){await replyDailyRestriction(interaction,'You are currently in moderation Hotseat. Only jail-safe commands are available until release.');return;}
        if(command!=='rules'&&component!=='onboard:ack_rules'&&!isCrimeBailRequest(command,subcommand,component)&&await crimeRepo.isJailed(interaction.guildId,interaction.user.id)){await replyDailyRestriction(interaction,'You are in crime jail. Use /crime bail, or ask another member to pay your bail.');return;}
      }
      if((interaction.isChatInputCommand()&&MUSIC_COMMANDS.has(interaction.commandName))||((interaction.isButton()||interaction.isStringSelectMenu())&&interaction.customId.startsWith('music:'))){if(!music){await interaction.reply({ephemeral:true,content:'Music is not enabled yet.'});return;}await music.coordinator.handle(interaction);return;}
      if((interaction.isChatInputCommand()&&SOCIAL_COMMANDS.has(interaction.commandName))||(interaction.isButton()&&interaction.customId.startsWith('social:'))){if(!enableSocialSmoke){await interaction.reply({ephemeral:true,content:'Social features are not enabled yet.'});return;}await social.handle(interaction);return;}
      if((interaction.isChatInputCommand()&&INTRODUCTION_COMMANDS.has(interaction.commandName))||((interaction.isButton()||interaction.isModalSubmit())&&interaction.customId.startsWith('intro:'))){if(!enableIntroductionsSmoke){await interaction.reply({ephemeral:true,content:'Introductions are not enabled yet.'});return;}await introductions.handle(interaction);return;}
      if((interaction.isChatInputCommand()&&['help','tutorial','lore','tldr'].includes(interaction.commandName))||((interaction.isButton()||interaction.isStringSelectMenu())&&interaction.customId.startsWith('learn:'))){if(!enableLearningSmoke){await interaction.reply({ephemeral:true,content:'Learning features are not enabled yet.'});return;}await learning.handle(interaction);return;}
      if(((interaction.isChatInputCommand()||interaction.isMessageContextMenuCommand())&&CHAIRISM_COMMANDS.has(interaction.commandName))||(interaction.isButton()&&interaction.customId.startsWith('chairism:'))){if(!enableChairismsSmoke){await interaction.reply({ephemeral:true,content:'Chairisms are not enabled yet.'});return;}await chairisms.handle(interaction);return;}
      if((interaction.isChatInputCommand()&&interaction.commandName==='family')||((interaction.isButton()||interaction.isModalSubmit())&&interaction.customId.startsWith('family:'))){if(!enableFamilySmoke){await interaction.reply({ephemeral:true,content:'Family features are not enabled yet.'});return;}if(!interaction.guildId){await interaction.reply({ephemeral:true,content:'Use family features in the server.'});return;}if(await config.get(interaction.guildId,'features.family')===true&&!familyMembership.ready){await interaction.reply({ephemeral:true,content:'Family membership recovery is in progress. Please try again shortly.'});lifecycle.run(ensureFamilyMembership,()=>console.error('Family membership recovery remains pending.'));return;}await(await familyFor(interaction.guildId)).coordinator.handle(interaction);return;}
      if((interaction.isChatInputCommand()&&COMMUNITY_COMMANDS.has(interaction.commandName))||((interaction.isButton()||interaction.isModalSubmit()||interaction.isStringSelectMenu()||interaction.isUserSelectMenu())&&interaction.customId.startsWith('community:'))){if(!enableCommunitySmoke){await interaction.reply({ephemeral:true,content:'Community tools are not enabled yet.'});return;}await community.handle(interaction);return;}
      if((interaction.isChatInputCommand()&&interaction.commandName==='crime')||((interaction.isButton()||interaction.isStringSelectMenu()||interaction.isUserSelectMenu())&&interaction.customId.startsWith('crime:'))){if(!enableCrimeSmoke){await interaction.reply({ephemeral:true,content:'Crime controls are not enabled yet.'});return;}await crime.handle(interaction);return;}

      if(enableProfilesSmoke&&interaction.isChatInputCommand())lifecycle.run(()=>profiles.recordCommand(interaction),()=>console.error('Command activity recording failed.'));
      if(interaction.isButton()&&interaction.customId.startsWith('channelgame:')){if(!enableChannelGamesSmoke){await interaction.reply({ephemeral:true,content:'Channel games are not enabled yet.'});return;}await channelGames.handle(interaction);return;}
      if((interaction.isChatInputCommand()&&PARTY_COMMANDS.has(interaction.commandName))||((interaction.isButton()||interaction.isModalSubmit()||interaction.isStringSelectMenu())&&interaction.customId.startsWith('party:'))){if(!enablePartySmoke){await interaction.reply({ephemeral:true,content:'Party games are not enabled yet.'});return;}await party.handle(interaction);return;}
      if((interaction.isChatInputCommand()&&interaction.commandName==='game')||((interaction.isButton()||interaction.isModalSubmit())&&interaction.customId.startsWith('pvp:'))){if(!enablePvpSmoke){await interaction.reply({ephemeral:true,content:'Skill games are not enabled yet.'});return;}await pvp.handle(interaction);return;}
      if(interaction.isButton()&&interaction.customId.startsWith('line:')){if(!enableSpecialSmoke){await interaction.reply({ephemeral:true,content:'Line controls are not enabled yet.'});return;}await special.handle(interaction);return;}
      if((interaction.isChatInputCommand()&&SOLO_COMMANDS.has(interaction.commandName))||((interaction.isButton()||interaction.isModalSubmit())&&interaction.customId.startsWith('solo:'))){if(!enableSoloSmoke){await interaction.reply({ephemeral:true,content:'Solo games are not enabled yet.'});return;}await solo.handle(interaction);return;}

      if((interaction.isButton()||interaction.isModalSubmit())&&(interaction.customId.startsWith('event:')||interaction.customId.startsWith('fight:'))){if(!enableEventsSmoke){await interaction.reply({ephemeral:true,content:'Event controls are not enabled yet.'});return;}await events.handle(interaction);return;}
      if(interaction.isChatInputCommand()&&interaction.commandName==='fight'){if(!enableEventsSmoke){await interaction.reply({ephemeral:true,content:'Fight is not enabled yet.'});return;}await events.startFight(interaction);return;}
      if((interaction.isChatInputCommand()&&CASINO_COMMANDS.has(interaction.commandName))||((interaction.isButton()||interaction.isModalSubmit())&&interaction.customId.startsWith('casino:'))){if(!enableCasinoSmoke){await interaction.reply({ephemeral:true,content:'Casino controls are not enabled yet.'});return;}await casino.handle(interaction);return;}
      if((interaction.isChatInputCommand()&&PROFILE_COMMANDS.has(interaction.commandName))||((interaction.isButton()||interaction.isStringSelectMenu())&&interaction.customId.startsWith('profile:'))){
        if(!enableProfilesSmoke){await interaction.reply({ephemeral:true,content:'Profile controls are not enabled yet.'});return;}
        await profiles.handle(interaction);return;
      }
      if((interaction.isChatInputCommand()&&ITEM_COMMANDS.has(interaction.commandName)&&(interaction.commandName!=='inventory'||enableItemsSmoke))||((interaction.isButton()||interaction.isStringSelectMenu()||interaction.isModalSubmit())&&interaction.customId.startsWith('items:'))){
        if(!enableItemsSmoke){await interaction.reply({ephemeral:true,content:'Item controls are not enabled yet.'});return;}
        await items.handle(interaction);return;
      }
      if(interaction.isChatInputCommand()){
        if(enableJailSmoke&&interaction.guildId){
          const active=await jail.isModerationJailed(interaction.guildId,interaction.user.id);
          if(active){
            const jailSub=interaction.commandName==='jail'?interaction.options.getSubcommand(false):null;
            const safe=interaction.commandName==='rules'||interaction.commandName==='help'||(interaction.commandName==='jail'&&(jailSub==='status'||jailSub==='reason'));
            if(!safe){await interaction.reply({ephemeral:true,content:'You are currently in moderation Hotseat. Only jail-safe commands are available until release.'});return;}
          }
        }
        if(interaction.commandName==='jail'){if(!enableJailSmoke){await interaction.reply({ephemeral:true,content:'Hotseat is not enabled yet.'});return;}await jail.handleCommand(interaction);return;}
        if(interaction.commandName==='mod'){if(!enableModerationSmoke){await interaction.reply({ephemeral:true,content:'Moderation controls are not enabled yet.'});return;}await moderation.handleCommand(interaction);return;}
        if(interaction.commandName==='panic'){if(!enableSecuritySmoke){await interaction.reply({ephemeral:true,content:'Security controls are not enabled yet.'});return;}await security.handlePanicCommand(interaction);return;}
        if(ECONOMY_COMMANDS.has(interaction.commandName)){if(!enableEconomySmoke){await interaction.reply({ephemeral:true,content:'Economy controls are not enabled yet.'});return;}if(enableSecuritySmoke&&interaction.guildId&&await security.isRestricted(interaction.guildId,interaction.user.id)){await interaction.reply({ephemeral:true,content:'Join Gate verification is required before economy controls are available.'});return;}if(enableSecuritySmoke&&interaction.guildId){const state=await securityService.state(interaction.guildId);if(state.panicActive||state.mode==='LOCKDOWN'){await interaction.reply({ephemeral:true,content:'Economy controls are temporarily disabled while the server is in Lockdown.'});return;}}await economy.handleCommand(interaction);return;}
        if(enableSecuritySmoke&&interaction.guildId&&interaction.commandName==='wyr'){const s=await securityService.state(interaction.guildId);if(s.panicActive||s.mode==='LOCKDOWN'){await interaction.reply({ephemeral:true,content:'Interactive games are temporarily disabled while the server is in Lockdown.'});return;}}
        if(interaction.commandName==='wyr'){if(!enableWyrSmoke){await interaction.reply({ephemeral:true,content:'Would You Rather is not enabled yet.'});return;}await wyr.handleSlash(interaction);return;}
        if(interaction.commandName==='rules'&&enableOnboardingSmoke){await onboarding.handleRulesCommand(interaction);return;}
        if(interaction.commandName==='roles'&&enableOnboardingSmoke){await onboarding.handleRolesCommand(interaction);return;}
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
      if(enableOnboardingSmoke&&interaction.isStringSelectMenu()&&interaction.customId.startsWith('roles:select:')){await onboarding.handleRoleSelect(interaction);return;}
    }catch(error){
      console.error('Interaction failed; response withheld or marked unsuccessful.');
      const content='That action could not be completed. Angrier Jordan logged the failure.';
      if(interaction.isRepliable()){
        if(interaction.deferred||interaction.replied)await interaction.followUp({ephemeral:true,content}).catch(()=>undefined);
        else await interaction.reply({ephemeral:true,content}).catch(()=>undefined);
      }
    }
  });

  const server=await startRuntimeHealth(runtime.port,()=>initialized&&client.isReady()&&!lifecycle.isStopping,()=>db.$queryRaw`SELECT 1`);
  let shutdownPromise:Promise<void>|undefined;
  const shutdown=()=>shutdownPromise??(shutdownPromise=(async()=>{
    lifecycle.stopAdmission();initialized=false;worker.stop();musicWorker.stop();music?.close();
    if(introSweep)clearInterval(introSweep);if(eventSweep)clearInterval(eventSweep);if(voiceSweep)clearInterval(voiceSweep);if(wyrSweep)clearInterval(wyrSweep);
    if(familySweep)clearInterval(familySweep);if(communitySweep)clearInterval(communitySweep);if(crimeSweep)clearInterval(crimeSweep);if(partySweep)clearInterval(partySweep);if(pvpSweep)clearInterval(pvpSweep);if(specialSweep)clearInterval(specialSweep);if(soloSweep)clearInterval(soloSweep);
    const deadline=setTimeout(()=>{console.error('Shutdown deadline reached; durable work will recover on restart.');process.exit(1);},25_000);deadline.unref();
    try{
      await Promise.allSettled([lifecycle.drain(20_000),worker.stopAndDrain(),musicWorker.stopAndDrain()]);
      client.destroy();await new Promise<void>(resolve=>server.close(()=>resolve()));await disconnectPrisma();
    }finally{clearTimeout(deadline);}
  })());
  process.once('SIGINT',()=>{void shutdown();});process.once('SIGTERM',()=>{void shutdown();});
  try{await client.login(token);}catch{await shutdown();throw new Error('Discord login failed.');}
}
