import { AnalysisResult, AnalysisMove, ChessMove } from "../types.js";
/**
 * Start analysis
 */
export declare function startAnalysis(): Promise<void>;
/**
 * Stop analysis
 */
export declare function stopAnalysis(): void;
/**
 * Update results display
 */
export declare function updateResults(result: AnalysisResult): void;
/**
 * Update results panel
 */
export declare function actuallyUpdateResultsPanel(moves: AnalysisMove[]): void;
/**
 * Make a move from analysis results
 */
export declare function makeAnalysisMove(move: ChessMove): void;
/**
 * Add PV move click listeners
 */
export declare function addPVClickListeners(): void;
/**
 * Handle click on main move notation in Engine Moves results
 */
export declare function handleMakeEngineMove(move: AnalysisMove): void;
