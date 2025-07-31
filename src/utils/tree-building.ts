import { BestLineNode, TreeDiggerAnalysis } from "../types.js";
import { generateNodeId, formatNodeScore } from "./node-utils.js";
import { moveToNotation } from "./notation-utils.js";
import { applyMoveToFEN } from "./fen-manipulation.js";

/**
 * Tree Building Utility Functions
 *
 * Provides functions for building and managing tree structures.
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
 * Build the shadow tree from the data tree
 */
export function buildShadowTree(
  nodes: BestLineNode[],
  analysis: TreeDiggerAnalysis,
  parent: UITreeNode | null = null,
  depth: number = 0,
): UITreeNode[] {
  const uiNodes: UITreeNode[] = [];

  for (const node of nodes) {
    const nodeId = generateNodeId(node);
    const element = createTreeNodeElement(node, depth, analysis);

    const uiNode: UITreeNode = {
      id: nodeId,
      element,
      children: [],
      parent,
    };

    // Recursively build children
    if (node.children.length > 0) {
      uiNode.children = buildShadowTree(
        node.children,
        analysis,
        uiNode,
        depth + 1,
      );
    }

    uiNodes.push(uiNode);
  }

  return uiNodes;
}

/**
 * Find a node by ID in the data tree
 */
export function findNodeById(
  nodeId: string,
  nodes: BestLineNode[],
): BestLineNode | null {
  for (const node of nodes) {
    if (generateNodeId(node) === nodeId) {
      return node;
    }
    if (node.children.length > 0) {
      const found = findNodeById(nodeId, node.children);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Create a DOM element for a tree node
 */
function createTreeNodeElement(
  node: BestLineNode,
  depth: number,
  analysis: TreeDiggerAnalysis,
): HTMLElement {
  const moveText = moveToNotation(node.move);
  const scoreText = formatNodeScore(node);
  const moveClass = node.isWhiteMove ? "white-move" : "black-move";

  const moveNumber = node.moveNumber;
  let moveNumberText = "";
  if (node.isWhiteMove) {
    moveNumberText = `${moveNumber}.`;
  } else {
    moveNumberText = `${moveNumber}...`;
  }
  const depthClass = `tree-depth-${depth}`;

  const nodeId = generateNodeId(node);

  const positionAfterMove = applyMoveToFEN(node.fen, node.move);
  const isTransposition =
    node.children.length === 0 &&
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
    scoreSpan.innerHTML = scoreText;
    moveInfo.appendChild(scoreSpan);
  }

  if (isTransposition) {
    const transpositionSpan = document.createElement("span");
    transpositionSpan.className = "transposition-indicator";
    transpositionSpan.textContent = " (transposed)";
    moveInfo.appendChild(transpositionSpan);
  }

  element.appendChild(moveInfo);

  return element;
}
