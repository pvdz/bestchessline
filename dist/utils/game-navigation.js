import { moveToNotation } from "./notation-utils.js";
import { applyMoveToFEN } from "./fen-manipulation.js";
import * as Board from "../chess-board.js";
/**
 * Game Navigation Utility Functions
 *
 * Provides functions for navigating through chess games, highlighting moves,
 * and managing game state transitions.
 */
/**
 * Navigate to previous move
 */
export function previousMove(appState, updateAppState, updateNavigationButtons, updateFENInput, updateControlsFromPosition, resetPositionEvaluation) {
    if (appState.currentMoveIndex > -1) {
        const newIndex = appState.currentMoveIndex - 1;
        updateAppState({ currentMoveIndex: newIndex });
        applyMovesUpToIndex(newIndex, appState, updateAppState, updateMoveList, updateFENInput, updateControlsFromPosition, highlightLastMove, clearLastMoveHighlight);
        updateNavigationButtons();
        updateFENInput();
        updateControlsFromPosition();
        resetPositionEvaluation();
    }
}
/**
 * Navigate to next move
 */
export function nextMove(appState, updateAppState, updateNavigationButtons, updateFENInput, updateControlsFromPosition, resetPositionEvaluation) {
    if (appState.currentMoveIndex < appState.moves.length - 1) {
        const newIndex = appState.currentMoveIndex + 1;
        updateAppState({ currentMoveIndex: newIndex });
        applyMovesUpToIndex(newIndex, appState, updateAppState, updateMoveList, updateFENInput, updateControlsFromPosition, highlightLastMove, clearLastMoveHighlight);
        updateNavigationButtons();
        updateFENInput();
        updateControlsFromPosition();
        resetPositionEvaluation();
    }
}
/**
 * Navigate to a specific move index
 */
export function navigateToMove(moveIndex, appState, updateAppState, clearBranch, updateMoveList, updateNavigationButtons, resetPositionEvaluation, updateStatus) {
    if (moveIndex < -1 || moveIndex >= appState.moves.length) {
        return;
    }
    // Clear any existing branch
    clearBranch();
    // Update the current move index
    updateAppState({ currentMoveIndex: moveIndex });
    // Apply moves up to the specified index
    applyMovesUpToIndex(moveIndex, appState, updateAppState, updateMoveList, updateFENInput, updateControlsFromPosition, highlightLastMove, clearLastMoveHighlight);
    // Update the move list to reflect the new current position
    updateMoveList();
    updateNavigationButtons();
    // Evaluate the new position
    resetPositionEvaluation();
    updateStatus(`Navigated to move ${moveIndex + 1}`);
}
/**
 * Apply moves up to specified index
 */
export function applyMovesUpToIndex(index, appState, updateAppState, updateMoveList, updateFENInput, updateControlsFromPosition, highlightLastMove, clearLastMoveHighlight) {
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
    }
    else {
        clearLastMoveHighlight();
    }
}
/**
 * Highlight the last move on the board
 */
export function highlightLastMove(move) {
    // Clear previous highlights
    clearLastMoveHighlight();
    // Add highlights for the last move
    const fromSquare = document.querySelector(`[data-square="${move.from}"]`);
    const toSquare = document.querySelector(`[data-square="${move.to}"]`);
    if (fromSquare) {
        fromSquare.classList.add("last-move-from");
    }
    if (toSquare) {
        toSquare.classList.add("last-move-to");
    }
}
/**
 * Clear last move highlight
 */
export function clearLastMoveHighlight() {
    Board.clearLastMoveHighlight();
}
/**
 * Update move list display
 */
export function updateMoveList(appState, getCheckedRadioByName) {
    const movesPanel = document.getElementById("game-moves");
    if (!movesPanel)
        return;
    // Get current format settings
    const notationFormat = getCheckedRadioByName("notation-format")?.value || "algebraic-short";
    const pieceFormat = getCheckedRadioByName("piece-format")?.value || "symbols";
    // Convert format values to match moveToNotation parameters
    const notationType = notationFormat === "algebraic-short" ? "short" : "long";
    const pieceType = pieceFormat === "symbols" ? "unicode" : "english";
    movesPanel.innerHTML = "";
    // Display main game moves
    for (let i = 0; i < appState.moves.length; i += 2) {
        const moveEntry = document.createElement("div");
        moveEntry.className = "move-entry";
        const moveNumber = Math.floor(i / 2) + 1;
        const whiteMove = appState.moves[i];
        const blackMove = appState.moves[i + 1];
        // Create clickable move elements
        const whiteMoveElement = document.createElement("span");
        whiteMoveElement.className = `move-text clickable ${i === appState.currentMoveIndex ? "current-move" : ""}`;
        whiteMoveElement.textContent = whiteMove
            ? moveToNotation(whiteMove, notationType, pieceType, "")
            : "...";
        whiteMoveElement.dataset.moveIndex = i.toString();
        whiteMoveElement.title = "Click to go to this position";
        const blackMoveElement = document.createElement("span");
        blackMoveElement.className = `move-text clickable ${i + 1 === appState.currentMoveIndex ? "current-move" : ""}`;
        blackMoveElement.textContent = blackMove
            ? moveToNotation(blackMove, notationType, pieceType, "")
            : "";
        blackMoveElement.dataset.moveIndex = (i + 1).toString();
        blackMoveElement.title = "Click to go to this position";
        // Add click handlers
        whiteMoveElement.addEventListener("click", () => {
            if (whiteMove) {
                navigateToMove(i, appState, updateAppState, clearBranch, updateMoveList, updateNavigationButtons, resetPositionEvaluation, updateStatus);
            }
        });
        blackMoveElement.addEventListener("click", () => {
            if (blackMove) {
                navigateToMove(i + 1, appState, updateAppState, clearBranch, updateMoveList, updateNavigationButtons, resetPositionEvaluation, updateStatus);
            }
        });
        // Create move number element
        const moveNumberElement = document.createElement("span");
        moveNumberElement.className = "move-number";
        moveNumberElement.textContent = `${moveNumber}.`;
        // Assemble the move entry
        moveEntry.appendChild(moveNumberElement);
        moveEntry.appendChild(whiteMoveElement);
        if (blackMove) {
            moveEntry.appendChild(document.createTextNode(" "));
            moveEntry.appendChild(blackMoveElement);
        }
        movesPanel.appendChild(moveEntry);
    }
    // Display branch moves if any
    if (appState.isInBranch && appState.branchMoves.length > 0) {
        const branchHeader = document.createElement("div");
        branchHeader.className = "branch-header";
        branchHeader.textContent = "Branch:";
        movesPanel.appendChild(branchHeader);
        for (let i = 0; i < appState.branchMoves.length; i += 2) {
            const moveEntry = document.createElement("div");
            moveEntry.className = "move-entry branch-move";
            const moveNumber = Math.floor(i / 2) + 1;
            const whiteMove = appState.branchMoves[i];
            const blackMove = appState.branchMoves[i + 1];
            const whiteMoveElement = document.createElement("span");
            whiteMoveElement.className = "move-text clickable";
            whiteMoveElement.textContent = whiteMove
                ? moveToNotation(whiteMove, notationType, pieceType, "")
                : "...";
            whiteMoveElement.dataset.moveIndex = (appState.branchStartIndex + i).toString();
            whiteMoveElement.title = "Click to go to this position";
            const blackMoveElement = document.createElement("span");
            blackMoveElement.className = "move-text clickable";
            blackMoveElement.textContent = blackMove
                ? moveToNotation(blackMove, notationType, pieceType, "")
                : "";
            blackMoveElement.dataset.moveIndex = (appState.branchStartIndex + i + 1).toString();
            blackMoveElement.title = "Click to go to this position";
            // Add click handlers for branch moves
            whiteMoveElement.addEventListener("click", () => {
                if (whiteMove) {
                    navigateToMove(appState.branchStartIndex + i, appState, updateAppState, clearBranch, updateMoveList, updateNavigationButtons, resetPositionEvaluation, updateStatus);
                }
            });
            blackMoveElement.addEventListener("click", () => {
                if (blackMove) {
                    navigateToMove(appState.branchStartIndex + i + 1, appState, updateAppState, clearBranch, updateMoveList, updateNavigationButtons, resetPositionEvaluation, updateStatus);
                }
            });
            const moveNumberElement = document.createElement("span");
            moveNumberElement.className = "move-number";
            moveNumberElement.textContent = `${moveNumber}.`;
            moveEntry.appendChild(moveNumberElement);
            moveEntry.appendChild(whiteMoveElement);
            if (blackMove) {
                moveEntry.appendChild(document.createTextNode(" "));
                moveEntry.appendChild(blackMoveElement);
            }
            movesPanel.appendChild(moveEntry);
        }
    }
}
/**
 * Update navigation buttons state
 */
export function updateNavigationButtons(appState) {
    const prevBtn = document.getElementById("prev-move");
    const nextBtn = document.getElementById("next-move");
    if (prevBtn) {
        prevBtn.disabled = appState.currentMoveIndex <= -1;
    }
    if (nextBtn) {
        nextBtn.disabled = appState.currentMoveIndex >= appState.moves.length - 1;
    }
}
// Helper functions that need to be passed from main.ts
function updateAppState(updates) {
    // This will be passed from main.ts
}
function clearBranch() {
    // This will be passed from main.ts
}
function updateFENInput() {
    // This will be passed from main.ts
}
function updateControlsFromPosition() {
    // This will be passed from main.ts
}
function resetPositionEvaluation() {
    // This will be passed from main.ts
}
function updateStatus(message) {
    // This will be passed from main.ts
}
//# sourceMappingURL=game-navigation.js.map