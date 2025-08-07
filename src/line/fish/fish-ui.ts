import { FishState, FishLine, LineFisherConfig } from "./types.js";
import { computeSanGameFromPCN } from "../../utils/pcn-utils.js";
import {
  getElementByIdOrThrow,
  querySelectorOrThrow,
} from "../../utils/dom-helpers.js";
import {
  calculateTotalNodes,
  calculateTotalLines,
} from "./line-fisher-calculations.js";
import { getCurrentFishState } from "./fish-state.js";
import {
  coordsToSquare,
  getPieceAtSquareFromFEN,
} from "../../utils/fen-utils.js";

/**
 * Update fish config display in UI
 * Non-blocking UI update with error handling
 */
export function updateFishConfigDisplay(config: LineFisherConfig): void {
  try {
    // Calculate total nodes and lines using existing line-fisher functions
    const totalNodes = calculateTotalNodes(config);
    const totalLines = calculateTotalLines(config);

    const initiatorDisplay = getElementByIdOrThrow(
      "fish-config-initiator-moves",
    );
    initiatorDisplay.textContent = config.initiatorMoves.join(", ") || "(none)";

    const responderDisplay = getElementByIdOrThrow(
      "fish-config-responder-counts",
    );
    responderDisplay.textContent =
      config.responderMoveCounts.join(", ") || "(default)";

    const depthDisplay = getElementByIdOrThrow("fish-config-move-depth");
    depthDisplay.textContent = config.maxDepth.toString();

    const threadsDisplay = getElementByIdOrThrow("fish-config-threads");
    threadsDisplay.textContent = config.threads.toString();

    // Add total nodes, lines, and formulas to config display
    const totalNodesElement = getElementByIdOrThrow("fish-config-total-nodes");
    totalNodesElement.textContent = totalNodes.toString();

    const totalLinesElement = getElementByIdOrThrow("fish-config-total-lines");
    totalLinesElement.textContent = totalLines.toString();

    const { nodeFormula, lineFormula } = generateLineFisherFormula(config);

    const nodeFormulaElement = getElementByIdOrThrow(
      "fish-config-node-formula",
    );
    nodeFormulaElement.textContent = nodeFormula;

    const lineFormulaElement = getElementByIdOrThrow(
      "fish-config-line-formula",
    );
    lineFormulaElement.textContent = lineFormula;

    renderLineFisherBoard(config.rootFEN);
  } catch (error) {
    console.error("Failed to update fish config display:", error);
  }
}

/**
 * Render chess board in the Line Fisher config section
 * Similar to tree digger board rendering
 */
const renderLineFisherBoard = (fen: string): void => {
  const boardDisplay = getElementByIdOrThrow("fish-board-display");

  // Check if the board already shows this position
  const currentFEN = boardDisplay.getAttribute("data-fen");
  if (currentFEN === fen) {
    return; // Don't re-render if it's the same position
  }

  // Clear existing content
  boardDisplay.innerHTML = "";
  boardDisplay.setAttribute("data-fen", fen);

  // Create proper table structure for CSS table layout
  for (let rank = 0; rank < 8; rank++) {
    const tableRow = document.createElement("tr");

    for (let file = 0; file < 8; file++) {
      const tableCell = document.createElement("td");
      tableCell.className = "line-fisher-board-square";

      // Get piece from FEN using existing utility function
      const square = coordsToSquare(rank, file);
      const piece = getPieceAtSquareFromFEN(square, fen);

      if (piece) {
        tableCell.textContent = piece;
      }

      tableRow.appendChild(tableCell);
    }

    boardDisplay.appendChild(tableRow);
  }
};

/**
 * Update fish status display
 * Non-blocking UI update with error handling
 */
export function updateFishStatus(message: string): void {
  try {
    const statusElement = getElementByIdOrThrow("line-fisher-status");
    statusElement.textContent = message;
  } catch (error) {
    console.error("Failed to update fish status:", error);
  }
}

/**
 * Update fish progress display
 * Non-blocking UI update with error handling
 */
export function updateFishProgress(state: FishState): void {
  try {
    const wipCount = state.wip.length;
    const wipDisplay = getElementByIdOrThrow("fish-status-wips");
    wipDisplay.textContent = wipCount.toString();

    const doneCount = state.done.length;
    const doneDisplay = getElementByIdOrThrow("fish-status-dones");
    doneDisplay.textContent = doneCount.toString();

    // Calculate total expected lines for display
    const totalNodes = calculateTotalNodes(state.config);
    const totalExpectedLines = Math.floor((totalNodes - 1) / 2) + 1;
    const progressPercent =
      totalExpectedLines > 0
        ? (state.done.length / totalExpectedLines) * 100
        : 0;

    const linesDisplay = getElementByIdOrThrow("fish-status-lines");
    linesDisplay.textContent = `${state.done.length} / ${totalExpectedLines} (${progressPercent.toFixed(2)}%)`;

    const positionDisplay = getElementByIdOrThrow("fish-status-position");
    const currentLine = state.wip[0];
    if (currentLine) {
      const sanGame =
        currentLine.sanGame ||
        computeSanGameFromPCN(currentLine.pcns, state.config.rootFEN);
      positionDisplay.textContent = sanGame || "Root position";
    } else {
      positionDisplay.textContent = "Complete";
    }

    // Update progress bar
    const progressFill = getElementByIdOrThrow("fish-status-progress-fill");
    // Cap progress at 100%
    const cappedProgress = Math.min(progressPercent, 100);
    progressFill.style.width = `${cappedProgress}%`;

    // Update leaf node count display
    updateLeafNodeCount(state);
  } catch (error) {
    console.error("Failed to update fish progress:", error);
    // Non-blocking: continue analysis even if UI update fails
  }
}

/**
 * Update fish root score display
 * Non-blocking UI update with error handling
 */
export function updateFishRootScore(score: number): void {
  try {
    const scoreSpan = getElementByIdOrThrow("fish-config-root-score");
    const scoreInPawns = score / 100;
    const scoreText =
      scoreInPawns > 0
        ? `+${scoreInPawns.toFixed(1)}`
        : scoreInPawns.toFixed(1);
    scoreSpan.textContent = scoreText;
  } catch (error) {
    console.error("Failed to update fish root score:", error);
  }
}

/**
 * Update leaf node count display
 * Non-blocking UI update with error handling
 */
function updateLeafNodeCount(state: FishState): void {
  try {
    // Check if leaf node count element already exists
    const leafNodeElement = getElementByIdOrThrow("fish-config-leaf-nodes");
    const totalNodes = calculateTotalNodes(state.config);
    const reachedNodes = state.done.length + state.wip.length;
    const percentage = totalNodes > 0 ? (reachedNodes / totalNodes) * 100 : 0;
    leafNodeElement.textContent = `${reachedNodes} / ${totalNodes} (${percentage.toFixed(1)}%)`;
  } catch (error) {
    console.error("Failed to update leaf node count:", error);
  }
}

/**
 * Update an existing line element's content without re-rendering
 */
export const updateLineElement = (
  lineElement: HTMLElement,
  line: FishLine,
): void => {
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

  // Update individual child elements instead of setting innerHTML
  const lineNumberElement = querySelectorOrThrow(
    lineElement,
    ".line-number",
  ) as HTMLElement;
  const lineScoreElement = querySelectorOrThrow(
    lineElement,
    ".line-score",
  ) as HTMLElement;
  const lineDeltaElement = querySelectorOrThrow(
    lineElement,
    ".line-delta",
  ) as HTMLElement;
  const lineNotationElement = querySelectorOrThrow(
    lineElement,
    ".line-notation",
  ) as HTMLElement;
  const lineCompleteElement = querySelectorOrThrow(
    lineElement,
    ".line-complete",
  ) as HTMLElement;
  const lineDoneElement = querySelectorOrThrow(
    lineElement,
    ".line-done",
  ) as HTMLElement;

  lineNumberElement.style.cssText = lineNumberStyle;
  lineNumberElement.textContent = `${lineNumberPrefix}${line.lineIndex + 1}.`;
  lineScoreElement.textContent = scoreText;
  lineNotationElement.textContent = line.sanGame + endIndicator;
  lineCompleteElement.textContent = `Complete: ${line.isFull}`;
  lineDoneElement.textContent = `Done: ${line.isDone}`;
};

/**
 * Generate computation formula for Line Fisher
 * Creates a human-readable formula showing how nodes and lines are calculated
 */
const generateLineFisherFormula = (
  config: LineFisherConfig,
): { nodeFormula: string; lineFormula: string } => {
  const maxDepth = config.maxDepth;
  const responderCounts = config.responderMoveCounts;
  const defaultResponderCount = config.defaultResponderCount;

  // If the count is fixed for all layers, it would be sum(m^i) for each i = 0 to maxDepth-1
  // But because m can be different for every depth, we have to do this more complicated way.
  // So we'll show the extrapolated formula for overrides and them a sum for the rest.

  // For each move, increase prod by responder count at this move. Then add that result to the sum.
  // When we reach the first move that has no override, finalize the fomula with the sum.
  let prod = "";
  let nodeFormula = "";
  for (let i = 0; i < maxDepth; i++) {
    if (i < responderCounts.length) {
      prod = prod + (prod ? " * " : "") + responderCounts[i];
      nodeFormula =
        nodeFormula + (nodeFormula ? " + " : "") + " ( " + prod + " )";
    } else {
      nodeFormula =
        nodeFormula +
        (nodeFormula ? " + " : "") +
        " prod( sum( " +
        prod +
        " * " +
        defaultResponderCount +
        "<sup>n</sup> ) for n = " +
        (responderCounts.length + 1) +
        " .. " +
        maxDepth +
        " )";
      break;
    }
  }
  if (responderCounts.length) {
    nodeFormula =
      "1 + 2 * (" + nodeFormula + " ) = " + calculateTotalNodes(config);
  } else {
    nodeFormula = "1";
  }

  // The lines are simply the product of the number of responder moves. Initiator moves don't matter (always 1).

  let lineFormula = "";
  for (let i = 0; i < maxDepth; i++) {
    if (i < responderCounts.length) {
      lineFormula =
        lineFormula + (lineFormula ? " * " : "") + responderCounts[i];
    } else {
      lineFormula =
        lineFormula +
        (lineFormula ? " * " : "") +
        defaultResponderCount +
        "<sup>" +
        (maxDepth - responderCounts.length) +
        "</sup>";
      break;
    }
  }
  lineFormula = (lineFormula || "1") + " = " + calculateTotalLines(config);

  return { nodeFormula, lineFormula };
};

/**
 * Update Line Fisher button states
 * Enable/disable buttons based on analysis state, update visual feedback,
 * and handle button state transitions
 */
export const updateLineFisherButtonStates = (
  isAnalyzing: boolean,
  isFishing: boolean,
): void => {
  // Update button states based on analysis status
  const stopBtn = getElementByIdOrThrow(
    "stop-line-fisher",
  ) as HTMLButtonElement;
  const resetBtn = getElementByIdOrThrow(
    "reset-line-fisher",
  ) as HTMLButtonElement;
  const continueBtn = getElementByIdOrThrow(
    "continue-line-fisher",
  ) as HTMLButtonElement;
  const copyBtn = getElementByIdOrThrow(
    "copy-line-fisher-state",
  ) as HTMLButtonElement;
  const exportBtn = getElementByIdOrThrow(
    "export-line-fisher-state",
  ) as HTMLButtonElement;
  const importBtn = getElementByIdOrThrow(
    "import-line-fisher-state",
  ) as HTMLButtonElement;
  const startFish2Btn = getElementByIdOrThrow(
    "start-fish2",
  ) as HTMLButtonElement;

  const hasResults = getCurrentFishState().done.length > 0;

  // Update button states
  stopBtn.disabled = !isAnalyzing && !isFishing;
  resetBtn.disabled = isAnalyzing || isFishing;
  continueBtn.disabled = isAnalyzing || isFishing || !hasResults;
  copyBtn.disabled = false; // Copy should always work
  exportBtn.disabled = false; // Export should always work
  importBtn.disabled = isAnalyzing || isFishing;
  startFish2Btn.disabled = isAnalyzing || isFishing;
};
