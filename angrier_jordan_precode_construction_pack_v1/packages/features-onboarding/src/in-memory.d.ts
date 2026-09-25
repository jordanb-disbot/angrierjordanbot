import type { OnboardingRepository } from './repository.js';
import type { MemberPresence, PunishmentState, RoleSnapshot, SelfRolePanelDefinition, SelfRoleSelection } from './types.js';
export declare class InMemoryOnboardingRepository implements OnboardingRepository {
    readonly members: Set<string>;
    readonly presences: Map<string, MemberPresence>;
    readonly snapshots: Map<string, RoleSnapshot[]>;
    readonly punishments: Map<string, PunishmentState[]>;
    readonly selections: Map<string, SelfRoleSelection[]>;
    panel: SelfRolePanelDefinition | null;
    ensureMember(g: string, u: string): Promise<void>;
    getPresence(g: string, u: string): Promise<MemberPresence | null>;
    markJoined(g: string, u: string, now: Date): Promise<MemberPresence>;
    markLeft(input: {
        guildId: string;
        userId: string;
        nickname?: string;
        now: Date;
    }): Promise<MemberPresence>;
    acknowledgeRules(g: string, u: string, now: Date): Promise<MemberPresence>;
    setRoleSnapshots(g: string, u: string, roles: readonly RoleSnapshot[], now: Date): Promise<void>;
    listRoleSnapshots(g: string, u: string): Promise<RoleSnapshot[]>;
    markRoleRestoreComplete(g: string, u: string): Promise<void>;
    pauseActivePunishments(g: string, u: string, now: Date): Promise<PunishmentState[]>;
    resumePausedPunishments(g: string, u: string, now: Date): Promise<PunishmentState[]>;
    listActivePunishments(g: string, u: string, now: Date): Promise<{
        id: string;
        kind: "CRIME" | "MODERATION" | string;
        reason: string;
        endsAt: Date;
        indefinite?: boolean;
        pausedAt?: Date;
        pausedRemainingSeconds?: number;
    }[]>;
    getSelfRolePanel(g: string): Promise<SelfRolePanelDefinition | null>;
    listSelfRoleSelections(g: string, u: string): Promise<{
        guildId: string;
        userId: string;
        roleId: string;
        categoryKey: string;
        active: boolean;
        selectedAt: Date;
        archivedAt?: Date;
    }[]>;
    replaceSelfRoleCategorySelections(input: {
        guildId: string;
        userId: string;
        categoryKey: string;
        roleIds: readonly string[];
        now: Date;
    }): Promise<{
        guildId: string;
        userId: string;
        roleId: string;
        categoryKey: string;
        active: boolean;
        selectedAt: Date;
    }[]>;
}
