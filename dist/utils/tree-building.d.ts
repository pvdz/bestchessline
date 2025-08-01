import { TreeDiggerNode, TreeDiggerAnalysis } from "../types.js";
/**
 * Tree Building Utility Functions
 *
 * Provides functions for building and managing tree structures.
 */
/**
 * Simple tree node structure for UI management
 */
export interface UITreeNode {
  id: string;
  element: HTMLElement;
  children: UITreeNode[];
  parent: UITreeNode | null;
}
/**
 * Build the shadow tree from the data tree
 */
export declare function buildShadowTree(
  nodes: TreeDiggerNode[],
  analysis: TreeDiggerAnalysis,
  parent?: UITreeNode | null,
  depth?: number,
): UITreeNode[];
/**
 * Find a node by ID in the data tree
 */
export declare function findNodeById(
  nodeId: string,
  nodes: TreeDiggerNode[],
): TreeDiggerNode | null;
