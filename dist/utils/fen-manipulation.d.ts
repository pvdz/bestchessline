/**
 * FEN Manipulation Functions
 *
 * Provides functions for manipulating FEN strings, including applying moves
 * and updating position state.
 */
export declare function applyLongMoveToFEN(fen: string, move: string, opts?: {
    assert?: boolean;
}): string;
/**
 * Apply a chess move to a FEN string and return the new FEN
 */
export declare function applyMoveToFEN(fen: string, move: {
    from: string;
    to: string;
    piece: string;
    special?: "castling" | "en-passant";
    rookFrom?: string;
    rookTo?: string;
}, opts?: {
    assert?: boolean;
}): string;
