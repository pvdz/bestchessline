import type { CoachMessage, CoachMessageKey } from "./db-coach.js";
import { ServerLine } from "./types.js";
export type SqlValue = string | number | null;
export declare function boolToInt(value: boolean): number;
export declare function intToBool(value: number): boolean;
export interface DBExecutor {
    run: (sql: string, params?: ReadonlyArray<SqlValue>) => Promise<{
        lastID?: number;
        changes?: number;
    }>;
    get: <T>(sql: string, params?: ReadonlyArray<SqlValue>) => Promise<T | undefined>;
    all: <T>(sql: string, params?: ReadonlyArray<SqlValue>) => Promise<T[]>;
}
export declare function createSQLiteCliExecutor(dbPath: string): DBExecutor;
export declare function writeLine(body: {
    sessionId: string;
    line: ServerLine;
}): Promise<{
    ok: true;
    id: number;
}>;
export declare function readLinesByPosition(position: string, searchLineCount: number, maxDepth: number): Promise<ServerLine[]>;
export declare function readLineByPosition(position: string, searchLineCount: number, maxDepth: number): Promise<ServerLine | null>;
export declare function writeCoachMessage(msg: CoachMessage): Promise<{
    ok: true;
}>;
export declare function readCoachMessage(key: CoachMessageKey): Promise<CoachMessage | null>;
export declare function readRandomLines(limit: number): Promise<ServerLine[]>;
export declare function truncateDatabase(): Promise<{
    ok: true;
}>;
