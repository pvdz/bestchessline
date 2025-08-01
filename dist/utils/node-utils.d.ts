import { TreeDiggerNode } from "../types.js";
/**
 * Node Utility Functions
 *
 * Provides functions for formatting and manipulating tree nodes.
 */
/**
 * Generate a unique ID for a tree node based on its position and move
 * @param node The node to generate an ID for
 * @returns A unique string identifier for the node
 */
export declare function generateNodeId(node: TreeDiggerNode): string;
/**
 * Count nodes recursively in a tree structure
 * @param nodes Array of nodes to count
 * @returns Total number of nodes including all children
 */
export declare function countNodesRecursive(nodes: TreeDiggerNode[]): number;
/**
 * Format a node's score with delta information
 * @param node The node to format the score for
 * @returns Formatted score string with delta information
 */
export declare function formatNodeScore(node: TreeDiggerNode): string;
