import { AnalysisResult, StockfishOptions } from "./types.js";
/**
 * Check if running in fallback mode
 */
export declare const isFallbackMode: () => boolean;
/**
 * Initialize Stockfish with fallback support
 */
export declare const initializeStockfish: () => void;
/**
 * Analyze position with Stockfish
 */
export declare const analyzePosition: (fen: string, options?: StockfishOptions, onUpdate?: (result: AnalysisResult) => void) => Promise<AnalysisResult>;
export declare const stopAnalysis: () => void;
/**
 * Check if currently analyzing
 */
export declare const isAnalyzingPosition: () => boolean;
