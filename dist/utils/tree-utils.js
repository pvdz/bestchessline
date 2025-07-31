import { moveToNotation } from "./notation-utils.js";
import { formatScoreWithMateIn } from "./formatting-utils.js";
import { applyMoveToFEN } from "./fen-manipulation.js";
import * as BestLines from "../best-lines.js";
/**
 * Generate a unique ID for a tree node
 */
export function generateNodeId(node) {
    const positionAfterMove = applyMoveToFEN(node.fen, node.move);
    const cleanFen = positionAfterMove.replace(/[^a-zA-Z0-9]/g, "");
    return `node-${cleanFen}-${node.move.from}-${node.move.to}`;
}
/**
 * Create a DOM element for a tree node
 */
export function createTreeNodeElement(node, depth, analysis) {
    const moveText = moveToNotation(node.move);
    const scoreText = formatNodeScore(node);
    const moveClass = node.isWhiteMove ? "white-move" : "black-move";
    const moveNumber = node.moveNumber;
    let moveNumberText = "";
    if (node.isWhiteMove) {
        moveNumberText = `${moveNumber}.`;
    }
    else {
        moveNumberText = `${moveNumber}...`;
    }
    const depthClass = `tree-depth-${depth}`;
    const nodeId = generateNodeId(node);
    const positionAfterMove = applyMoveToFEN(node.fen, node.move);
    const isTransposition = node.children.length === 0 &&
        analysis.analyzedPositions.has(positionAfterMove);
    const transpositionClass = isTransposition ? "transposition" : "";
    const element = document.createElement("div");
    element.className = `tree-node ${moveClass} ${depthClass} ${transpositionClass}`;
    element.setAttribute("data-node-id", nodeId);
    const moveInfo = document.createElement("div");
    moveInfo.className = "move-info clickable";
    moveInfo.style.cursor = "pointer";
    moveInfo.title = "Click to view this position on the board";
    const moveNumberSpan = document.createElement("span");
    moveNumberSpan.className = "move-number";
    moveNumberSpan.textContent = moveNumberText;
    const moveTextSpan = document.createElement("span");
    moveTextSpan.className = "move-text";
    moveTextSpan.textContent = moveText;
    moveInfo.appendChild(moveNumberSpan);
    moveInfo.appendChild(moveTextSpan);
    if (scoreText) {
        const scoreSpan = document.createElement("span");
        scoreSpan.className = "move-score";
        scoreSpan.textContent = scoreText;
        moveInfo.appendChild(scoreSpan);
    }
    if (isTransposition) {
        const transpositionSpan = document.createElement("span");
        transpositionSpan.className = "transposition-indicator";
        transpositionSpan.textContent = "🔄";
        transpositionSpan.title = "Transposition - position already analyzed";
        moveInfo.appendChild(transpositionSpan);
    }
    element.appendChild(moveInfo);
    // Add children container
    if (node.children.length > 0) {
        const childrenContainer = document.createElement("div");
        childrenContainer.className = "tree-children";
        element.appendChild(childrenContainer);
    }
    return element;
}
/**
 * Update an existing tree node element with new data
 */
export function updateTreeNodeElement(element, node, analysis) {
    const moveText = moveToNotation(node.move);
    const scoreText = formatNodeScore(node);
    const moveClass = node.isWhiteMove ? "white-move" : "black-move";
    const moveNumber = node.moveNumber;
    let moveNumberText = "";
    if (node.isWhiteMove) {
        moveNumberText = `${moveNumber}.`;
    }
    else {
        moveNumberText = `${moveNumber}...`;
    }
    const positionAfterMove = applyMoveToFEN(node.fen, node.move);
    const isTransposition = node.children.length === 0 &&
        analysis.analyzedPositions.has(positionAfterMove);
    const transpositionClass = isTransposition ? "transposition" : "";
    // Update element classes
    element.className = `tree-node ${moveClass} ${transpositionClass}`;
    // Update move info
    const moveInfo = element.querySelector(".move-info");
    if (moveInfo) {
        const moveNumberSpan = moveInfo.querySelector(".move-number");
        const moveTextSpan = moveInfo.querySelector(".move-text");
        const scoreSpan = moveInfo.querySelector(".move-score");
        const transpositionSpan = moveInfo.querySelector(".transposition-indicator");
        if (moveNumberSpan)
            moveNumberSpan.textContent = moveNumberText;
        if (moveTextSpan)
            moveTextSpan.textContent = moveText;
        // Update score
        if (scoreText && scoreSpan) {
            scoreSpan.textContent = scoreText;
        }
        else if (scoreText && !scoreSpan) {
            const newScoreSpan = document.createElement("span");
            newScoreSpan.className = "move-score";
            newScoreSpan.textContent = scoreText;
            moveInfo.appendChild(newScoreSpan);
        }
        else if (!scoreText && scoreSpan) {
            scoreSpan.remove();
        }
        // Update transposition indicator
        if (isTransposition && !transpositionSpan) {
            const newTranspositionSpan = document.createElement("span");
            newTranspositionSpan.className = "transposition-indicator";
            newTranspositionSpan.textContent = "🔄";
            newTranspositionSpan.title = "Transposition - position already analyzed";
            moveInfo.appendChild(newTranspositionSpan);
        }
        else if (!isTransposition && transpositionSpan) {
            transpositionSpan.remove();
        }
    }
    // Update children container
    const childrenContainer = element.querySelector(".tree-children");
    if (node.children.length > 0 && !childrenContainer) {
        const newChildrenContainer = document.createElement("div");
        newChildrenContainer.className = "tree-children";
        element.appendChild(newChildrenContainer);
    }
    else if (node.children.length === 0 && childrenContainer) {
        childrenContainer.remove();
    }
}
/**
 * Build a shadow tree structure for efficient DOM updates
 */
export function buildShadowTree(nodes, analysis, parent = null, depth = 0) {
    const shadowNodes = [];
    for (const node of nodes) {
        const element = createTreeNodeElement(node, depth, analysis);
        const nodeId = generateNodeId(node);
        const shadowNode = {
            id: nodeId,
            element,
            children: [],
            parent,
        };
        // Recursively build children
        if (node.children.length > 0) {
            shadowNode.children = buildShadowTree(node.children, analysis, shadowNode, depth + 1);
        }
        shadowNodes.push(shadowNode);
    }
    return shadowNodes;
}
/**
 * Find a node by ID in the tree structure
 */
export function findNodeById(nodeId, nodes) {
    for (const node of nodes) {
        if (generateNodeId(node) === nodeId) {
            return node;
        }
        if (node.children.length > 0) {
            const found = findNodeById(nodeId, node.children);
            if (found)
                return found;
        }
    }
    return null;
}
/**
 * Sync DOM with shadow tree structure
 */
export function syncDOMWithShadowTree(container, shadowNodes, analysis) {
    // Clear existing content
    container.innerHTML = "";
    // Add shadow nodes to container
    for (const shadowNode of shadowNodes) {
        container.appendChild(shadowNode.element);
        // Add children if they exist
        if (shadowNode.children.length > 0) {
            const childrenContainer = shadowNode.element.querySelector(".tree-children");
            if (childrenContainer) {
                for (const childShadowNode of shadowNode.children) {
                    childrenContainer.appendChild(childShadowNode.element);
                }
            }
        }
    }
}
/**
 * Count nodes recursively in the tree
 */
export function countNodesRecursive(nodes) {
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
 * Get the path from root to a specific node
 */
export function getPathToNode(targetNode, rootNodes) {
    const findPath = (nodes, path = []) => {
        for (const node of nodes) {
            const currentPath = [...path, node];
            if (node === targetNode) {
                return currentPath;
            }
            if (node.children.length > 0) {
                const result = findPath(node.children, currentPath);
                if (result) {
                    return result;
                }
            }
        }
        return null;
    };
    return findPath(rootNodes) || [];
}
/**
 * Format a node's score with delta information
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
/**
 * Generate all lines from the tree as a string
 */
export function generateAllLines(nodes) {
    let result = "";
    let lineCount = 0;
    const traverseNode = (node, currentLine = []) => {
        // Add current node to the line
        const newLine = [...currentLine, node];
        if (node.children.length === 0) {
            // Check if this is a transposed node (not a real leaf)
            const positionAfterMove = applyMoveToFEN(node.fen, node.move);
            const analysis = BestLines.getCurrentAnalysis();
            const isTransposition = analysis && analysis.analyzedPositions.has(positionAfterMove);
            if (!isTransposition) {
                // This is a real leaf node - output the complete line
                const lineText = formatLineWithMoveNumbers(newLine);
                result += `${lineText}\n`;
                lineCount++;
                console.log(`Generated line ${lineCount}:`, lineText);
            }
            else {
                console.log(`Skipping transposed node: ${moveToNotation(node.move)}`);
            }
        }
        else {
            // Continue traversing children
            for (const child of node.children) {
                traverseNode(child, newLine);
            }
        }
    };
    // Traverse all root nodes
    for (const rootNode of nodes) {
        traverseNode(rootNode);
    }
    console.log(`Total lines generated: ${lineCount}`);
    return result;
}
/**
 * Format a line with move numbers
 */
export function formatLineWithMoveNumbers(moves) {
    if (moves.length === 0)
        return "";
    let result = "";
    let currentMoveNumber = 1;
    for (let i = 0; i < moves.length; i++) {
        const move = moves[i];
        const moveText = moveToNotation(move.move);
        if (move.isWhiteMove) {
            // White move - add move number
            result += `${currentMoveNumber}.${moveText}`;
            currentMoveNumber++;
        }
        else {
            // Black move - just add the move
            result += ` ${moveText}`;
        }
        // Add space between moves (except for the last one)
        if (i < moves.length - 1) {
            result += " ";
        }
    }
    return result;
}
//# sourceMappingURL=tree-utils.js.map