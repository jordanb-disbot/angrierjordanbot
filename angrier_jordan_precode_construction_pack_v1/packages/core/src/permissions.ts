export type StaffRole = 'member'|'recliner'|'chaise_lounge'|'throne';
export type CapabilityRole=StaffRole|'discord_administrator'|'guild_owner';
export type CapabilityMap = Record<string, readonly CapabilityRole[]>;
const rank: Record<StaffRole, number> = { member:0, recliner:1, chaise_lounge:2, throne:3 };
export class PermissionEngine {
  constructor(private readonly capabilities: CapabilityMap) {}
  can(role: StaffRole, capability: string): boolean { return (this.capabilities[capability] ?? []).includes(role); }
  canDashboard(actor:{isGuildOwner:boolean;administrator:boolean},capability:string):boolean{
    const allowed=this.capabilities[capability]??[];
    return (actor.isGuildOwner&&allowed.includes('guild_owner'))||(actor.administrator&&allowed.includes('discord_administrator'));
  }
  atLeast(actual: StaffRole, required: StaffRole): boolean { return rank[actual] >= rank[required]; }
}
