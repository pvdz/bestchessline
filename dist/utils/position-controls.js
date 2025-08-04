import { getInputElement, getCheckedRadio } from "./dom-helpers.js";
import { getFENWithCorrectMoveCounter } from "../utils.js";
import { clearInitiatorMoveInputs } from "./ui-utils.js";
import * as Board from "../chess-board.js";
import { getAppState, updateAppState } from "../main.js";
import { updateButtonStates } from "./analysis-config.js";
import { log, logError } from "./logging.js";
import { formatScoreWithMateIn } from "./formatting-utils.js";
import * as Stockfish from "../stockfish-client.js";
import { toFEN } from "./fen-utils.js";
/**
 * Position Control Utility Functions
 *
 * Provides functions for managing FEN input and position controls.
 */
/**
 * Update FEN input field
 */
export function updateFENInput() {
  const fenInput = getInputElement("fen-input");
  if (fenInput) {
    const boardFEN = Board.getFEN();
    const appState = getAppState();
    const position = Board.getPosition();
    fenInput.value = getFENWithCorrectMoveCounter(
      boardFEN,
      appState.currentMoveIndex,
      position.castling,
      position.enPassant,
    );
  }
  clearInitiatorMoveInputs();
}
/**
 * Update controls from current position
 */
export function updateControlsFromPosition() {
  const position = Board.getPosition();
  const { turn, castling, enPassant } = position;
  // Update current player
  const whiteRadio = getCheckedRadio("current-player", "w");
  const blackRadio = getCheckedRadio("current-player", "b");
  if (whiteRadio && blackRadio) {
    if (turn === "w") {
      whiteRadio.checked = true;
    } else {
      blackRadio.checked = true;
    }
  }
  // Update castling rights
  const whiteKingside = getInputElement("white-kingside");
  const whiteQueenside = getInputElement("white-queenside");
  const blackKingside = getInputElement("black-kingside");
  const blackQueenside = getInputElement("black-queenside");
  if (whiteKingside) whiteKingside.checked = castling.includes("K");
  if (whiteQueenside) whiteQueenside.checked = castling.includes("Q");
  if (blackKingside) blackKingside.checked = castling.includes("k");
  if (blackQueenside) blackQueenside.checked = castling.includes("q");
  // Update en passant
  const enPassantInput = getInputElement("en-passant");
  if (enPassantInput) {
    enPassantInput.value =
      enPassant === null || enPassant === "-" ? "" : enPassant;
  }
}
/**
 * Update position from controls
 */
export function updatePositionFromControls() {
  // Get current player
  const whiteRadio = getCheckedRadio("current-player", "w");
  const turn = whiteRadio?.checked ? "w" : "b";
  // Get castling rights
  const whiteKingside = getInputElement("white-kingside");
  const whiteQueenside = getInputElement("white-queenside");
  const blackKingside = getInputElement("black-kingside");
  const blackQueenside = getInputElement("black-queenside");
  let castling = "";
  if (whiteKingside?.checked) castling += "K";
  if (whiteQueenside?.checked) castling += "Q";
  if (blackKingside?.checked) castling += "k";
  if (blackQueenside?.checked) castling += "q";
  // Get en passant
  const enPassantInput = getInputElement("en-passant");
  const enPassant = enPassantInput?.value || "-";
  // Get current board position
  const currentFEN = Board.getFEN();
  if (!currentFEN) return;
  // Create new FEN with updated controls
  const position = Board.getPosition();
  const newFEN = toFEN({
    ...position,
    turn,
    castling: castling || "-",
    enPassant: enPassant === "-" ? null : enPassant,
  });
  // Update board position
  Board.setPosition(newFEN);
}
/**
 * Reset position evaluation to initial state
 */
export const resetPositionEvaluation = () => {
  updateAppState({
    positionEvaluation: {
      score: null,
      isMate: false,
      mateIn: null,
      isAnalyzing: false,
    },
  });
  updatePositionEvaluationDisplay();
  updateButtonStates();
};
/**
 * Initialize position evaluation button
 */
export const initializePositionEvaluationButton = () => {
  const evaluationButton = document.getElementById("position-evaluation-btn");
  if (evaluationButton) {
    evaluationButton.addEventListener("click", () => {
      evaluateCurrentPosition();
    });
  }
};
/**
 * Evaluate the current board position using Stockfish
 */
export const evaluateCurrentPosition = async () => {
  const currentFEN = Board.getFEN();
  if (!currentFEN) {
    log("No position available for evaluation");
    return;
  }
  log(`Evaluating position: ${currentFEN}`);
  const appState = getAppState();
  // Don't evaluate if main analysis is running
  if (appState.isAnalyzing) {
    log("Skipping position evaluation - main analysis is running");
    return;
  }
  // Update state to show we're analyzing
  updateAppState({
    positionEvaluation: {
      ...appState.positionEvaluation,
      isAnalyzing: true,
    },
  });
  updatePositionEvaluationDisplay();
  updateButtonStates();
  try {
    // Get a proper evaluation with adequate depth and timeout
    const result = await Promise.race([
      Stockfish.analyzePosition(currentFEN, {
        depth: 20,
        threads: 1,
        multiPV: 1,
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Analysis timeout")), 10000),
      ),
    ]);
    if (result.moves.length > 0) {
      const bestMove = result.moves[0];
      const score = bestMove.score;
      // Log the evaluation for debugging
      log(`Position evaluation: ${score} centipawns (${score / 100} pawns)`);
      // Determine if it's a mate
      const isMate = Math.abs(score) >= 10000;
      const mateIn = isMate ? Math.ceil((10000 - Math.abs(score)) / 2) : null;
      updateAppState({
        positionEvaluation: {
          score,
          isMate,
          mateIn,
          isAnalyzing: false,
        },
      });
    } else {
      log("No moves found in analysis result");
      updateAppState({
        positionEvaluation: {
          score: null,
          isMate: false,
          mateIn: null,
          isAnalyzing: false,
        },
      });
    }
  } catch (error) {
    logError("Error evaluating position:", error);
    updateAppState({
      positionEvaluation: {
        score: null,
        isMate: false,
        mateIn: null,
        isAnalyzing: false,
      },
    });
  }
  updatePositionEvaluationDisplay();
  updateButtonStates();
};
/**
 * Update the position evaluation display
 */
export const updatePositionEvaluationDisplay = () => {
  const evaluationButton = document.getElementById("position-evaluation-btn");
  if (!evaluationButton) {
    return;
  }
  const appState = getAppState();
  const { score, isMate, mateIn, isAnalyzing } = appState.positionEvaluation;
  if (isAnalyzing) {
    evaluationButton.textContent = "...";
    evaluationButton.className = "evaluation-button neutral";
    evaluationButton.disabled = true;
    return;
  }
  if (score === null) {
    evaluationButton.textContent = "??";
    evaluationButton.className = "evaluation-button neutral";
    evaluationButton.disabled = false;
    return;
  }
  let displayText;
  let className;
  if (isMate) {
    // Use the new formatter for mate scores
    displayText = formatScoreWithMateIn(score, mateIn ?? 0);
    className = "evaluation-button mate";
  } else {
    // Convert centipawns to pawns and format
    const scoreInPawns = score / 100;
    displayText =
      score > 0 ? `+${scoreInPawns.toFixed(1)}` : `${scoreInPawns.toFixed(1)}`;
    className =
      score > 0
        ? "evaluation-button positive"
        : score < 0
          ? "evaluation-button negative"
          : "evaluation-button neutral";
  }
  evaluationButton.textContent = displayText;
  evaluationButton.className = className;
  evaluationButton.disabled = false;
};
//# sourceMappingURL=position-controls.js.map
