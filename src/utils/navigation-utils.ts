import { applyMoveToFEN } from "./fen-manipulation.js";
import {
  updateFENInput,
  updateControlsFromPosition,
  resetPositionEvaluation,
} from "./position-controls.js";
import { highlightLastMove } from "./board-utils.js";
import { updateStatus } from "./status-utils.js";
import { updateNavigationButtons } from "./button-utils.js";
import * as Board from "../chess-board.js";
import { getAppState, clearBranch, updateAppState } from "../main.js";
import { updateMoveList } from "./game-navigation.js";

/**
 * Navigation Utility Functions
 * 
 * Provides functions for navigating through game moves.
 */

/**
 * Navigate to a specific move index
 * @param moveIndex The move index to navigate to
 */
export function navigateToMove(moveIndex: number): void {
  const appState = getAppState();
  if (moveIndex < -1 || moveIndex >= appState.moves.length) {
    return;
  }

  // Clear any existing branch
  clearBranch();

  // Update the current move index
  updateAppState({ currentMoveIndex: moveIndex });

  // Apply moves up to the specified index
  applyMovesUpToIndex(moveIndex);

  // Update the move list to reflect the new current position
  updateMoveList();
  updateNavigationButtons();

  // Evaluate the new position
  resetPositionEvaluation();

  updateStatus(`Navigated to move ${moveIndex + 1}`);
}

/**
 * Apply moves up to specified index
 * @param index The index to apply moves up to
 */
export function applyMovesUpToIndex(index: number): void {
  const appState = getAppState();
  
  // Reset to initial position
  Board.setPosition(appState.initialFEN);

  // Apply moves up to index
  let currentFEN = appState.initialFEN;
  for (let i = 0; i <= index && i < appState.moves.length; i++) {
    const move = appState.moves[i];
    currentFEN = applyMoveToFEN(currentFEN, move);
  }

  Board.setPosition(currentFEN);
  updateMoveList();
  updateFENInput();
  updateControlsFromPosition();

  // Highlight last move if there is one
  if (index >= 0 && index < appState.moves.length) {
    highlightLastMove(appState.moves[index]);
  } else {
    Board.clearLastMoveHighlight();
  }
} 