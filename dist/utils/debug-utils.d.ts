import { BestLineNode } from "../types.js";
/**
 * Clear the tree node DOM map
 */
export declare function clearTreeNodeDOMMap(): void;
/**
 * Debug function to log tree structure
 * @param nodes Array of nodes to log
 * @param depth Current depth in the tree (default: 0)
 */
export declare function logTreeStructure(nodes: BestLineNode[], depth?: number): void;
/**
 * Count total nodes in the tree recursively
 * @param nodes Array of nodes to count
 * @returns Total number of nodes including all children
 */
export declare function countTotalNodes(nodes: BestLineNode[]): number;
/**
 * Debug function to log tree digger initialization info
 */
export declare function debugTreeDiggerStart(): void;
