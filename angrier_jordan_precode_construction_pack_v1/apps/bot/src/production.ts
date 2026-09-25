import {DiscordRecordAnnouncements} from './discord/record-announcements.js';
import {DiscordProfilesCoordinator,PROFILE_COMMANDS} from './discord/profiles-coordinator.js';
import {PrismaProfilesRepository} from '../../../packages/features-profiles/src/prisma-repository.js';
import {DiscordItemsCoordinator,ITEM_COMMANDS} from './discord/items-coordinator.js';
import {PrismaItemRepository} from '../../../packages/features-economy/src/items-prisma.js';
import fs from 'node:fs';
import { Client, Events, GatewayIntentBits, REST, Routes } from 'discord.js';
import { AuditService, ConfigService, HealthService, IdempotentScheduler, SchedulerWorker } from '../../../packages/core/src/index.js';
import { SETTINGS } from '../../../packages/contracts/src/generated/settings.js';
import { PrismaAuditSink, PrismaConfigRepository, PrismaJobRepository, createPrismaHealthProbe } from '../../../packages/database/src/prisma-adapters.js';
import { PrismaOnboardingRepository, OnboardingService } from '../../../packages/features-onboarding/src/index.js';
import { PrismaJailRepository, JailService } from '../../../packages/features-jail/src/index.js';
import { PrismaModerationRepository, ModerationService } from '../../../packages/features-moderation/src/index.js';
import { PrismaSecurityRepository, SecurityService } from '../../../packages/features-security/src/index.js';
import { PrismaEconomyRepository, EconomyService, type FortuneEntry } from '../../../packages/features-economy/src/index.js';
import { getPrismaClient, disconnectPrisma } from '../../../packages/database/src/client.js';
import { PrismaWyrPromptRepository, PrismaWyrSessionRepository, WyrService } from '../../../packages/features-wyr/src/index.js';
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
  const token=required('DISCORD_TOKEN');const applicationId=required('DISCORD_APPLICATION_ID');const guildId=required('DISCORD_GUILD_ID');
  const enableWyrSmoke=process.env.ENABLE_WYR_SMOKE==='true';
  const enableOnboardingSmoke=process.env.ENABLE_ONBOARDING_SMOKE==='true';
  const enableJailSmoke=process.env.ENABLE_JAIL_SMOKE==='true';
  const enableModerationSmoke=process.env.ENABLE_MODERATION_SMOKE==='true';
  const enableSecuritySmoke=process.env.ENABLE_SECURITY_SMOKE==='true';
  const enableProfilesSmoke=process.env.ENABLE_PROFILES_SMOKE==='true';
  const enableItemsSmoke=process.env.ENABLE_ITEMS_SMOKE==='true';
  const enableEconomySmoke=process.env.ENABLE_ECONOMY_SMOKE==='true';
  const db=getPrismaClient();
  const audit=new AuditService(new PrismaAuditSink(db));
  const config=new ConfigService(SETTINGS,new PrismaConfigRepository(db),audit);
  const health=new HealthService([createPrismaHealthProbe(db),async()=>({name:'discord',status:'ok' as const})]);
  const jobRepo=new PrismaJobRepository(db);
  const client=new Client({intents:[GatewayIntentBits.Guilds,GatewayIntentBits.GuildMembers,GatewayIntentBits.GuildMessages,GatewayIntentBits.MessageContent,GatewayIntentBits.GuildVoiceStates,GatewayIntentBits.GuildModeration]});
  const promptRepo=new PrismaWyrPromptRepository(db);
  const sessionRepo=new PrismaWyrSessionRepository(db);
  const wyrService=new WyrService(promptRepo,sessionRepo,new SystemClock(),new CuidLikeIds());
  const wyr=new DiscordWyrCoordinator(wyrService);
  const onboardingService=new OnboardingService(new PrismaOnboardingRepository(db),audit,new SystemClock());
  const onboarding=new DiscordOnboardingCoordinator(onboardingService,config);
  const jailService=new JailService(new PrismaJailRepository(db),audit,new SystemClock());
  const jail=new DiscordJailCoordinator(jailService,config,onboarding);
  const moderationService=new ModerationService(new PrismaModerationRepository(db),audit,new SystemClock());
  const moderation=new DiscordModerationCoordinator(moderationService,config);
  const securityService=new SecurityService(new PrismaSecurityRepository(db),audit,new SystemClock());
  const security=new DiscordSecurityCoordinator(securityService,moderationService,config);
  const fortunes=JSON.parse(fs.readFileSync(new URL('../../../packages/content/economy/fortune_300.json',import.meta.url),'utf8')) as FortuneEntry[];
  const economyService=new EconomyService(new PrismaEconomyRepository(db),audit,new SystemClock(),undefined,fortunes);
  const economy=new DiscordEconomyCoordinator(economyService,config);
  const items=new DiscordItemsCoordinator(new PrismaItemRepository(db),config,async(g,u)=>{
    if(await jail.isModerationJailed(g,u)||await security.isRestricted(g,u))return false;
    const state=await securityService.state(g);return !state.panicActive&&state.mode!=='LOCKDOWN';
  });
  const profileRepo=new PrismaProfilesRepository(db);
  const profiles=new DiscordProfilesCoordinator(profileRepo,config,async(g,u)=>!await jail.isModerationJailed(g,u)&&!await security.isRestricted(g,u));
  const recordAnnouncements=new DiscordRecordAnnouncements(db,config);
  const scheduler=new IdempotentScheduler(jobRepo,{
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
  let voiceSweep:ReturnType<typeof setInterval>|undefined;
  let wyrSweep:ReturnType<typeof setInterval>|undefined;

  client.once(Events.ClientReady,async ready=>{
    const registration=JSON.parse(fs.readFileSync(new URL('../../../generated/discord/application_commands.json',import.meta.url),'utf8'));
    const enabled=registration.filter((c:{name?:string;type?:number})=>c.type===1&&(c.name==='status'||(enableProfilesSmoke&&Boolean(c.name&&PROFILE_COMMANDS.has(c.name)))||(enableItemsSmoke&&Boolean(c.name&&ITEM_COMMANDS.has(c.name)))||(enableWyrSmoke&&c.name==='wyr')||(enableOnboardingSmoke&&(c.name==='rules'||c.name==='roles'))||(enableJailSmoke&&c.name==='jail')||(enableModerationSmoke&&c.name==='mod')||(enableSecuritySmoke&&c.name==='panic')||(enableEconomySmoke&&Boolean(c.name&&ECONOMY_COMMANDS.has(c.name)))));
    await new REST({version:'10'}).setToken(token).put(Routes.applicationGuildCommands(applicationId,guildId),{body:enabled});
    if(enableProfilesSmoke){await profileRepo.resetVoiceAfterRestart(guildId);await profiles.reconcile(guildId);await profiles.sampleVoice(ready,guildId);voiceSweep=setInterval(()=>{void profiles.sampleVoice(ready,guildId).catch(()=>console.error('Activity voice sampling failed.'));},30_000);}
    const recovered=await wyr.recover(ready);if(enableJailSmoke){await jail.reconcileSchedules(guildId);const guild=ready.guilds.cache.get(guildId);if(guild)await jail.reconcileGuild(guild);}if(enableEconomySmoke)await economy.reconcileInterestSchedule(guildId);await worker.runOnce();worker.start();
    wyrSweep=setInterval(()=>{void wyr.closeDue(ready);},5_000);
    const snapshot=await health.check();
    console.log(`Angrier Jordan online as ${ready.user.tag}. WYR recovery active=${recovered.active} closed=${recovered.closed}. Onboarding=${enableOnboardingSmoke?'enabled':'disabled'}. Hotseat=${enableJailSmoke?'enabled':'disabled'}. Moderation=${enableModerationSmoke?'enabled':'disabled'}. Security=${enableSecuritySmoke?'enabled':'disabled'}. Economy=${enableEconomySmoke?'enabled':'disabled'}. Health=${snapshot.status}.`);
  });

  client.on(Events.GuildMemberAdd,member=>{if(enableOnboardingSmoke)void onboarding.handleMemberAdd(member).catch(error=>console.error('Onboarding join failed',error));if(enableSecuritySmoke)void security.handleMemberAdd(member).catch(error=>console.error('Join Gate failed',error));if(enableEconomySmoke)void economy.handleMemberAdd(member).catch(error=>console.error('Economy starter grant failed',error));});
  client.on(Events.GuildMemberRemove,member=>{if(enableOnboardingSmoke)void onboarding.handleMemberRemove(member).catch(error=>console.error('Onboarding leave snapshot failed',error));});
  client.on(Events.ChannelCreate,channel=>{if(enableJailSmoke)void jail.reconcileNewChannel(channel).catch(error=>console.error('Hotseat channel reconciliation failed',error));});
  client.on(Events.MessageCreate,message=>{if(enableProfilesSmoke)void profiles.message(message).catch(()=>console.error('Activity message recording failed.'));if(enableSecuritySmoke)void security.handleMessage(message).catch(error=>console.error('AutoMod failed',error));});
  client.on(Events.GuildAuditLogEntryCreate,(entry,guild)=>{if(enableSecuritySmoke)void security.handleAuditEntry(entry,guild).catch(error=>console.error('Anti-nuke evaluation failed',error));});

  client.on(Events.VoiceStateUpdate,(_before,after)=>{if(enableProfilesSmoke)void profiles.sampleVoice(client,after.guild.id).catch(()=>console.error('Activity voice transition failed.'));});
  client.on(Events.InteractionCreate,async interaction=>{
    try{
      if(enableProfilesSmoke&&interaction.isChatInputCommand())void profiles.recordCommand(interaction).catch(()=>console.error('Command activity recording failed.'));
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
          await interaction.reply({ephemeral:true,content:'You are currently in moderation Hotseat. Interactive game, role, and community controls are unavailable until release.'});return;
        }
      }
      if(enableSecuritySmoke&&interaction.guildId&&(interaction.isButton()||interaction.isStringSelectMenu())){const securitySafe=interaction.isButton()&&(interaction.customId==='security:verify'||interaction.customId==='security:panic_deactivate_confirm'||interaction.customId.startsWith('moderation:review:')||interaction.customId==='onboard:ack_rules');if(!securitySafe&&await security.isRestricted(interaction.guildId,interaction.user.id)){await interaction.reply({ephemeral:true,content:'Join Gate verification is required before interactive controls are available.'});return;}}
      if(enableEconomySmoke&&interaction.isButton()&&interaction.customId.startsWith('economy:')){if(enableSecuritySmoke&&interaction.guildId&&await security.isRestricted(interaction.guildId,interaction.user.id)){await interaction.reply({ephemeral:true,content:'Join Gate verification is required before economy controls are available.'});return;}await economy.handleButton(interaction);return;}
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
      console.error('Interaction failed',error);
      const content='That action could not be completed. Angrier Jordan logged the failure.';
      if(interaction.isRepliable()){
        if(interaction.deferred||interaction.replied)await interaction.followUp({ephemeral:true,content}).catch(()=>undefined);
        else await interaction.reply({ephemeral:true,content}).catch(()=>undefined);
      }
    }
  });

  const shutdown=async()=>{worker.stop();if(voiceSweep)clearInterval(voiceSweep);if(wyrSweep)clearInterval(wyrSweep);client.destroy();await disconnectPrisma();};
  process.once('SIGINT',()=>{void shutdown();});process.once('SIGTERM',()=>{void shutdown();});
  await client.login(token);
}
