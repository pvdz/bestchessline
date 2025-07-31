import { ChessMove } from "../types.js";
/**
 * Game Navigation Utility Functions
 *
 * Provides functions for navigating through chess games, highlighting moves,
 * and managing game state transitions.
 */
/**
 * Navigate to previous move
 */
export declare function previousMove(appState: any, updateAppState: (updates: any) => void, updateNavigationButtons: () => void, updateFENInput: () => void, updateControlsFromPosition: () => void, resetPositionEvaluation: () => void): void;
/**
 * Navigate to next move
 */
export declare function nextMove(appState: any, updateAppState: (updates: any) => void, updateNavigationButtons: () => void, updateFENInput: () => void, updateControlsFromPosition: () => void, resetPositionEvaluation: () => void): void;
/**
 * Navigate to a specific move index
 */
export declare function navigateToMove(moveIndex: number, appState: any, updateAppState: (updates: any) => void, clearBranch: () => void, updateMoveList: () => void, updateNavigationButtons: () => void, resetPositionEvaluation: () => void, updateStatus: (message: string) => void): void;
/**
 * Apply moves up to specified index
 */
export declare function applyMovesUpToIndex(index: number, appState: any, updateAppState: (updates: any) => void, updateMoveList: () => void, updateFENInput: () => void, updateControlsFromPosition: () => void, highlightLastMove: (move: ChessMove) => void, clearLastMoveHighlight: () => void): void;
/**
 * Highlight the last move on the board
 */
export declare function highlightLastMove(move: ChessMove): void;
/**
 * Clear last move highlight
 */
export declare function clearLastMoveHighlight(): void;
/**
 * Update move list display
 */
export declare function updateMoveList(appState: any, getCheckedRadioByName: (name: string) => HTMLInputElement | null): void;
/**
 * Update navigation buttons state
 */
export declare function updateNavigationButtons(appState: any): void;
