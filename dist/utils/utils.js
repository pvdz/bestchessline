import { createPieceTypeNotation, createColorNotation, } from "../line/types.js";
import { parseFEN, toFEN } from "./fen-utils.js";
import { getElementByIdOrThrow } from "./dom-helpers.js";
export function getPieceColor(piece) {
    return piece === piece.toUpperCase()
        ? createColorNotation("w")
        : createColorNotation("b");
}
export function getPieceType(piece) {
    return createPieceTypeNotation(piece.toUpperCase());
}
// Global variable to store current move index
let globalCurrentMoveIndex = -1;
/**
 * Set the global current move index
 */
export function setGlobalCurrentMoveIndex(moveIndex) {
    globalCurrentMoveIndex = moveIndex;
}
/**
 * Get the global current move index
 */
export function getGlobalCurrentMoveIndex() {
    return globalCurrentMoveIndex;
}
/**
 * Get FEN with correct move counter based on current move index
 */
export function getFENWithCorrectMoveCounter(boardFEN, currentMoveIndex, castling, enPassant) {
    const position = parseFEN(boardFEN);
    // Calculate the correct move number based on current move index
    const correctMoveNumber = Math.floor(currentMoveIndex / 2) + 1;
    // Create new position with correct move number and optional castling/en-passant
    const correctedPosition = {
        ...position,
        fullMoveNumber: correctMoveNumber,
        castling: castling !== undefined ? castling : position.castling,
        enPassant: enPassant !== undefined ? enPassant : position.enPassant,
    };
    return toFEN(correctedPosition);
}
/**
 * Get the starting player from a FEN string
 */
export function getStartingPlayer(fen) {
    const position = parseFEN(fen);
    return position.turn;
}
let paused = false;
function setContinueButtonEnabled(enabled) {
    const btn = getElementByIdOrThrow("fish-continue");
    btn.disabled = !enabled;
}
export async function pauseUntilButton() {
    paused = true;
    setContinueButtonEnabled(true);
    console.log("paused");
    return new Promise((resolve) => {
        setInterval(() => {
            if (!paused)
                resolve();
        }, 250);
    });
}
export function unpause() {
    console.log("unpaused");
    paused = false;
    setContinueButtonEnabled(false);
}
//# sourceMappingURL=utils.js.map