import type { AuditService, Clock } from '../../core/src/index.js';
import type { OnboardingRepository } from './repository.js';
import type { RestorePlan, RoleSelectionDelta, RoleSnapshot, SelfRolePanelDefinition, SelfRoleSelection } from './types.js';
export declare class OnboardingService {
    private readonly repository;
    private readonly audit;
    private readonly clock;
    constructor(repository: OnboardingRepository, audit: AuditService, clock: Clock);
    memberJoined(guildId: string, userId: string): Promise<{
        needsRulesAck: true;
    }>;
    memberLeft(input: {
        guildId: string;
        userId: string;
        nickname?: string;
        roles: readonly RoleSnapshot[];
    }): Promise<{
        pausedPunishmentIds: string[];
    }>;
    acknowledgeRules(guildId: string, userId: string): Promise<RestorePlan>;
    buildPostPunishmentRestorePlan(guildId: string, userId: string): Promise<RestorePlan>;
    completeRoleRestore(guildId: string, userId: string, input: {
        restoredRoleIds: readonly string[];
        failed: readonly {
            roleId: string;
            reason: string;
        }[];
        nicknameRestored: boolean;
        nicknameFailure?: string;
    }): Promise<void>;
    rolePanel(guildId: string, userId: string): Promise<{
        panel: SelfRolePanelDefinition;
        selections: SelfRoleSelection[];
    }>;
    planRoleCategoryUpdate(input: {
        guildId: string;
        userId: string;
        categoryKey: string;
        selectedRoleIds: readonly string[];
    }): Promise<RoleSelectionDelta>;
    updateRoleCategory(input: {
        guildId: string;
        userId: string;
        categoryKey: string;
        selectedRoleIds: readonly string[];
    }): Promise<RoleSelectionDelta>;
    currentRoleSnapshots(guildId: string, userId: string): Promise<RoleSnapshot[]>;
}
