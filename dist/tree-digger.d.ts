import { BestLineNode, TreeDiggerAnalysis, TreeDiggerState } from "./types.js";
/**
 * Start the tree digger analysis
 */
export declare const startBestLinesAnalysis: () => Promise<void>;
/**
 * Stop the tree digger analysis
 */
export declare const stopBestLinesAnalysis: () => void;
/**
 * Clear the tree digger analysis
 */
export declare const clearBestLinesAnalysis: () => void;
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
export declare const calculateTotalLeafs: (nodes: BestLineNode[]) => number;
/**
 * Calculate number of unique positions analyzed
 */
export declare const calculateUniquePositions: (nodes: BestLineNode[], analysis: TreeDiggerAnalysis) => number;
