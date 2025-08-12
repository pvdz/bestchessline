import type { DBExecutor } from "./db.js";
import type { LineFisherConfig } from "../line/fish/types.js";
export interface PutLineBody {
    sessionId: string;
    rootFEN: string;
    config?: Partial<LineFisherConfig>;
    line: Partial<FishLineLike> & {
        lineIndex: number;
        pcns: string[];
        position?: string;
    };
}
export interface MoveScorePair {
    move: string;
    score: number;
}
export interface FishLineLike {
    lineIndex: number;
    pcns: string[];
    sanGame?: string;
    score: number;
    position: string;
    isDone: boolean;
    isFull: boolean;
    isMate: boolean;
    isStalemate: boolean;
    isTransposition: boolean;
    transpositionTarget?: string;
    best5Replies: MoveScorePair[];
    best5Alts: MoveScorePair[];
}
export interface StoredFishLine extends FishLineLike {
    id: number;
    sessionId: string;
    createdAt: number;
    updatedAt: number;
}
export declare function initSchemaFish(exec: DBExecutor): Promise<void>;
export declare function upsertFishSession(exec: DBExecutor, sessionId: string, rootFEN: string, config: Partial<LineFisherConfig>, createdAt: number): Promise<void>;
export declare function insertOrReplaceFishLine(exec: DBExecutor, sessionId: string, lineIndex: number, line: FishLineLike): Promise<number>;
export declare function getFishLinesBySession(exec: DBExecutor, sessionId: string): Promise<StoredFishLine[]>;
export declare function getRandomFishLines(exec: DBExecutor, limit: number): Promise<StoredFishLine[]>;
export declare function getFishLinesByPosition(exec: DBExecutor, position: string): Promise<StoredFishLine[]>;
