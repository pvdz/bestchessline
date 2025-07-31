import { BestLineNode } from "../types.js";
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
export declare function getPathToNode(targetNode: BestLineNode, rootNodes: BestLineNode[]): BestLineNode[];
/**
 * Apply a sequence of moves to the board, replacing the current game
 * @param moves Array of BestLineNode moves to apply
 * @param clearBranch Function to clear any existing branch
 * @param updateAppState Function to update application state
 * @param updateMoveList Function to update the move list UI
 */
export declare function applyMovesToBoard(moves: BestLineNode[], clearBranch: () => void, updateAppState: (updates: any) => void, updateMoveList: () => void): void;
