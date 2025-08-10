import type { AnalysisMove } from "../types.js";
/**
 * Generate line ID from SAN moves
 */
export declare function generateLineId(sans: string[]): string;
export declare function getRandomProofString(): string;
export declare function sortPvMoves(
  moves: AnalysisMove[],
  firstMoveTurn: "w" | "b",
  maxDepth?: number,
): AnalysisMove[];
export declare function filterPvMoves(
  moves: AnalysisMove[],
  maxDepth?: number,
): AnalysisMove[];
export declare function top5(
  moves: AnalysisMove[],
  into: {
    move: string;
    score: number;
  }[],
  firstMoveTurn: "w" | "b",
  maxDepth?: number,
): void;
