import { ChessMove } from "../types.js";
/**
 * Game Navigation Utility Functions
 *
 * Provides functions for managing game move history, navigation, and display.
 */
/**
 * Add move to game history
 */
export declare function addMove(move: ChessMove): void;
/**
 * Import game from notation
 */
export declare function importGame(notation: string): void;
/**
 * Navigate to previous move
 */
export declare function previousMove(): void;
/**
 * Navigate to next move
 */
export declare function nextMove(): void;
/**
 * Update move list display
 */
export declare function updateMoveList(): void;
