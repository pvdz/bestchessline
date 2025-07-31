import { getInputElement, getCheckedRadio } from "./dom-helpers.js";
import { getFENWithCorrectMoveCounter } from "../utils.js";
import { clearInitiatorMoveInputs } from "./ui-utils.js";
import * as Board from "../chess-board.js";
import { getAppState } from "../main.js";
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
        fenInput.value = getFENWithCorrectMoveCounter(boardFEN, appState.currentMoveIndex, position.castling, position.enPassant);
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
        }
        else {
            blackRadio.checked = true;
        }
    }
    // Update castling rights
    const whiteKingside = getInputElement("white-kingside");
    const whiteQueenside = getInputElement("white-queenside");
    const blackKingside = getInputElement("black-kingside");
    const blackQueenside = getInputElement("black-queenside");
    if (whiteKingside)
        whiteKingside.checked = castling.includes("K");
    if (whiteQueenside)
        whiteQueenside.checked = castling.includes("Q");
    if (blackKingside)
        blackKingside.checked = castling.includes("k");
    if (blackQueenside)
        blackQueenside.checked = castling.includes("q");
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
    if (whiteKingside?.checked)
        castling += "K";
    if (whiteQueenside?.checked)
        castling += "Q";
    if (blackKingside?.checked)
        castling += "k";
    if (blackQueenside?.checked)
        castling += "q";
}
//# sourceMappingURL=position-controls.js.map