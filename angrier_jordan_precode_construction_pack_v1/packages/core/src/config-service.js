import { ConfigValidator } from './config.js';
import { DomainError } from './errors.js';
export class ConfigService {
    repository;
    audit;
    validator;
    definitionsByKey;
    constructor(definitions, repository, audit) {
        this.repository = repository;
        this.audit = audit;
        this.validator = new ConfigValidator(definitions);
        this.definitionsByKey = new Map(definitions.map(d => [d.key, d]));
    }
    definition(key) { return this.definitionsByKey.get(key); }
    async get(guildId, key) {
        const definition = this.definition(key);
        if (!definition)
            throw new DomainError('UNKNOWN_SETTING', `Unknown setting: ${key}`);
        const row = await this.repository.get(guildId, key);
        return row?.value ?? definition.default;
    }
    async getWithMetadata(guildId, key) {
        const definition = this.definition(key);
        if (!definition)
            throw new DomainError('UNKNOWN_SETTING', `Unknown setting: ${key}`);
        const row = await this.repository.get(guildId, key);
        if (!row)
            return { value: definition.default, source: 'default', version: 0 };
        return { value: row.value, source: row.source, version: row.version, updatedAt: row.updatedAt };
    }
    async set(input) {
        const result = this.validator.validate(input.key, input.value);
        if (!result.ok)
            throw new DomainError(result.error ?? 'INVALID_SETTING', `Invalid value for ${input.key}: ${result.error ?? 'validation failed'}`);
        const before = await this.getWithMetadata(input.guildId, input.key);
        const row = await this.repository.set({
            guildId: input.guildId, key: input.key, value: result.value, source: input.source ?? 'dashboard',
            ...(input.actorUserId === undefined ? {} : { actorUserId: input.actorUserId }),
            ...(input.expectedVersion === undefined ? {} : { expectedVersion: input.expectedVersion }),
            rollbackSafe: input.rollbackSafe ?? true,
        });
        await this.audit.record({
            guildId: input.guildId,
            ...(input.actorUserId === undefined ? {} : { actorUserId: input.actorUserId }),
            source: input.source ?? 'dashboard', action: 'config.set', targetType: 'setting', targetId: input.key,
            before: { value: before.value, source: before.source, version: before.version },
            after: { value: row.value, source: row.source, version: row.version }, requestId: input.requestId, createdAt: new Date(),
        });
        return row;
    }
    async rollback(input) {
        const history = await this.repository.revisions(input.guildId, input.key, 100);
        const revision = history.find(r => r.version === input.toVersion);
        if (!revision)
            throw new DomainError('REVISION_NOT_FOUND', `No revision ${input.toVersion} exists for ${input.key}.`);
        if (!revision.rollbackSafe)
            throw new DomainError('ROLLBACK_UNSAFE', `Revision ${input.toVersion} is not safe to restore automatically.`);
        const current = await this.getWithMetadata(input.guildId, input.key);
        return this.set({
            guildId: input.guildId, key: input.key, value: revision.value,
            ...(input.actorUserId === undefined ? {} : { actorUserId: input.actorUserId }),
            source: 'rollback', requestId: input.requestId, expectedVersion: current.version, rollbackSafe: true,
        });
    }
}
//# sourceMappingURL=config-service.js.map