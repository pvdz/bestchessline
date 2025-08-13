import { SimpleMove } from "../../utils/types.js";
import type { AnalysisMove, AnalysisResult } from "../types.js";
/**
 * Generate line ID from SAN moves
 */
export declare function generateLineId(sans: string[]): string;
export declare function getRandomProofString(): string;
export declare function sortPvMoves(moves: AnalysisMove[], firstMoveTurn: "w" | "b", _maxDepth?: number): AnalysisMove[];
export declare function getTopLines(fen: string, targetLines: number, { maxDepth, threads, onUpdate, }?: {
    maxDepth?: number;
    threads?: number;
    onUpdate?: (res: AnalysisResult) => void;
}): Promise<SimpleMove[]>;
export declare function getTopLinesTrapped(fen: string, targetLines: number, options?: {
    maxDepth?: number;
    threads?: number;
    onUpdate?: (res: AnalysisResult) => void;
}): Promise<SimpleMove[] | null>;
export declare function filterPvMoves(moves: AnalysisMove[], maxDepth?: number): AnalysisMove[];
export declare function sortedAnalysisMovesToSimpleMoves(moves: AnalysisMove[], targetLines?: number, maxDepth?: number): SimpleMove[];
