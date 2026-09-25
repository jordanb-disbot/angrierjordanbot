const rank = { member: 0, recliner: 1, chaise_lounge: 2, throne: 3 };
export class PermissionEngine {
    capabilities;
    constructor(capabilities) {
        this.capabilities = capabilities;
    }
    can(role, capability) { return (this.capabilities[capability] ?? []).includes(role); }
    atLeast(actual, required) { return rank[actual] >= rank[required]; }
}
//# sourceMappingURL=permissions.js.map