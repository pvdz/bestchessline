import { getAppState, updateAppState, clearBranch } from "../main.js";
import { parseFEN } from "./fen-utils.js";
import { validateMove } from "../move-validator.js";
import { parseGameNotation } from "./move-parsing.js";
import { applyMoveToFEN } from "./fen-manipulation.js";
import { moveToNotation } from "./notation-utils.js";
import { getCheckedRadioByName } from "./dom-helpers.js";
import { log } from "./logging.js";
import { navigateToMove, applyMovesUpToIndex } from "./navigation-utils.js";
import { updateNavigationButtons } from "./button-utils.js";
import { updateFENInput, updateControlsFromPosition, resetPositionEvaluation } from "./position-controls.js";
import * as Board from "../chess-board.js";
import { highlightLastMove } from "./board-utils.js";
/**
 * Game Navigation Utility Functions
 *
 * Provides functions for managing game move history, navigation, and display.
 */
/**
 * Add move to game history
 */
export function addMove(move) {
    // Determine move effects if not already present
    if (!move.effect) {
        const position = parseFEN(Board.getFEN());
        const validationResult = validateMove(position, move);
        if (validationResult.isValid) {
            move.effect = validationResult.effect;
        }
    }
    const appState = getAppState();
    updateAppState({
        moves: [...appState.moves, move],
        currentMoveIndex: appState.moves.length,
    });
    updateMoveList();
    updateNavigationButtons();
    highlightLastMove(move);
    // Update FEN input and controls to reflect the board's current position
    // (not the move list, since the board has already been updated)
    updateFENInput();
    updateControlsFromPosition();
    // Evaluate the new position
    resetPositionEvaluation();
}
/**
 * Import game from notation
 */
export function importGame(notation) {
    console.log("Importing game:", notation);
    const appState = getAppState();
    // Reset game state
    updateAppState({
        moves: [],
        currentMoveIndex: -1,
    });
    // Parse moves
    const moves = parseGameNotation(notation, appState.initialFEN);
    updateAppState({ moves });
    updateMoveList();
    updateNavigationButtons();
    // Set board to initial position
    Board.setPosition(appState.initialFEN);
    // Apply all moves to get to the final position
    let currentFEN = appState.initialFEN;
    for (const move of moves) {
        currentFEN = applyMoveToFEN(currentFEN, move);
    }
    Board.setPosition(currentFEN);
    console.log("Game import complete, parsed moves:", moves);
    // Evaluate the final position
    resetPositionEvaluation();
}
/**
 * Navigate to previous move
 */
export function previousMove() {
    const appState = getAppState();
    if (appState.currentMoveIndex > -1) {
        const newIndex = appState.currentMoveIndex - 1;
        updateAppState({ currentMoveIndex: newIndex });
        applyMovesUpToIndex(newIndex);
        updateNavigationButtons();
        updateFENInput();
        updateControlsFromPosition();
        resetPositionEvaluation();
    }
}
/**
 * Navigate to next move
 */
export function nextMove() {
    const appState = getAppState();
    if (appState.currentMoveIndex < appState.moves.length - 1) {
        const newIndex = appState.currentMoveIndex + 1;
        updateAppState({ currentMoveIndex: newIndex });
        applyMovesUpToIndex(newIndex);
        updateNavigationButtons();
        updateFENInput();
        updateControlsFromPosition();
        resetPositionEvaluation();
    }
}
/**
 * Update move list display
 */
export function updateMoveList() {
    const movesPanel = document.getElementById("game-moves");
    if (!movesPanel)
        return;
    const appState = getAppState();
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
                clearBranch();
                navigateToMove(i);
            }
        });
        blackMoveElement.addEventListener("click", () => {
            if (blackMove) {
                clearBranch();
                navigateToMove(i + 1);
            }
        });
        moveEntry.innerHTML = `<span class="move-number">${moveNumber}.</span>`;
        moveEntry.appendChild(whiteMoveElement);
        moveEntry.appendChild(blackMoveElement);
        movesPanel.appendChild(moveEntry);
        // Display branch moves if this is where the branch should appear
        const isAtWhiteMove = appState.branchStartIndex % 2 === 0;
        const isAtBlackMove = appState.branchStartIndex % 2 === 1;
        log("Branch display check:", {
            i,
            branchStartIndex: appState.branchStartIndex,
            isInBranch: appState.isInBranch,
            branchMovesLength: appState.branchMoves.length,
            isAtWhiteMove,
            isAtBlackMove,
            shouldDisplay: appState.isInBranch &&
                appState.branchMoves.length > 0 &&
                ((isAtWhiteMove && i === appState.branchStartIndex) ||
                    (isAtBlackMove &&
                        i === Math.floor(appState.branchStartIndex / 2) * 2)),
        });
        if (appState.isInBranch &&
            appState.branchMoves.length > 0 &&
            i === appState.currentMoveIndex) {
            const branchEntry = document.createElement("div");
            branchEntry.className = "branch-entry";
            branchEntry.style.marginLeft = "12px";
            branchEntry.style.marginRight = "-12px"; // tbh, i dunno why specifically -12 but this does prevent a horizontal scrollbar.
            branchEntry.style.position = "relative";
            branchEntry.style.borderLeft = "2px solid #007bff";
            branchEntry.style.paddingLeft = "10px";
            branchEntry.style.boxSizing = "border-box";
            // Determine the starting move number for the branch
            const currentMoveNumber = Math.floor(appState.branchStartIndex / 2) + 1;
            if (isAtWhiteMove) {
                // At a white move - create branch at same move number
                const moveNumberSpan = document.createElement("span");
                moveNumberSpan.className = "move-number";
                moveNumberSpan.textContent = `${currentMoveNumber}.`;
                branchEntry.appendChild(moveNumberSpan);
                // Add "..." for the white move (since we're branching from it)
                const whitePlaceholder = document.createElement("span");
                whitePlaceholder.className = "move-text";
                whitePlaceholder.textContent = "...";
                branchEntry.appendChild(whitePlaceholder);
                // Add all branch moves
                for (let i = 0; i < appState.branchMoves.length; i += 2) {
                    const branchMoveNumber = currentMoveNumber + Math.floor(i / 2);
                    // Add black move
                    if (i < appState.branchMoves.length) {
                        const blackMove = appState.branchMoves[i];
                        const blackMoveElement = document.createElement("span");
                        blackMoveElement.className = "move-text clickable branch-move";
                        blackMoveElement.textContent = moveToNotation(blackMove, notationType, pieceType, "");
                        blackMoveElement.title = "Branch move";
                        branchEntry.appendChild(blackMoveElement);
                    }
                    // Add white move
                    if (i + 1 < appState.branchMoves.length) {
                        const whiteMove = appState.branchMoves[i + 1];
                        const whiteMoveElement = document.createElement("span");
                        whiteMoveElement.className = "move-text clickable branch-move";
                        // Add move number for all white moves in the branch
                        const moveNumberText = ` ${branchMoveNumber + 1}.`;
                        whiteMoveElement.textContent = `${moveNumberText}${moveToNotation(whiteMove, notationType, pieceType, "")}`;
                        whiteMoveElement.title = "Branch move";
                        branchEntry.appendChild(whiteMoveElement);
                    }
                }
            }
            else if (isAtBlackMove) {
                // At a black move - create branch under the current move
                const moveNumberSpan = document.createElement("span");
                moveNumberSpan.className = "move-number";
                moveNumberSpan.textContent = `${currentMoveNumber + 1}.`;
                branchEntry.appendChild(moveNumberSpan);
                // Add all branch moves
                for (let i = 0; i < appState.branchMoves.length; i += 2) {
                    const branchMoveNumber = currentMoveNumber + Math.floor(i / 2);
                    // Add white move
                    if (i < appState.branchMoves.length) {
                        const whiteMove = appState.branchMoves[i];
                        const whiteMoveElement = document.createElement("span");
                        whiteMoveElement.className = "move-text clickable branch-move";
                        // Add move number for all white moves in the branch
                        const moveNumberText = ` ${branchMoveNumber + 1}.`;
                        whiteMoveElement.textContent = `${moveNumberText}${moveToNotation(whiteMove, notationType, pieceType, "")}`;
                        whiteMoveElement.title = "Branch move";
                        branchEntry.appendChild(whiteMoveElement);
                    }
                    // Add black move
                    if (i + 1 < appState.branchMoves.length) {
                        const blackMove = appState.branchMoves[i + 1];
                        const blackMoveElement = document.createElement("span");
                        blackMoveElement.className = "move-text clickable branch-move";
                        blackMoveElement.textContent = moveToNotation(blackMove, notationType, pieceType, "");
                        blackMoveElement.title = "Branch move";
                        branchEntry.appendChild(blackMoveElement);
                    }
                }
            }
            movesPanel.appendChild(branchEntry);
        }
    }
}
//# sourceMappingURL=game-navigation.js.map