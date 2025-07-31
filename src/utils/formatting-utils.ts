/**
 * Formatting Utility Functions
 * 
 * Provides functions for formatting scores, times, and other display-related
 * utilities for the chess application.
 */

/**
 * Format a score with proper mate notation using mateIn
 * @param score The score in centipawns
 * @param mateIn The number of moves required for mate (0 if not a mate)
 * @returns Formatted score string
 */
export function formatScoreWithMateIn(score: number, mateIn: number): string {
  if (mateIn > 0) {
    // Mate in X moves
    return score > 0 ? `+M${mateIn}` : `-M${mateIn}`;
  } else if (Math.abs(score) >= 10000) {
    // Mate but mateIn is 0 (shouldn't happen, but fallback. or maybe that's just the current board state? #)
    return score > 0 ? `+#` : `-#`;
  } else {
    // Regular score in pawns
    const scoreInPawns = score / 100;
    return score > 0
      ? `+${scoreInPawns.toFixed(1)}`
      : `${scoreInPawns.toFixed(1)}`;
  }
}
