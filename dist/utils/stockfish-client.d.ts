import { AnalysisResult, StockfishOptions } from "../line/types.js";
/**
 * Check if running in fallback mode
 */
export declare function isFallbackMode(): boolean;
export declare function initializeStockfish(): void;
/**
 * Analyze position with Stockfish
 */
export declare function analyzePosition(fen: string, options: StockfishOptions | undefined, onUpdate: (result: AnalysisResult) => void): Promise<AnalysisResult>;
export declare function stopAnalysis(): void;
export declare function getCurrentAnalysisSnapshot(): AnalysisResult | null;
/**
 * Handle Stockfish crash and reset UI state
 */
export declare function handleStockfishCrash(): void;
/**
 * Check if currently analyzing
 */
export declare function isAnalyzingPosition(): boolean;
