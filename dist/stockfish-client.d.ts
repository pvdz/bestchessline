import { AnalysisResult, StockfishOptions } from "./types.js";
/**
 * Stockfish state interface
 */
interface StockfishState {
  worker: Worker | null;
  isReady: boolean;
  isAnalyzing: boolean;
  currentAnalysis: AnalysisResult | null;
  analysisCallbacks: ((result: AnalysisResult) => void)[];
  engineStatus: {
    engineLoaded: boolean;
    engineReady: boolean;
  };
  waitingForReady: boolean;
  pendingAnalysis: (() => void) | null;
  sharedArrayBufferSupported: boolean;
  fallbackMode: boolean;
}
/**
 * Update Stockfish state
 */
declare const updateStockfishState: (updates: Partial<StockfishState>) => void;
/**
 * Get current Stockfish state
 */
declare const getStockfishState: () => StockfishState;
/**
 * Check if running in fallback mode
 */
declare const isFallbackMode: () => boolean;
/**
 * Initialize Stockfish with fallback support
 */
declare const initializeStockfish: () => void;
/**
 * Analyze position with Stockfish
 */
declare const analyzePosition: (
  fen: string,
  options?: StockfishOptions,
  onUpdate?: (result: AnalysisResult) => void,
) => Promise<AnalysisResult>;
declare const stopAnalysis: () => void;
/**
 * Check if currently analyzing
 */
declare const isAnalyzingPosition: () => boolean;
/**
 * Get current analysis result
 */
declare const getCurrentAnalysis: () => AnalysisResult | null;
/**
 * Destroy Stockfish client
 */
declare const destroy: () => void;
export {
  initializeStockfish,
  getStockfishState,
  updateStockfishState,
  analyzePosition,
  stopAnalysis,
  isAnalyzingPosition,
  getCurrentAnalysis,
  destroy,
  isFallbackMode,
};
