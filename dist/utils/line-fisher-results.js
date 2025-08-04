import { log } from "./logging.js";
import { getElementByIdOrThrow } from "./dom-helpers.js";
import {
  calculateTotalNodes,
  calculateTotalLines,
  calculateResponderNodes,
} from "./line-fisher-calculations.js";
import * as LineFisher from "../line_fisher.js";
import { getFEN } from "../chess-board.js";
import { setPosition } from "../chess-board.js";
import { parseMove } from "./move-parsing.js";
import { applyMoveToFEN } from "./fen-manipulation.js";
// ============================================================================
// LINE FISHER RESULTS DISPLAY FUNCTIONS
// ============================================================================
/**
 * Generate computation formula for Line Fisher
 * Creates a human-readable formula showing how nodes and lines are calculated
 */
export const generateLineFisherFormula = (config) => {
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
 * Update Line Fisher results panel
 * TODO: Display current analysis results in the results panel
 */
export const updateLineFisherResultsPanel = (_state) => {
  log("Updating Line Fisher results panel");
  // TODO: Update results display with current analysis data
};
export const updateLineFisherConfigDisplay = async (state) => {
  const configBox = getElementByIdOrThrow("line-fisher-config");
  const config = state.config;
  // Calculate expected nodes and lines
  const nodeCount = calculateTotalNodes(config);
  const lineCount = calculateTotalLines(config);
  // Generate formulas
  const { nodeFormula, lineFormula } = generateLineFisherFormula(config);
  // Get the best moves from the stored baseline (static, doesn't update)
  let baselineInfo = "Loading...";
  try {
    if (state.config.baselineMoves && state.config.baselineMoves.length > 0) {
      // Show top 5 moves from stored baseline
      const topMoves = state.config.baselineMoves.slice(0, 5);
      const moveInfos = topMoves.map((move) => {
        const scoreInPawns = move.score / 100;
        const scoreText =
          scoreInPawns > 0
            ? `+${scoreInPawns.toFixed(1)}`
            : scoreInPawns.toFixed(1);
        return `${move.move} (${scoreText})`;
      });
      baselineInfo = moveInfos.join(", ");
    } else {
      baselineInfo = "No baseline available";
    }
  } catch (error) {
    baselineInfo = "Error loading baseline";
  }
  configBox.innerHTML = `
    <div class="line-fisher-config-section">
      <div class="line-fisher-config-board">
        <div id="line-fisher-board-display" class="line-fisher-board-display"></div>
        <div class="line-fisher-config-details">
          <div class="line-fisher-config-item"><label>Best Move:</label><span>${baselineInfo}</span></div>
          <div class="line-fisher-config-item"><label>Initiator Moves:</label><span>${config.initiatorMoves.join(", ") || "(none)"}</span></div>
          <div class="line-fisher-config-item"><label>Responder Counts:</label><span>${config.responderMoveCounts.join(", ")}</span></div>
          <div class="line-fisher-config-item"><label>Default Responder Count:</label><span>${config.defaultResponderCount}</span></div>
          <div class="line-fisher-config-item"><label>Move Depth:</label><span>${config.maxDepth}</span></div>
          <div class="line-fisher-config-item"><label>Threads:</label><span>${config.threads}</span></div>
          <div class="line-fisher-config-item"><label>Expected Nodes:</label><span>${nodeCount}</span></div>
          <div class="line-fisher-config-item"><label>Expected Lines:</label>Finished: <span>${lineCount}</span>, Any: <span>${(nodeCount - 1) / 2 + 1}</span></div>
          <div class="line-fisher-config-item"><label>Node Formula:</label><span style="font-family: monospace; font-size: 0.9em;">${nodeFormula}</span></div>
          <div class="line-fisher-config-item"><label>Line Formula:</label><span style="font-family: monospace; font-size: 0.9em;">${lineFormula}</span></div>
        </div>
      </div>
    </div>
  `;
  // Render the board with the current position
  const currentFEN = getFEN();
  renderLineFisherBoard(currentFEN);
};
/**
 * Update Line Fisher progress display
 * Show current analysis progress with progress bar
 */
export const updateLineFisherProgressDisplay = (progress) => {
  // Update progress bar
  const progressFill = getElementByIdOrThrow("line-fisher-progress-fill");
  const linesDisplay = getElementByIdOrThrow("line-fisher-lines-display");
  const positionDisplay = getElementByIdOrThrow("line-fisher-position-display");
  // Get current state to access config and results
  const state = LineFisher.getLineFisherState();
  // Count lines that have been fully analyzed and are done
  // Count lines that have reached their final state (won't be expanded further)
  // This includes both complete lines (reached max depth) and done lines (finished processing)
  const analyzedLines = state.results.filter((result) => result.isDone).length;
  // Calculate progress based on analyzed lines vs responder nodes + 1
  const maxLines = calculateResponderNodes(state.config) + 1;
  const progressPercent = maxLines > 0 ? (analyzedLines / maxLines) * 100 : 0;
  // Update progress bar
  progressFill.style.width = `${progressPercent}%`;
  // Update stats
  const actionDisplay = getElementByIdOrThrow("line-fisher-action-display");
  actionDisplay.textContent = progress.currentAction || "Ready";
  // Show WIP/DONE counts in the lines display
  const wipCount = state.results.filter((result) => !result.isDone).length;
  const doneCount = analyzedLines;
  linesDisplay.textContent = `${doneCount.toLocaleString()}/${maxLines.toLocaleString()} (WIP: ${wipCount}, DONE: ${doneCount})`;
  positionDisplay.textContent = progress.currentPosition || "Starting position";
};
/**
 * Update Line Fisher activity monitor
 * Show events per second and total events.
 * Display events per second, show total events, and provide real-time activity updates
 */
export const updateLineFisherActivityMonitor = (progress) => {
  // Display events per second and total events
  const activityElement = document.getElementById("line-fisher-activity");
  if (!activityElement) return;
  // Update time elapsed
  const timeElapsed =
    progress.startTime > 0 ? (Date.now() - progress.startTime) / 1000 : 0;
  const timeElapsedElement = activityElement.querySelector(
    ".line-fisher-time-elapsed",
  );
  if (timeElapsedElement) {
    timeElapsedElement.textContent = `${timeElapsed.toFixed(1)}s`;
  }
};
/**
 * Update Line Fisher explored lines display
 * Show all explored lines with their moves, scores, and completion status
 */
export const updateLineFisherExploredLines = (results) => {
  // Update the results panel with explored lines
  const resultsElement = getElementByIdOrThrow("line-fisher-results");
  if (results.length === 0) {
    resultsElement.innerHTML = "<p>No results to show yet...</p>";
    return;
  }
  // Create compact results HTML
  let resultsHTML = `<h3>Explored Lines (${results.length}) <small>(number of responder nodes + 1)</small></h3>`;
  // Show only the first 50 lines to keep it manageable
  const displayCount = Math.min(results.length, 50);
  for (let i = 0; i < displayCount; i++) {
    const result = results[i];
    const finalScore =
      result.scores.length > 0 ? result.scores[result.scores.length - 1] : 0;
    // Convert from centipawns to pawns (divide by 100)
    const scoreInPawns = finalScore / 100;
    // Use the stored delta from the result (calculated against baseline)
    let deltaInPawns = 0;
    if (result.deltas.length > 0) {
      // Use the last delta from the result (calculated against baseline)
      deltaInPawns = result.deltas[result.deltas.length - 1] / 100;
    }
    // Show "?" if no scores yet, otherwise show the score
    const scoreText =
      result.scores.length === 0
        ? "?"
        : scoreInPawns > 0
          ? `+${scoreInPawns.toFixed(1)}`
          : scoreInPawns.toFixed(1);
    // Show "?" if no scores yet, otherwise show the delta
    const deltaText =
      result.scores.length === 0
        ? "?"
        : Math.abs(deltaInPawns) < 0.05
          ? "="
          : deltaInPawns > 0
            ? `+${deltaInPawns.toFixed(1)}`
            : deltaInPawns.toFixed(1);
    // Determine delta class for styling
    const deltaClass =
      Math.abs(deltaInPawns) < 0.05
        ? ""
        : deltaInPawns > 0
          ? "positive"
          : deltaInPawns < 0
            ? "negative"
            : "";
    // Determine line number styling and prefix
    let lineNumberStyle = "";
    let lineNumberPrefix = "";
    if (result.isTransposition) {
      lineNumberPrefix = "*";
    }
    if (!result.isDone) {
      // Line is being worked on (not yet done) - yellow background
      lineNumberStyle =
        "background-color: #ffeb3b; color: #000; padding: 1px 3px; border-radius: 3px;";
    } else if (result.isComplete) {
      // Line is complete (reached max depth or mate) - box/border
      lineNumberStyle =
        "border: 1px solid #666; padding: 1px 3px; border-radius: 3px;";
    }
    // If isDone=true but isComplete=false, no special styling (normal text)
    // Add responder moves info if available
    let responderInfo = "";
    if (result.responderMoveList && result.responderMoveList.length > 0) {
      const responderMovesText = result.responderMoveList.join(" ");
      responderInfo = ` <small style="color: #666;">[${responderMovesText}]</small>`;
    }
    resultsHTML += `
      <div class="line-fisher-result-compact" data-line-index="${i}" style="cursor: pointer;">
        <span class="line-number" style="${lineNumberStyle}">${lineNumberPrefix}${i + 1}.</span>
        <span class="line-score">${scoreText}</span>
        <span class="line-delta ${deltaClass}">${deltaText}</span>
        <span class="line-notation">${result.notation}${responderInfo}</span>
        <span>[${result.updateCount}]</span>
        <span>Complete: ${result.isComplete}</span>
        <span>Done: ${result.isDone}</span>
      </div>
    `;
  }
  if (results.length > displayCount) {
    resultsHTML += `<div class="line-fisher-more">... and ${results.length - displayCount} more lines</div>`;
  }
  resultsElement.innerHTML = resultsHTML;
  // Add click handlers to load lines on the board
  addLineClickHandlers(results);
};
/**
 * Add click handlers to load lines on the board
 */
const addLineClickHandlers = (results) => {
  const lineElements = document.querySelectorAll(
    ".line-fisher-result-compact[data-line-index]",
  );
  lineElements.forEach((element) => {
    element.addEventListener("click", async () => {
      const lineIndex = parseInt(
        element.getAttribute("data-line-index") || "0",
        10,
      );
      const result = results[lineIndex];
      if (result) {
        await loadLineOnBoard(result);
      }
    });
  });
};
/**
 * Load a line on the board and update game moves
 */
const loadLineOnBoard = async (result) => {
  try {
    // Get the root FEN from the Line Fisher state
    const state = LineFisher.getLineFisherState();
    const rootFEN = state.config.rootFEN;
    if (!rootFEN) {
      console.error("No root FEN found for this fishing line");
      return;
    }
    // Set the board to the root position
    setPosition(rootFEN);
    console.log("Applying:", result.sans);
    // Add each move from the line using the sans array
    let fen = rootFEN;
    for (let i = 0; i < result.sans.length; i++) {
      const san = result.sans[i];
      if (!san) {
        console.error("No SAN notation found for move", i);
        return;
      }
      const move = parseMove(san, fen);
      if (!move) {
        console.error("No move found for SAN", san);
        continue;
      }
      // const was = fen;
      fen = applyMoveToFEN(fen, move);
      // console.log('FEN after applying move:', san, 'to', [was], 'is', [fen]);
    }
    // Update the game moves display
    updateGameMovesDisplay(result);
    setPosition(fen);
  } catch (error) {
    console.error("Error loading line on board:", error);
  }
};
/**
 * Update the game moves display with the line
 */
const updateGameMovesDisplay = (result) => {
  const movesPanel = getElementByIdOrThrow("game-moves");
  // Clear existing moves
  movesPanel.innerHTML = "";
  // Add moves from the line
  for (let i = 0; i < result.sans.length; i++) {
    const san = result.sans[i];
    const moveNumber = Math.floor(i / 2) + 1;
    const isWhiteMove = i % 2 === 0;
    if (isWhiteMove) {
      // Create new move entry
      const moveEntry = document.createElement("div");
      moveEntry.className = "move-entry";
      moveEntry.innerHTML = `
        <span class="move-number">${moveNumber}.</span>
        <span class="move-text">${san}</span>
      `;
      movesPanel.appendChild(moveEntry);
    } else {
      // Add black move to existing entry
      const lastEntry = movesPanel.lastElementChild;
      if (lastEntry) {
        const blackMoveSpan = document.createElement("span");
        blackMoveSpan.className = "move-text";
        blackMoveSpan.textContent = san;
        lastEntry.appendChild(blackMoveSpan);
      }
    }
  }
};
/**
 * Create Line Fisher results HTML structure
 * TODO: Generate HTML structure for results display
 */
export const createLineFisherResultsHTML = (_state) => {
  // TODO: Generate HTML structure for:
  // - Configuration display
  // - Progress bar
  // - Activity monitor
  // - Explored lines list
  return `
    <div class="line-fisher-results">
      <div class="line-fisher-config">
        <h3>Configuration</h3>
        <div id="line-fisher-config"></div>
      </div>
      <div class="line-fisher-progress">
        <h3>Progress</h3>
        <div id="line-fisher-progress"></div>
      </div>
      <div class="line-fisher-results">
        <h3>Results</h3>
        <div id="line-fisher-results"></div>
      </div>
    </div>
  `;
};
/**
 * Update Line Fisher results incrementally
 * TODO: Update results display incrementally
 */
export const updateLineFisherResultsIncrementally = (_state) => {
  // TODO: Update results display incrementally
};
/**
 * Clear Line Fisher results display
 * TODO: Clear all results and reset display
 */
export const clearLineFisherResultsDisplay = () => {
  // TODO: Clear results display and show empty state
  const resultsElement = document.getElementById("line-fisher-results");
  if (!resultsElement) return;
  // TODO: Clear display and show "No results yet" message
};
/**
 * Create Line Fisher configuration HTML structure
 * Create configuration HTML structure with layout for settings display,
 * statistics display, and board position display
 */
export const createLineFisherConfigHTML = () => {
  return `
    <div class="line-fisher-config-container">
      <div class="line-fisher-config-section">
        <h3>Line Fisher Configuration</h3>
        <div class="line-fisher-config-grid">
          <div class="line-fisher-config-item">
            <label>Initiator Moves:</label>
            <span id="line-fisher-initiator-moves-display">-</span>
          </div>
          <div class="line-fisher-config-item">
            <label>Responder Counts:</label>
            <span id="line-fisher-responder-counts-display">-</span>
          </div>
          <div class="line-fisher-config-item">
            <label>Max Depth:</label>
            <span id="line-fisher-depth-display">-</span>
          </div>
          <div class="line-fisher-config-item">
            <label>Threads:</label>
            <span id="line-fisher-threads-display">-</span>
          </div>
        </div>
      </div>
      
      <div class="line-fisher-statistics">
        <h4>Search Space Statistics</h4>
        <div class="line-fisher-stats-grid">
          <div class="line-fisher-stat-item">
            <label>Total Nodes:</label>
            <span id="line-fisher-total-nodes">-</span>
          </div>
          <div class="line-fisher-stat-item">
            <label>Total Lines:</label>
            <span id="line-fisher-total-lines">-</span>
          </div>
        </div>
      </div>
      
      <div class="line-fisher-board-info">
        <h4>Base Position</h4>
        <div class="line-fisher-fen-display">
          <label>FEN:</label>
          <span id="line-fisher-fen-display" class="line-fisher-fen">-</span>
        </div>
        <div class="line-fisher-player-info">
          <div class="line-fisher-player">
            <span class="line-fisher-player-label">Initiator:</span>
            <span class="line-fisher-player-color">White</span>
          </div>
          <div class="line-fisher-player">
            <span class="line-fisher-player-label">Responder:</span>
            <span class="line-fisher-player-color">Black</span>
          </div>
        </div>
      </div>
    </div>
  `;
};
/**
 * Create Line Fisher lines display HTML structure
 * Create line display HTML structure with line index column, move notation column,
 * score column, delta column, and responses column
 */
export const createLineFisherLinesHTML = () => {
  return `
    <div class="line-fisher-lines-container">
      <div class="line-fisher-lines-header">
        <h3>Fishing Lines</h3>
        <div class="line-fisher-lines-stats">
          <span class="line-fisher-lines-count">0 lines</span>
          <span class="line-fisher-lines-complete">0 complete</span>
        </div>
      </div>
      
      <div class="line-fisher-lines-table-container">
        <table class="line-fisher-lines-table" id="line-fisher-lines-table">
          <thead>
            <tr>
              <th class="line-fisher-col-index">#</th>
              <th class="line-fisher-col-move">Move</th>
              <th class="line-fisher-col-score">Score</th>
              <th class="line-fisher-col-delta">Δ</th>
              <th class="line-fisher-col-responses">Responses</th>
              <th class="line-fisher-col-status">Status</th>
            </tr>
          </thead>
          <tbody id="line-fisher-lines-tbody">
            <tr class="line-fisher-no-lines">
              <td colspan="6">No lines explored yet</td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div class="line-fisher-lines-summary">
        <div class="line-fisher-summary-item">
          <label>Total Lines:</label>
          <span id="line-fisher-total-lines-display">0</span>
        </div>
        <div class="line-fisher-summary-item">
          <label>Completed:</label>
          <span id="line-fisher-completed-lines-display">0</span>
        </div>
        <div class="line-fisher-summary-item">
          <label>In Progress:</label>
          <span id="line-fisher-in-progress-lines-display">0</span>
        </div>
      </div>
    </div>
  `;
};
/**
 * Render chess board in the Line Fisher config section
 * Similar to tree digger board rendering
 */
export const renderLineFisherBoard = (fen) => {
  const boardDisplay = getElementByIdOrThrow("line-fisher-board-display");
  // Check if the board already shows this position
  const currentFEN = boardDisplay.getAttribute("data-fen");
  if (currentFEN === fen) {
    return; // Don't re-render if it's the same position
  }
  // Clear existing content
  boardDisplay.innerHTML = "";
  boardDisplay.setAttribute("data-fen", fen);
  // Parse FEN and create squares
  const fenParts = fen.split(" ");
  const piecePlacement = fenParts[0];
  const ranks = piecePlacement.split("/");
  // Create proper table structure for CSS table layout
  for (let rank = 0; rank < 8; rank++) {
    const tableRow = document.createElement("tr");
    for (let file = 0; file < 8; file++) {
      const tableCell = document.createElement("td");
      tableCell.className = "line-fisher-board-square";
      // Get piece from FEN (ranks are from top to bottom: 8, 7, 6, 5, 4, 3, 2, 1)
      const piece = getPieceFromFEN(ranks, rank, file);
      if (piece) {
        tableCell.textContent = piece;
      }
      tableRow.appendChild(tableCell);
    }
    boardDisplay.appendChild(tableRow);
  }
};
/**
 * Helper function to get piece from FEN
 */
const getPieceFromFEN = (ranks, rank, file) => {
  const rankStr = ranks[rank];
  let fileIndex = 0;
  for (let i = 0; i < rankStr.length; i++) {
    const char = rankStr[i];
    if (char >= "1" && char <= "8") {
      fileIndex += parseInt(char);
    } else {
      if (fileIndex === file) {
        return char;
      }
      fileIndex++;
    }
  }
  return null;
};
// ============================================================================
// LINE FISHER UI OPTIMIZATION
// ============================================================================
/**
 * Debounced UI update function to reduce unnecessary re-renders
 */
let uiUpdateTimeout = null;
const debouncedUIUpdate = (updateFunction, delay = 100) => {
  if (uiUpdateTimeout) {
    clearTimeout(uiUpdateTimeout);
  }
  uiUpdateTimeout = window.setTimeout(() => {
    updateFunction();
    uiUpdateTimeout = null;
  }, delay);
};
/**
 * Optimize progress tracking updates
 */
export const updateLineFisherProgressDisplayOptimized = (progress) => {
  debouncedUIUpdate(async () => {
    await updateLineFisherProgressDisplay(progress);
  }, 50); // Update every 50ms for smoother progress
};
/**
 * Optimize activity monitor updates
 */
export const updateLineFisherActivityMonitorOptimized = (progress) => {
  debouncedUIUpdate(() => {
    updateLineFisherActivityMonitor(progress);
  }, 200); // Update every 200ms for activity monitor
};
/**
 * Optimize results display updates
 */
export const updateLineFisherExploredLinesOptimized = (results) => {
  debouncedUIUpdate(() => {
    updateLineFisherExploredLines(results);
  }, 300); // Update every 300ms for results display
};
//# sourceMappingURL=line-fisher-results.js.map
