import { FishLine, LineFisherConfig, LineMetadata } from "./types.js";
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

const lineAppState: {
  isFishAnalysisRunning: boolean;
  shouldStopFishAnalysis: boolean;
} = {
  isFishAnalysisRunning: false,
  shouldStopFishAnalysis: false,
};

/**
 * Update Fish button states using existing Line Fisher button management
 */
function updateFishButtonStates(isAnalyzing: boolean): void {
  lineAppState.isFishAnalysisRunning = isAnalyzing;
  lineAppState.shouldStopFishAnalysis = false;

  updateLineFisherButtonStates(isAnalyzing, getCurrentFishState().isFishing);
}

/**
 * Stop Fish analysis
 */
export const stopFishAnalysis = (): void => {
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
export async function fish(config: LineFisherConfig): Promise<void> {
  // - create a state object, empty wip/done list.
  // Ensure current fish config reflects the UI config so initFishing uses it
  const state = getCurrentFishState();
  state.config = config;
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
    updateFishConfigDisplay(state.config);
    updateFishStatus("Starting root analysis...");
    updateFishProgress(getCurrentFishState());
    updateLiveLinesPreview();

    await initFishing();

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
      updateLiveLinesPreview();
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

export const importFishStateFromClipboard = async (): Promise<void> => {
  console.log("Importing fish state from clipboard");

  try {
    // Read from clipboard
    const clipboardText = await navigator.clipboard.readText();

    if (!clipboardText) {
      showToast("No text found in clipboard", "#FF9800", 3000);
      return;
    }

    let importedState: unknown;
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
export const exportFishStateToClipboard = async (): Promise<void> => {
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
    updateLiveLinesPreview();
    // updateLineFisherExploredLines(      getCurrentFishState().done,      getCurrentFishState().config.rootFEN,    );
  });

  console.log("Continued fishing stopped");
}

/**
 * Copy fish state to clipboard (for copy button)
 * Copy current analysis state to clipboard in plain text format.
 * Serialize current state, copy to clipboard, and show success notification
 */
export const copyFishStateToClipboard = async (): Promise<void> => {
  console.log("Copying fish state to clipboard");

  try {
    const currentFishState = getCurrentFishState();

    // Get all lines (both WIP and done)
    const allLines = [...currentFishState.wip, ...currentFishState.done];

    if (allLines.length === 0) {
      showToast("No lines to copy", "#FF9800", 3000);
      return;
    }

    // Lines are already in PCN format, convert to long notation with move numbers
    const outputLines = allLines.map((line) => {
      // Convert each PCN to long coordinate notation (e.g., Ng1f3 -> g1f3, keep O-O/O-O-O)
      const longMoves = line.pcns.map((pcn) => {
        if (pcn === "O-O" || pcn === "O-O-O") return pcn;
        if (/^[NBRQKP][a-h][1-8][a-h][1-8]$/.test(pcn)) {
          return pcn.substring(1, 5);
        }
        // Already long or unexpected, keep as-is
        return pcn;
      });

      // Re-use formatter to add move numbers, but with long moves
      const formattedLine = formatPCNLineWithMoveNumbers(
        longMoves as unknown as string[],
      );

      // Include top-5 best moves (responders) and their scores if available
      const metadata: LineMetadata = {
        lineId: `line_${line.lineIndex}`,
        isMate: line.isMate,
        isStalemate: line.isStalemate,
        isTransposition: line.isTransposition,
        transpositionTarget: line.transpositionTarget,
      };

      return `${formattedLine} // ${JSON.stringify({
        ...metadata,
        best5: line.best5?.slice(0, 5) ?? [],
      })}`;
    });

    // Create plain text format - one line per opening line in PCN notation
    const plainTextLines = outputLines.join("\n");

    // Copy plain text to clipboard
    await navigator.clipboard.writeText(plainTextLines);

    // Show success notification
    const wipCount = currentFishState.wip.length;
    const doneCount = currentFishState.done.length;
    showToast(
      `Copied ${allLines.length} lines to clipboard (long notation) (${wipCount} WIP, ${doneCount} done)`,
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
const createLineElement = (line: FishLine): HTMLElement => {
  const resultsElement = getElementByIdOrThrow("fish-results");

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
  lineElement.className = "fish-result-compact";
  lineElement.style.cursor = "pointer";
  lineElement.setAttribute("data-line-index", line.lineIndex.toString());

  resultsElement.appendChild(lineElement);
  return lineElement;
};

/**
 * Create the initial HTML structure for a line element
 */
const createLineHTMLStructure = (line: FishLine): string => {
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
    <span class="fish-line-number" style="${lineNumberStyle}">${lineNumberPrefix}${line.lineIndex + 1}.</span>
    <span class="fish-line-score">${scoreText}</span>
    <span class="fish-line-notation">${line.sanGame}${endIndicator}</span>
    <span class="fish-line-complete">Complete: ${line.isFull}</span>
    <span class="fish-line-done">Done: ${line.isDone}</span>
  `;
};

/**
 * Update Line Fisher explored lines display with incremental updates
 * Only add new lines and update existing ones without re-rendering everything
 */
const updateLineFisherExploredLines = (
  results: FishLine[],
  rootFEN: string,
): void => {
  const resultsElement = getElementByIdOrThrow("fish-results");

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
        const lineElement = getElementByIdOrThrow(line.nodeId) as HTMLElement;
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
    moreElement.className = "fish-more";
    moreElement.textContent = `... hiding other lines for performance...`;
    resultsElement.appendChild(moreElement);
  }
};

/**
 * Initialize Line Fisher (placeholder for compatibility)
 */
export const initializeLineFisher = async (): Promise<void> => {
  console.log("Line Fisher initialization (placeholder)");
  // No initialization needed for Fish analysis
};

/**
 * Reset Fish analysis
 */
export const resetFishAnalysis = (): void => {
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
  const resultsElement = getElementByIdOrThrow("fish-results");
  resultsElement.innerHTML = "<p>No results to show yet...</p>";

  showToast("Fish analysis reset", "#FF9800", 3000);
};

/**
 * Live lines preview: render last few WIP and Done lines at an interval-gated cadence.
 * Visible only when toggled on; when toggled off, rendering stops but panel remains visible.
 */
let fishLiveLinesLastRenderAt = 0;
const FISH_LIVE_LINES_MIN_INTERVAL_MS = 500; // throttle UI updates

function isLiveLinesEnabled(): boolean {
  const checkbox = document.getElementById(
    "fish-lines-toggle",
  ) as HTMLInputElement | null;
  return !!(checkbox && checkbox.checked);
}

export function updateLiveLinesPreview(): void {
  try {
    const now = Date.now();
    if (now - fishLiveLinesLastRenderAt < FISH_LIVE_LINES_MIN_INTERVAL_MS)
      return;
    fishLiveLinesLastRenderAt = now;

    const panel = document.getElementById("fish-lines-panel");
    if (!panel) return;

    // Always keep panel visible once it appeared; only gate updates by toggle
    const enabled = isLiveLinesEnabled();
    if (enabled && panel.style.display === "none") {
      panel.style.display = "block";
    }
    if (!enabled) return; // do not update when disabled

    const state = getCurrentFishState();

    const wipContainer = document.getElementById("fish-lines-wip");
    const doneContainer = document.getElementById("fish-lines-done");
    if (!wipContainer || !doneContainer) return;

    // Show last up to 10 entries from each list (Fisher-generated lines)
    const lastWip = state.wip.slice(-10);
    const lastDone = state.done.slice(-10);

    // Update headings with showing/queue counts
    const wipHeading = document.querySelector("#fish-lines-wip")
      ?.previousElementSibling as HTMLElement | undefined;
    const doneHeading = document.querySelector("#fish-lines-done")
      ?.previousElementSibling as HTMLElement | undefined;
    if (wipHeading) {
      wipHeading.textContent = `WIP ${lastWip.length}/${state.wip.length}`;
    }
    if (doneHeading) {
      doneHeading.textContent = `Done ${lastDone.length}/${state.done.length}`;
    }

    const toList = (lines: typeof state.wip) =>
      lines
        .map((l) => {
          // Display the fisher-produced line in PCN with move numbers
          return formatPCNLineWithMoveNumbers(l.pcns) + "\n";
        })
        .join("");

    wipContainer.textContent = toList(lastWip) || "(none)";
    doneContainer.textContent = toList(lastDone) || "(none)";
  } catch (e) {
    console.warn("Failed to update live lines preview", e);
  }
}
