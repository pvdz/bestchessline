import { PLAYER_COLORS, } from "../types.js";
import { getAppState, updateAppState } from "../main.js";
import { parseFEN } from "./fen-utils.js";
import { validateMove } from "../move-validator.js";
import { applyMoveToFEN } from "./fen-manipulation.js";
import { moveToNotation } from "./notation-utils.js";
import { getCheckedRadioByName } from "./dom-helpers.js";
import { log, logError } from "./logging.js";
import { compareAnalysisMoves } from "./analysis-utils.js";
import { getAnalysisOptions, updateButtonStates } from "./analysis-config.js";
import { updateStatus } from "./status-utils.js";
import { updateResultsPanel, formatPVWithEffects } from "./pv-utils.js";
import { updatePositionEvaluationDisplay } from "./position-controls.js";
import { addMove, updateMoveList } from "./game-navigation.js";
import { updateNavigationButtons } from "./button-utils.js";
import { updateFENInput, updateControlsFromPosition, resetPositionEvaluation, } from "./position-controls.js";
import { createBranch } from "../main.js";
import * as Board from "../chess-board.js";
import * as Stockfish from "../stockfish-client.js";
import { highlightLastMove } from "./board-utils.js";
import { formatScoreWithMateIn } from "./formatting-utils.js";
import { hideMoveArrow } from "./arrow-utils.js";
import { clearLastMoveHighlight } from "../chess-board.js";
/**
 * Analysis Management Utility Functions
 *
 * Provides functions for managing Stockfish analysis, results display, and move interactions.
 */
// Constants
const MATE_SCORE_THRESHOLD = 10000;
/**
 * Start analysis
 */
export function startAnalysis() {
    const appState = getAppState();
    if (appState.isAnalyzing)
        return Promise.resolve();
    updateAppState({
        isAnalyzing: true,
    });
    updateButtonStates();
    updatePositionEvaluationDisplay();
    return Stockfish.analyzePosition(Board.getFEN(), getAnalysisOptions(), (analysisResult) => {
        updateAppState({
            currentResults: analysisResult,
            isAnalyzing: !analysisResult.completed,
        });
        updateResults(analysisResult);
        updateButtonStates();
    })
        .then((result) => {
        updateAppState({
            currentResults: result,
            isAnalyzing: false,
        });
        updateButtonStates();
    })
        .catch((error) => {
        logError("Analysis failed:", error);
        updateAppState({ isAnalyzing: false });
        updateButtonStates();
    });
}
/**
 * Stop analysis
 */
export function stopAnalysis() {
    Stockfish.stopAnalysis();
    updateAppState({
        isAnalyzing: false,
        currentResults: null,
    });
    updateButtonStates();
    updateResultsPanel([]);
}
/**
 * Update results display
 */
export function updateResults(result) {
    if (!result || !result.moves)
        return;
    updateResultsPanel(result.moves);
    updateStatus(`Analysis complete: ${result.moves.length} moves found`);
}
// Debounce mechanism for analysis updates
let analysisUpdateTimeout = null;
/**
 * Update results panel
 */
export function actuallyUpdateResultsPanel(moves) {
    analysisUpdateTimeout = null;
    const resultsPanel = document.getElementById("analysis-results");
    if (!resultsPanel)
        return;
    // Clear existing arrows
    hideMoveArrow();
    // Get current format settings
    const notationFormat = getCheckedRadioByName("notation-format")?.value || "algebraic-short";
    const pieceFormat = getCheckedRadioByName("piece-format")?.value || "symbols";
    // Convert format values to match moveToNotation parameters
    const notationType = notationFormat === "algebraic-short" ? "short" : "long";
    const pieceType = pieceFormat === "symbols" ? "unicode" : "english";
    // Filter moves based on analysis criteria
    const appState = getAppState();
    const isAnalyzing = appState.isAnalyzing;
    // First, separate mate lines from non-mate lines
    const mateLines = moves.filter((move) => Math.abs(move.score) >= MATE_SCORE_THRESHOLD);
    const nonMateLines = moves.filter((move) => Math.abs(move.score) < MATE_SCORE_THRESHOLD);
    // Sort mate lines using the updated comparison function that considers mateIn
    const currentFEN = Board.getFEN();
    const position = currentFEN ? parseFEN(currentFEN) : null;
    const direction = position && position.turn === PLAYER_COLORS.BLACK ? "asc" : "desc";
    mateLines.sort((a, b) => compareAnalysisMoves(a, b, direction));
    // Sort non-mate lines by depth (descending), then by score (descending), then by multipv
    nonMateLines.sort((a, b) => {
        // For score comparison, use shared logic
        const scoreComparison = compareAnalysisMoves(a, b, direction);
        if (scoreComparison !== 0)
            return scoreComparison;
        return (a.multipv || 1) - (b.multipv || 1);
    });
    // Get the configured number of lines from UI
    const analysisOptions = getAnalysisOptions();
    const maxLines = analysisOptions.multiPV;
    const filteredMoves = [];
    // Add all mate lines first (up to maxLines)
    filteredMoves.push(...mateLines.slice(0, maxLines));
    // If we have fewer than maxLines, add the best non-mate lines
    if (filteredMoves.length < maxLines) {
        const remainingSlots = maxLines - filteredMoves.length;
        filteredMoves.push(...nonMateLines.slice(0, remainingSlots));
    }
    // Add analysis status indicator to the results section (after controls, before results panel)
    const resultsSection = document.querySelector(".results-section");
    if (resultsSection) {
        // Remove any existing status indicator
        const existingStatus = resultsSection.querySelector(".analysis-status");
        if (existingStatus) {
            existingStatus.remove();
        }
        // Create new status indicator
        const statusIndicator = document.createElement("div");
        statusIndicator.className = "analysis-status";
        // Calculate lowest depth of visible non-mating moves, or mating moves if that's all we have
        const visibleNonMatingMoves = filteredMoves.filter((move) => Math.abs(move.score) < MATE_SCORE_THRESHOLD);
        const visibleMatingMoves = filteredMoves.filter((move) => Math.abs(move.score) >= MATE_SCORE_THRESHOLD);
        let lowestDepth = 0;
        if (visibleNonMatingMoves.length > 0) {
            lowestDepth = Math.min(...visibleNonMatingMoves.map((move) => move.depth));
        }
        else if (visibleMatingMoves.length > 0) {
            lowestDepth = Math.max(...visibleMatingMoves.map((move) => move.mateIn));
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
        const resultsPanel = resultsSection.querySelector("#analysis-results");
        if (statusDiv && resultsPanel) {
            resultsSection.insertBefore(statusIndicator, resultsPanel);
        }
    }
    resultsPanel.innerHTML = "";
    filteredMoves.forEach((move, index) => {
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
        const notation = moveToNotation(move.move, notationType, pieceType, Board.getFEN());
        const score = formatScoreWithMateIn(move.score, move.mateIn);
        const pv = formatPVWithEffects(move.pv, Board.getFEN(), notationType, pieceType);
        moveItem.innerHTML = `
      <div class="move-rank">${rank}.</div>
      <div class="move-notation">${notation}</div>
      <div class="move-score">${score}</div>
      <div class="move-pv">${pv}</div>
    `;
        // Add click handler for the main move
        moveItem.addEventListener("click", () => {
            handleMakeEngineMove(move);
        });
        resultsPanel.appendChild(moveItem);
    });
    addPVClickListeners();
}
/**
 * Make a move from analysis results
 */
export function makeAnalysisMove(move) {
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
export function addPVClickListeners() {
    // Use event delegation on the results panel
    const resultsPanel = document.getElementById("analysis-results");
    if (!resultsPanel)
        return;
    // Remove any existing listeners to prevent duplicates
    resultsPanel.removeEventListener("click", handlePVClick);
    // Add the event listener
    resultsPanel.addEventListener("click", handlePVClick);
}
/**
 * Handle click on PV move
 */
function handlePVClick(e) {
    const target = e.target;
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
        const currentResults = appState.currentResults;
        if (currentResults && currentResults.moves.length > 0) {
            // Find the analysis result that matches the clicked move
            const clickedIndex = parseInt(moveIndex);
            const clickedMoveFrom = target.dataset.moveFrom;
            const clickedMoveTo = target.dataset.moveTo;
            log("Looking for analysis result:", {
                clickedIndex,
                clickedMove: `${clickedMoveFrom}${clickedMoveTo}`,
                totalResults: currentResults.moves.length,
            });
            // Find the analysis result that contains this specific move
            let matchingResult = null;
            for (let i = 0; i < currentResults.moves.length; i++) {
                const result = currentResults.moves[i];
                if (result.pv && result.pv.length > clickedIndex) {
                    const pvMove = result.pv[clickedIndex];
                    if (pvMove.from === clickedMoveFrom && pvMove.to === clickedMoveTo) {
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
            const pvMoves = matchingResult.pv;
            log("Found matching result:", {
                resultIndex: currentResults.moves.indexOf(matchingResult),
                pvLength: pvMoves.length,
                clickedIndex,
                pvMoves: pvMoves.map((m) => `${m.from}${m.to}`),
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
                    currentFEN = applyMoveToFEN(currentFEN, move);
                }
                // Set the board to this position
                Board.setPosition(currentFEN);
                // Update the FEN input
                updateFENInput();
                // Highlight the last move in the branch
                if (validClickedIndex >= 0) {
                    highlightLastMove(pvMoves[validClickedIndex]);
                }
                log("After all updates, final appState:", getAppState());
            }
        }
    }
}
/**
 * Handle click on main move notation in Engine Moves results
 */
export function handleMakeEngineMove(move) {
    log("Main move clicked:", move);
    const appState = getAppState();
    const currentFEN = Board.getFEN();
    // Check if we're at the last move of the game
    const isAtLastMove = appState.currentMoveIndex === appState.moves.length - 1;
    if (isAtLastMove) {
        // If we're at the last move, just make the move directly
        log("At last move, making move directly");
        makeAnalysisMove(move.move);
    }
    else {
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
//# sourceMappingURL=analysis-manager.js.map