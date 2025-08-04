import { TreeDiggerNode, TreeDiggerAnalysis } from "../types.js";
import { UITreeNode } from "./tree-building.js";
/**
 * Tree Digger Analysis Management Utility Functions
 *
 * Provides functions for managing tree digger analysis, UI updates, and tree rendering.
 */
/**
 * Start tree digger analysis
 */
export declare const startTreeDiggerAnalysisFromManager: () => Promise<void>;
/**
 * Stop tree digger analysis
 */
export declare const stopTreeDiggerAnalysisFromManager: () => void;
/**
 * Clear tree digger analysis
 */
export declare const clearTreeDiggerAnalysisFromManager: () => void;
/**
 * Continue tree digger analysis from current state
 */
export declare const continueTreeDiggerAnalysisFromManager: () => Promise<void>;
/**
 * Recover from Stockfish crash
 */
export declare const recoverFromCrash: () => void;
/**
 * Update tree digger button states
 */
export declare const updateTreeDiggerButtonStates: () => void;
/**
 * Update an existing DOM element for a tree node
 */
export declare const updateTreeNodeElement: (
  element: HTMLElement,
  node: TreeDiggerNode,
  analysis: TreeDiggerAnalysis,
) => void;
/**
 * Sync the DOM with the shadow tree
 */
export declare const syncDOMWithShadowTree: (
  container: HTMLElement,
  shadowNodes: UITreeNode[],
  analysis: TreeDiggerAnalysis,
) => void;
/**
 * Update the tree UI incrementally
 */
export declare const updateTreeDiggerTreeIncrementally: (
  resultsElement: HTMLElement,
  analysis: TreeDiggerAnalysis,
) => void;
/**
 * Render a tree node recursively
 */
export declare const renderTreeNode: (
  node: TreeDiggerNode,
  depth: number,
  analysis: TreeDiggerAnalysis,
) => string;
/**
 * Render a tree digger node
 */
export declare const renderTreeDiggerNode: (node: TreeDiggerNode) => string;
/**
 * Export current tree digger state
 */
export declare const exportTreeDiggerStateFromManager: () => void;
/**
 * Copy tree digger state to clipboard
 */
export declare const copyTreeDiggerStateToClipboardFromManager: () => Promise<void>;
/**
 * Import tree digger state from file
 */
export declare const importTreeDiggerStateFromManager: (
  file: File,
) => Promise<void>;
/**
 * Import tree digger state from clipboard
 */
export declare const importTreeDiggerStateFromClipboardFromManager: () => Promise<void>;
/**
 * Update tree digger state information display
 */
interface ValidationResult {
  warnings: string[];
  errors: string[];
}
export declare const updateTreeDiggerStateInfo: (
  _stateExport?: unknown,
  validation?: ValidationResult,
) => void;
/**
 * Reset tree digger pagination state
 */
export declare const resetTreeDiggerPagination: () => void;
/**
 * Handle file input change for state import
 */
export declare const handleStateFileInput: (event: Event) => void;
export {};
