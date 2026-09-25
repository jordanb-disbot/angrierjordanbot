export interface SettingDefinition {
    key: string;
    type: string;
    default: unknown;
    mutable: boolean;
    min?: number;
    max?: number;
    choices?: readonly string[];
}
export interface ValidationResult {
    ok: boolean;
    value?: unknown;
    error?: string;
}
export declare class ConfigValidator {
    private readonly definitions;
    constructor(definitions: readonly SettingDefinition[]);
    definition(key: string): SettingDefinition | undefined;
    validate(key: string, value: unknown): ValidationResult;
}
