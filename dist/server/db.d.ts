import type { PutLineBody, StoredFishLine } from "./db-lines.js";
import type { CoachMessage, CoachMessageKey } from "./db-coach.js";
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
export declare function writeLine(body: PutLineBody): Promise<{
    ok: true;
    id: number;
}>;
export declare function readLines(sessionId: string): Promise<StoredFishLine[]>;
export declare function readLinesByPosition(position: string): Promise<StoredFishLine[]>;
export declare function writeCoachMessage(msg: CoachMessage): Promise<{
    ok: true;
}>;
export declare function readCoachMessage(key: CoachMessageKey): Promise<CoachMessage | null>;
export declare function readRandomLines(limit: number): Promise<StoredFishLine[]>;
