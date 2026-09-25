export type StaffRole = 'member'|'recliner'|'chaise_lounge'|'throne';
export type CapabilityMap = Record<string, readonly StaffRole[]>;
const rank: Record<StaffRole, number> = { member:0, recliner:1, chaise_lounge:2, throne:3 };
export class PermissionEngine {
  constructor(private readonly capabilities: CapabilityMap) {}
  can(role: StaffRole, capability: string): boolean { return (this.capabilities[capability] ?? []).includes(role); }
  atLeast(actual: StaffRole, required: StaffRole): boolean { return rank[actual] >= rank[required]; }
}
