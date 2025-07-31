import { BestLineNode, TreeDiggerAnalysis } from "../types.js";
import { UITreeNode } from "./tree-building.js";
/**
 * Tree Digger Analysis Management Utility Functions
 *
 * Provides functions for managing tree digger analysis, UI updates, and tree rendering.
 */
/**
 * Start tree digger analysis
 */
export declare const startTreeDiggerAnalysis: () => Promise<void>;
/**
 * Stop tree digger analysis
 */
export declare const stopTreeDiggerAnalysis: () => void;
/**
 * Clear tree digger analysis
 */
export declare const clearTreeDiggerAnalysis: () => void;
/**
 * Update tree digger button states
 */
export declare const updateTreeDiggerButtonStates: () => void;
/**
 * Update an existing DOM element for a tree node
 */
export declare const updateTreeNodeElement: (element: HTMLElement, node: BestLineNode, analysis: TreeDiggerAnalysis) => void;
/**
 * Sync the DOM with the shadow tree
 */
export declare const syncDOMWithShadowTree: (container: HTMLElement, shadowNodes: UITreeNode[], analysis: TreeDiggerAnalysis) => void;
/**
 * Update the tree UI incrementally
 */
export declare const updateTreeDiggerTreeIncrementally: (resultsElement: HTMLElement, analysis: TreeDiggerAnalysis) => void;
/**
 * Render a tree node recursively
 */
export declare const renderTreeNode: (node: BestLineNode, depth: number, analysis: TreeDiggerAnalysis) => string;
/**
 * Render a tree digger node
 */
export declare const renderTreeDiggerNode: (node: BestLineNode) => string;
