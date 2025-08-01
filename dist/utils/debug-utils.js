import { moveToNotation } from "./notation-utils.js";
import { getGlobalCurrentMoveIndex } from "../utils.js";
import * as Board from "../chess-board.js";
import * as TreeDigger from "../tree-digger.js";
/**
 * Debug Utility Functions
 *
 * Provides functions for debugging and logging tree structures.
 */
// Global map to track DOM elements for tree nodes
const treeNodeDOMMap = new Map();
/**
 * Clear the tree node DOM map
 */
export function clearTreeNodeDOMMap() {
    treeNodeDOMMap.clear();
}
/**
 * Debug function to log tree structure
 * @param nodes Array of nodes to log
 * @param depth Current depth in the tree (default: 0)
 */
export function logTreeStructure(nodes, depth = 0) {
    for (const node of nodes) {
        const indent = "  ".repeat(depth);
        const moveText = moveToNotation(node.move);
        const parentText = node.parent
            ? ` (parent: ${moveToNotation(node.parent.move)})`
            : " (root)";
        console.log(`${indent}${moveText}${parentText} [${node.children.length} children]`);
        if (node.children.length > 0) {
            logTreeStructure(node.children, depth + 1);
        }
    }
}
/**
 * Count total nodes in the tree recursively
 * @param nodes Array of nodes to count
 * @returns Total number of nodes including all children
 */
export function countTotalNodes(nodes) {
    let count = 0;
    const countRecursive = (nodeList) => {
        for (const node of nodeList) {
            count++;
            if (node.children.length > 0) {
                countRecursive(node.children);
            }
        }
    };
    countRecursive(nodes);
    return count;
}
/**
 * Debug function to log tree digger initialization info
 */
export function debugTreeDiggerStart() {
    console.log("=== Tree Digger Debug Info ===");
    console.log("Current board FEN:", Board.getFEN());
    console.log("Current move index:", getGlobalCurrentMoveIndex());
    console.log("Board position:", Board.getPosition());
    const analysis = TreeDigger.getCurrentAnalysis();
    if (analysis) {
        console.log("Analysis root FEN:", analysis.rootFen);
        console.log("Analysis nodes count:", analysis.nodes.length);
        console.log("Analysis max depth:", analysis.maxDepth);
        console.log("Analysis config:", analysis.config);
    }
    else {
        console.log("No current analysis found");
    }
    console.log("=== End Debug Info ===");
}
//# sourceMappingURL=debug-utils.js.map