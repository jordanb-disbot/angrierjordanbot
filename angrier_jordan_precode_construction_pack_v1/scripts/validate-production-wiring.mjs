import fs from 'node:fs';

const root = new URL('../', import.meta.url);
const requiredFiles = [
  'apps/bot/src/production.ts',
  'apps/bot/src/discord/wyr-coordinator.ts',
  'apps/bot/src/discord/onboarding-coordinator.ts',
  'apps/bot/src/discord/jail-coordinator.ts',
  'apps/bot/src/discord/moderation-coordinator.ts',
  'apps/bot/src/discord/security-coordinator.ts',
  'apps/bot/src/discord/economy-coordinator.ts',
  'packages/features-economy/src/service.ts',
  'packages/features-economy/src/prisma-repository.ts',
  'packages/content/economy/fortune_300.json',
  'packages/features-jail/src/service.ts',
  'packages/features-jail/src/prisma-repository.ts',
  'packages/features-moderation/src/service.ts',
  'packages/features-moderation/src/prisma-repository.ts',
  'packages/features-security/src/service.ts',
  'packages/features-security/src/prisma-repository.ts',
  'packages/database/src/client.ts',
  'packages/database/prisma/migrations/0004_hotseat_execution/migration.sql',
  'packages/database/prisma/migrations/0005_main_moderation/migration.sql',
  'packages/database/prisma/migrations/0006_moderation_security_controls/migration.sql',
  'packages/database/prisma/migrations/0007_automated_security/migration.sql',
  'packages/database/prisma/migrations/0008_economy_foundation/migration.sql',
  'docs/approved_visuals/wyr_runtime_standard.png',
  'generated/discord/application_commands.json',
];

const missing = requiredFiles.filter(file => !fs.existsSync(new URL(file, root)));
if (missing.length) {
  console.error('Production wiring validation failed; missing files:', missing);
  process.exit(1);
}

const commands = JSON.parse(fs.readFileSync(new URL('generated/discord/application_commands.json', root), 'utf8'));
for (const name of ['wyr', 'status', 'rules', 'roles', 'jail', 'mod', 'panic', 'daily', 'weekly', 'work', 'fish', 'dig', 'scavenge', 'statement', 'inventory', 'bank', 'transfer']) {
  if (!commands.some(command => command.type === 1 && command.name === name)) {
    console.error(`Missing registered command ${name}`);
    process.exit(1);
  }
}

const jail = commands.find(command => command.type === 1 && command.name === 'jail');
const expectedJailSubcommands = {
  send: ['member', 'duration', 'reason'],
  release: ['member', 'reason'],
  extend: ['member', 'duration', 'reason'],
  reduce: ['member', 'duration', 'reason'],
  reason: ['member'],
  history: ['member'],
  roster: ['type'],
  status: ['member'],
};

for (const [subcommandName, expectedOptions] of Object.entries(expectedJailSubcommands)) {
  const subcommand = jail?.options?.find(option => option.type === 1 && option.name === subcommandName);
  if (!subcommand) {
    console.error(`Missing /jail ${subcommandName} registration`);
    process.exit(1);
  }
  const actual = (subcommand.options ?? []).map(option => option.name);
  if (actual.join('|') !== expectedOptions.join('|')) {
    console.error(`Unexpected /jail ${subcommandName} options: ${actual.join(', ')}`);
    process.exit(1);
  }
}


const mod = commands.find(command => command.type === 1 && command.name === 'mod');
for (const name of ['warn','timeout','untimeout','kick','ban','unban','purge','note','history','lock','unlock','slowmode','quarantine','staff-alert','modstats']) {
  if (!mod?.options?.some(option => option.type === 1 && option.name === name)) {
    console.error(`Missing /mod ${name} registration`);
    process.exit(1);
  }
}
const purge = mod?.options?.find(option => option.type === 1 && option.name === 'purge');
if ((purge?.options ?? []).map(option => option.name).join('|') !== 'count|reason|member') {
  console.error('Unexpected /mod purge options; expected count, reason, member');
  process.exit(1);
}
const caseGroup = mod?.options?.find(option => option.type === 2 && option.name === 'case');
for (const name of ['view','edit','reverse']) {
  if (!caseGroup?.options?.some(option => option.type === 1 && option.name === name)) {
    console.error(`Missing /mod case ${name} registration`);
    process.exit(1);
  }
}

const panic = commands.find(command => command.type === 1 && command.name === 'panic');
const panicActivate = panic?.options?.find(option => option.type === 1 && option.name === 'activate');
if ((panicActivate?.options ?? []).map(option => option.name).join('|') !== 'reason') {
  console.error('Unexpected /panic activate options; expected reason');
  process.exit(1);
}
for (const name of ['deactivate','status']) {
  if (!panic?.options?.some(option => option.type === 1 && option.name === name)) {
    console.error(`Missing /panic ${name} registration`);
    process.exit(1);
  }
}

const moderationSource = fs.readFileSync(new URL('apps/bot/src/discord/moderation-coordinator.ts', root), 'utf8');
for (const requiredFragment of [
  "actionType:'CHANNEL_LOCK'",
  "actionType:'CHANNEL_UNLOCK'",
  "actionType:'SLOWMODE'",
  "actionType:'QUARANTINE'",
  'EVIDENCE_ENCRYPTION_KEY',
  "createCipheriv('aes-256-gcm'",
  'handleAppealButton',
  'handleAppealModal',
  'postAppealForReview',
]) {
  if (!moderationSource.includes(requiredFragment)) {
    console.error(`Moderation coordinator is missing checkpoint-06 wiring: ${requiredFragment}`);
    process.exit(1);
  }
}

const securitySource = fs.readFileSync(new URL('apps/bot/src/discord/security-coordinator.ts', root), 'utf8');
for (const requiredFragment of [
  'handleMessage(message:Message)',
  'handleMemberAdd(member:GuildMember)',
  'handleAuditEntry(entry:GuildAuditLogsEntry',
  "actionType:'ANTI_NUKE'",
  "actionType:'PANIC'",
  'security:verify',
  'security:panic_deactivate_confirm',
  'applyPanicChannels',
  'restorePanicChannels',
  'EVIDENCE_ENCRYPTION_KEY',
]) {
  if (!securitySource.includes(requiredFragment)) {
    console.error(`Security coordinator is missing checkpoint-07 wiring: ${requiredFragment}`);
    process.exit(1);
  }
}


const economySource = fs.readFileSync(new URL('apps/bot/src/discord/economy-coordinator.ts', root), 'utf8');
for (const requiredFragment of [
  'handleMemberAdd(member:GuildMember)',
  'handleInterestJob(payload:unknown)',
  'reconcileInterestSchedule(guildId:string)',
  "case'daily'",
  "case'weekly'",
  "case'work'",
  "case'fish'",
  "case'dig'",
  "case'scavenge'",
  "case'statement'",
  "case'inventory'",
  "case'bank'",
  "case'transfer'",
  'economy:daily:claim',
  'economy:bank_modal:',
]) {
  if (!economySource.includes(requiredFragment)) {
    console.error(`Economy coordinator is missing checkpoint-08 wiring: ${requiredFragment}`);
    process.exit(1);
  }
}

const economyServiceSource = fs.readFileSync(new URL('packages/features-economy/src/service.ts', root), 'utf8');
for (const requiredFragment of [
  'starterAmount',
  'wallet+source.bank',
  'dailyCycle',
  "'America/Denver'",
  'applyTier5Interest',
  'technicalThrottleMs',
  'TOOL_REQUIRED',
]) {
  if (!economyServiceSource.includes(requiredFragment)) {
    console.error(`Economy service is missing checkpoint-08 invariant: ${requiredFragment}`);
    process.exit(1);
  }
}

const productionSource = fs.readFileSync(new URL('apps/bot/src/production.ts', root), 'utf8');
for (const requiredFragment of [
  "'jail.expire'",
  'ENABLE_JAIL_SMOKE',
  'ENABLE_MODERATION_SMOKE',
  'ENABLE_SECURITY_SMOKE',
  'ENABLE_ECONOMY_SMOKE',
  'ENABLE_ITEMS_SMOKE',
  'ENABLE_PROFILES_SMOKE',
  'ENABLE_CASINO_SMOKE',
  "'casino.expire'",
  "'lottery.draw'",
  "'records.observe'",
  "'moderation.timeout_expire'",
  "'moderation.temp_ban_expire'",
  "'moderation.evidence_expire'",
  "'security.state_expire'",
  "'economy.bank_interest_weekly'",
  "interaction.customId.startsWith('moderation:review:')",
  "interaction.customId.startsWith('moderation:appeal:')",
  "interaction.customId.startsWith('moderation:appeal_submit:')",
  "interaction.customId.startsWith('jail:review:')",
  "interaction.customId.startsWith('wyr:')",
  "interaction.customId==='security:verify'",
  "interaction.customId==='security:panic_deactivate_confirm'",
  'Events.MessageCreate',
  'Events.GuildAuditLogEntryCreate',
  'economy.handleMemberAdd(member)',
  'economy.reconcileInterestSchedule(guildId)',
  "interaction.customId.startsWith('economy:')",
  'Interactive game, role, and community controls are unavailable until release.',
]) {
  if (!productionSource.includes(requiredFragment)) {
    console.error(`Production wiring is missing required Hotseat guard/wiring: ${requiredFragment}`);
    process.exit(1);
  }
}

console.log('production-wiring: PASS (WYR + onboarding + Hotseat + moderation/security + economy foundation Discord/PostgreSQL paths present; live credentials still required)');
