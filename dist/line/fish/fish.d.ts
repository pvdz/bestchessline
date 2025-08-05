/**
 * Line Fisher analysis configuration
 */
export interface LineFisherConfig {
  initiatorMoves: string[];
  responderMoveCounts: number[];
  maxDepth: number;
  threads: number;
  defaultResponderCount: number;
  rootFEN: string;
  baselineScore?: number;
  baselineMoves?: {
    move: string;
    score: number;
  }[];
}
/**
 * Line Fisher result for a single line
 */
export interface LineFisherResult {
  lineIndex: number;
  pcns: string[];
  scores: number[];
  deltas: number[];
  sanLine: string;
  nodeId: string;
  isComplete: boolean;
  isDone: boolean;
  isTransposition?: boolean;
  responderMoveList?: string[];
  updateCount: number;
}
/**
 * Continue fish analysis from current state
 * Resume fish analysis from the current state if there are WIP lines
 */
export declare const continueFishAnalysis: () => Promise<void>;
/**
 * Import fish state from clipboard
 * Import fish analysis state from clipboard JSON format.
 * Parse JSON state, validate format, and load into current state
 */
export declare const importFishStateFromClipboard: () => Promise<void>;
/**
 * Represents a line being analyzed
 */
interface FishLine {
  lineIndex: number;
  nodeId: string;
  sanGame: string;
  pcns: string[];
  score: number;
  delta: number;
  position: string;
  isDone: boolean;
  isFull: boolean;
}
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
export declare function fish(config: LineFisherConfig): Promise<FishLine[]>;
/**
 * Export fish state to clipboard
 * Export current analysis state to clipboard in JSON format for import.
 * Serialize current state, copy to clipboard, and show success notification
 */
export declare const exportFishStateToClipboard: () => Promise<void>;
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
export {};
