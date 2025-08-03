import { TreeDiggerNode } from "../types.js";
/**
 * Tree Navigation Utility Functions
 *
 * Provides functions for navigating and manipulating tree structures.
 */
/**
 * Get the path from root to a specific node
 * @param targetNode The node to find the path to
 * @param rootNodes Array of root nodes to search in
 * @returns Array of nodes representing the path from root to target
 */
export declare function getPathToNode(targetNode: TreeDiggerNode, rootNodes: TreeDiggerNode[]): TreeDiggerNode[];
/**
 * Apply a sequence of moves to the board, replacing the current game
 * @param moves Array of TreeDiggerNode moves to apply
 */
export declare function applyMovesToBoard(moves: TreeDiggerNode[]): void;
