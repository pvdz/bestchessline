import { ChessMove, AnalysisResult, AnalysisMove, BestLinesAnalysis } from "./types.js";
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
/**
 * Reset position evaluation to initial state
 */
export declare const resetPositionEvaluation: () => void;
/**
 * Update the tree UI incrementally
 */
export declare const updateBestLinesTreeIncrementally: (resultsElement: HTMLElement, analysis: BestLinesAnalysis) => void;
/**
 * Update results panel
 */
export declare const actuallyUpdateResultsPanel: (moves: AnalysisMove[]) => void;
/**
 * Clear the current branch
 */
export declare const clearBranch: () => void;
/**
 * Update move list display
 */
export declare const updateMoveList: () => void;
export {};
