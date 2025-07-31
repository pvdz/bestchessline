import { ChessMove, AnalysisResult } from "./types.js";
import { highlightLastMove, clearLastMoveHighlight } from "./utils/board-utils.js";
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
 * Start analysis
 */
declare const startAnalysis: () => Promise<void>;
/**
 * Stop analysis
 */
declare const stopAnalysis: () => void;
/**
 * Update results display
 */
declare const updateResults: (result: AnalysisResult) => void;
/**
 * Update status message
 */
declare const updateStatus: (message: string) => void;
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
 * Highlight the last move on the board
 */
/**
 * Update move list display
 */
declare const updateMoveList: () => void;
/**
 * Update navigation buttons
 */
declare const updateNavigationButtons: () => void;
export { initializeApp, getAppState, updateAppState, startAnalysis, stopAnalysis, addMove, importGame, previousMove, nextMove, updateResults, updateStatus, updateMoveList, updateNavigationButtons, highlightLastMove, clearLastMoveHighlight, };
