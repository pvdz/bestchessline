import {
  TreeDiggerNode,
  TreeDiggerAnalysis,
  TreeDiggerState,
} from "./types.js";
/**
 * Start the tree digger analysis
 */
export declare const startTreeDiggerAnalysis: () => Promise<void>;
/**
 * Stop the tree digger analysis
 */
export declare const stopTreeDiggerAnalysis: () => void;
/**
 * Clear the tree digger analysis
 */
export declare const clearTreeDiggerAnalysis: () => void;
/**
 * Restore tree digger state from imported data
 */
export declare const restoreTreeDiggerState: (
  importedState: TreeDiggerState,
) => void;
/**
 * Continue tree digger analysis from current state
 */
export declare const continueTreeDiggerAnalysis: () => Promise<void>;
/**
 * Get the current analysis results
 */
export declare const getCurrentAnalysis: () => TreeDiggerAnalysis | null;
/**
 * Check if analysis is currently running
 */
export declare const isAnalyzing: () => boolean;
/**
 * Get current progress
 */
export declare const getProgress: () => TreeDiggerState["progress"];
/**
 * Calculate total leaf nodes in the tree
 */
export declare const calculateTotalLeafs: (nodes: TreeDiggerNode[]) => number;
/**
 * Calculate number of unique positions analyzed
 */
export declare const calculateUniquePositions: (
  nodes: TreeDiggerNode[],
  analysis: TreeDiggerAnalysis,
) => number;
