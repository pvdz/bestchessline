import { ChessPosition, Square } from "./types.js";
/**
 * FEN Utility Functions
 *
 * Provides functions for parsing and manipulating FEN (Forsyth-Edwards Notation) strings,
 * coordinate conversion between chess squares and array indices, and square validation.
 */
/**
 * Parse a FEN string into a ChessPosition object
 */
export declare function parseFEN(fen: string): ChessPosition;
/**
 * Convert a ChessPosition object to a FEN string
 */
export declare function toFEN(position: ChessPosition): string;
/**
 * Convert a chess square (e.g., "e4") to array coordinates [rank, file]
 */
export declare function squareToCoords(square: Square): [number, number];
/**
 * Convert array coordinates [rank, file] to a chess square (e.g., "e4")
 */
export declare function coordsToSquare(rank: number, file: number): Square;
/**
 * Check if a string is a valid chess square
 */
export declare function isValidSquare(square: string): square is Square;
/**
 * Get piece at a specific square from FEN string
 */
export declare function getPieceAtSquareFromFEN(square: string, fen: string): string;
/**
 * Verify FEN encoding invariants (lightweight):
 * - Correct 6 fields and basic syntax (delegates to parseFEN)
 * - En-passant square is either '-' or empty and on the correct rank
 * - Optional: if en-passant set, there exists a capturable pawn scenario
 */
export declare function verifyFenEncoding(fen: string, options?: {
    strictEnPassant?: boolean;
}): {
    ok: boolean;
    errors: string[];
};
