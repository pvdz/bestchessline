import { SimpleMove } from "../../utils/types.js";
import type { AnalysisMove, AnalysisResult } from "../types.js";
/**
 * Generate line ID from SAN moves
 */
export declare function generateLineId(sans: string[]): string;
export declare function getRandomProofString(): string;
export declare function sortPvMoves(moves: AnalysisMove[], firstMoveTurn: "w" | "b", _maxDepth?: number): AnalysisMove[];
export declare function getTopLines(rootFEN: string, // this is used to update the server for the practice app.
moves: string[] | null, // long moves. set to null when this is unknown. this is used to update the server for the practice app.
nowFEN: string, // fen to compute next moves from
searchLineCount: number, maxDepth: number, { threads, onUpdate, targetMove, }?: {
    threads?: number;
    onUpdate?: (res: AnalysisResult) => void;
    targetMove?: string;
}): Promise<SimpleMove[]>;
export declare function getTopLinesTrapped(fen: string, targetLines: number, options?: {
    maxDepth?: number;
    threads?: number;
    onUpdate?: (res: AnalysisResult) => void;
}): Promise<SimpleMove[] | null>;
export declare function filterPvMoves(moves: AnalysisMove[], maxDepth?: number): AnalysisMove[];
export declare function sortedAnalysisMovesToSimpleMoves(moves: AnalysisMove[], targetLines?: number, maxDepth?: number): SimpleMove[];
