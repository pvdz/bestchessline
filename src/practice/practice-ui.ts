import { showToast } from "../utils/ui-utils.js";
import { DOMElements, GameState } from "./practice-types.js";

// Update statistics display
export function updateStatistics(dom: DOMElements, gameState: GameState): void {
  const stats = gameState.statistics;

  dom.correctMoves.textContent = stats.correctMoves.toString();
  dom.totalMoves.textContent = stats.totalMoves.toString();
  dom.accuracy.textContent = `${Math.round(stats.accuracy)}%`;
  dom.currentLine.textContent = (gameState.currentLineIndex + 1).toString();
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

// Add move to history
export function addMoveToHistory(
  movesHistoryEl: HTMLElement,
  move: string,
  isCorrect: boolean,
): void {
  const moveEl = document.createElement("div");
  moveEl.className = `practice-move ${isCorrect ? "correct" : "incorrect"}`;
  moveEl.textContent = move;
  movesHistoryEl.appendChild(moveEl);

  // Scroll to bottom
  movesHistoryEl.scrollTop = movesHistoryEl.scrollHeight;
}

// Clear move history
export function clearMoveHistory(movesHistoryEl: HTMLElement): void {
  movesHistoryEl.innerHTML = "";
}

// Show success toast
export function showSuccessToast(message: string): void {
  showToast(message, "#2ecc71");
}

// Show error toast
export function showErrorToast(message: string): void {
  showToast(message, "#e74c3c");
}

// Show info toast
export function showInfoToast(message: string): void {
  showToast(message, "#3498db");
}

// Show warning toast
export function showWarningToast(message: string): void {
  showToast(message, "#f39c12");
}
