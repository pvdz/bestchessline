import { createPieceTypeNotation, createColorNotation, } from "./types.js";
import { parseFEN, toFEN, } from "./utils/fen-utils.js";
export function getPieceColor(piece) {
    return piece === piece.toUpperCase()
        ? createColorNotation("w")
        : createColorNotation("b");
}
export function getPieceType(piece) {
    return createPieceTypeNotation(piece.toUpperCase());
}
/**
 * Format a score with proper mate notation using mateIn
 * @param score The score in centipawns
 * @param mateIn The number of moves required for mate (0 if not a mate)
 * @returns Formatted score string
 */
export function formatScoreWithMateIn(score, mateIn) {
    if (mateIn > 0) {
        // Mate in X moves
        return score > 0 ? `+M${mateIn}` : `-M${mateIn}`;
    }
    else if (Math.abs(score) >= 10000) {
        // Mate but mateIn is 0 (shouldn't happen, but fallback. or maybe that's just the current board state? #)
        return score > 0 ? `+#` : `-#`;
    }
    else {
        // Regular score in pawns
        const scoreInPawns = score / 100;
        return score > 0
            ? `+${scoreInPawns.toFixed(1)}`
            : `${scoreInPawns.toFixed(1)}`;
    }
}
export function formatTime(ms) {
    if (ms < 1000)
        return `${ms}ms`;
    if (ms < 60000)
        return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
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
export function debounce(func, wait) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}
/**
 * Get the starting player from a FEN string
 */
export function getStartingPlayer(fen) {
    const position = parseFEN(fen);
    return position.turn;
}
/**
 * Show a toast notification
 * @param message The message to display
 * @param background The background color (default: #333)
 * @param duration How long to show (ms, default: 4000)
 */
export function showToast(message, background = "#333", duration = 4000) {
    const toast = document.createElement("div");
    toast.textContent = message;
    toast.style.position = "fixed";
    toast.style.bottom = "64px";
    toast.style.left = "50%";
    toast.style.transform = "translateX(-50%)";
    toast.style.background = background;
    toast.style.color = "#fff";
    toast.style.padding = "8px 16px";
    toast.style.borderRadius = "6px";
    toast.style.zIndex = "9999";
    toast.style.fontWeight = "bold";
    toast.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), duration);
}
//# sourceMappingURL=utils.js.map