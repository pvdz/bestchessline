import { BestLineNode, BestLinesAnalysis } from "../types.js";
import { UITreeNode } from "./tree-building.js";
/**
 * Best Lines Analysis Management Utility Functions
 *
 * Provides functions for managing tree digger analysis, UI updates, and tree rendering.
 */
/**
 * Start best lines analysis
 */
export declare const startBestLinesAnalysis: () => Promise<void>;
/**
 * Stop best lines analysis
 */
export declare const stopBestLinesAnalysis: () => void;
/**
 * Clear best lines analysis
 */
export declare const clearBestLinesAnalysis: () => void;
/**
 * Update best lines button states
 */
export declare const updateBestLinesButtonStates: () => void;
/**
 * Update an existing DOM element for a tree node
 */
export declare const updateTreeNodeElement: (element: HTMLElement, node: BestLineNode, analysis: BestLinesAnalysis) => void;
/**
 * Sync the DOM with the shadow tree
 */
export declare const syncDOMWithShadowTree: (container: HTMLElement, shadowNodes: UITreeNode[], analysis: BestLinesAnalysis) => void;
/**
 * Update the tree UI incrementally
 */
export declare const updateBestLinesTreeIncrementally: (resultsElement: HTMLElement, analysis: BestLinesAnalysis) => void;
/**
 * Render a tree node recursively
 */
export declare const renderTreeNode: (node: BestLineNode, depth: number, analysis: BestLinesAnalysis) => string;
/**
 * Render a best line node
 */
export declare const renderBestLineNode: (node: BestLineNode) => string;
