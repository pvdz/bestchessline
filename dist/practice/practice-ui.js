import { showToast } from "../utils/ui-utils.js";
// Update statistics display
export function updateStatistics(dom, gameState) {
    const stats = gameState.statistics;
    dom.correctMoves.textContent = stats.correctMoves.toString();
    dom.totalMoves.textContent = stats.totalMoves.toString();
    dom.accuracy.textContent = `${Math.round(stats.accuracy)}%`;
    dom.currentLine.textContent = gameState.openingLines.length.toString();
}
// Update status display
export function updateStatus(dom, gameState) {
    if (!gameState.isPracticeActive) {
        dom.statusIndicator.className = "practice-status-indicator";
        dom.statusText.textContent = "Ready to start";
    }
    else if (!gameState.isHumanTurn) {
        dom.statusIndicator.className = "practice-status-indicator waiting";
        dom.statusText.textContent = "Computer thinking...";
    }
    else {
        dom.statusIndicator.className = "practice-status-indicator ready";
        dom.statusText.textContent = "Your turn";
    }
}
// Add move to history
export function addMoveToHistory(movesHistoryEl, move, isCorrect) {
    const moveEl = document.createElement("div");
    moveEl.className = `practice-move ${isCorrect ? "correct" : "incorrect"}`;
    moveEl.textContent = move;
    movesHistoryEl.appendChild(moveEl);
    // Scroll to bottom
    movesHistoryEl.scrollTop = movesHistoryEl.scrollHeight;
}
// Clear move history
export function clearMoveHistory(movesHistoryEl) {
    movesHistoryEl.innerHTML = "";
}
// Show success toast
export function showSuccessToast(message) {
    showToast(message, "#2ecc71");
}
// Show error toast
export function showErrorToast(message) {
    showToast(message, "#e74c3c");
}
// Show info toast
export function showInfoToast(message) {
    showToast(message, "#3498db");
}
// Show warning toast
export function showWarningToast(message) {
    showToast(message, "#f39c12");
}
//# sourceMappingURL=practice-ui.js.map