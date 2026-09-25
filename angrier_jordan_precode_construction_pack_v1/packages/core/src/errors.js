export class DomainError extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.code = code;
        this.name = 'DomainError';
    }
}
export function invariant(condition, code, message) {
    if (!condition)
        throw new DomainError(code, message);
}
//# sourceMappingURL=errors.js.map