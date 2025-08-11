import { showToast } from "../utils/ui-utils.js";
import { DOMElements, GameState } from "./practice-types.js";

// Update statistics display
export function updateStatistics(dom: DOMElements, gameState: GameState): void {
  const stats = gameState.statistics;

  // Calculate accuracy
  if (stats.totalMoves > 0) {
    stats.accuracy = (stats.correctMoves / stats.totalMoves) * 100;
  } else {
    stats.accuracy = 0;
  }

  dom.correctMoves.textContent = stats.correctMoves.toString();
  dom.totalMoves.textContent = stats.totalMoves.toString();
  dom.accuracy.textContent = `${Math.round(stats.accuracy)}%`;
  dom.currentLine.textContent = gameState.openingLines.length.toString();

  // Update depth display
  updateDepthDisplay(dom, gameState);
}

// Update status display
export function updateStatus(dom: DOMElements, gameState: GameState): void {
  if (!gameState.isPracticeActive) {
    dom.statusIndicator.className = "practice-status-indicator";
    dom.statusText.textContent = "Ready to start";
  } else if (!gameState.isHumanTurn) {
    dom.statusIndicator.className = "practice-status-indicator waiting";
    dom.statusText.textContent = "Computer thinking...";
  } else {
    dom.statusIndicator.className = "practice-status-indicator ready";
    dom.statusText.textContent = "Your turn";
  }
}

// Update depth display
export function updateDepthDisplay(
  dom: DOMElements,
  gameState: GameState,
): void {
  dom.currentDepth.textContent = gameState.currentDepth.toString();
}

// Track moves for proper game display
let moveHistory: Array<{
  notation: string;
  isCorrect: boolean;
  isWhite: boolean;
}> = [];
let attemptedMoves: Array<{ notation: string; isWhite: boolean }> = [];

// Add move to history
export function addMoveToHistory(
  movesHistoryEl: HTMLElement,
  move: string,
  isCorrect: boolean,
): void {
  // Determine if this is a white or black move
  const isWhite = moveHistory.length % 2 === 0;

  if (isCorrect) {
    // Add correct move to our tracking array
    moveHistory.push({
      notation: move,
      isCorrect,
      isWhite,
    });

    // Clear attempted moves after a correct move
    attemptedMoves = [];

    // Update both displays
    updateMoveHistoryDisplay(movesHistoryEl);
    updateAttemptedMovesDisplay(movesHistoryEl);
  } else {
    // Add incorrect move to attempted moves
    attemptedMoves.push({
      notation: move,
      isWhite,
    });

    // Update both displays
    updateMoveHistoryDisplay(movesHistoryEl);
    updateAttemptedMovesDisplay(movesHistoryEl);
  }
}

// Update the move history display to show moves in game format
export function updateMoveHistoryDisplay(movesHistoryEl: HTMLElement): void {
  movesHistoryEl.innerHTML = "";

  for (let i = 0; i < moveHistory.length; i += 2) {
    const moveNumber = Math.floor(i / 2) + 1;
    const whiteMove = moveHistory[i];
    const blackMove = moveHistory[i + 1];

    const moveEntry = document.createElement("div");
    moveEntry.className = "practice-move-entry";

    // Create simple text line
    let moveText = `${moveNumber}. ${whiteMove.notation}`;
    if (blackMove) {
      moveText += ` ${blackMove.notation}`;
    }

    moveEntry.textContent = moveText;
    movesHistoryEl.appendChild(moveEntry);
  }

  // Scroll to bottom
  movesHistoryEl.scrollTop = movesHistoryEl.scrollHeight;
}

// Update the attempted moves display
function updateAttemptedMovesDisplay(movesHistoryEl: HTMLElement): void {
  // Find or create the attempted moves section
  let attemptedSection = movesHistoryEl.parentElement?.querySelector(
    ".practice-attempted-moves",
  );
  if (!attemptedSection) {
    attemptedSection = document.createElement("div");
    attemptedSection.className = "practice-attempted-moves";
    attemptedSection.innerHTML =
      "<h4>Attempted Moves</h4><div class='practice-attempted-list'></div>";
    movesHistoryEl.parentElement?.appendChild(attemptedSection);
  }

  const attemptedList = attemptedSection.querySelector(
    ".practice-attempted-list",
  );
  if (attemptedList) {
    attemptedList.innerHTML = "";

    if (attemptedMoves.length === 0) {
      attemptedList.innerHTML = "<em>No attempted moves yet</em>";
      return;
    }

    // Create a container for attempted moves as blocks
    const attemptedContainer = document.createElement("div");
    attemptedContainer.className = "practice-attempted-container";

    for (const attemptedMove of attemptedMoves) {
      const moveEl = document.createElement("div");
      moveEl.className = "practice-attempted-move";
      moveEl.textContent = attemptedMove.notation;
      attemptedContainer.appendChild(moveEl);
    }

    attemptedList.appendChild(attemptedContainer);
  }
}

// Clear move history
export function clearMoveHistory(movesHistoryEl: HTMLElement): void {
  movesHistoryEl.innerHTML = "";
  moveHistory = [];
  attemptedMoves = [];

  // Also clear the attempted moves display
  const attemptedSection = movesHistoryEl.parentElement?.querySelector(
    ".practice-attempted-moves",
  );
  if (attemptedSection) {
    attemptedSection.remove();
  }
}

// Remove the last move from history (for incorrect moves)
export function removeLastMove(movesHistoryEl: HTMLElement): void {
  if (moveHistory.length > 0) {
    moveHistory.pop();
    updateMoveHistoryDisplay(movesHistoryEl);
  }
}

// Show success toast
export function showSuccessToast(message: string, dom?: DOMElements): void {
  if (dom?.textBelow) {
    dom.textBelow.textContent = message;
    return;
  }
  showToast(message, "#2ecc71");
}

// Show error toast
export function showErrorToast(message: string, dom?: DOMElements): void {
  if (dom?.textBelow) {
    dom.textBelow.textContent = message;
    return;
  }
  showToast(message, "#e74c3c");
}

// Show info toast
export function showInfoToast(message: string, dom?: DOMElements): void {
  if (dom?.textBelow) {
    dom.textBelow.textContent = message;
    return;
  }
  showToast(message, "#3498db");
}

// Show warning toast
export function showWarningToast(message: string, dom?: DOMElements): void {
  if (dom?.textBelow) {
    dom.textBelow.textContent = message;
    return;
  }
  showToast(message, "#f39c12");
}
