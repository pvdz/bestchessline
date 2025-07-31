import { BestLineNode, BestLinesAnalysis } from "../types.js";
import { getAppState, updateAppState } from "../main.js";
import { moveToNotation } from "./notation-utils.js";
import { applyMoveToFEN } from "./fen-manipulation.js";
import { getButtonElement } from "./dom-helpers.js";
import { log, logError } from "./logging.js";
import { updateBestLinesStatus } from "./status-management.js";
import { updateBestLinesResults } from "./best-lines-results.js";
import { formatNodeScore } from "./node-utils.js";
import { getLineCompletion } from "./line-analysis.js";
import { clearTreeNodeDOMMap } from "./debug-utils.js";
import { buildShadowTree, findNodeById, UITreeNode } from "./tree-building.js";
import * as BestLines from "../best-lines.js";

/**
 * Best Lines Analysis Management Utility Functions
 * 
 * Provides functions for managing tree digger analysis, UI updates, and tree rendering.
 */

/**
 * Start best lines analysis
 */
export const startBestLinesAnalysis = async (): Promise<void> => {
  try {
    // Clear any previous analysis results first
    BestLines.clearBestLinesAnalysis();

    await BestLines.startBestLinesAnalysis();
    updateBestLinesButtonStates();
    updateBestLinesStatus();
    updateBestLinesResults();
  } catch (error) {
    logError("Failed to start best lines analysis:", error);
    updateBestLinesStatus("Error starting analysis");
  }
};

/**
 * Stop best lines analysis
 */
export const stopBestLinesAnalysis = (): void => {
  log("Stop button clicked - calling stopBestLinesAnalysis");
  try {
    BestLines.stopBestLinesAnalysis();
    log("BestLines.stopBestLinesAnalysis() completed");
    clearTreeNodeDOMMap(); // Clear tracked DOM elements
    updateBestLinesButtonStates();
    updateBestLinesStatus("Analysis stopped");
    log("Stop analysis completed successfully");
  } catch (error) {
    logError("Failed to stop best lines analysis:", error);
  }
};

/**
 * Clear best lines analysis
 */
export const clearBestLinesAnalysis = (): void => {
  try {
    BestLines.clearBestLinesAnalysis();
    clearTreeNodeDOMMap(); // Clear tracked DOM elements
    updateBestLinesButtonStates();
    updateBestLinesStatus("Ready");
    updateBestLinesResults();
  } catch (error) {
    logError("Failed to clear best lines analysis:", error);
  }
};

/**
 * Update best lines button states
 */
export const updateBestLinesButtonStates = (): void => {
  const startBtn = getButtonElement("start-tree-digger");
  const stopBtn = getButtonElement("stop-tree-digger");
  const clearBtn = getButtonElement("clear-tree-digger");

  const appState = getAppState();
  const isAnalyzing = BestLines.isAnalyzing();
  const isStockfishBusy =
    appState.isAnalyzing || appState.positionEvaluation.isAnalyzing;

  if (startBtn) {
    startBtn.disabled = isAnalyzing || isStockfishBusy;
  } else {
    logError("Start button not found!");
  }
  if (stopBtn) {
    stopBtn.disabled = !isAnalyzing;
  } else {
    logError("Stop button not found!");
  }
  if (clearBtn) {
    clearBtn.disabled = isAnalyzing;
  } else {
    logError("Clear button not found!");
  }
};

/**
 * Update an existing DOM element for a tree node
 */
export const updateTreeNodeElement = (
  element: HTMLElement,
  node: BestLineNode,
  analysis: BestLinesAnalysis,
): void => {
  const moveInfo = element.querySelector(".move-info") as HTMLElement;

  const moveText = moveToNotation(node.move);
  const scoreText = formatNodeScore(node);

  // Update move text
  const moveTextSpan = element.querySelector(".move-text");
  if (moveTextSpan) {
    moveTextSpan.textContent = moveText;
  }

  // Update score
  const scoreSpan = element.querySelector(".move-score") as HTMLElement;
  if (scoreSpan) {
    if (scoreText) {
      scoreSpan.textContent = scoreText;
      scoreSpan.style.display = "inline";
    } else {
      scoreSpan.style.display = "none";
    }
  }

  // Update line completion for leaf nodes
  const lineCompletion = element.querySelector(".line-completion");
  if (lineCompletion && node.children.length === 0) {
    lineCompletion.innerHTML = getLineCompletion(node, analysis);
  }

  // Update transposition indicator
  const positionAfterMove = applyMoveToFEN(node.fen, node.move);
  const isTransposition =
    node.children.length === 0 &&
    analysis.analyzedPositions.has(positionAfterMove);
  
  const transpositionIndicator = element.querySelector(".transposition-indicator") as HTMLElement;
  if (transpositionIndicator) {
    if (isTransposition) {
      transpositionIndicator.textContent = "🔄";
      transpositionIndicator.style.display = "inline";
    } else {
      transpositionIndicator.style.display = "none";
    }
  }
};

/**
 * Sync the DOM with the shadow tree
 */
export const syncDOMWithShadowTree = (
  container: HTMLElement,
  shadowNodes: UITreeNode[],
  analysis: BestLinesAnalysis,
): void => {
  // Get existing DOM nodes
  const existingNodes = Array.from(container.children) as HTMLElement[];
  const existingNodeMap = new Map<string, HTMLElement>();

  for (const element of existingNodes) {
    const nodeId = element.getAttribute("data-node-id");
    if (nodeId) {
      existingNodeMap.set(nodeId, element);
    }
  }

  // Process shadow nodes in order
  for (let i = 0; i < shadowNodes.length; i++) {
    const shadowNode = shadowNodes[i];
    const existingElement = existingNodeMap.get(shadowNode.id);

    if (existingElement) {
      // Update existing element - we need to find the original node data
      const originalNode = findNodeById(shadowNode.id, analysis.nodes);
      if (originalNode) {
        updateTreeNodeElement(existingElement, originalNode, analysis);
      }

      // Move to correct position if needed
      if (container.children[i] !== existingElement) {
        container.insertBefore(existingElement, container.children[i] || null);
      }

      // Process children
      let childrenContainer = existingElement.querySelector(
        ".tree-children",
      ) as HTMLElement;
      if (shadowNode.children.length > 0) {
        if (!childrenContainer) {
          childrenContainer = document.createElement("div");
          childrenContainer.className = "tree-children";
          existingElement.appendChild(childrenContainer);
        }
        syncDOMWithShadowTree(childrenContainer, shadowNode.children, analysis);
      } else if (childrenContainer) {
        childrenContainer.remove();
      }
    } else {
      // Create new element
      const newElement = shadowNode.element;

      // Insert at correct position
      if (i < container.children.length) {
        container.insertBefore(newElement, container.children[i]);
      } else {
        container.appendChild(newElement);
      }

      // Process children
      if (shadowNode.children.length > 0) {
        const childrenContainer = document.createElement("div");
        childrenContainer.className = "tree-children";
        newElement.appendChild(childrenContainer);
        syncDOMWithShadowTree(childrenContainer, shadowNode.children, analysis);
      }
    }
  }

  // Remove extra DOM nodes that shouldn't be there
  for (const element of existingNodes) {
    const nodeId = element.getAttribute("data-node-id");
    if (nodeId && !shadowNodes.find((n) => n.id === nodeId)) {
      element.remove();
    }
  }
};

/**
 * Update the tree UI incrementally
 */
export const updateBestLinesTreeIncrementally = (
  resultsElement: HTMLElement,
  analysis: BestLinesAnalysis,
): void => {
  let treeSection = resultsElement.querySelector(
    ".tree-digger-tree",
  ) as HTMLElement;
  if (!treeSection) {
    treeSection = document.createElement("div");
    treeSection.className = "tree-digger-tree";
    resultsElement.appendChild(treeSection);
  }

  // Always update the tree section, even when there are no nodes
  if (analysis.nodes.length === 0) {
    treeSection.innerHTML =
      "<p id='tree-digger-tree-empty-message'>No analysis results yet. Starting analysis...</p>";
    return;
  }

  // Remove empty message if it exists
  const emptyMessage = treeSection.querySelector("#tree-digger-tree-empty-message");
  if (emptyMessage) {
    emptyMessage.remove();
  }

  // Build shadow tree from current analysis data
  const shadowNodes = buildShadowTree(analysis.nodes, analysis);

  // Sync DOM with shadow tree
  syncDOMWithShadowTree(treeSection, shadowNodes, analysis);
};

/**
 * Render a tree node recursively
 */
export const renderTreeNode = (
  node: BestLineNode,
  depth: number,
  analysis: BestLinesAnalysis,
): string => {
  const moveText = moveToNotation(node.move);
  const scoreText = formatNodeScore(node);
  const moveClass = node.isWhiteMove ? "white-move" : "black-move";

  // Use the move number from the node itself (calculated based on game position)
  const moveNumber = node.moveNumber;
  let moveNumberText = "";
  if (node.isWhiteMove) {
    moveNumberText = `${moveNumber}.`;
  } else {
    moveNumberText = `${moveNumber}...`;
  }
  const depthClass = `tree-depth-${depth}`;

  // Generate a unique node ID for debugging
  const nodeId = `node-${node.fen.replace(/[^a-zA-Z0-9]/g, "")}-${node.move.from}-${node.move.to}`;

  // Check if this position is a transposition (has been analyzed before)
  // We show transposition when this node has no children because the position was already analyzed
  const positionAfterMove = applyMoveToFEN(node.fen, node.move);
  const isTransposition =
    node.children.length === 0 &&
    analysis.analyzedPositions.has(positionAfterMove);
  const transpositionClass = isTransposition ? "transposition" : "";

  let html = `
    <div class="tree-node ${moveClass} ${depthClass} ${transpositionClass}" data-node-id="${nodeId}">
      <div class="move-info">
        <span class="move-number">${moveNumberText}</span>
        <span class="move-text">${moveText}</span>
        ${scoreText ? `<span class="move-score">${scoreText}</span>` : ""}

        ${isTransposition ? `<span class="transposition-indicator">🔄</span>` : ""}
      </div>
      ${node.children.length === 0 ? `<div class="line-completion">${getLineCompletion(node, analysis)}</div>` : ""}
  `;

  if (node.children.length > 0) {
    html += `<div class="tree-children">`;
    for (const child of node.children) {
      html += renderTreeNode(child, depth + 1, analysis);
    }
    html += `</div>`;
  }

  html += `</div>`;
  return html;
};

/**
 * Render a best line node
 */
export const renderBestLineNode = (node: BestLineNode): string => {
  const moveText = moveToNotation(node.move);
  const scoreText = formatNodeScore(node);
  const depthText = node.depth > 0 ? ` [depth: ${node.depth}]` : "";
  const moveClass = node.isWhiteMove ? "white-move" : "black-move";
  const playerText = node.isWhiteMove ? "White" : "Black";

  let html = `
    <div class="best-line-node ${moveClass}">
      <div class="move-info">
        <span class="move-player">${playerText}</span>
        <span class="move-text">${moveText}</span>
        ${scoreText ? `<span class="move-score">${scoreText}</span>` : ""}
        ${depthText ? `<span class="move-depth">${depthText}</span>` : ""}
      </div>
      <div class="move-fen">${node.fen}</div>
  `;

  if (node.children.length > 0) {
    html += "<div class='children'>";
    for (const child of node.children) {
      html += renderBestLineNode(child);
    }
    html += "</div>";
  }

  html += "</div>";
  return html;
}; 