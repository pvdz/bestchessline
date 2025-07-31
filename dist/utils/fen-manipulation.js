import { PLAYER_COLORS } from "../types.js";
import { parseFEN, toFEN, squareToCoords, coordsToSquare, } from "./fen-utils.js";
import { PIECE_TYPES } from "./notation-utils.js";
/**
 * FEN Manipulation Functions
 *
 * Provides functions for manipulating FEN strings, including applying moves
 * and updating position state.
 */
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
        const [toRank, toFile] = squareToCoords(move.to);
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