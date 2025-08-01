import { ChessMove, AnalysisResult, AnalysisMove } from "./types.js";
/**
 * Application state interface
 */
interface AppState {
  moves: ChessMove[];
  initialFEN: string;
  currentMoveIndex: number;
  isAnalyzing: boolean;
  currentResults: AnalysisResult | null;
  branchMoves: ChessMove[];
  branchStartIndex: number;
  isInBranch: boolean;
  positionEvaluation: {
    score: number | null;
    isMate: boolean;
    mateIn: number | null;
    isAnalyzing: boolean;
  };
}
/**
 * Get event tracking state
 */
export declare const getEventTrackingState: () => {
  totalCount: number;
  recentCount: number;
  recentStartTime: number;
  lastEventTime: number;
};
/**
 * Update application state
 */
export declare const updateAppState: (updates: Partial<AppState>) => void;
/**
 * Get current application state
 */
export declare const getAppState: () => AppState;
/**
 * Initialize the application
 */
export declare const initializeApp: () => void;
export declare const actuallyUpdateResultsPanel: (
  moves: AnalysisMove[],
) => void;
/**
 * Create a branch from the current position
 */
export declare const createBranch: (
  branchMoves: ChessMove[],
  originalPosition: string,
) => void;
/**
 * Clear the current branch
 */
export declare const clearBranch: () => void;
export {};
