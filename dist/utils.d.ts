import { ChessMove, PieceTypeNotation, ColorNotation, PieceNotation, PlayerColor } from "./types.js";
export declare function getPieceColor(piece: PieceNotation): ColorNotation;
export declare function getPieceType(piece: PieceNotation): PieceTypeNotation;
/**
 * Format a score with proper mate notation using mateIn
 * @param score The score in centipawns
 * @param mateIn The number of moves required for mate (0 if not a mate)
 * @returns Formatted score string
 */
export declare function formatScoreWithMateIn(score: number, mateIn: number): string;
export declare function formatTime(ms: number): string;
/**
 * Set the global current move index
 */
export declare function setGlobalCurrentMoveIndex(moveIndex: number): void;
/**
 * Get the global current move index
 */
export declare function getGlobalCurrentMoveIndex(): number;
/**
 * Get FEN with correct move counter based on current move index
 */
export declare function getFENWithCorrectMoveCounter(boardFEN: string, currentMoveIndex: number, castling?: string, enPassant?: string | null): string;
export declare function debounce<T extends (...args: unknown[]) => unknown>(func: T, wait: number): (...args: Parameters<T>) => void;
/**
 * Apply a chess move to a FEN string and return the new FEN
 */
export declare function applyMoveToFEN(fen: string, move: ChessMove): string;
/**
 * Get the starting player from a FEN string
 */
export declare function getStartingPlayer(fen: string): PlayerColor;
/**
 * Compare two analysis moves for sorting. The moves should always be for the same player
 * from the same position, maybe even the same piece (with different targets).
 * Mate is always the best move. When two moves mate or have same score, use consistent ordering.
 *
 * @param a First analysis move. Score is negative if in favor of black, otherwise in favor of white
 * @param b Second analysis move. Score is negative if in favor of black, otherwise in favor of white
 * @param currentPlayer The player whose turn it is ("w" for white, "b" for black)
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
/**
 * Show a toast notification
 * @param message The message to display
 * @param background The background color (default: #333)
 * @param duration How long to show (ms, default: 4000)
 */
export declare function showToast(message: string, background?: string, duration?: number): void;
