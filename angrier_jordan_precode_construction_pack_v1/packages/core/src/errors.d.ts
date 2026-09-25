export declare class DomainError extends Error {
    readonly code: string;
    constructor(code: string, message: string);
}
export declare function invariant(condition: unknown, code: string, message: string): asserts condition;
