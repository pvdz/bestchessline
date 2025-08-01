import { TreeDiggerNode, TreeDiggerAnalysis } from "../types.js";
/**
 * Tree Debug Utility Functions
 *
 * Provides functions for debugging tree structures and DOM verification.
 */
/**
 * Debug function to verify DOM structure matches data structure
 * @param container The container element to verify
 * @param nodes Array of nodes to verify against
 * @param depth Current depth in the tree (default: 0)
 */
export declare function verifyDOMStructure(
  container: HTMLElement,
  nodes: TreeDiggerNode[],
  depth?: number,
): void;
/**
 * Handle click on tree node
 * @param node The node that was clicked
 * @param analysis The current analysis
 */
export declare function handleTreeNodeClick(
  node: TreeDiggerNode,
  analysis: TreeDiggerAnalysis,
): void;
