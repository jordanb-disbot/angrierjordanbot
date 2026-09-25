import type { OnboardingRepository } from './repository.js';
import type { MemberPresence, PunishmentState, RoleSnapshot, SelfRolePanelDefinition, SelfRoleSelection } from './types.js';
interface RowPresence {
    guildId: string;
    userId: string;
    needsRulesAck: boolean;
    rulesAcknowledgedAt: Date | null;
    joinedAt: Date | null;
    leftAt: Date | null;
    nickname: string | null;
    pendingRoleRestore: boolean;
    roleSnapshotCapturedAt: Date | null;
}
interface RowSelection {
    guildId: string;
    userId: string;
    roleId: string;
    categoryKey: string;
    active: boolean;
    selectedAt: Date;
    archivedAt: Date | null;
}
interface RowSnapshot {
    guildId: string;
    userId: string;
    roleId: string;
    kind: string;
    expiresAt: Date | null;
    capturedAt: Date;
    metadata: unknown;
}
interface RowJail {
    id: string;
    type: string;
    reason: string;
    endsAt: Date;
    indefinite: boolean;
    pausedAt: Date | null;
    pausedRemainingSeconds: number | null;
}
interface RowPanel {
    id: string;
    guildId: string;
    name: string;
    enabled: boolean;
    config: unknown;
}
interface TxLike {
    member: {
        upsert(args: unknown): Promise<unknown>;
    };
    memberPresenceState: {
        findUnique(args: unknown): Promise<RowPresence | null>;
        upsert(args: unknown): Promise<RowPresence>;
        update(args: unknown): Promise<RowPresence>;
    };
    memberRoleSnapshot: {
        deleteMany(args: unknown): Promise<unknown>;
        createMany(args: unknown): Promise<unknown>;
        findMany(args: unknown): Promise<RowSnapshot[]>;
    };
    jailSentence: {
        findMany(args: unknown): Promise<RowJail[]>;
        update(args: unknown): Promise<RowJail>;
    };
    selfRolePanel: {
        findFirst(args: unknown): Promise<RowPanel | null>;
    };
    selfRoleSelection: {
        findMany(args: unknown): Promise<RowSelection[]>;
        deleteMany(args: unknown): Promise<unknown>;
        upsert(args: unknown): Promise<RowSelection>;
    };
}
export interface OnboardingPrismaLike extends TxLike {
    $transaction<T>(fn: (tx: TxLike) => Promise<T>): Promise<T>;
}
export declare class PrismaOnboardingRepository implements OnboardingRepository {
    private readonly db;
    constructor(db: OnboardingPrismaLike);
    ensureMember(guildId: string, userId: string): Promise<void>;
    getPresence(guildId: string, userId: string): Promise<MemberPresence | null>;
    markJoined(guildId: string, userId: string, now: Date): Promise<MemberPresence>;
    markLeft(input: {
        guildId: string;
        userId: string;
        nickname?: string;
        now: Date;
    }): Promise<MemberPresence>;
    acknowledgeRules(guildId: string, userId: string, now: Date): Promise<MemberPresence>;
    setRoleSnapshots(guildId: string, userId: string, roles: readonly RoleSnapshot[], now: Date): Promise<void>;
    listRoleSnapshots(guildId: string, userId: string): Promise<{
        metadata?: Record<string, unknown>;
        expiresAt?: Date;
        roleId: string;
        kind: RoleSnapshot["kind"];
    }[]>;
    markRoleRestoreComplete(guildId: string, userId: string): Promise<void>;
    pauseActivePunishments(guildId: string, userId: string, now: Date): Promise<PunishmentState[]>;
    resumePausedPunishments(guildId: string, userId: string, now: Date): Promise<PunishmentState[]>;
    listActivePunishments(guildId: string, userId: string, now: Date): Promise<PunishmentState[]>;
    getSelfRolePanel(guildId: string): Promise<SelfRolePanelDefinition | null>;
    listSelfRoleSelections(guildId: string, userId: string): Promise<SelfRoleSelection[]>;
    replaceSelfRoleCategorySelections(input: {
        guildId: string;
        userId: string;
        categoryKey: string;
        roleIds: readonly string[];
        now: Date;
    }): Promise<SelfRoleSelection[]>;
}
export {};
