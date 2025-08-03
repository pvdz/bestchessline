import type { TreeDiggerAnalysis } from "../types.js";
/**
 * Reset tree digger pagination state
 */
export declare const resetTreeDiggerPaginationState: () => void;
/**
 * Update tree digger results display
 */
export declare function updateTreeDiggerResults(): void;
/**
 * Update tree digger progress section
 */
export declare function updateTreeDiggerProgress(resultsElement: HTMLElement, analysis: TreeDiggerAnalysis): void;
