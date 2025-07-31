/**
 * Position Evaluation Utility Functions
 *
 * Provides functions for evaluating chess positions using Stockfish engine,
 * managing evaluation state, and updating the evaluation display.
 */
/**
 * Reset position evaluation to initial state
 */
export declare function resetPositionEvaluation(appState: any, updateAppState: (updates: any) => void, updatePositionEvaluationDisplay: () => void, updateButtonStates: () => void): void;
/**
 * Initialize position evaluation button
 */
export declare function initializePositionEvaluationButton(evaluateCurrentPosition: () => Promise<void>): void;
/**
 * Evaluate the current board position using Stockfish
 */
export declare function evaluateCurrentPosition(appState: any, updateAppState: (updates: any) => void, updatePositionEvaluationDisplay: () => void, updateButtonStates: () => void): Promise<void>;
/**
 * Update the position evaluation display
 */
export declare function updatePositionEvaluationDisplay(appState: any): void;
