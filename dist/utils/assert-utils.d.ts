export declare function setAssertionsEnabled(enabled: boolean): void;
export declare function getAssertionsEnabled(): boolean;
export declare function ASSERT(condition: unknown, message: string, context?: Record<string, unknown>): asserts condition;
export declare function assertFenParsable(label: string, fen: string, extra?: Record<string, unknown>): void;
