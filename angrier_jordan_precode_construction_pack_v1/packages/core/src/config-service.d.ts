import type { AuditService } from './audit.js';
import { type SettingDefinition } from './config.js';
export interface ConfigRecord {
    guildId: string;
    key: string;
    value: unknown;
    source: string;
    version: number;
    updatedBy?: string;
    updatedAt: Date;
}
export interface ConfigRevisionRecord {
    guildId: string;
    key: string;
    version: number;
    value: unknown;
    source: string;
    actorUserId?: string;
    rollbackSafe: boolean;
    createdAt: Date;
}
export interface ConfigRepository {
    get(guildId: string, key: string): Promise<ConfigRecord | null>;
    set(input: {
        guildId: string;
        key: string;
        value: unknown;
        source: string;
        actorUserId?: string;
        expectedVersion?: number;
        rollbackSafe: boolean;
    }): Promise<ConfigRecord>;
    revisions(guildId: string, key: string, limit?: number): Promise<ConfigRevisionRecord[]>;
}
export interface ConfigSetInput {
    guildId: string;
    key: string;
    value: unknown;
    actorUserId?: string;
    source?: string;
    requestId: string;
    expectedVersion?: number;
    rollbackSafe?: boolean;
}
export declare class ConfigService {
    private readonly repository;
    private readonly audit;
    private readonly validator;
    private readonly definitionsByKey;
    constructor(definitions: readonly SettingDefinition[], repository: ConfigRepository, audit: AuditService);
    definition(key: string): SettingDefinition | undefined;
    get(guildId: string, key: string): Promise<unknown>;
    getWithMetadata(guildId: string, key: string): Promise<{
        value: unknown;
        source: string;
        version: number;
        updatedAt?: Date;
    }>;
    set(input: ConfigSetInput): Promise<ConfigRecord>;
    rollback(input: {
        guildId: string;
        key: string;
        toVersion: number;
        actorUserId?: string;
        requestId: string;
    }): Promise<ConfigRecord>;
}
