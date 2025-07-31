import { ChessMove, AnalysisResult, AnalysisMove, BestLinesAnalysis } from "./types.js";
import { highlightLastMove, clearLastMoveHighlight } from "./utils/board-utils.js";
import { updateStatus } from "./utils/status-utils.js";
import { updateNavigationButtons } from "./utils/button-utils.js";
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
declare const getEventTrackingState: () => {
    totalCount: number;
    recentCount: number;
    recentStartTime: number;
    lastEventTime: number;
};
/**
 * Update application state
 */
declare const updateAppState: (updates: Partial<AppState>) => void;
/**
 * Get current application state
 */
declare const getAppState: () => AppState;
/**
 * Initialize the application
 */
declare const initializeApp: () => void;
/**
 * Reset position evaluation to initial state
 */
declare const resetPositionEvaluation: () => void;
/**
 * Start analysis
 */
declare const startAnalysis: () => Promise<void>;
/**
 * Stop analysis
 */
declare const stopAnalysis: () => void;
/**
 * Update the tree UI incrementally
 */
declare const updateBestLinesTreeIncrementally: (resultsElement: HTMLElement, analysis: BestLinesAnalysis) => void;
/**
 * Update results display
 */
declare const updateResults: (result: AnalysisResult) => void;
/**
 * Update results panel
 */
declare const actuallyUpdateResultsPanel: (moves: AnalysisMove[]) => void;
/**
 * Clear the current branch
 */
declare const clearBranch: () => void;
/**
 * Update position from controls
 */
/**
 * Add move to game history
 */
declare const addMove: (move: ChessMove) => void;
/**
 * Import game from notation
 */
declare const importGame: (notation: string) => void;
/**
 * Navigate to previous move
 */
declare const previousMove: () => void;
/**
 * Navigate to next move
 */
declare const nextMove: () => void;
/**
 * Update move list display
 */
declare const updateMoveList: () => void;
export { initializeApp, getAppState, updateAppState, startAnalysis, stopAnalysis, addMove, importGame, previousMove, nextMove, updateResults, updateStatus, updateMoveList, updateNavigationButtons, highlightLastMove, clearLastMoveHighlight, clearBranch, resetPositionEvaluation, actuallyUpdateResultsPanel, updateBestLinesTreeIncrementally, getEventTrackingState, };
