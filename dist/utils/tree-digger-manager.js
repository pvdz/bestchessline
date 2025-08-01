import { getAppState, updateAppState } from "../main.js";
import { moveToNotation } from "./notation-utils.js";
import { applyMoveToFEN } from "./fen-manipulation.js";
import { getButtonElement } from "./dom-helpers.js";
import { log, logError } from "./logging.js";
import { updateTreeDiggerStatus } from "./status-management.js";
import {
  updateTreeDiggerResults,
  resetTreeDiggerPaginationState,
} from "./tree-digger-results.js";
import { formatNodeScore } from "./node-utils.js";
import { getLineCompletion } from "./line-analysis.js";
import { clearTreeNodeDOMMap } from "./debug-utils.js";
import { buildShadowTree, findNodeById } from "./tree-building.js";
import { updateTreeFontSize } from "./ui-utils.js";
import { handleTreeNodeClick } from "./tree-debug-utils.js";
import {
  startTreeDiggerAnalysis,
  stopTreeDiggerAnalysis,
  clearTreeDiggerAnalysis,
  continueTreeDiggerAnalysis,
  restoreTreeDiggerState,
  isAnalyzing,
  getCurrentAnalysis,
  getProgress,
} from "../tree-digger.js";
import { initializeStockfish } from "../stockfish-client.js";
import { updateButtonStates } from "./analysis-config.js";
import {
  exportTreeDiggerState,
  copyTreeDiggerStateToClipboard,
  importTreeDiggerState,
  importTreeDiggerStateFromClipboard,
  deserializeTreeDiggerState,
  validateTreeDiggerState,
  formatStateFileSize,
  estimateStateFileSize,
} from "./tree-digger-persistence.js";
import { getFEN } from "../chess-board.js";
/**
 * Tree Digger Analysis Management Utility Functions
 *
 * Provides functions for managing tree digger analysis, UI updates, and tree rendering.
 */
/**
 * Start tree digger analysis
 */
export const startTreeDiggerAnalysisFromManager = async () => {
  try {
    // Clear any previous analysis results first
    clearTreeDiggerAnalysis();
    // Reset pagination state for new analysis
    resetTreeDiggerPagination();
    await startTreeDiggerAnalysis();
    updateTreeDiggerButtonStates();
    updateTreeDiggerStatus();
    updateTreeDiggerResults();
    updateTreeDiggerStateInfo();
  } catch (error) {
    logError("Failed to start tree digger analysis:", error);
    updateTreeDiggerStatus("Error starting analysis");
  }
};
/**
 * Stop tree digger analysis
 */
export const stopTreeDiggerAnalysisFromManager = () => {
  log("Stop button clicked - calling stopTreeDiggerAnalysis");
  try {
    stopTreeDiggerAnalysis();
    log("TreeDigger.stopTreeDiggerAnalysis() completed");
    clearTreeNodeDOMMap(); // Clear tracked DOM elements
    updateTreeDiggerButtonStates();
    updateTreeDiggerStatus("Analysis stopped");
    log("Stop analysis completed successfully");
  } catch (error) {
    logError("Failed to stop tree digger analysis:", error);
  }
};
/**
 * Clear tree digger analysis
 */
export const clearTreeDiggerAnalysisFromManager = () => {
  try {
    clearTreeDiggerAnalysis();
    clearTreeNodeDOMMap(); // Clear tracked DOM elements
    updateTreeDiggerButtonStates();
    updateTreeDiggerStatus("Ready");
    updateTreeDiggerResults();
    updateTreeDiggerStateInfo();
  } catch (error) {
    logError("Failed to clear tree digger analysis:", error);
  }
};
/**
 * Continue tree digger analysis from current state
 */
export const continueTreeDiggerAnalysisFromManager = async () => {
  try {
    // Update button states immediately when continue is pressed
    updateTreeDiggerButtonStates();
    updateTreeDiggerStatus("Continuing analysis...");
    await continueTreeDiggerAnalysis();
    // Update again after completion
    updateTreeDiggerButtonStates();
    updateTreeDiggerStatus();
    updateTreeDiggerResults();
    updateTreeDiggerStateInfo();
  } catch (error) {
    logError("Failed to continue tree digger analysis:", error);
    updateTreeDiggerStatus("Continue failed");
    // Update button states on error too
    updateTreeDiggerButtonStates();
  }
};
/**
 * Recover from Stockfish crash
 */
export const recoverFromCrash = () => {
  try {
    log("Recovering from Stockfish crash...");
    // Reset all analysis states
    updateAppState({
      isAnalyzing: false,
      currentResults: null,
    });
    // Reset tree digger state
    clearTreeDiggerAnalysis();
    // Reset Stockfish state by reinitializing
    initializeStockfish();
    // Update UI
    updateTreeDiggerButtonStates();
    updateTreeDiggerStatus("Recovered from crash - ready");
    // Hide recovery button
    const recoveryBtn = document.getElementById("recover-from-crash");
    if (recoveryBtn) {
      recoveryBtn.style.display = "none";
    }
    log("Recovery completed successfully");
  } catch (error) {
    logError("Failed to recover from crash:", error);
    updateTreeDiggerStatus("Recovery failed - please refresh page");
  }
};
/**
 * Update tree digger button states
 */
export const updateTreeDiggerButtonStates = () => {
  const startBtn = getButtonElement("start-tree-digger");
  const stopBtn = getButtonElement("stop-tree-digger");
  const clearBtn = getButtonElement("clear-tree-digger");
  const continueBtn = getButtonElement("continue-tree-digger");
  const exportBtn = getButtonElement("export-tree-digger-state");
  const copyBtn = getButtonElement("copy-tree-digger-state");
  const importBtn = getButtonElement("import-tree-digger-state");
  const pasteBtn = getButtonElement("paste-tree-digger-state");
  const recoveryBtn = document.getElementById("recover-from-crash");
  const appState = getAppState();
  const currentlyAnalyzing = isAnalyzing();
  const isStockfishBusy =
    appState.isAnalyzing || appState.positionEvaluation.isAnalyzing;
  const hasAnalysis = getCurrentAnalysis() !== null;
  if (startBtn) {
    startBtn.disabled = currentlyAnalyzing || isStockfishBusy;
  } else {
    logError("Start button not found!");
  }
  if (stopBtn) {
    stopBtn.disabled = !currentlyAnalyzing;
  } else {
    logError("Stop button not found!");
  }
  if (clearBtn) {
    clearBtn.disabled = currentlyAnalyzing;
  } else {
    logError("Clear button not found!");
  }
  if (continueBtn) {
    continueBtn.disabled = currentlyAnalyzing || !hasAnalysis;
  } else {
    logError("Continue button not found!");
  }
  if (exportBtn) {
    exportBtn.disabled = !hasAnalysis; // Only disable if no analysis exists
  } else {
    logError("Export button not found!");
  }
  if (copyBtn) {
    copyBtn.disabled = !hasAnalysis; // Only disable if no analysis exists
  } else {
    logError("Copy button not found!");
  }
  if (importBtn) {
    importBtn.disabled = currentlyAnalyzing;
  } else {
    logError("Import button not found!");
  }
  if (pasteBtn) {
    pasteBtn.disabled = currentlyAnalyzing;
  } else {
    logError("Paste button not found!");
  }
  if (recoveryBtn) {
    // Recovery button is only shown when needed, not disabled
  }
  // Also update main analysis control buttons
  updateButtonStates();
};
/**
 * Update an existing DOM element for a tree node
 */
export const updateTreeNodeElement = (element, node, analysis) => {
  const moveInfo = element.querySelector(".move-info");
  const moveText = moveToNotation(node.move);
  const scoreText = formatNodeScore(node);
  // Update move text
  const moveTextSpan = element.querySelector(".move-text");
  if (moveTextSpan) {
    moveTextSpan.textContent = moveText;
  }
  // Update score
  const scoreSpan = element.querySelector(".move-score");
  if (scoreSpan) {
    if (scoreText) {
      scoreSpan.innerHTML = scoreText;
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
  const transpositionIndicator = element.querySelector(
    ".transposition-indicator",
  );
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
export const syncDOMWithShadowTree = (container, shadowNodes, analysis) => {
  // Get existing DOM nodes
  const existingNodes = Array.from(container.children);
  const existingNodeMap = new Map();
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
      let childrenContainer = existingElement.querySelector(".tree-children");
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
export const updateTreeDiggerTreeIncrementally = (resultsElement, analysis) => {
  let treeSection = resultsElement.querySelector(".tree-digger-tree");
  if (!treeSection) {
    treeSection = document.createElement("div");
    treeSection.className = "tree-digger-tree";
    resultsElement.appendChild(treeSection);
    // Apply current font size to newly created tree section
    const treeFontSizeInput = document.getElementById("tree-font-size");
    if (treeFontSizeInput) {
      const currentFontSize = parseInt(treeFontSizeInput.value);
      updateTreeFontSize(currentFontSize);
    } else {
      updateTreeFontSize(16);
    }
  }
  // Always update the tree section, even when there are no nodes
  if (analysis.nodes.length === 0) {
    treeSection.innerHTML =
      "<p id='tree-digger-tree-empty-message'>No analysis results yet. Starting analysis...</p>";
    return;
  }
  // Remove empty message if it exists
  const emptyMessage = treeSection.querySelector(
    "#tree-digger-tree-empty-message",
  );
  if (emptyMessage) {
    emptyMessage.remove();
  }
  // Build shadow tree from current analysis data
  const shadowNodes = buildShadowTree(analysis.nodes, analysis);
  // Sync DOM with shadow tree
  syncDOMWithShadowTree(treeSection, shadowNodes, analysis);
  // Apply current font size to the updated tree
  const treeFontSizeInput = document.getElementById("tree-font-size");
  if (treeFontSizeInput) {
    const currentFontSize = parseInt(treeFontSizeInput.value);
    updateTreeFontSize(currentFontSize);
  } else {
    // If no input found, apply default font size
    updateTreeFontSize(16);
  }
  // Add click event delegation to the tree section for better performance
  // Only add the listener if it doesn't already exist
  if (!treeSection.hasAttribute("data-tree-digger-clicks-enabled")) {
    treeSection.setAttribute("data-tree-digger-clicks-enabled", "true");
    treeSection.addEventListener("click", (e) => {
      const target = e.target;
      const moveInfo = target.closest(".move-info.clickable");
      if (moveInfo) {
        const treeNode = moveInfo.closest(".tree-node");
        if (treeNode) {
          const nodeId = treeNode.getAttribute("data-node-id");
          if (nodeId) {
            const node = findNodeById(nodeId, analysis.nodes);
            if (node) {
              handleTreeNodeClick(node, analysis);
            }
          }
        }
      }
    });
  }
};
/**
 * Render a tree node recursively
 */
export const renderTreeNode = (node, depth, analysis) => {
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
 * Render a tree digger node
 */
export const renderTreeDiggerNode = (node) => {
  const moveText = moveToNotation(node.move);
  const scoreText = formatNodeScore(node);
  const depthText = node.depth > 0 ? ` [depth: ${node.depth}]` : "";
  const moveClass = node.isWhiteMove ? "white-move" : "black-move";
  const playerText = node.isWhiteMove ? "White" : "Black";
  let html = `
    <div class="tree-digger-node ${moveClass}">
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
      html += renderTreeDiggerNode(child);
    }
    html += "</div>";
  }
  html += "</div>";
  return html;
};
// ============================================================================
// STATE MANAGEMENT FUNCTIONS
// ============================================================================
/**
 * Export current tree digger state
 */
export const exportTreeDiggerStateFromManager = () => {
  try {
    const analysis = getCurrentAnalysis();
    const progress = getProgress();
    if (!analysis) {
      log("No analysis to export");
      return;
    }
    // Create a proper TreeDiggerState object
    const state = {
      isAnalyzing: isAnalyzing(),
      currentAnalysis: analysis,
      progress: progress,
    };
    exportTreeDiggerState(analysis, state);
    updateTreeDiggerStatus("State exported successfully");
    updateTreeDiggerStateInfo();
  } catch (error) {
    logError("Failed to export tree digger state:", error);
    updateTreeDiggerStatus("Export failed");
  }
};
/**
 * Copy tree digger state to clipboard
 */
export const copyTreeDiggerStateToClipboardFromManager = async () => {
  try {
    const analysis = getCurrentAnalysis();
    const progress = getProgress();
    if (!analysis) {
      log("No analysis to copy");
      updateTreeDiggerStatus("No analysis to copy");
      return;
    }
    // Create a proper TreeDiggerState object
    const state = {
      isAnalyzing: isAnalyzing(),
      currentAnalysis: analysis,
      progress: progress,
    };
    updateTreeDiggerStatus("Copying to clipboard...");
    await copyTreeDiggerStateToClipboard(analysis, state);
    updateTreeDiggerStatus("State copied to clipboard");
  } catch (error) {
    logError("Failed to copy tree digger state to clipboard:", error);
    updateTreeDiggerStatus("Copy failed");
  }
};
/**
 * Import tree digger state from file
 */
export const importTreeDiggerStateFromManager = async (file) => {
  try {
    updateTreeDiggerStatus("Importing state...");
    const stateExport = await importTreeDiggerState(file);
    const { analysis, state } = deserializeTreeDiggerState(stateExport);
    // Validate against current board position and configuration
    const currentBoardPosition = getFEN();
    const currentConfig = analysis.config;
    const validation = validateTreeDiggerState(
      stateExport,
      currentBoardPosition,
      currentConfig,
    );
    if (!validation.isValid) {
      throw new Error(`Invalid state: ${validation.errors.join(", ")}`);
    }
    // Restore the tree digger state with imported data
    restoreTreeDiggerState(state);
    // Update UI to reflect the restored state
    updateTreeDiggerButtonStates();
    updateTreeDiggerStatus();
    updateTreeDiggerResults();
    updateTreeDiggerStateInfo(stateExport, validation);
    if (validation.warnings.length > 0) {
      updateTreeDiggerStatus(
        `State imported with warnings: ${validation.warnings.join(", ")}`,
      );
    } else {
      updateTreeDiggerStatus("State imported successfully");
    }
  } catch (error) {
    logError("Failed to import tree digger state:", error);
    updateTreeDiggerStatus("Import failed");
  }
};
/**
 * Import tree digger state from clipboard
 */
export const importTreeDiggerStateFromClipboardFromManager = async () => {
  try {
    updateTreeDiggerStatus("Reading from clipboard...");
    const stateExport = await importTreeDiggerStateFromClipboard();
    const { analysis, state } = deserializeTreeDiggerState(stateExport);
    // Validate against current board position and configuration
    const currentBoardPosition = getFEN();
    const currentConfig = analysis.config;
    const validation = validateTreeDiggerState(
      stateExport,
      currentBoardPosition,
      currentConfig,
    );
    if (!validation.isValid) {
      throw new Error(`Invalid state: ${validation.errors.join(", ")}`);
    }
    // Restore the tree digger state with imported data
    restoreTreeDiggerState(state);
    // Update UI to reflect the restored state
    updateTreeDiggerButtonStates();
    updateTreeDiggerStatus();
    updateTreeDiggerResults();
    updateTreeDiggerStateInfo(stateExport, validation);
    if (validation.warnings.length > 0) {
      updateTreeDiggerStatus(
        `State pasted with warnings: ${validation.warnings.join(", ")}`,
      );
    } else {
      updateTreeDiggerStatus("State pasted successfully");
    }
  } catch (error) {
    logError("Failed to import tree digger state from clipboard:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    updateTreeDiggerStatus(`Paste failed: ${errorMessage}`);
  }
};
/**
 * Update tree digger state information display
 */
export const updateTreeDiggerStateInfo = (stateExport, validation) => {
  const stateInfoElement = document.getElementById("tree-digger-state-info");
  if (!stateInfoElement) {
    logError("State info element not found");
    return;
  }
  const analysis = getCurrentAnalysis();
  const progress = getProgress();
  if (!analysis) {
    stateInfoElement.innerHTML = "<p>No analysis loaded</p>";
    return;
  }
  // Calculate statistics
  const totalNodes = analysis.nodes.reduce((count, node) => {
    const countNodesRecursive = (n) => {
      return (
        1 +
        n.children.reduce((sum, child) => sum + countNodesRecursive(child), 0)
      );
    };
    return count + countNodesRecursive(node);
  }, 0);
  const estimatedSize = estimateStateFileSize(analysis);
  const formattedSize = formatStateFileSize(estimatedSize);
  let html = `
    <div class="state-stat">
      <span class="state-stat-label">Total Nodes:</span>
      <span class="state-stat-value">${totalNodes}</span>
    </div>
    <div class="state-stat">
      <span class="state-stat-label">Analyzed Positions:</span>
      <span class="state-stat-value">${progress.analyzedPositions}/${progress.totalPositions}</span>
    </div>
    <div class="state-stat">
      <span class="state-stat-label">Max Depth:</span>
      <span class="state-stat-value">${analysis.maxDepth}</span>
    </div>
    <div class="state-stat">
      <span class="state-stat-label">Estimated File Size:</span>
      <span class="state-stat-value">${formattedSize}</span>
    </div>
  `;
  // Add validation warnings/errors if available
  if (validation) {
    if (validation.warnings.length > 0) {
      html += `
        <div class="state-warning">
          Warnings: ${validation.warnings.join(", ")}
        </div>
      `;
    }
    if (validation.errors.length > 0) {
      html += `
        <div class="state-error">
          Errors: ${validation.errors.join(", ")}
        </div>
      `;
    }
  }
  stateInfoElement.innerHTML = html;
};
/**
 * Reset tree digger pagination state
 */
export const resetTreeDiggerPagination = () => {
  resetTreeDiggerPaginationState();
  log("Tree digger pagination state reset");
};
/**
 * Handle file input change for state import
 */
export const handleStateFileInput = (event) => {
  const input = event.target;
  const file = input.files?.[0];
  if (file) {
    importTreeDiggerStateFromManager(file);
    // Clear the input so the same file can be selected again
    input.value = "";
  }
};
//# sourceMappingURL=tree-digger-manager.js.map
