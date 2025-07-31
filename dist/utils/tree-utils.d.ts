import { BestLineNode, BestLinesAnalysis } from "../types.js";
/**
 * Tree Utility Functions
 *
 * Provides functions for managing chess analysis trees, including
 * node creation, rendering, navigation, and state management.
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
 * Generate a unique ID for a tree node
 */
export declare function generateNodeId(node: BestLineNode): string;
/**
 * Create a DOM element for a tree node
 */
export declare function createTreeNodeElement(node: BestLineNode, depth: number, analysis: BestLinesAnalysis): HTMLElement;
/**
 * Update an existing tree node element with new data
 */
export declare function updateTreeNodeElement(element: HTMLElement, node: BestLineNode, analysis: BestLinesAnalysis): void;
/**
 * Build a shadow tree structure for efficient DOM updates
 */
export declare function buildShadowTree(nodes: BestLineNode[], analysis: BestLinesAnalysis, parent?: UITreeNode | null, depth?: number): UITreeNode[];
/**
 * Find a node by ID in the tree structure
 */
export declare function findNodeById(nodeId: string, nodes: BestLineNode[]): BestLineNode | null;
/**
 * Sync DOM with shadow tree structure
 */
export declare function syncDOMWithShadowTree(container: HTMLElement, shadowNodes: UITreeNode[], analysis: BestLinesAnalysis): void;
/**
 * Count nodes recursively in the tree
 */
export declare function countNodesRecursive(nodes: BestLineNode[]): number;
/**
 * Get the path from root to a specific node
 */
export declare function getPathToNode(targetNode: BestLineNode, rootNodes: BestLineNode[]): BestLineNode[];
/**
 * Format a node's score with delta information
 */
export declare function formatNodeScore(node: BestLineNode): string;
/**
 * Generate all lines from the tree as a string
 */
export declare function generateAllLines(nodes: BestLineNode[]): string;
/**
 * Format a line with move numbers
 */
export declare function formatLineWithMoveNumbers(moves: BestLineNode[]): string;
