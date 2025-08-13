import {
  AnalysisResult,
  AnalysisMove,
  ChessMove,
  PLAYER_COLORS,
  PieceFormat,
} from "../types.js";
import { getAppState, updateAppState, createBranch } from "../main.js";
import { parseFEN } from "../../utils/fen-utils.js";
import { validateMove } from "../../utils/move-validator.js";
import {
  applyLongMoveToFEN,
  applyMoveToFEN,
} from "../../utils/fen-manipulation.js";
import { moveToNotation } from "../../utils/notation-utils.js";
import {
  getCheckedRadioByName,
  getElementByIdOrThrow,
  querySelectorOrThrow,
} from "../../utils/dom-helpers.js";
import { log, logError } from "../../utils/logging.js";
import { compareAnalysisMoves } from "./bestmove-utils.js";
import { getAnalysisOptions, updateButtonStates } from "./bestmove-config.js";
import { updateStatus } from "../../utils/status-utils.js";
import {
  updateResultsPanel,
  formatPVWithEffects,
} from "./bestmove-pv-utils.js";
import { updatePositionEvaluationDisplay } from "../board/position-controls.js";
import { addMove, updateMoveList } from "../board/game-navigation.js";
import { updateNavigationButtons } from "../../utils/button-utils.js";
import {
  updateFENInput,
  updateControlsFromPosition,
  resetPositionEvaluation,
} from "../board/position-controls.js";
import * as Board from "../../utils/chess-board.js";
import * as Stockfish from "../../utils/stockfish-client.js";
import { highlightLastMove } from "../board/board-utils.js";
import { formatScoreWithMateIn } from "../../utils/formatting-utils.js";
import { hideMoveArrow } from "../board/arrow-utils.js";
import { clearLastMoveHighlight } from "../../utils/chess-board.js";
import { getTopLines } from "../fish/fish-utils.js";
import { parseLongMove } from "../../utils/move-parser.js";

/**
 * Analysis Management Utility Functions
 *
 * Provides functions for managing Stockfish analysis, results display, and move interactions.
 */

// Constants
const MATE_SCORE_THRESHOLD = 10000;

let lastPvTickerUpdateMs = 0;
const PV_TICKER_INTERVAL_MS = 1000;

/**
 * Start best move analysis
 */
export async function startBestmove(): Promise<void> {
  const appState = getAppState();
  if (appState.isAnalyzing) return;

  updateAppState({
    isAnalyzing: true,
  });
  updateButtonStates();
  updatePositionEvaluationDisplay();

  const options = getAnalysisOptions();
  try {
    await getTopLines(Board.getFEN(), options.multiPV, {
      maxDepth: 20,
      threads: options.threads,
      onUpdate: (analysisResult) => {
        updateAppState({
          // currentResults: analysisResult,
          isAnalyzing: !analysisResult.completed,
        });
        updateBestmoveResults(analysisResult);
        updateButtonStates();
        // TOOD: this needs to populate the lines now. in favor of the previous way
        updateEnginePvTickerThrottled(false, analysisResult);
      },
    });

    // When analysis promise resolves, briefly emphasize the PV ticker and pause UI updates
    // await emphasizePvTickerWithPause();
    updateAppState({
      // currentResults: result,
      isAnalyzing: false,
    });
    updateButtonStates();
  } catch (error) {
    logError("Analysis failed:", error);
    updateAppState({ isAnalyzing: false });
    updateButtonStates();
  }
}

function updateEnginePvTickerThrottled(
  force: boolean = false,
  result: AnalysisResult,
): void {
  const now = Date.now();
  if (!force && now - lastPvTickerUpdateMs < PV_TICKER_INTERVAL_MS) return;
  lastPvTickerUpdateMs = now;
  console.log("updateEnginePvTickerThrottled", force);

  const el = getElementByIdOrThrow("bestmove-pv-ticker");

  if (!result || !result.moves || result.moves.length === 0) {
    el.textContent = "";
    return;
  }

  const position = parseFEN(result.position);
  const direction = position.turn === PLAYER_COLORS.BLACK ? "asc" : "desc";

  // Sort: mate first, then depth, then score
  const moves = [...result.moves].sort((a: AnalysisMove, b: AnalysisMove) =>
    compareAnalysisMoves(a, b, direction as any),
  );

  const lines = moves.map((m: AnalysisMove, idx: number) => {
    const depthStr = `d${m.depth}`;
    const scoreStr = formatScoreWithMateIn(m.score, m.mateIn);
    const pvStr = m.pv.map((mv: ChessMove) => `${mv.from}${mv.to}`).join(" ");
    return `${idx + 1}. ${depthStr} ${scoreStr}  ${pvStr}`;
  });

  el.textContent = lines.join("\n");
}

async function emphasizePvTickerWithPause(): Promise<void> {
  const el = getElementByIdOrThrow("bestmove-pv-ticker");

  const prevWeight = el.style.fontWeight;
  const prevOpacity = el.style.opacity;
  // Freeze updates visually by bolding and dimming other UI slightly
  el.style.fontWeight = "bold";
  try {
    // Pause further ticker updates for 3s
    lastPvTickerUpdateMs = Date.now();
    await new Promise((r) => setTimeout(r, 3000));
  } finally {
    el.style.fontWeight = prevWeight || "";
    el.style.opacity = prevOpacity || "";
  }
}

/**
 * Stop analysis
 */
export function stopBestmove(): void {
  Stockfish.stopAnalysis();
  updateAppState({
    isAnalyzing: false,
    // currentResults: null,
  });
  updateButtonStates();
  updateResultsPanel([]);
}

/**
 * Update results display
 */
export function updateBestmoveResults(result: AnalysisResult): void {
  if (!result || !result.moves) return;

  updateResultsPanel(result.moves);
  updateStatus(`Analysis complete: ${result.moves.length} moves found`);
}

/**
 * Update results panel
 */
export function actuallyUpdateBestmovePanel(moves: AnalysisMove[]): void {
  const resultsPanel = getElementByIdOrThrow("bestmove-results");

  // Clear existing arrows
  hideMoveArrow();

  // Get current format settings
  const notationFormat =
    getCheckedRadioByName("notation-format")?.value || "algebraic-short";
  const pieceFormat = getCheckedRadioByName("piece-format")?.value || "symbols";

  // Convert format values to match moveToNotation parameters
  const notationType = notationFormat === "algebraic-short" ? "short" : "long";
  const pieceType: PieceFormat =
    pieceFormat === "symbols" ? "unicode" : "english";

  // Filter moves based on analysis criteria
  const appState = getAppState();
  const isAnalyzing = appState.isAnalyzing;

  // First, separate mate lines from non-mate lines
  const mateLines = moves.filter(
    (move: AnalysisMove) => Math.abs(move.score) >= MATE_SCORE_THRESHOLD,
  );
  const nonMateLines = moves.filter(
    (move: AnalysisMove) => Math.abs(move.score) < MATE_SCORE_THRESHOLD,
  );

  // Sort mate lines using the updated comparison function that considers mateIn
  const currentFEN = Board.getFEN();
  const position = currentFEN ? parseFEN(currentFEN) : null;
  const direction =
    position && position.turn === PLAYER_COLORS.BLACK ? "asc" : "desc";

  mateLines.sort((a, b) => compareAnalysisMoves(a, b, direction));

  // Sort non-mate lines by depth (descending), then by score (descending), then by multipv
  nonMateLines.sort((a, b) => {
    // For score comparison, use shared logic
    const scoreComparison = compareAnalysisMoves(a, b, direction);
    if (scoreComparison !== 0) return scoreComparison;
    return (a.multipv || 1) - (b.multipv || 1);
  });

  // Get the configured number of lines from UI
  const analysisOptions = getAnalysisOptions();
  const maxLines = analysisOptions.multiPV;
  const filteredMoves: AnalysisMove[] = [];

  // Add all mate lines first (up to maxLines)
  filteredMoves.push(...mateLines.slice(0, maxLines));

  // If we have fewer than maxLines, add the best non-mate lines
  if (filteredMoves.length < maxLines) {
    const remainingSlots = maxLines - filteredMoves.length;
    filteredMoves.push(...nonMateLines.slice(0, remainingSlots));
  }

  // Add analysis status indicator to the results section (after controls, before results panel)
  const resultsSection = querySelectorOrThrow(document, ".results-section");
  if (resultsSection) {
    // Remove any existing status indicator
    const existingStatus = resultsSection.querySelector(".bestmove-status");
    if (existingStatus) {
      existingStatus.remove();
    }

    // Create new status indicator
    const statusIndicator = document.createElement("div");
    statusIndicator.className = "bestmove-status";

    // Calculate lowest depth of visible non-mating moves, or mating moves if that's all we have
    const visibleNonMatingMoves = filteredMoves.filter(
      (move: AnalysisMove) => Math.abs(move.score) < MATE_SCORE_THRESHOLD,
    );
    const visibleMatingMoves = filteredMoves.filter(
      (move: AnalysisMove) => Math.abs(move.score) >= MATE_SCORE_THRESHOLD,
    );

    let lowestDepth = 0;
    if (visibleNonMatingMoves.length > 0) {
      lowestDepth = Math.min(
        ...visibleNonMatingMoves.map((move: AnalysisMove) => move.depth),
      );
    } else if (visibleMatingMoves.length > 0) {
      lowestDepth = Math.max(
        ...visibleMatingMoves.map((move: AnalysisMove) => move.mateIn),
      );
    }

    // Check if we're in fallback mode
    const isFallback = Stockfish.isFallbackMode();

    const statusText = isAnalyzing
      ? `🔄 Analyzing... (min depth: ${lowestDepth})`
      : `✅ Analysis complete (depth: ${lowestDepth})`;

    const fallbackIndicator = isFallback
      ? ' <span class="fallback-indicator" title="Single-threaded mode">🔧</span>'
      : "";

    statusIndicator.innerHTML = `
      <div class="status-text">${statusText}${fallbackIndicator}</div>
    `;

    // Insert after the status div but before the results-panel
    const statusDiv = resultsSection.querySelector(".status");
    const resultsPanel = getElementByIdOrThrow("bestmove-results");

    if (statusDiv && resultsPanel) {
      resultsSection.insertBefore(statusIndicator, resultsPanel);
    }
  }

  resultsPanel.innerHTML = "";

  filteredMoves.forEach((move: AnalysisMove, index: number) => {
    // Determine move effects if not already present
    if (!move.move.effect) {
      const position = parseFEN(Board.getFEN());
      const validationResult = validateMove(position, move.move);
      if (validationResult.isValid) {
        move.move.effect = validationResult.effect;
      }
    }

    const moveItem = document.createElement("div");
    moveItem.className = "move-item";
    moveItem.dataset.moveFrom = move.move.from;
    moveItem.dataset.moveTo = move.move.to;
    moveItem.dataset.movePiece = move.move.piece;

    const rank = index + 1;
    const notation = moveToNotation(
      move.move,
      notationType,
      pieceType,
      Board.getFEN(),
    );
    const score = formatScoreWithMateIn(move.score, move.mateIn);
    const pv = formatPVWithEffects(
      move.pv,
      Board.getFEN(),
      notationType,
      pieceType,
    );

    moveItem.innerHTML = `
      <div class="move-rank">${rank}.</div>
      <div class="move-notation">${notation}</div>
      <div class="move-score">${score}</div>
      <div class="move-pv">${pv}</div>
    `;

    // Add click handler for the main move
    moveItem.addEventListener("click", () => {
      handleMakeBestmove(move);
    });

    resultsPanel.appendChild(moveItem);
  });

  addBestmovePVClickListeners();
}

/**
 * Make a move from analysis results
 */
export function makeBestmove(move: ChessMove): void {
  log("makeAnalysisMove called with:", move);

  // Determine move effects if not already present
  if (!move.effect) {
    const position = parseFEN(Board.getFEN());
    const validationResult = validateMove(position, move);
    if (validationResult.isValid) {
      move.effect = validationResult.effect;
    }
  }

  // Add the move to the game history
  addMove(move);

  // Update the board position
  const newFEN = applyMoveToFEN(Board.getFEN(), move);
  Board.setPosition(newFEN);

  // Update UI controls
  updateFENInput();
  updateControlsFromPosition();

  // Update move list and navigation
  updateMoveList();
  updateNavigationButtons();

  // Clear any existing move highlights
  clearLastMoveHighlight();

  // Highlight the new move
  highlightLastMove(move);

  // Evaluate the new position
  resetPositionEvaluation();

  updateStatus(`Made move: ${move.from}${move.to}`);
}

/**
 * Add PV move click listeners
 */
export function addBestmovePVClickListeners(): void {
  // Use event delegation on the results panel
  const resultsPanel = getElementByIdOrThrow("bestmove-results");
  if (!resultsPanel) return;

  // Remove any existing listeners to prevent duplicates
  resultsPanel.removeEventListener("click", handleBestmovePVClick);

  // Add the event listener
  resultsPanel.addEventListener("click", handleBestmovePVClick);
}

/**
 * Handle click on PV move
 */
function handleBestmovePVClick(e: Event): void {
  // TODO: this needs to read the move list from the DOM, not local/module state. When these elements are added to the DOM they will know the pv, so that's when we can add and store the moves. is fine.
  const target = e.target as HTMLElement;

  log("Event delegation caught click on:", target);

  // Check if the clicked element is a PV move
  if (!target.classList.contains("pv-move")) {
    log("Not a PV move, ignoring");
    return;
  }

  log("PV move clicked, processing...");

  e.preventDefault();
  e.stopPropagation(); // Prevent triggering the parent move-item click
  e.stopImmediatePropagation(); // Prevent any other handlers from executing

  const originalPosition = target.dataset.originalPosition;
  const moveIndex = target.dataset.moveIndex;

  log("PV click detected:", { originalPosition, moveIndex });

  if (originalPosition && moveIndex !== undefined) {
    // Get the PV moves from the current analysis results
    const appState = getAppState();
    log("Current appState before processing:", appState);
    const moves = appState.moves;

    if (moves.length > 0) {
      // Find the analysis result that matches the clicked move
      const clickedIndex = parseInt(moveIndex);
      const clickedMoveFrom = target.dataset.moveFrom;
      const clickedMoveTo = target.dataset.moveTo;

      log("Looking for analysis result:", {
        clickedIndex,
        clickedMove: `${clickedMoveFrom}${clickedMoveTo}`,
        totalResults: moves.length,
      });

      // Find the analysis result that contains this specific move
      let matchingResult = null;
      for (let i = 0; i < moves.length; i++) {
        const result = moves[i];
        const list = (target.getAttribute("data-pv") ?? "").split(" ");
        if (list.length > clickedIndex) {
          if (list[clickedIndex] === `${clickedMoveFrom}${clickedMoveTo}`) {
            matchingResult = result;
            break;
          }
        }
      }

      if (!matchingResult) {
        logError("Could not find matching analysis result for clicked move");
        return;
      }

      // Use the PV moves from the matching result
      const pvMoves = (target.getAttribute("data-pv") ?? "").split(" ");

      log("Found matching result:", {
        resultIndex: moves.indexOf(matchingResult),
        pvLength: pvMoves.length,
        clickedIndex,
        pvMoves,
      });

      log("PV click processing:", {
        clickedIndex,
        isInBranch: appState.isInBranch,
      });

      log("PV moves check:", {
        pvMoves: pvMoves ? pvMoves.length : null,
        clickedIndex,
        condition: pvMoves && clickedIndex < pvMoves.length,
      });

      if (pvMoves && clickedIndex < pvMoves.length) {
        // Calculate the valid clicked index (don't go beyond available moves)
        const validClickedIndex = Math.min(clickedIndex, pvMoves.length - 1);

        log("Processing PV click:", {
          validClickedIndex,
          pvMovesLength: pvMoves.length,
          originalPosition,
        });

        // Apply all moves up to and including the clicked move
        let currentFEN = originalPosition;
        for (let i = 0; i <= validClickedIndex; i++) {
          const move = pvMoves[i];
          currentFEN = applyLongMoveToFEN(currentFEN, move);
        }

        // Set the board to this position
        Board.setPosition(currentFEN);

        // Update the FEN input
        updateFENInput();

        // Highlight the last move in the branch
        if (validClickedIndex >= 0) {
          // FIXME
          highlightLastMove(
            parseLongMove(pvMoves[validClickedIndex], currentFEN)!,
          );
        }

        log("After all updates, final appState:", getAppState());
      }
    }
  }
}

/**
 * Handle click on main move notation in Next Best Moves results
 */
export function handleMakeBestmove(move: AnalysisMove): void {
  log("Main move clicked:", move);

  const appState = getAppState();
  const currentFEN = Board.getFEN();

  // Check if we're at the last move of the game
  const isAtLastMove = appState.currentMoveIndex === appState.moves.length - 1;

  if (isAtLastMove) {
    // If we're at the last move, just make the move directly
    log("At last move, making move directly");
    makeBestmove(move.move);
  } else {
    // If we're not at the last move, create a branch
    log("Not at last move, creating branch");
    createBranch([move.move], currentFEN);
    updateMoveList();

    // Apply the move to the board
    const newFEN = applyMoveToFEN(currentFEN, move.move);
    Board.setPosition(newFEN);

    // Update UI
    updateFENInput();
    updateControlsFromPosition();
    highlightLastMove(move.move);
  }
}
