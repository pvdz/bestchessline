import { AnalysisResult, AnalysisMove, ChessMove } from "../types.js";
/**
 * Start best move analysis
 */
export declare function startBestmove(): Promise<void>;
/**
 * Stop analysis
 */
export declare function stopBestmove(): void;
/**
 * Update results display
 */
export declare function updateBestmoveResults(result: AnalysisResult): void;
/**
 * Update results panel
 */
export declare function actuallyUpdateBestmovePanel(moves: AnalysisMove[]): void;
/**
 * Make a move from analysis results
 */
export declare function makeBestmove(move: ChessMove): void;
/**
 * Add PV move click listeners
 */
export declare function addBestmovePVClickListeners(): void;
/**
 * Handle click on main move notation in Next Best Moves results
 */
export declare function handleMakeBestmove(move: AnalysisMove): void;
