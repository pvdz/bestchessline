/**
 * Analysis Utility Functions
 * 
 * Provides functions for analyzing chess moves, comparing scores,
 * and calculating position counts for tree analysis.
 */

/**
 * Compare two analysis moves for sorting. The moves should always be for the same player
 * from the same position, maybe even the same piece (with different targets).
 * Mate is always the best move. When two moves mate or have same score, use consistent ordering.
 *
 * @param a First analysis move. Score is negative if in favor of black, otherwise in favor of white
 * @param b Second analysis move. Score is negative if in favor of black, otherwise in favor of white
 * @param direction The sort direction ("asc" for ascending, "desc" for descending)
 * @returns Negative if a should come before b, positive if b should come before a, 0 if equal
 */
export function compareAnalysisMoves(
  a: { score: number; depth: number; mateIn: number },
  b: { score: number; depth: number; mateIn: number },
  direction: "asc" | "desc" = "desc",
): number {
  // Determine if moves are mate moves (|score| > 9000 indicates mate)
  const aIsMate = Math.abs(a.score) > 9000;
  const bIsMate = Math.abs(b.score) > 9000;

  // Handle mate moves with highest priority
  if (aIsMate && !bIsMate) return -1; // a is mate, b is not
  if (!aIsMate && bIsMate) return 1; // b is mate, a is not
  if (aIsMate && bIsMate) {
    // Both are mate moves, prefer shorter mates (lower mateIn value)
    return a.mateIn - b.mateIn;
  }

  // Prefer scores that have been checked deeper. Neither is mate so then it's just a move.
  if (a.depth !== b.depth) return b.depth - a.depth;

  // Both are non-mate moves, sort by score based on direction
  if (direction === "asc") {
    // Ascending order: low to high scores (good for black's turn)
    return a.score - b.score;
  } else {
    // Descending order: high to low scores (good for white's turn)
    return b.score - a.score;
  }
}

/**
 * Calculate total positions with overrides
 */
export function calculateTotalPositionsWithOverrides(
  maxDepth: number,
  responderResponses: number,
  firstReplyOverride: number = 0,
  secondReplyOverride: number = 0,
): number {
  if (responderResponses === 1) {
    // Special case: if n=1, it's just maxDepth + 1
    return maxDepth + 1;
  }

  let total = 1; // Start with root node

  for (let i = 1; i <= maxDepth; i++) {
    let nextN = responderResponses;
    if (i === 0) nextN = firstReplyOverride || responderResponses;
    else if (i === 1) nextN = secondReplyOverride || responderResponses;

    total += 2 * Math.pow(nextN, i);
  }

  return total;
} 