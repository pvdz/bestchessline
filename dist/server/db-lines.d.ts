import type { DBExecutor } from "./db.js";
import type { ServerLine } from "./types.js";
export declare function initSchemaFish(exec: DBExecutor): Promise<void>;
export declare function upsertServerLine(exec: DBExecutor, sessionId: string, line: ServerLine): Promise<number>;
export declare function getServerLineByPosition(exec: DBExecutor, position: string, searchLineCount: number, maxDepth: number): Promise<ServerLine | null>;
export declare function getRandomServerLines(exec: DBExecutor, limit: number): Promise<ServerLine[]>;
