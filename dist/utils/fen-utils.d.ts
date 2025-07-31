import { ChessPosition, Square } from "../types.js";
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
