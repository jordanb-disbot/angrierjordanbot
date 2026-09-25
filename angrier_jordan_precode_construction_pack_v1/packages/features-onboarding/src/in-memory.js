const key = (g, u) => `${g}:${u}`;
const clonePresence = (x) => ({ ...x });
const cloneRole = (x) => ({ ...x, ...(x.expiresAt ? { expiresAt: new Date(x.expiresAt) } : {}), ...(x.metadata ? { metadata: { ...x.metadata } } : {}) });
export class InMemoryOnboardingRepository {
    members = new Set();
    presences = new Map();
    snapshots = new Map();
    punishments = new Map();
    selections = new Map();
    panel = null;
    async ensureMember(g, u) { this.members.add(key(g, u)); if (!this.presences.has(key(g, u)))
        this.presences.set(key(g, u), { guildId: g, userId: u, needsRulesAck: true, pendingRoleRestore: false }); }
    async getPresence(g, u) { const x = this.presences.get(key(g, u)); return x ? clonePresence(x) : null; }
    async markJoined(g, u, now) { await this.ensureMember(g, u); const p = this.presences.get(key(g, u)); Object.assign(p, { needsRulesAck: true, joinedAt: now }); return clonePresence(p); }
    async markLeft(input) { await this.ensureMember(input.guildId, input.userId); const p = this.presences.get(key(input.guildId, input.userId)); p.leftAt = input.now; p.pendingRoleRestore = true; if (input.nickname !== undefined)
        p.nickname = input.nickname; return clonePresence(p); }
    async acknowledgeRules(g, u, now) { await this.ensureMember(g, u); const p = this.presences.get(key(g, u)); p.needsRulesAck = false; p.rulesAcknowledgedAt = now; return clonePresence(p); }
    async setRoleSnapshots(g, u, roles, now) { this.snapshots.set(key(g, u), roles.map(cloneRole)); const p = this.presences.get(key(g, u)); if (p)
        p.roleSnapshotCapturedAt = now; }
    async listRoleSnapshots(g, u) { return (this.snapshots.get(key(g, u)) ?? []).map(cloneRole); }
    async markRoleRestoreComplete(g, u) { const p = this.presences.get(key(g, u)); if (p)
        p.pendingRoleRestore = false; }
    async pauseActivePunishments(g, u, now) { const list = this.punishments.get(key(g, u)) ?? []; const out = []; for (const p of list) {
        if ((p.indefinite || p.endsAt.getTime() > now.getTime()) && !p.pausedAt) {
            if (!p.indefinite)
                p.pausedRemainingSeconds = Math.max(0, Math.ceil((p.endsAt.getTime() - now.getTime()) / 1000));
            p.pausedAt = now;
            out.push({ ...p });
        }
    } return out; }
    async resumePausedPunishments(g, u, now) { const list = this.punishments.get(key(g, u)) ?? []; const out = []; for (const p of list) {
        if (p.pausedAt) {
            if (!p.indefinite && p.pausedRemainingSeconds !== undefined && p.pausedRemainingSeconds > 0)
                p.endsAt = new Date(now.getTime() + p.pausedRemainingSeconds * 1000);
            delete p.pausedAt;
            delete p.pausedRemainingSeconds;
            out.push({ ...p });
        }
    } return out; }
    async listActivePunishments(g, u, now) { return (this.punishments.get(key(g, u)) ?? []).filter(p => p.indefinite || (p.pausedAt !== undefined) || (p.endsAt.getTime() > now.getTime())).map(p => ({ ...p })); }
    async getSelfRolePanel(g) { return this.panel?.guildId === g ? structuredClone(this.panel) : null; }
    async listSelfRoleSelections(g, u) { return (this.selections.get(key(g, u)) ?? []).map(x => ({ ...x })); }
    async replaceSelfRoleCategorySelections(input) { const k = key(input.guildId, input.userId); const existing = this.selections.get(k) ?? []; const keep = existing.filter(x => x.categoryKey !== input.categoryKey); const next = input.roleIds.map(roleId => ({ guildId: input.guildId, userId: input.userId, roleId, categoryKey: input.categoryKey, active: true, selectedAt: input.now })); this.selections.set(k, [...keep, ...next]); return next.map(x => ({ ...x })); }
}
//# sourceMappingURL=in-memory.js.map