import { PLAYER_COLORS } from "./types.js";
import { parseFEN, toFEN, squareToCoords, coordsToSquare, getPieceAtSquareFromFEN, } from "./fen-utils.js";
import { PIECE_TYPES } from "./notation-utils.js";
/**
 * FEN Manipulation Functions
 *
 * Provides functions for manipulating FEN strings, including applying moves
 * and updating position state.
 */
export function applyLongMoveToFEN(fen, move) {
    const piece = getPieceAtSquareFromFEN(move.slice(0, 2), fen);
    const isKing = piece.toUpperCase() === "K";
    const from = move.slice(0, 2);
    const to = move.slice(2, 4);
    return applyMoveToFEN(fen, {
        from: move.slice(0, 2),
        to: move.slice(2, 4),
        piece,
        special: isKing &&
            ((from === "e1" && (to === "c1" || to === "g1")) ||
                (from === "e8" && (to === "c8" || to === "g8")))
            ? "castling"
            : undefined,
        rookFrom: to === "c1" ? "a1" : to === "g1" ? "h1" : to === "c8" ? "a8" : "h8",
        rookTo: to === "c1" ? "d1" : to === "g1" ? "f1" : to === "c8" ? "d8" : "f8",
    });
}
/**
 * Apply a chess move to a FEN string and return the new FEN
 */
export function applyMoveToFEN(fen, move) {
    const position = parseFEN(fen);
    const [fromRank, fromFile] = squareToCoords(move.from);
    const [toRank, toFile] = squareToCoords(move.to);
    // Create new board
    const newBoard = position.board.map((row) => [...row]);
    newBoard[toRank][toFile] = newBoard[fromRank][fromFile];
    newBoard[fromRank][fromFile] = "";
    // Handle special moves
    if (move.special === "castling") {
        if (move.rookFrom && move.rookTo) {
            const [rookFromRank, rookFromFile] = squareToCoords(move.rookFrom);
            const [rookToRank, rookToFile] = squareToCoords(move.rookTo);
            newBoard[rookToRank][rookToFile] = newBoard[rookFromRank][rookFromFile];
            newBoard[rookFromRank][rookFromFile] = "";
        }
    }
    // Auto-detect castling when king moves two squares, even if not explicitly marked
    else if (move.piece.toUpperCase() === PIECE_TYPES.KING) {
        const fromFileIndex = move.from.charCodeAt(0) - "a".charCodeAt(0);
        const toFileIndex = move.to.charCodeAt(0) - "a".charCodeAt(0);
        const fileDistance = Math.abs(toFileIndex - fromFileIndex);
        if (fileDistance === 2) {
            const isWhite = move.piece === move.piece.toUpperCase();
            const isKingside = toFileIndex > fromFileIndex;
            const rookFrom = isWhite
                ? isKingside
                    ? "h1"
                    : "a1"
                : isKingside
                    ? "h8"
                    : "a8";
            const rookTo = isWhite
                ? isKingside
                    ? "f1"
                    : "d1"
                : isKingside
                    ? "f8"
                    : "d8";
            const [rookFromRank, rookFromFile] = squareToCoords(rookFrom);
            const [rookToRank, rookToFile] = squareToCoords(rookTo);
            // Only move rook if it exists at the expected square
            if (newBoard[rookFromRank][rookFromFile]) {
                newBoard[rookToRank][rookToFile] = newBoard[rookFromRank][rookFromFile];
                newBoard[rookFromRank][rookFromFile] = "";
            }
        }
    }
    // Update castling rights
    let newCastling = position.castling;
    // Remove castling rights when king moves
    if (move.piece.toUpperCase() === PIECE_TYPES.KING) {
        if (move.piece === "K") {
            // White king moved
            newCastling = newCastling.replace(/[KQ]/g, "");
        }
        else {
            // Black king moved
            newCastling = newCastling.replace(/[kq]/g, "");
        }
    }
    // Remove castling rights when rooks move
    if (move.piece.toUpperCase() === PIECE_TYPES.ROOK) {
        if (move.from === "a1")
            newCastling = newCastling.replace("Q", "");
        if (move.from === "h1")
            newCastling = newCastling.replace("K", "");
        if (move.from === "a8")
            newCastling = newCastling.replace("q", "");
        if (move.from === "h8")
            newCastling = newCastling.replace("k", "");
    }
    // Update en passant
    let newEnPassant = null;
    if (move.piece.toUpperCase() === PIECE_TYPES.PAWN) {
        const [fromRank, fromFile] = squareToCoords(move.from);
        const [toRank, _toFile] = squareToCoords(move.to);
        // Check if it's a double pawn move
        if (Math.abs(fromRank - toRank) === 2) {
            const enPassantRank = fromRank + (toRank > fromRank ? 1 : -1);
            newEnPassant = coordsToSquare(enPassantRank, fromFile);
        }
    }
    else {
        // Clear en passant for non-pawn moves
        newEnPassant = null;
    }
    // Update position
    const newPosition = {
        ...position,
        board: newBoard,
        turn: position.turn === PLAYER_COLORS.WHITE
            ? PLAYER_COLORS.BLACK
            : PLAYER_COLORS.WHITE,
        castling: newCastling || "-",
        enPassant: newEnPassant,
    };
    return toFEN(newPosition);
}
//# sourceMappingURL=fen-manipulation.js.map