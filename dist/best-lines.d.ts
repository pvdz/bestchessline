import { BestLineNode, BestLinesAnalysis, BestLinesState } from "./types.js";
/**
 * Get current best lines state
 */
declare const getBestLinesState: () => BestLinesState;
/**
 * Start the best lines analysis
 */
declare const startBestLinesAnalysis: () => Promise<void>;
/**
 * Stop the best lines analysis
 */
declare const stopBestLinesAnalysis: () => void;
/**
 * Clear the best lines analysis
 */
declare const clearBestLinesAnalysis: () => void;
/**
 * Get the current analysis results
 */
declare const getCurrentAnalysis: () => BestLinesAnalysis | null;
/**
 * Check if analysis is currently running
 */
declare const isAnalyzing: () => boolean;
/**
 * Get current progress
 */
declare const getProgress: () => BestLinesState["progress"];
/**
 * Calculate total leaf nodes in the tree
 */
declare const calculateTotalLeafs: (nodes: BestLineNode[]) => number;
/**
 * Calculate number of unique positions analyzed
 */
declare const calculateUniquePositions: (
  nodes: BestLineNode[],
  analysis: BestLinesAnalysis,
) => number;
export {
  startBestLinesAnalysis,
  stopBestLinesAnalysis,
  clearBestLinesAnalysis,
  getCurrentAnalysis,
  isAnalyzing,
  getProgress,
  getBestLinesState,
  calculateTotalLeafs,
  calculateUniquePositions,
};
