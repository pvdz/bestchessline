import { LineFisherConfig } from "./types.js";
/**
 * Stop Fish analysis
 */
export declare const stopFishAnalysis: () => void;
/**
 * Fish function - performs line analysis according to the algorithm in the comment
 *
 * Algorithm:
 * 1. Create initial move (predefined or from Stockfish)
 * 2. Add to wip list
 * 3. Loop until wip list is empty:
 *    - Get next line from wip
 *    - If even half-moves: responder move (get N best moves)
 *    - If odd half-moves: initiator move (get best move)
 *    - Mark lines as done when max depth reached
 */
export declare function fish(config: LineFisherConfig): Promise<void>;
/**
 * Copy fish state to clipboard (for copy button)
 * Copy current analysis state to clipboard in plain text format.
 * Serialize current state, copy to clipboard, and show success notification
 */
export declare const copyFishStateToClipboard: () => Promise<void>;
/**
 * Initialize Line Fisher (placeholder for compatibility)
 */
export declare const initializeLineFisher: () => Promise<void>;
/**
 * Reset Fish analysis
 */
export declare const resetFishAnalysis: () => void;
