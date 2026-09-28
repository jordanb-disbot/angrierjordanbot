import {beginJailDiagnostic} from './jail-send-diagnostics.js';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  ContainerBuilder,
  MessageFlags,
  PermissionFlagsBits,
  TextDisplayBuilder,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
  type Client,
  type Guild,
  type GuildBasedChannel,
  type GuildMember,
} from 'discord.js';
import type { ConfigService } from '../../../../packages/core/src/index.js';
import { DomainError } from '../../../../packages/core/src/index.js';
import type { JailSentenceRecord, JailService } from '../../../../packages/features-jail/src/index.js';
import type { DiscordOnboardingCoordinator } from './onboarding-coordinator.js';

const roleId = async (config: ConfigService, serverId: string, key: string) => {
  const value = await config.get(serverId, key);
  return typeof value === 'string' && value ? value : null;
};

const boolSetting = async (config: ConfigService, serverId: string, key: string) => Boolean(await config.get(serverId, key));

const hotseatChannelId = async (config: ConfigService, serverId: string) => {
  const value = await config.get(serverId, 'channels.hotseat_channel');
  return typeof value === 'string' && value ? value : null;
};

const discordTime = (date: Date) => `<t:${Math.floor(date.getTime() / 1000)}:F> (<t:${Math.floor(date.getTime() / 1000)}:R>)`;

type StaffLevel = 'member' | 'recliner' | 'chaise_lounge' | 'throne';
const staffRank: Record<StaffLevel, number> = { member: 0, recliner: 1, chaise_lounge: 2, throne: 3 };

type DiscordReleaseMutation = {
  removedJailedRole: boolean;
  restoredRoleIds: string[];
};

export class DiscordJailCoordinator {
  constructor(
    private readonly service: JailService,
    private readonly config: ConfigService,
    private readonly onboarding: DiscordOnboardingCoordinator,
  ) {}

  async reconcileGuild(server: Guild): Promise<void> {
    const [jailedId, hotseatId, links, attachments] = await Promise.all([
      roleId(this.config, server.id, 'roles.jailed'),
      hotseatChannelId(this.config, server.id),
      boolSetting(this.config, server.id, 'moderation.jail.links_allowed'),
      boolSetting(this.config, server.id, 'moderation.jail.attachments_allowed'),
    ]);
    if (!jailedId) return;
    const role = server.roles.cache.get(jailedId);
    if (!role) return;
    for (const channel of server.channels.cache.values()) {
      await this.reconcileChannel(channel, role.id, hotseatId, links, attachments);
    }
  }

  async reconcileNewChannel(channel: GuildBasedChannel): Promise<void> {
    const server = channel.guild;
    const [jailedId, hotseatId, links, attachments] = await Promise.all([
      roleId(this.config, server.id, 'roles.jailed'),
      hotseatChannelId(this.config, server.id),
      boolSetting(this.config, server.id, 'moderation.jail.links_allowed'),
      boolSetting(this.config, server.id, 'moderation.jail.attachments_allowed'),
    ]);
    if (!jailedId) return;
    await this.reconcileChannel(channel, jailedId, hotseatId, links, attachments);
  }

  async handleCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guildId || !interaction.guild) {
      await interaction.reply({ ephemeral: true, content: 'This command is only available in the server.' });
      return;
    }

    const subcommand = interaction.options.getSubcommand();
    if (subcommand === 'send') {
      if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ ephemeral: true });
      try { await this.handleSend(interaction); }
      catch (error) { await interaction.editReply({ content: error instanceof DomainError ? error.message : 'Hotseat confinement could not be completed. Check the member’s current status before retrying.' }); }
      return;
    }
    if (subcommand === 'release') return this.handleRelease(interaction);
    if (subcommand === 'extend') return this.handleExtend(interaction);
    if (subcommand === 'reduce') return this.handleReduce(interaction);
    if (subcommand === 'reason') return this.handleReason(interaction);
    if (subcommand === 'history') return this.handleHistory(interaction);
    if (subcommand === 'roster') return this.handleRoster(interaction);
    if (subcommand === 'status') return this.handleStatus(interaction);
    await interaction.reply({ ephemeral: true, content: 'Unknown Hotseat action.' });
  }

  async handleReviewButton(interaction: ButtonInteraction): Promise<void> {
    const sentenceId = interaction.customId.split(':')[2] ?? '';
    try {
      const result = await this.service.requestReview(sentenceId, interaction.user.id);
      await interaction.reply({
        ephemeral: true,
        content: `Review requested for moderation case #${result.caseId}. Staff will review it independently.`,
      });
    } catch (error) {
      await interaction.reply({
        ephemeral: true,
        content: error instanceof DomainError ? error.message : 'The review request could not be created.',
      });
    }
  }

  async handleExpiryJob(client: Client, payload: unknown): Promise<void> {
    const sentenceId = payload && typeof payload === 'object' && typeof (payload as Record<string, unknown>).sentenceId === 'string'
      ? (payload as Record<string, unknown>).sentenceId as string
      : '';
    if (!sentenceId) return;

    const before = await this.service.getSentence(sentenceId);
    if (!before) return;

    const server = client.guilds.cache.get(before.guildId);
    if (!server) {
      await this.service.expireSentence(sentenceId);
      return;
    }

    const member = await server.members.fetch(before.userId).catch(() => null);
    if (before.pausedAt) return;
    if (before.endsAt.getTime() > Date.now()) {
      await this.service.reconcileMember(before.guildId, before.userId);
      return;
    }

    let discordMutation: DiscordReleaseMutation | null = null;
    if (member) discordMutation = await this.removeDiscordJailState(member, before, 'Sentence expired.');

    try {
      const result = await this.service.expireSentence(sentenceId);
      if (!result) {
        const current = await this.service.getSentence(sentenceId);
        if (current?.active && member && discordMutation) await this.rollbackDiscordReleaseState(member, discordMutation);
        return;
      }

      if (member) {
        const others = await this.service.status(server.id, member.id);
        if (!others.some(s=>s.type==='MODERATION')) await this.onboarding.restoreAfterPunishment(member).catch(() => undefined);
        await this.postHotseatCard(member, result.sentence, result.caseRecord.id, 'released').catch(() => undefined);
      }
    } catch (error) {
      const current = await this.service.getSentence(sentenceId).catch(() => null);
      if (current?.active && member && discordMutation) await this.rollbackDiscordReleaseState(member, discordMutation);
      throw error;
    }
  }

  async reconcileSchedules(serverId?: string) {
    return this.service.reconcileExpirySchedules(serverId);
  }

  async reconcileMember(serverId: string, userId: string) {
    return this.service.reconcileMember(serverId, userId);
  }

  async isModerationJailed(serverId: string, userId: string) {
    return Boolean(await this.service.activeModeration(serverId, userId));
  }

  private async handleSend(interaction: ChatInputCommandInteraction) {
    const diagnostic=beginJailDiagnostic(interaction.id);
    const stage=(name:string)=>{if(diagnostic){diagnostic.state.stage=name;diagnostic.log();}};
    try {
    stage('actor-fetch');
    const actor = await interaction.guild!.members.fetch(interaction.user.id);
    stage('staff-authority');
    await this.requireStaff(actor, 'recliner');
    stage('target-fetch');
    let target = await this.targetMember(interaction, true);
    stage('command-options');
    const duration = interaction.options.getString('duration', true);
    const reason = interaction.options.getString('reason', true);
    stage('target-validation');
    await this.validateTarget(actor, target);

    stage('administrator-suspension-check');
    const suspended = await this.prepareAdministratorSuspension(actor, target);
    stage('member-access-config');
    const accessId = await roleId(this.config, target.guild.id, 'roles.member_access');
    stage('channel-reconciliation');
    await this.reconcileGuild(interaction.guild!);
    stage('jailed-role-check');
    const jailed = await this.requireJailedRole(interaction.guild!);
    const removedRoleIds: string[] = [];

    let result: Awaited<ReturnType<JailService['send']>>;
    let hotseatId: string | null = null;
    try {
      // Explicit member-access allows override a different role's deny. Suspend access
      // as well as approved admin roles, using returned members rather than gateway cache timing.
    stage('role-removal');
      const toRemove = new Set([...suspended, ...(accessId && target.roles.cache.has(accessId) ? [accessId] : [])]);
      for (const id of toRemove) {
        target = await target.roles.remove(id, 'Temporary role suspension for moderation Hotseat.');
        removedRoleIds.push(id);
        if(diagnostic&&id===accessId)diagnostic.state.foldingRemoved=true;
      }
    stage('jailed-role-add');
      target = await target.roles.add(jailed, 'Moderation Hotseat confinement.');

    stage('administrator-bypass-check');
      if(diagnostic)diagnostic.state.jailedAdded=true;
      if (target.permissions.has(PermissionFlagsBits.Administrator)) {
        throw new DomainError('ADMINISTRATOR_BYPASS', 'This member still has Administrator permission, so Hotseat confinement would not be effective.');
      }

    stage('hotseat-config');
      hotseatId = await hotseatChannelId(this.config, target.guild.id);
      if (!hotseatId) throw new DomainError('HOTSEAT_NOT_CONFIGURED', 'The Hotseat channel is not configured.');
    stage('normal-channel-containment');
      if(diagnostic){try{const permissions=hotseatId?target.guild.channels.cache.get(hotseatId)?.permissionsFor(target):null;diagnostic.state.hotseatView=permissions?.has(PermissionFlagsBits.ViewChannel)??false;diagnostic.state.hotseatSend=permissions?.has(PermissionFlagsBits.SendMessages)??false;}catch(e){diagnostic.log(e);}}
      const visible = this.visibleOrdinaryChannels(target, hotseatId);
      if(diagnostic)diagnostic.state.normalContainment=visible.size===0;
      if (visible.size) {
        throw new DomainError('CONFINEMENT_INCOMPLETE', `Hotseat would not fully contain this member. ${visible.size} normal channel(s) remain visible.`);
      }

    stage('sentence-create');
      if(diagnostic)diagnostic.state.sentenceCreationStarted=true;
      result = await this.service.send({
        guildId: target.guild.id,
        userId: target.id,
        actorUserId: actor.id,
        duration,
        reason,
        // Member access is restored by onboarding after durable release and Rules checks,
        // never by the unconditional suspended-admin-role restoration path.
        suspendedRoleIds: removedRoleIds.filter(id => id !== accessId),
      });
      if(diagnostic)diagnostic.state.sentenceCreationCompleted=true;
    } catch (error) {
      diagnostic?.log(error);
      if(diagnostic)diagnostic.state.rollbackStarted=true;
      stage('rollback');
      let rollbackOk=true;
      target = await target.roles.remove(jailed, 'Rolling back incomplete Hotseat confinement.').catch(e => {rollbackOk=false;diagnostic?.log(e);return target;});
      for (const id of removedRoleIds) {
        target = await target.roles.add(id, 'Rolling back incomplete Hotseat confinement.').catch(e => {rollbackOk=false;diagnostic?.log(e);return target;});
      }
      if(diagnostic)diagnostic.state.rollbackCompleted=rollbackOk;
      throw error;
    }

    stage('hotseat-card');
    let cardDelivered = true;
    await this.postHotseatCard(target, result.sentence, result.caseRecord.id, 'entered').catch(() => { cardDelivered = false; });
    stage('member-dm');
    await target.send({
      content: `You have been placed in the server Hotseat. Go to <#${hotseatId}> to read your notice and request a review.\nReason: ${reason}\nCase #${result.caseRecord.id}. Use \`/jail status\` or \`/jail reason\` for details.`,
    }).catch(() => undefined);
    stage('interaction-result');
    await interaction.editReply({ content: `${target} is now in Hotseat. Case #${result.caseRecord.id}.${cardDelivered ? '' : ' The Hotseat notice could not be delivered; confinement is active. Do not resend the punishment.'}` });
    stage('complete');
    } catch(error){diagnostic?.log(error);throw error;}
  }

  private async handleRelease(interaction: ChatInputCommandInteraction) {
    const actor = await interaction.guild!.members.fetch(interaction.user.id);
    await this.requireStaff(actor, 'recliner');
    const target = await this.targetMember(interaction, true);
    const reason = interaction.options.getString('reason', true);
    const sentence = await this.requireActive(target);
    const discordMutation = await this.removeDiscordJailState(target, sentence, reason);

    let result: Awaited<ReturnType<JailService['release']>>;
    try {
      result = await this.service.release({ guildId: target.guild.id, userId: target.id, actorUserId: actor.id, reason });
    } catch (error) {
      const current = await this.service.activeModeration(target.guild.id, target.id).catch(() => null);
      if (current?.id === sentence.id) await this.rollbackDiscordReleaseState(target, discordMutation);
      throw error;
    }

    const remaining = await this.service.status(target.guild.id, target.id);
    if (!remaining.some(s=>s.type==='MODERATION')) await this.onboarding.restoreAfterPunishment(target).catch(() => undefined);
    await this.postHotseatCard(target, result.sentence, result.caseRecord.id, 'released').catch(() => undefined);
    await interaction.reply({ ephemeral: true, content: `${target} was released from moderation Hotseat. Case #${result.caseRecord.id}.` });
  }

  private async handleExtend(interaction: ChatInputCommandInteraction) {
    const actor = await interaction.guild!.members.fetch(interaction.user.id);
    await this.requireStaff(actor, 'recliner');
    const target = await this.targetMember(interaction, true);
    const result = await this.service.extend({
      guildId: target.guild.id,
      userId: target.id,
      actorUserId: actor.id,
      duration: interaction.options.getString('duration', true),
      reason: interaction.options.getString('reason', true),
    });
    await this.postHotseatCard(target, result.sentence, result.caseRecord.id, 'extended').catch(() => undefined);
    await interaction.reply({ ephemeral: true, content: `${target}'s Hotseat sentence was extended. Case #${result.caseRecord.id}.` });
  }

  private async handleReduce(interaction: ChatInputCommandInteraction) {
    const actor = await interaction.guild!.members.fetch(interaction.user.id);
    await this.requireStaff(actor, 'recliner');
    const target = await this.targetMember(interaction, true);
    const result = await this.service.reduce({
      guildId: target.guild.id,
      userId: target.id,
      actorUserId: actor.id,
      duration: interaction.options.getString('duration', true),
      reason: interaction.options.getString('reason', true),
    });
    await this.postHotseatCard(target, result.sentence, result.caseRecord.id, 'reduced').catch(() => undefined);
    await interaction.reply({ ephemeral: true, content: `${target}'s Hotseat sentence was reduced. Case #${result.caseRecord.id}.` });
  }

  private async handleReason(interaction: ChatInputCommandInteraction) {
    const actor = await interaction.guild!.members.fetch(interaction.user.id);
    const requested = interaction.options.getUser('member', false);
    const targetId = requested?.id ?? interaction.user.id;
    if (targetId !== interaction.user.id) await this.requireStaff(actor, 'recliner');
    const sentence = await this.service.reason(interaction.guild!.id, targetId);
    await interaction.reply({
      ephemeral: true,
      content: `Hotseat reason: **${sentence.reason}**${sentence.caseId ? `\nCase #${sentence.caseId}` : ''}`,
    });
  }

  private async handleHistory(interaction: ChatInputCommandInteraction) {
    const actor = await interaction.guild!.members.fetch(interaction.user.id);
    await this.requireStaff(actor, 'recliner');
    const target = await this.targetMember(interaction, true);
    const history = await this.service.history(target.guild.id, target.id, 10);
    const text = history.length
      ? history.map(entry => `• ${entry.sentence.active ? 'Active' : 'Closed'} — ${entry.sentence.reason}${entry.sentence.caseId ? ` — case #${entry.sentence.caseId}` : ''}`).join('\n')
      : 'No moderation Hotseat history.';
    await interaction.reply({ ephemeral: true, content: `**Hotseat history for ${target.displayName}**\n${text}` });
  }

  private async handleRoster(interaction: ChatInputCommandInteraction) {
    const raw = interaction.options.getString('type', false) ?? 'all';
    const type = (['all', 'crime', 'moderation'].includes(raw) ? raw : 'all') as 'all' | 'crime' | 'moderation';
    const rows = await this.service.roster(interaction.guild!.id, type);
    const text = rows.length
      ? rows.map(sentence => `• <@${sentence.userId}> — ${sentence.type.toLowerCase()} — ${sentence.indefinite ? 'indefinite' : discordTime(sentence.endsAt)}`).join('\n')
      : 'Nobody is currently jailed.';
    await interaction.reply({ content: `**Current jail roster — ${type}**\n${text}` });
  }

  private async handleStatus(interaction: ChatInputCommandInteraction) {
    const actor = await interaction.guild!.members.fetch(interaction.user.id);
    const requested = interaction.options.getUser('member', false);
    const targetId = requested?.id ?? interaction.user.id;
    if (targetId !== interaction.user.id) await this.requireStaff(actor, 'recliner');
    const rows = await this.service.status(interaction.guild!.id, targetId);
    const text = rows.length
      ? rows.map(sentence => `${sentence.type}: ${sentence.reason}\n${sentence.pausedAt ? 'Timer paused while away' : sentence.indefinite ? 'Release: manual' : `Release: ${discordTime(sentence.endsAt)}`}${sentence.caseId ? `\nCase #${sentence.caseId}` : ''}`).join('\n\n')
      : 'No active jail state.';
    await interaction.reply({ ephemeral: targetId === interaction.user.id, content: text });
  }

  private async postHotseatCard(
    member: GuildMember,
    sentence: JailSentenceRecord,
    caseId: number,
    state: 'entered' | 'extended' | 'reduced' | 'released',
  ) {
    const id = await hotseatChannelId(this.config, member.guild.id);
    if (!id) return;
    const channel = member.guild.channels.cache.get(id);
    if (!channel?.isTextBased() || !('send' in channel)) return;

    const title = state === 'entered' ? 'THE HOTSEAT' : state === 'released' ? 'HOTSEAT RELEASED' : `HOTSEAT ${state.toUpperCase()}`;
    const timing = sentence.active
      ? sentence.indefinite ? '**Release:** Manual release required' : `**Release:** ${discordTime(sentence.endsAt)}`
      : `**Ended:** ${sentence.endedAt ? discordTime(sentence.endedAt) : 'Now'}`;

    const container = new ContainerBuilder()
      .setAccentColor(state === 'released' ? 0x10B981 : 0xB42318)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# ${title}\n${state === 'entered' ? `<@${member.id}> has entered the Hotseat.` : `<@${member.id}>`}\n**Reason:** ${sentence.reason}\n**Case:** #${caseId}\n${timing}`));

    if (sentence.active) {
      container.addActionRowComponents(
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder().setCustomId(`jail:review:${sentence.id}`).setLabel('Request Review').setStyle(ButtonStyle.Secondary),
        ),
      );
    }

    await channel.send({ flags: MessageFlags.IsComponentsV2, components: [container] });
  }

  private async removeDiscordJailState(member: GuildMember, sentence: JailSentenceRecord, reason: string): Promise<DiscordReleaseMutation> {
    const jailedId = await roleId(this.config, member.guild.id, 'roles.jailed');
    const otherPunishment = (await this.service.status(member.guild.id, member.id)).some(s=>s.id!==sentence.id&&s.type==='MODERATION');
    const mutation: DiscordReleaseMutation = { removedJailedRole: false, restoredRoleIds: [] };

    if (jailedId && !otherPunishment && member.roles.cache.has(jailedId)) {
      await member.roles.remove(jailedId, `Hotseat release: ${reason}`);
      mutation.removedJailedRole = true;
    }

    for (const id of sentence.restoration.suspendedRoleIds) {
      if (member.roles.cache.has(id)) continue;
      const role = member.guild.roles.cache.get(id);
      if (!role || !role.editable || role.managed) continue;
      try {
        await member.roles.add(role, 'Restoring role suspended by moderation Hotseat.');
        mutation.restoredRoleIds.push(role.id);
      } catch {
        // Role restoration failure must not block release; the existing audit/case remains authoritative.
      }
    }

    return mutation;
  }

  private async rollbackDiscordReleaseState(member: GuildMember, mutation: DiscordReleaseMutation): Promise<void> {
    for (const id of mutation.restoredRoleIds) {
      if (member.roles.cache.has(id)) {
        await member.roles.remove(id, 'Rolling back incomplete Hotseat release.').catch(() => undefined);
      }
    }
    if (mutation.removedJailedRole) {
      const jailedId = await roleId(this.config, member.guild.id, 'roles.jailed');
      const role = jailedId ? member.guild.roles.cache.get(jailedId) : null;
      if (role?.editable) await member.roles.add(role, 'Rolling back incomplete Hotseat release.').catch(() => undefined);
    }
  }

  private async targetMember(interaction: ChatInputCommandInteraction, required: boolean) {
    const user = interaction.options.getUser('member', required);
    if (!user) throw new DomainError('MEMBER_REQUIRED', 'A member is required.');
    return interaction.guild!.members.fetch(user.id);
  }

  private async requireActive(member: GuildMember) {
    const sentence = await this.service.activeModeration(member.guild.id, member.id);
    if (!sentence) throw new DomainError('JAIL_NOT_ACTIVE', 'That member does not have an active moderation Hotseat sentence.');
    return sentence;
  }

  private async validateTarget(actor: GuildMember, target: GuildMember) {
    if (target.id === actor.id) throw new DomainError('SELF_JAIL_BLOCKED', 'You cannot place yourself in Hotseat.');
    if (target.id === target.guild.ownerId) throw new DomainError('OWNER_PROTECTED', 'The server owner cannot be placed in Hotseat.');
    if (actor.id !== actor.guild.ownerId && actor.roles.highest.comparePositionTo(target.roles.highest) <= 0) {
      throw new DomainError('ROLE_HIERARCHY', 'You cannot moderate a member with an equal or higher server role.');
    }
    if (!target.manageable) throw new DomainError('BOT_ROLE_HIERARCHY', 'Angrier Jordan cannot manage this member because of the server role hierarchy.');
  }

  private async prepareAdministratorSuspension(actor: GuildMember, target: GuildMember) {
    if (!target.permissions.has(PermissionFlagsBits.Administrator)) return [];
    const enabled = await boolSetting(this.config, target.guild.id, 'moderation.jail.staff_role_suspension_enabled');
    if (!enabled) {
      throw new DomainError('ADMINISTRATOR_BYPASS', 'This member has Administrator permission. Staff-role suspension is disabled, so Hotseat cannot safely contain them.');
    }
    if ((await this.staffLevel(actor)) !== 'throne') {
      throw new DomainError('THRONE_REQUIRED', 'Only Throne may jail a member whose Administrator roles must be suspended.');
    }

    const roles = target.roles.cache.filter(role =>
      role.id !== target.guild.id && !role.managed && role.permissions.has(PermissionFlagsBits.Administrator));
    for (const role of roles.values()) {
      if (!role.editable) throw new DomainError('ADMIN_ROLE_UNMANAGEABLE', `Angrier Jordan cannot suspend ${role.name}, so confinement cannot proceed.`);
    }
    return [...roles.keys()];
  }

  private async requireJailedRole(server: Guild) {
    const id = await roleId(this.config, server.id, 'roles.jailed');
    const role = id ? server.roles.cache.get(id) : null;
    if (!role) throw new DomainError('JAILED_ROLE_MISSING', 'The Jailed role is not configured correctly.');
    if (!role.editable) throw new DomainError('JAILED_ROLE_UNMANAGEABLE', 'Angrier Jordan cannot manage the Jailed role.');
    return role;
  }

  private visibleOrdinaryChannels(member: GuildMember, hotseatId: string | null) {
    return member.guild.channels.cache.filter(channel =>
      channel.id !== hotseatId &&
      channel.type !== ChannelType.GuildCategory &&
      'permissionsFor' in channel &&
      Boolean(channel.permissionsFor(member)?.has(PermissionFlagsBits.ViewChannel)));
  }

  private async staffLevel(member: GuildMember): Promise<StaffLevel> {
    if (member.id === member.guild.ownerId) return 'throne';
    const [throne, chaise, recliner] = await Promise.all(
      ['roles.throne', 'roles.chaise_lounge', 'roles.recliner'].map(key => roleId(this.config, member.guild.id, key)),
    );
    if (throne && member.roles.cache.has(throne)) return 'throne';
    if (chaise && member.roles.cache.has(chaise)) return 'chaise_lounge';
    if (recliner && member.roles.cache.has(recliner)) return 'recliner';
    return 'member';
  }

  private async requireStaff(member: GuildMember, minimum: StaffLevel) {
    const level = await this.staffLevel(member);
    if (staffRank[level] < staffRank[minimum]) {
      throw new DomainError('STAFF_PERMISSION_REQUIRED', 'You do not have permission to use this Hotseat control.');
    }
  }

  private async reconcileChannel(
    channel: GuildBasedChannel,
    jailedId: string,
    hotseatId: string | null,
    links: boolean,
    attachments: boolean,
  ) {
    if (!('permissionOverwrites' in channel)) return;
    const isHotseat = channel.id === hotseatId;
    const permissions = isHotseat
      ? {
          ViewChannel: true,
          SendMessages: true,
          AddReactions: true,
          UseApplicationCommands: true,
          AttachFiles: attachments,
          EmbedLinks: links,
          CreatePublicThreads: false,
          CreatePrivateThreads: false,
          SendMessagesInThreads: false,
          Connect: false,
          Speak: false,
        }
      : {
          ViewChannel: false,
          SendMessages: false,
          AddReactions: false,
          UseApplicationCommands: false,
          Connect: false,
          Speak: false,
        };
    await channel.permissionOverwrites.edit(jailedId, permissions, { reason: 'Angrier Jordan Hotseat permission reconciliation.' }).catch(() => undefined);
  }
}
