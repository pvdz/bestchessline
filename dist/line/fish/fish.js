import {
  formatPCNLineWithMoveNumbers,
  computeSanGameFromPCN,
} from "../../utils/pcn-utils.js";
import { getElementByIdOrThrow } from "../../utils/dom-helpers.js";
import { showToast } from "../../utils/ui-utils.js";
import { initFishing, initInitialMove, keepFishing } from "./fishing.js";
import { getCurrentFishState } from "./fish-state.js";
import { importFishState } from "./fish-state.js";
import {
  updateFishConfigDisplay,
  updateFishStatus,
  updateFishProgress,
  updateFishRootScore,
  updateLineElement,
  updateLineFisherButtonStates,
} from "./fish-ui.js";
import { getRandomProofString, generateLineId } from "./fish-utils.js";
const lineAppState = {
  isFishAnalysisRunning: false,
  shouldStopFishAnalysis: false,
};
/**
 * Update Fish button states using existing Line Fisher button management
 */
function updateFishButtonStates(isAnalyzing) {
  lineAppState.isFishAnalysisRunning = isAnalyzing;
  lineAppState.shouldStopFishAnalysis = false;
  updateLineFisherButtonStates(isAnalyzing, getCurrentFishState().isFishing);
}
/**
 * Stop Fish analysis
 */
export const stopFishAnalysis = () => {
  console.log("Stopping Fish analysis");
  if (!lineAppState.isFishAnalysisRunning) {
    console.log("Fish analysis not running, nothing to stop");
    return;
  }
  // Set the stop flag to interrupt the analysis loop
  lineAppState.shouldStopFishAnalysis = true;
  // Set isFishing to false in current state if it exists
  getCurrentFishState().isFishing = false;
  // Update button states
  updateFishButtonStates(false);
  // Update UI status
  updateFishStatus("Analysis stopped");
  showToast("Fish analysis stopped", "#FF9800", 3000);
};
/**
 * Fish function - performs line analysis according to the algorithm in the comment
 *
 * Algorithm:
 * 1. Create initial move (predefined or from Stockfish)
 * 2. Add to wip list
 * 3. Loop until wip list is empty:
 *    - Get next line from wip
 *    - If even half-moves: responder move (get N best moves)
 *    - If odd half-moves: initiator move (get best move)
 *    - Mark lines as done when max depth reached
 */
export async function fish(config) {
  // - create a state object, empty wip/done list.
  // - show config in UI (root board, limits, the whole thing)
  // - get root score, update config
  // - update root score in UI
  // - create an initial move
  //   - if there is a predefined move, use that, ask stockfish for the score
  //   - otherwise, ask stockfish for the best move of the root FEN
  // - add move to UI
  //   - when adding moves, create a node in the fish-results box to represent the move
  //   - give the node the id of the move.sans, concatenated with underscores
  // add this move to the wip list and the UI
  // now loop:
  // - get the next element in the wip list
  //   - if the number of half-moves is even, the next step is a responder move
  //   - otherwise the next step is an initiator move
  //   - responder move:
  //     - take the position and ask stockfish for the next N best moves
  //       - if there is a responder count override at this depth, use that for N
  //       - otherwise use the default responder count for N.
  //     - add this top list as moves to the line, mark line as done, move it from wip list to done list
  //     - for each response gotten this way, create a _new_ line object that extends the line with the new move
  //     - add these to the wip list
  //     - add these to the UI
  //  - initiator move
  //    - ask stockfish for the best move in the current line
  //    - once you have it, record it as the next move in the line
  //    - if the number of half-moves now exceeds maxDepth/2+1, mark the line as done and complete, remove it from wip list, add it to done list
  //    - otherwise the line can stay in queue and will be picked up again for responder moves
  // repeat until wip queue is drained.
  // Reset stop flag for new analysis
  lineAppState.shouldStopFishAnalysis = false;
  // Update button states - disable start, enable stop
  updateFishButtonStates(true);
  try {
    updateFishConfigDisplay(config);
    updateFishStatus("Starting root analysis...");
    updateFishProgress(getCurrentFishState());
    initFishing();
    // Update root score in UI
    updateFishRootScore(getCurrentFishState().config.baselineScore);
    updateFishStatus(`Creating initial move`);
    await initInitialMove();
    // Update progress and results after initial move
    updateFishProgress(getCurrentFishState());
    // updateLineFisherExploredLines(getCurrentFishState().done.concat(getCurrentFishState().wip), getCurrentFishState().config.rootFEN);
    await keepFishing((msg) => {
      updateFishStatus(msg);
      updateFishProgress(getCurrentFishState());
      // updateLineFisherExploredLines(        getCurrentFishState().done,        getCurrentFishState().config.rootFEN,      );
    });
    // Update button states - enable start, disable stop
    updateFishButtonStates(false);
  } catch (error) {
    console.error("Error thrown while fishing:", error);
    updateFishButtonStates(false);
    updateFishStatus("Error thrown while fishing");
    showToast(
      `Fish analysis failed: ${error instanceof Error ? error.message : String(error)}`,
      "#dc3545",
      5000,
    );
    throw error;
  }
}
export const importFishStateFromClipboard = async () => {
  console.log("Importing fish state from clipboard");
  try {
    // Read from clipboard
    const clipboardText = await navigator.clipboard.readText();
    if (!clipboardText) {
      showToast("No text found in clipboard", "#FF9800", 3000);
      return;
    }
    let importedState;
    try {
      importedState = JSON.parse(clipboardText);
    } catch {
      showToast("Data in clipboard was Invalid JSON", "#FF9800", 3000);
      return;
    }
    if (!importedState) {
      showToast("No data found in clipboard", "#FF9800", 3000);
      return;
    }
    const ok = importFishState(importedState);
    if (ok) {
      console.log("Fish state import completed successfully");
    } else {
      showToast("Failed to import fish state", "#f44336", 4000);
    }
  } catch (error) {
    console.error("Error importing fish state:", error);
    showToast("Failed to import fish state", "#f44336", 4000);
  }
};
/**
 * Export fish state to clipboard
 * Export current analysis state to clipboard in JSON format for import.
 * Serialize current state, copy to clipboard, and show success notification
 */
export const exportFishStateToClipboard = async () => {
  try {
    // Create exportable state object
    const exportState = getCurrentFishState();
    // Convert to JSON and copy to clipboard
    const jsonState = JSON.stringify(exportState, null, 2);
    await navigator.clipboard.writeText(jsonState);
    // Show success notification
    const wipCount = exportState.wip.length;
    const doneCount = exportState.done.length;
    showToast(
      `Exported ${wipCount + doneCount} lines to clipboard (wip: ${wipCount}x, done: ${doneCount}x)`,
      "#4CAF50",
      3000,
    );
    console.log("Fish state exported to clipboard successfully");
  } catch (error) {
    console.error("Error exporting fish state:", error);
    showToast("Failed to export state", "#f44336", 4000);
  }
};
export async function continueFishing() {
  console.log("Continuing fishing with existing state");
  await keepFishing((msg) => {
    updateFishStatus(msg);
    updateFishProgress(getCurrentFishState());
    // updateLineFisherExploredLines(      getCurrentFishState().done,      getCurrentFishState().config.rootFEN,    );
  });
  console.log("Continued fishing stopped");
}
/**
 * Copy fish state to clipboard (for copy button)
 * Copy current analysis state to clipboard in plain text format.
 * Serialize current state, copy to clipboard, and show success notification
 */
export const copyFishStateToClipboard = async () => {
  console.log("Copying fish state to clipboard");
  try {
    const currentFishState = getCurrentFishState();
    // Get all lines (both WIP and done)
    const allLines = [...currentFishState.wip, ...currentFishState.done];
    if (allLines.length === 0) {
      showToast("No lines to copy", "#FF9800", 3000);
      return;
    }
    // Lines are already in PCN format, just format them with move numbers
    const pcnLines = allLines.map((line) => {
      const formattedLine = formatPCNLineWithMoveNumbers(line.pcns);
      // Create comprehensive metadata
      const metadata = {
        lineId: `line_${line.lineIndex}`,
        isMate: line.isMate,
        isStalemate: line.isStalemate,
        isTransposition: line.isTransposition,
        transpositionTarget: line.transpositionTarget,
      };
      // Add metadata as JSON after //
      return `${formattedLine} // ${JSON.stringify(metadata)}`;
    });
    // Create plain text format - one line per opening line in PCN notation
    const plainTextLines = pcnLines.join("\n");
    // Copy plain text to clipboard
    await navigator.clipboard.writeText(plainTextLines);
    // Show success notification
    const wipCount = currentFishState.wip.length;
    const doneCount = currentFishState.done.length;
    showToast(
      `Copied ${allLines.length} lines to clipboard (PCN notation) (${wipCount} WIP, ${doneCount} done)`,
      "#4CAF50",
      3000,
    );
    console.log("Fish state copied to clipboard successfully");
  } catch (error) {
    console.error("Error copying fish state:", error);
    showToast("Failed to copy state", "#f44336", 4000);
  }
};
/**
 * Create a new line element and add it to the DOM
 */
const createLineElement = (line) => {
  const resultsElement = getElementByIdOrThrow("line-fisher-results");
  if (resultsElement.childElementCount === 1) {
    // Add a random proof string as the first child if this is the first line
    const randomProofString = getRandomProofString();
    const proofElement = document.createElement("div");
    proofElement.className = "random-proof-string";
    proofElement.style.color = "#ff0000";
    proofElement.style.fontWeight = "bold";
    proofElement.textContent = randomProofString;
    resultsElement.appendChild(proofElement);
  }
  line.nodeId = generateLineId(line.pcns);
  const lineElement = document.createElement("div");
  lineElement.id = line.nodeId;
  lineElement.className = "line-fisher-result-compact";
  lineElement.style.cursor = "pointer";
  lineElement.setAttribute("data-line-index", line.lineIndex.toString());
  resultsElement.appendChild(lineElement);
  return lineElement;
};
/**
 * Create the initial HTML structure for a line element
 */
const createLineHTMLStructure = (line) => {
  const scoreInPawns = line.score / 100;
  const scoreText =
    scoreInPawns > 0 ? `+${scoreInPawns.toFixed(1)}` : scoreInPawns.toFixed(1);
  let lineNumberStyle = "";
  let lineNumberPrefix = "";
  if (!line.isDone) {
    lineNumberStyle =
      "background-color: #ffeb3b; color: #000; padding: 1px 3px; border-radius: 3px;";
  } else if (line.isFull) {
    lineNumberStyle =
      "border: 1px solid #666; padding: 1px 3px; border-radius: 3px;";
  }
  // Add end-of-line indicator
  const endIndicator = line.isFull ? " 🏁" : "";
  // <span class="random-proof-string">${Math.random().toString(36).substring(2, 8)}</span>
  // <span class="random-proof-string">${line.nodeId.split('_').pop()}</span>
  return `
    <span class="line-number" style="${lineNumberStyle}">${lineNumberPrefix}${line.lineIndex + 1}.</span>
    <span class="line-score">${scoreText}</span>
    <span class="line-notation">${line.sanGame}${endIndicator}</span>
    <span class="line-complete">Complete: ${line.isFull}</span>
    <span class="line-done">Done: ${line.isDone}</span>
  `;
};
/**
 * Update Line Fisher explored lines display with incremental updates
 * Only add new lines and update existing ones without re-rendering everything
 */
const updateLineFisherExploredLines = (results, rootFEN) => {
  const resultsElement = getElementByIdOrThrow("line-fisher-results");
  if (results.length === 0) {
    resultsElement.innerHTML = "<p>No results to show yet...</p>";
    return;
  }
  // Show only the first 50 lines to keep it manageable
  const displayCount = Math.min(results.length, 50);
  // Process each line
  for (let i = 0; i < displayCount; i++) {
    const line = results[i];
    if (!line.sanGame) {
      line.sanGame = computeSanGameFromPCN(line.pcns, rootFEN);
    }
    try {
      if (line.nodeId) {
        const lineElement = getElementByIdOrThrow(line.nodeId);
        updateLineElement(lineElement, line);
      } else {
        // Create new line element
        const lineElement = createLineElement(line);
        lineElement.innerHTML = createLineHTMLStructure(line);
      }
    } catch (error) {
      console.warn(`Failed to update line ${i}:`, error);
      // Continue with next line
    }
  }
  if (resultsElement.childElementCount === displayCount + 1) {
    const moreElement = document.createElement("div");
    moreElement.className = "line-fisher-more";
    moreElement.textContent = `... hiding other lines for performance...`;
    resultsElement.appendChild(moreElement);
  }
};
/**
 * Initialize Line Fisher (placeholder for compatibility)
 */
export const initializeLineFisher = async () => {
  console.log("Line Fisher initialization (placeholder)");
  // No initialization needed for Fish analysis
};
/**
 * Reset Fish analysis
 */
export const resetFishAnalysis = () => {
  console.log("Resetting Fish analysis");
  // Stop any running analysis
  if (lineAppState.isFishAnalysisRunning) {
    stopFishAnalysis();
  }
  // Clear state
  lineAppState.isFishAnalysisRunning = false;
  lineAppState.shouldStopFishAnalysis = true;
  // Update UI
  updateFishButtonStates(false);
  updateFishStatus("Analysis reset");
  // Clear results display
  const resultsElement = getElementByIdOrThrow("line-fisher-results");
  resultsElement.innerHTML = "<p>No results to show yet...</p>";
  showToast("Fish analysis reset", "#FF9800", 3000);
};
//# sourceMappingURL=fish.js.map
