import { formatScoreWithMateIn } from "./formatting-utils.js";
import { applyMoveToFEN } from "./fen-manipulation.js";
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
export function generateNodeId(node) {
    const positionAfterMove = applyMoveToFEN(node.fen, node.move);
    const cleanFen = positionAfterMove.replace(/[^a-zA-Z0-9]/g, "");
    return `node-${cleanFen}-${node.move.from}-${node.move.to}`;
}
/**
 * Count nodes recursively in a tree structure
 * @param nodes Array of nodes to count
 * @returns Total number of nodes including all children
 */
export function countNodesRecursive(nodes) {
    let count = 0;
    for (const node of nodes) {
        count += 1 + countNodesRecursive(node.children);
    }
    return count;
}
/**
 * Format a node's score with delta information
 * @param node The node to format the score for
 * @returns Formatted score string with delta information
 */
export function formatNodeScore(node) {
    if (node.needsEvaluation) {
        return " (?)";
    }
    if (node.score === undefined || node.score === null) {
        return "";
    }
    const currentScore = formatScoreWithMateIn(node.score, node.mateIn ?? 0);
    // Calculate delta from parent position
    let deltaText = "";
    if (node.parent) {
        const parentScore = node.parent.score;
        if (parentScore !== undefined && parentScore !== null) {
            const delta = node.score - parentScore;
            if (Math.abs(delta) < 0.01) {
                // Equal position (within 0.01 centipawns)
                deltaText = " <span class='delta-equal'>(≈)</span>";
            }
            else if (delta > 0) {
                // Improved position
                const deltaFormatted = formatScoreWithMateIn(delta, 0);
                deltaText = ` <span class='delta-improved'>(▲${deltaFormatted})</span>`;
            }
            else {
                // Regressed position
                const deltaFormatted = formatScoreWithMateIn(Math.abs(delta), 0);
                deltaText = ` <span class='delta-regressed'>(▼${deltaFormatted})</span>`;
            }
        }
    }
    return ` (${currentScore}${deltaText})`;
}
//# sourceMappingURL=node-utils.js.map