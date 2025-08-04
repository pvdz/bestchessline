import {
  getCurrentAnalysis,
  isAnalyzing,
  getProgress,
} from "../tree-digger.js";
import { log } from "./logging.js";
import { moveToNotation } from "./notation-utils.js";
import { getElementByIdOrThrow } from "./dom-helpers.js";

/**
 * Debug panel state
 */
let debugPanelVisible = false;
let debugUpdateInterval: number | null = null;

/**
 * Toggle debug panel visibility
 */
export const toggleDebugPanel = (): void => {
  const debugPanel = getElementByIdOrThrow("debug-panel");
  const toggleBtn = getElementByIdOrThrow("toggle-debug-panel");

  if (!debugPanel || !toggleBtn) {
    log("Debug panel elements not found");
    return;
  }

  debugPanelVisible = !debugPanelVisible;

  if (debugPanelVisible) {
    debugPanel.style.display = "block";
    toggleBtn.textContent = "🔍 Debug (ON)";
    startDebugUpdates();
  } else {
    debugPanel.style.display = "none";
    toggleBtn.textContent = "🔍 Debug";
    stopDebugUpdates();
  }
};

/**
 * Close debug panel
 */
export const closeDebugPanel = (): void => {
  const debugPanel = getElementByIdOrThrow("debug-panel");
  const toggleBtn = getElementByIdOrThrow("toggle-debug-panel");

  if (!debugPanel || !toggleBtn) {
    return;
  }

  debugPanelVisible = false;
  debugPanel.style.display = "none";
  toggleBtn.textContent = "🔍 Debug";
  stopDebugUpdates();
};

/**
 * Start debug updates
 */
const startDebugUpdates = (): void => {
  if (debugUpdateInterval) {
    clearInterval(debugUpdateInterval);
  }

  // Update immediately
  updateDebugInfo();

  // Update every 2 seconds
  debugUpdateInterval = window.setInterval(updateDebugInfo, 2000);
};

/**
 * Stop debug updates
 */
const stopDebugUpdates = (): void => {
  if (debugUpdateInterval) {
    clearInterval(debugUpdateInterval);
    debugUpdateInterval = null;
  }
};

/**
 * Update debug information
 */
const updateDebugInfo = (): void => {
  if (!debugPanelVisible) return;

  updateQueueInfo();
  updateStateInfo();
  updateTreeInfo();
};

/**
 * Update queue information
 */
const updateQueueInfo = (): void => {
  const element = getElementByIdOrThrow("debug-queue-info");
  if (!element) return;

  const analysis = getCurrentAnalysis();
  if (!analysis) {
    element.innerHTML = "<p>No analysis loaded</p>";
    return;
  }

  const queueLength = analysis.analysisQueue.length;
  const isComplete = analysis.isComplete;

  let html = `
    <h4>Analysis Queue</h4>
    <p><strong>Queue Length:</strong> ${queueLength}</p>
    <p><strong>Status:</strong> ${isComplete ? "Complete" : "In Progress"}</p>
  `;

  if (queueLength > 0) {
    html += "<h5>Top 5 Queue Items:</h5><ul>";

    // Show top 5 queue items with move notation
    const topItems = analysis.analysisQueue.slice(0, 5);
    topItems.forEach((fen: string, index: number) => {
      const moveNotation = getMoveNotationFromFen(fen, analysis);
      html += `<li><strong>${index + 1}.</strong> ${moveNotation}</li>`;
    });

    html += "</ul>";
  } else {
    html += "<p>Queue is empty</p>";
  }

  element.innerHTML = html;
};

/**
 * Update state information
 */
const updateStateInfo = (): void => {
  const element = getElementByIdOrThrow("debug-state-info");
  if (!element) return;

  const analysis = getCurrentAnalysis();
  const analyzing = isAnalyzing();
  const progress = getProgress();

  if (!analysis) {
    element.textContent = "No analysis loaded";
    return;
  }

  let info = `Analyzing: ${analyzing}\n`;
  info += `Nodes count: ${analysis.nodes.length}\n`;
  info += `Max depth: ${analysis.maxDepth}\n`;
  info += `Threads: ${analysis.config.threads}\n`;
  info += `Analyzed positions: ${analysis.analyzedPositions.size}\n\n`;
  info += `Progress:\n`;
  info += `  Total positions: ${progress.totalPositions}\n`;
  info += `  Analyzed positions: ${progress.analyzedPositions}\n`;
  info += `  Current position: ${progress.currentPosition.substring(0, 30)}...\n`;
  info += `  PV lines received: ${progress.pvLinesReceived}`;

  element.textContent = info;
};

/**
 * Update tree statistics
 */
const updateTreeInfo = (): void => {
  const element = getElementByIdOrThrow("debug-tree-info");
  if (!element) return;

  const analysis = getCurrentAnalysis();
  if (!analysis) {
    element.textContent = "No analysis loaded";
    return;
  }

  const stats = calculateTreeStats(analysis.nodes);

  let info = `Total nodes: ${stats.totalNodes}\n`;
  info += `Leaf nodes: ${stats.leafNodes}\n`;
  info += `Max depth: ${stats.maxDepth}\n`;
  info += `Average depth: ${stats.avgDepth.toFixed(2)}\n`;
  info += `Nodes with analysis: ${stats.nodesWithAnalysis}\n`;
  info += `Nodes without analysis: ${stats.nodesWithoutAnalysis}`;

  element.textContent = info;
};

/**
 * Get the complete move sequence for a FEN position
 */
import type { TreeDiggerAnalysis, TreeDiggerNode } from "../types.js";

const getMoveNotationFromFen = (
  fen: string,
  analysis: TreeDiggerAnalysis,
): string => {
  try {
    // Find the node that corresponds to this FEN
    const findNodeByFen = (
      nodes: TreeDiggerNode[],
      targetFen: string,
    ): TreeDiggerNode | null => {
      for (const node of nodes) {
        if (node.fen === targetFen) {
          return node;
        }
        const found = findNodeByFen(node.children, targetFen);
        if (found) {
          return found;
        }
      }
      return null;
    };

    const node = findNodeByFen(analysis.nodes, fen);
    if (node) {
      return getCompleteMoveSequence(node);
    }

    // If we can't find the node, show a truncated FEN
    return `Position: ${fen.substring(0, 20)}...`;
  } catch (error) {
    log("Error getting move notation from FEN:", error);
    return `FEN: ${fen.substring(0, 20)}...`;
  }
};

/**
 * Get the complete move sequence for a node
 */
const getCompleteMoveSequence = (node: TreeDiggerNode): string => {
  const moves: string[] = [];
  let currentNode: TreeDiggerNode | null = node;

  // Walk up the tree to build the complete sequence
  while (currentNode && currentNode.move) {
    moves.unshift(moveToNotation(currentNode.move));
    currentNode = currentNode.parent || null;
  }

  // Format as a move sequence
  if (moves.length === 0) {
    return "Initial position";
  }

  // Group moves into pairs (white move + black move)
  let sequence = "";
  for (let i = 0; i < moves.length; i++) {
    if (i % 2 === 0) {
      // White move
      const moveNumber = Math.floor(i / 2) + 1;
      sequence += `${moveNumber}.${moves[i]}`;
    } else {
      // Black move
      sequence += moves[i];
    }

    // Add space between move pairs
    if (i % 2 === 1 && i < moves.length - 1) {
      sequence += " ";
    }
  }

  return sequence;
};

/**
 * Calculate tree statistics
 */
const calculateTreeStats = (
  nodes: TreeDiggerNode[],
): {
  totalNodes: number;
  leafNodes: number;
  maxDepth: number;
  avgDepth: number;
  nodesWithAnalysis: number;
  nodesWithoutAnalysis: number;
} => {
  let totalNodes = 0;
  let leafNodes = 0;
  let maxDepth = 0;
  let totalDepth = 0;
  let nodesWithAnalysis = 0;
  let nodesWithoutAnalysis = 0;

  const traverse = (nodeList: TreeDiggerNode[], depth: number): void => {
    for (const node of nodeList) {
      totalNodes++;
      totalDepth += depth;
      maxDepth = Math.max(maxDepth, depth);

      if (node.analysisResult) {
        nodesWithAnalysis++;
      } else {
        nodesWithoutAnalysis++;
      }

      if (node.children.length === 0) {
        leafNodes++;
      } else {
        traverse(node.children, depth + 1);
      }
    }
  };

  traverse(nodes, 0);

  return {
    totalNodes,
    leafNodes,
    maxDepth,
    avgDepth: totalNodes > 0 ? totalDepth / totalNodes : 0,
    nodesWithAnalysis,
    nodesWithoutAnalysis,
  };
};

/**
 * Clear tracked DOM elements for tree nodes
 */
export const clearTreeNodeDOMMap = (): void => {
  // This function is used to clear any tracked DOM elements
  // Currently a placeholder - can be expanded if needed
  log("Clearing tree node DOM map");
};
