/**
 * Position Control Utility Functions
 *
 * Provides functions for managing FEN input and position controls.
 */
/**
 * Update FEN input field
 */
export declare function updateFENInput(): void;
/**
 * Update controls from current position
 */
export declare function updateControlsFromPosition(): void;
/**
 * Update position from controls
 */
export declare function updatePositionFromControls(): void;
/**
 * Reset position evaluation to initial state
 */
export declare const resetPositionEvaluation: () => void;
/**
 * Initialize position evaluation button
 */
export declare const initializePositionEvaluationButton: () => void;
/**
 * Evaluate the current board position using Stockfish
 */
export declare const evaluateCurrentPosition: () => Promise<void>;
/**
 * Update the position evaluation display
 */
export declare const updatePositionEvaluationDisplay: () => void;
