import { compareAnalysisMoves } from "../best/bestmove-utils.js";
import type { AnalysisMove } from "../types.js";

/**
 * Generate line ID from SAN moves
 */
export function generateLineId(sans: string[]): string {
  return sans.join("_") + "_" + Math.random().toString(36).substring(2, 8);
}

export function getRandomProofString(): string {
  return `R_${Math.random().toString(36).substring(2, 8)}`;
}

export function sortPvMoves(
  moves: AnalysisMove[],
  firstMoveTurn: "w" | "b",
  maxDepth: number = 20,
): AnalysisMove[] {
  const direction =
    (firstMoveTurn === "w") === (moves.length % 2 === 0) ? "desc" : "asc";
  moves.sort((a, b) =>
    compareAnalysisMoves(a, b, { direction, prioritize: "score" }),
  );
  return moves;
}

export function filterPvMoves(
  moves: AnalysisMove[],
  maxDepth: number = 20,
): AnalysisMove[] {
  return moves.filter((m) => Math.abs(m.score) > 9000 || m.depth >= maxDepth);
}

export function top5(
  moves: AnalysisMove[],
  into: { move: string; score: number }[],
  firstMoveTurn: "w" | "b",
  maxDepth: number = 20,
): void {
  if (into.length !== 0) {
    throw new Error(
      "top5 called with non-empty 'into' array; line.best5* should only be populated once so this is breaking an invariant somehow... good luck.",
    );
  }
  sortPvMoves(moves, firstMoveTurn, maxDepth);

  // Build best5 ordered by score relative to side to move, unique by move key; also record replies
  const uniqueTop: AnalysisMove[] = [];
  const seen = new Set<string>();
  for (const m of moves) {
    if (Math.abs(m.score) < 9000 && m.depth < maxDepth) continue; // Skip non-fully-explored lines
    const key = m.move.from + m.move.to;
    if (seen.has(key)) continue;
    seen.add(key);
    uniqueTop.push(m);
    if (uniqueTop.length >= 5) break;
  }
  uniqueTop.forEach((move) => {
    into.push({
      move: move.move.from + move.move.to,
      score: move.score,
    });
  });
}
