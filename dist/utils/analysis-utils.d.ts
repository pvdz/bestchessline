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
export declare function compareAnalysisMoves(a: {
    score: number;
    depth: number;
    mateIn: number;
}, b: {
    score: number;
    depth: number;
    mateIn: number;
}, direction?: "asc" | "desc"): number;
/**
 * Calculate total positions with overrides
 */
export declare function calculateTotalPositionsWithOverrides(maxDepth: number, responderResponses: number, firstReplyOverride?: number, secondReplyOverride?: number): number;
