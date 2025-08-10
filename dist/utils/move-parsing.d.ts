import { ChessMove } from "./types.js";
/**
 * Move Parsing Utility Functions
 *
 * Provides functions for parsing chess notation, importing games,
 * and converting between different move formats.
 */
/**
 * Parse individual move string
 * Input can be SAN, PCN, or long notation
 */
export declare function parseMove(
  moveText: string,
  currentFEN: string,
): ChessMove | null;
/**
 * Parse game notation into moves
 */
export declare function parseGameNotation(
  notation: string,
  initialFEN: string,
): ChessMove[];
