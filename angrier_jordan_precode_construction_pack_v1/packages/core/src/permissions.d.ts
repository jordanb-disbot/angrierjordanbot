export type StaffRole = 'member' | 'recliner' | 'chaise_lounge' | 'throne';
export type CapabilityMap = Record<string, readonly StaffRole[]>;
export declare class PermissionEngine {
    private readonly capabilities;
    constructor(capabilities: CapabilityMap);
    can(role: StaffRole, capability: string): boolean;
    atLeast(actual: StaffRole, required: StaffRole): boolean;
}
