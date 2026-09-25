export class ConfigValidator {
    definitions;
    constructor(definitions) {
        this.definitions = definitions;
    }
    definition(key) { return this.definitions.find(d => d.key === key); }
    validate(key, value) {
        const d = this.definition(key);
        if (!d)
            return { ok: false, error: 'UNKNOWN_SETTING' };
        if (!d.mutable)
            return { ok: false, error: 'IMMUTABLE_SETTING' };
        if (d.type === 'boolean' && typeof value !== 'boolean')
            return { ok: false, error: 'EXPECTED_BOOLEAN' };
        if (d.type === 'integer') {
            if (!Number.isInteger(value))
                return { ok: false, error: 'EXPECTED_INTEGER' };
            const n = value;
            if (d.min !== undefined && n < d.min)
                return { ok: false, error: 'BELOW_MIN' };
            if (d.max !== undefined && n > d.max)
                return { ok: false, error: 'ABOVE_MAX' };
        }
        if (d.type === 'choice' && (!d.choices || !d.choices.includes(String(value))))
            return { ok: false, error: 'INVALID_CHOICE' };
        if (['string', 'discord_channel', 'discord_role'].includes(d.type) && !(typeof value === 'string' || value === null))
            return { ok: false, error: 'EXPECTED_STRING_OR_NULL' };
        return { ok: true, value };
    }
}
//# sourceMappingURL=config.js.map