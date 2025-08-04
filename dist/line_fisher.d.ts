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
