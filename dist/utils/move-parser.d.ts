import { ChessMove, PieceNotation } from "./types.js";
/**
 * Move Parser and Validation Functions
 *
 * Provides functions for parsing chess moves from notation and validating
 * whether pieces can move from one square to another.
 */
/**
 * Parse a simple move string and return a ChessMove object
 */
export declare function parseSimpleMove(
  moveText: string,
  fen: string,
): ChessMove | null;
/**
 * Parse a move string purely from notation without position validation
 * This is useful for the Line Fisher where we want to parse user input moves
 * without checking if they're actually legal in the current position
 */
export declare function parseMoveFromNotation(
  moveText: string,
  isWhiteTurn?: boolean,
): ChessMove | null;
/**
 * Find the from square for a piece moving to a destination
 */
export declare function findFromSquare(
  piece: PieceNotation,
  toSquare: string,
  currentFEN: string,
): string | null;
/**
 * Find the from square with disambiguation
 */
export declare function findFromSquareWithDisambiguation(
  piece: PieceNotation,
  toSquare: string,
  disambiguation: string,
  currentFEN: string,
): string | null;
/**
 * Check if a piece can move from one square to another
 */
export declare function canPieceMoveTo(
  fromSquare: string,
  toSquare: string,
  piece: PieceNotation,
  board: string[][],
): boolean;
/**
 * Check if a pawn can move from one square to another
 */
export declare function canPawnMoveTo(
  fromSquare: string,
  toSquare: string,
  board: string[][],
): boolean;
/**
 * Check if a rook can move from one square to another
 */
export declare function canRookMoveTo(
  fromSquare: string,
  toSquare: string,
  board: string[][],
): boolean;
/**
 * Check if a knight can move from one square to another
 */
export declare function canKnightMoveTo(
  fromSquare: string,
  toSquare: string,
  _board: string[][],
): boolean;
/**
 * Check if a bishop can move from one square to another
 */
export declare function canBishopMoveTo(
  fromSquare: string,
  toSquare: string,
  board: string[][],
): boolean;
/**
 * Check if a queen can move from one square to another
 */
export declare function canQueenMoveTo(
  fromSquare: string,
  toSquare: string,
  board: string[][],
): boolean;
/**
 * Check if a king can move from one square to another
 */
export declare function canKingMoveTo(
  fromSquare: string,
  toSquare: string,
  _board: string[][],
): boolean;
/**
 * Select the correct move from multiple candidates using disambiguation
 */
export declare function selectCorrectMove(
  candidates: string[],
  _toSquare: string,
  _piece: PieceNotation,
  _board: string[][],
  disambiguation: string,
): string;
