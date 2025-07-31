import { moveToNotation } from "./notation-utils.js";
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
//# sourceMappingURL=debug-utils.js.map