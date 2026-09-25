import { DomainError } from '../../core/src/index.js';
const allowedRestore = (role, now) => {
    if (role.kind === 'STAFF' || role.kind === 'BOOSTER' || role.kind === 'SYSTEM')
        return false;
    if (role.kind === 'TEMPORARY' && role.expiresAt && role.expiresAt.getTime() <= now.getTime())
        return false;
    return true;
};
export class OnboardingService {
    repository;
    audit;
    clock;
    constructor(repository, audit, clock) {
        this.repository = repository;
        this.audit = audit;
        this.clock = clock;
    }
    async memberJoined(guildId, userId) {
        await this.repository.ensureMember(guildId, userId);
        const now = this.clock.now();
        await this.repository.markJoined(guildId, userId, now);
        await this.audit.record({ guildId, actorUserId: userId, source: 'discord', action: 'member.rejoin_gate', targetType: 'member', targetId: userId, after: { needsRulesAck: true }, requestId: `join:${guildId}:${userId}:${now.getTime()}`, createdAt: now });
        return { needsRulesAck: true };
    }
    async memberLeft(input) {
        await this.repository.ensureMember(input.guildId, input.userId);
        const now = this.clock.now();
        await this.repository.setRoleSnapshots(input.guildId, input.userId, input.roles, now);
        await this.repository.markLeft({ guildId: input.guildId, userId: input.userId, ...(input.nickname === undefined ? {} : { nickname: input.nickname }), now });
        const paused = await this.repository.pauseActivePunishments(input.guildId, input.userId, now);
        await this.audit.record({ guildId: input.guildId, actorUserId: input.userId, source: 'discord', action: 'member.leave_snapshot', targetType: 'member', targetId: input.userId, after: { roleCount: input.roles.length, pausedPunishmentIds: paused.map(x => x.id) }, requestId: `leave:${input.guildId}:${input.userId}:${now.getTime()}`, createdAt: now });
        return { pausedPunishmentIds: paused.map(x => x.id) };
    }
    async acknowledgeRules(guildId, userId) {
        await this.repository.ensureMember(guildId, userId);
        const now = this.clock.now();
        await this.repository.acknowledgeRules(guildId, userId, now);
        const resumed = await this.repository.resumePausedPunishments(guildId, userId, now);
        const active = await this.repository.listActivePunishments(guildId, userId, now);
        const punished = active.length > 0;
        const presence = await this.repository.getPresence(guildId, userId);
        const snapshots = await this.repository.listRoleSnapshots(guildId, userId);
        const rolesToRestore = punished ? [] : snapshots.filter(role => allowedRestore(role, now));
        const plan = {
            guildId, userId, grantMemberAccess: !punished, applyJailedRole: punished, rolesToRestore,
            ...(presence?.nickname ? { nickname: presence.nickname } : {}), punishmentIds: active.map(x => x.id), deferredBecausePunished: punished,
        };
        await this.audit.record({ guildId, actorUserId: userId, source: 'discord', action: 'onboarding.rules_acknowledged', targetType: 'member', targetId: userId, after: { grantMemberAccess: plan.grantMemberAccess, applyJailedRole: plan.applyJailedRole, restoreRoleCount: rolesToRestore.length, resumedPunishmentIds: resumed.map(x => x.id) }, requestId: `rules:${guildId}:${userId}:${now.getTime()}`, createdAt: now });
        return plan;
    }
    async buildPostPunishmentRestorePlan(guildId, userId) {
        const now = this.clock.now();
        const active = await this.repository.listActivePunishments(guildId, userId, now);
        if (active.length)
            throw new DomainError('PUNISHMENT_ACTIVE', 'Member still has an active punishment.');
        const presence = await this.repository.getPresence(guildId, userId);
        if (!presence || presence.needsRulesAck)
            throw new DomainError('RULES_ACK_REQUIRED', 'Rules must be acknowledged before access is restored.');
        const snapshots = await this.repository.listRoleSnapshots(guildId, userId);
        return { guildId, userId, grantMemberAccess: true, applyJailedRole: false, rolesToRestore: snapshots.filter(role => allowedRestore(role, now)), ...(presence.nickname ? { nickname: presence.nickname } : {}), punishmentIds: [], deferredBecausePunished: false };
    }
    async completeRoleRestore(guildId, userId, input) {
        await this.repository.markRoleRestoreComplete(guildId, userId);
        const now = this.clock.now();
        await this.audit.record({ guildId, source: 'discord', action: 'member.restore_complete', targetType: 'member', targetId: userId, after: { restoredRoleIds: [...input.restoredRoleIds], failed: [...input.failed], nicknameRestored: input.nicknameRestored, ...(input.nicknameFailure ? { nicknameFailure: input.nicknameFailure } : {}) }, requestId: `restore:${guildId}:${userId}:${now.getTime()}`, createdAt: now });
    }
    async rolePanel(guildId, userId) {
        await this.repository.ensureMember(guildId, userId);
        const panel = await this.repository.getSelfRolePanel(guildId);
        if (!panel || !panel.enabled)
            throw new DomainError('ROLE_PANEL_DISABLED', 'The role panel is not currently available.');
        return { panel, selections: await this.repository.listSelfRoleSelections(guildId, userId) };
    }
    async planRoleCategoryUpdate(input) {
        const { panel, selections } = await this.rolePanel(input.guildId, input.userId);
        const category = panel.categories.find(c => c.key === input.categoryKey);
        if (!category)
            throw new DomainError('ROLE_CATEGORY_NOT_FOUND', `Unknown role category ${input.categoryKey}.`);
        const requested = [...new Set(input.selectedRoleIds)];
        if (category.mode === 'single' && requested.length > 1)
            throw new DomainError('ROLE_CATEGORY_SINGLE_CHOICE', `${category.label} allows at most one selection.`);
        const allowed = new Set(category.options.filter(o => o.enabled && !o.archived).map(o => o.roleId));
        for (const roleId of requested)
            if (!allowed.has(roleId))
                throw new DomainError('ROLE_OPTION_NOT_AVAILABLE', `Role ${roleId} is not selectable in ${category.label}.`);
        const before = selections.filter(s => s.categoryKey === category.key && s.active).map(s => s.roleId);
        const beforeSet = new Set(before), afterSet = new Set(requested);
        return { categoryKey: category.key, addRoleIds: requested.filter(x => !beforeSet.has(x)), removeRoleIds: before.filter(x => !afterSet.has(x)), selectedRoleIds: requested };
    }
    async updateRoleCategory(input) {
        const now = this.clock.now();
        const plan = await this.planRoleCategoryUpdate(input);
        const before = await this.repository.listSelfRoleSelections(input.guildId, input.userId);
        const previous = before.filter(s => s.categoryKey === plan.categoryKey && s.active).map(s => s.roleId);
        await this.repository.replaceSelfRoleCategorySelections({ guildId: input.guildId, userId: input.userId, categoryKey: plan.categoryKey, roleIds: plan.selectedRoleIds, now });
        await this.audit.record({ guildId: input.guildId, actorUserId: input.userId, source: 'discord', action: 'roles.selection_changed', targetType: 'role_category', targetId: plan.categoryKey, before: { roleIds: previous }, after: { roleIds: plan.selectedRoleIds }, requestId: `roles:${input.guildId}:${input.userId}:${plan.categoryKey}:${now.getTime()}`, createdAt: now });
        return plan;
    }
    async currentRoleSnapshots(guildId, userId) { return this.repository.listRoleSnapshots(guildId, userId); }
}
//# sourceMappingURL=service.js.map