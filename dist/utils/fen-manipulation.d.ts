import { ChessMove } from "../types.js";
/**
 * FEN Manipulation Functions
 *
 * Provides functions for manipulating FEN strings, including applying moves
 * and updating position state.
 */
/**
 * Apply a chess move to a FEN string and return the new FEN
 */
export declare function applyMoveToFEN(fen: string, move: ChessMove): string;
