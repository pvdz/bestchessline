import type { ChessMove, AnalysisResult } from "./types.js";
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
 * Line Fisher analysis state
 */
export interface LineFisherState {
  isAnalyzing: boolean;
  config: LineFisherConfig;
  progress: LineFisherProgress;
  results: LineFisherResult[];
  analyzedPositions: Set<string>;
  analysisQueue: string[];
  isComplete: boolean;
  rootNodes: LineFisherNode[];
}
/**
 * OneFishLine represents a single line of analysis
 * Each line represents an initiator move and its response moves
 * The final move of a line has no response moves (isFull = true)
 * This can be because max depth was reached, mate was reached, or it's a transposition
 */
export interface OneFishLine {
  sans: string[];
  score: number;
  isFull: boolean;
  isDone: boolean;
  isTransposition: boolean;
}
/**
 * FishLineNewState - Sleeker alternative to LineFisherState
 * Simplified state management focusing on lines rather than tree nodes
 */
export interface FishLineNewState {
  isFishing: boolean;
  config: LineFisherConfig;
  analyzedPartianFens: Set<string>;
  linesWip: OneFishLine[];
  linesDone: OneFishLine[];
}
/**
 * Line Fisher progress tracking
 */
export interface LineFisherProgress {
  totalNodes: number;
  processedNodes: number;
  totalLines: number;
  completedLines: number;
  currentPosition: string;
  currentAction: string;
  eventsPerSecond: number;
  totalEvents: number;
  startTime: number;
}
/**
 * Line Fisher result for a single line
 */
export interface LineFisherResult {
  lineIndex: number;
  sans: string[];
  scores: number[];
  deltas: number[];
  notation: string;
  isComplete: boolean;
  isDone: boolean;
  isTransposition?: boolean;
  responderMoveList?: string[];
  updateCount: number;
}
/**
 * Line Fisher node in the analysis tree
 */
export interface LineFisherNode {
  fen: string;
  move: ChessMove;
  score: number;
  depth: number;
  moveNumber: number;
  children: LineFisherNode[];
  parent?: LineFisherNode;
  analysisResult?: AnalysisResult;
}
/**
 * Create initial FishLineNewState
 */
export declare const createInitialFishLineNewState: () => FishLineNewState;
/**
 * Verify that FishLineNewState represents a valid LineFisherState
 * This function checks if the new state structure can represent the same analysis
 * as the original LineFisherState
 */
export declare const verifyFishLineNewState: (
  fishState: FishLineNewState,
  originalState: LineFisherState,
) => {
  isValid: boolean;
  errors: string[];
  warnings: string[];
};
/**
 * Convert LineFisherState to FishLineNewState
 * This function creates a new state representation from the original
 */
export declare const convertLineFisherStateToFishLineNewState: (
  originalState: LineFisherState,
) => FishLineNewState;
/**
 * Convert FishLineNewState to LineFisherState
 * This function creates the original state representation from the new state
 */
export declare const convertFishLineNewStateToLineFisherState: (
  fishState: FishLineNewState,
) => LineFisherState;
/**
 * Get current FishLineNewState (for testing and comparison)
 */
export declare const getFishLineNewState: () => FishLineNewState;
/**
 * Update FishLineNewState (for testing and comparison)
 */
export declare const updateFishLineNewState: (
  newState: Partial<FishLineNewState>,
) => void;
/**
 * Test verification function with current state
 */
export declare const testFishLineNewStateVerification: () => {
  isValid: boolean;
  errors: string[];
  warnings: string[];
};
/**
 * Initialize Line Fisher with default configuration
 * Sets up the initial state and prepares for analysis
 */
export declare const initializeLineFisher: () => Promise<void>;
/**
 * Get current Line Fisher state
 * Returns a copy of the current state for external access
 */
export declare const getLineFisherState: () => LineFisherState;
/**
 * Update Line Fisher state
 * Safely updates the global state with new values
 */
export declare const updateLineFisherState: (
  newState: Partial<LineFisherState>,
) => void;
/**
 * Handle Line Fisher interruption
 */
/**
 * Start Line Fisher analysis
 * Begin the fishing analysis process with current configuration
 */
export declare const startLineFisherAnalysis: () => Promise<void>;
/**
 * Stop Line Fisher analysis
 * Halt the current analysis process
 */
export declare const stopLineFisherAnalysis: () => void;
/**
 * Reset Line Fisher analysis
 * Clear all results and reset to initial state
 */
export declare const resetLineFisherAnalysis: () => void;
/**
 * Continue Line Fisher analysis
 * Resume analysis from where it left off
 */
export declare const continueLineFisherAnalysis: () => Promise<void>;
export declare const getLineFisherConfig: () => LineFisherConfig;
export declare const updateLineFisherConfig: (
  updates: Partial<LineFisherConfig>,
) => void;
