import { AnalysisOptions, AnalysisResult } from "../types.js";
/**
 * Analysis Control Utility Functions
 *
 * Provides functions for controlling chess engine analysis, managing
 * analysis state, and updating UI elements related to analysis.
 */
/**
 * Start analysis
 */
export declare function startAnalysis(appState: any, updateAppState: (updates: any) => void, updateButtonStates: () => void, updatePositionEvaluationDisplay: () => void, updateResults: (result: AnalysisResult) => void): Promise<void>;
/**
 * Stop analysis
 */
export declare function stopAnalysis(appState: any, updateAppState: (updates: any) => void, updateButtonStates: () => void, updateResultsPanel: (moves: any[]) => void): void;
/**
 * Get analysis options from UI
 */
export declare function getAnalysisOptions(): AnalysisOptions;
/**
 * Update button states
 */
export declare function updateButtonStates(appState: any): void;
/**
 * Start best lines analysis
 */
export declare function startBestLinesAnalysis(updateBestLinesButtonStates: () => void, updateBestLinesStatus: (message?: string) => void, updateBestLinesResults: () => void): Promise<void>;
/**
 * Stop best lines analysis
 */
export declare function stopBestLinesAnalysis(clearTreeNodeDOMMap: () => void, updateBestLinesButtonStates: () => void, updateBestLinesStatus: (message?: string) => void): void;
/**
 * Clear best lines analysis
 */
export declare function clearBestLinesAnalysis(clearTreeNodeDOMMap: () => void, updateBestLinesButtonStates: () => void, updateBestLinesStatus: (message?: string) => void, updateBestLinesResults: () => void): void;
/**
 * Update best lines button states
 */
export declare function updateBestLinesButtonStates(appState: any): void;
/**
 * Update best lines status
 */
export declare function updateBestLinesStatus(message?: string): void;
/**
 * Update analysis status
 */
export declare function updateAnalysisStatus(appState: any, message?: string): void;
