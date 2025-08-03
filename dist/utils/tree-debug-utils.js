import { generateNodeId } from "./node-utils.js";
import { getPathToNode, applyMovesToBoard } from "./tree-navigation.js";
import { log } from "./logging.js";
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
export function verifyDOMStructure(container, nodes, depth = 0) {
    const domNodes = Array.from(container.children);
    if (domNodes.length !== nodes.length) {
        console.log(`Depth ${depth}: DOM has ${domNodes.length} nodes, data has ${nodes.length} nodes`);
    }
    // Check all nodes at this level
    for (let i = 0; i < Math.max(domNodes.length, nodes.length); i++) {
        if (i < domNodes.length && i < nodes.length) {
            const domNode = domNodes[i];
            const dataNode = nodes[i];
            const nodeId = generateNodeId(dataNode);
            const domNodeId = domNode.getAttribute("data-node-id");
            if (domNodeId !== nodeId) {
                console.log(`  Node ${i}: DOM ID: ${domNodeId}, Data ID: ${nodeId}, Match: false`);
            }
            // Check children
            const childrenContainer = domNode.querySelector(".tree-children");
            if (childrenContainer && dataNode.children.length > 0) {
                verifyDOMStructure(childrenContainer, dataNode.children, depth + 1);
            }
        }
        else if (i < nodes.length) {
            console.log(`  Node ${i}: Missing in DOM, Data ID: ${generateNodeId(nodes[i])}`);
        }
        else {
            console.log(`  Node ${i}: Extra in DOM, DOM ID: ${domNodes[i].getAttribute("data-node-id")}`);
        }
    }
}
/**
 * Handle click on tree node
 * @param node The node that was clicked
 * @param analysis The current analysis
 */
export function handleTreeNodeClick(node, analysis) {
    const path = getPathToNode(node, analysis.nodes);
    if (path.length > 0) {
        applyMovesToBoard(path);
        log(`Applied ${path.length} moves to board from tree click`);
    }
}
//# sourceMappingURL=tree-debug-utils.js.map