/**
 * FEN Utility Functions
 *
 * Provides functions for parsing and manipulating FEN (Forsyth-Edwards Notation) strings,
 * coordinate conversion between chess squares and array indices, and square validation.
 */
/**
 * Parse a FEN string into a ChessPosition object
 */
export function parseFEN(fen) {
    if (typeof fen !== "string" || fen.trim() === "") {
        throw new Error("parseFEN(): FEN must be a non-empty string");
    }
    const parts = fen.trim().split(/\s+/);
    if (parts.length !== 6) {
        throw new Error(`parseFEN(): FEN must have exactly 6 fields: ${fen}`);
    }
    const boardPart = parts[0];
    const turnPart = parts[1];
    const castlingPart = parts[2];
    const enPassantPart = parts[3];
    const halfMovePart = parts[4];
    const fullMovePart = parts[5];
    if (turnPart !== "w" && turnPart !== "b") {
        throw new Error(`parseFEN(): active color must be 'w' or 'b': ${turnPart}`);
    }
    const turn = turnPart;
    // Validate castling availability: '-' or combination of KQkq without duplicates
    let castling = castlingPart;
    if (castling !== "-") {
        if (!/^[KQkq]+$/.test(castling)) {
            throw new Error(`parseFEN(): invalid castling availability: ${castling}`);
        }
        const set = new Set(castling.split(""));
        if (set.size !== castling.length) {
            throw new Error(`parseFEN(): duplicate castling flags: ${castling}`);
        }
    }
    // Validate en passant target square: '-' or a valid square on rank 3 (for black to move) or 6 (for white to move)
    let enPassant = null;
    if (enPassantPart !== "-") {
        // Whatever.
        // if (!isValidSquare(enPassantPart)) {
        //   throw new Error(
        //     `parseFEN(): invalid en passant square: ${enPassantPart}`,
        //   );
        // }
        // const rank = enPassantPart[1];
        // if (turn === "w" && rank !== "6") {
        //   throw new Error(
        //     `parseFEN(): en passant square must be on rank 6 when white to move: ${enPassantPart} on FEN ${fen}`,
        //   );
        // }
        // if (turn === "b" && rank !== "3") {
        //   throw new Error(
        //     `parseFEN(): en passant square must be on rank 3 when black to move: ${enPassantPart}`,
        //   );
        // }
        enPassant = enPassantPart;
    }
    // Validate half-move clock and full move number
    const halfMoveClock = Number(halfMovePart);
    const fullMoveNumber = Number(fullMovePart);
    if (!Number.isInteger(halfMoveClock) || halfMoveClock < 0) {
        throw new Error(`parseFEN(): halfmove clock must be a non-negative integer: ${halfMovePart}`);
    }
    if (!Number.isInteger(fullMoveNumber) || fullMoveNumber < 1) {
        throw new Error(`parseFEN(): fullmove number must be a positive integer: ${fullMovePart}`);
    }
    // Parse board
    const ranks = boardPart.split("/");
    if (ranks.length !== 8) {
        throw new Error(`parseFEN(): board must have 8 ranks: ${boardPart}`);
    }
    const board = Array.from({ length: 8 }, () => Array(8).fill(""));
    const allowedPieces = new Set([
        "p",
        "n",
        "b",
        "r",
        "q",
        "k",
        "P",
        "N",
        "B",
        "R",
        "Q",
        "K",
    ]);
    let whiteKing = 0;
    let blackKing = 0;
    for (let r = 0; r < 8; r++) {
        const row = ranks[r];
        let file = 0;
        for (let i = 0; i < row.length; i++) {
            const ch = row[i];
            if (ch >= "1" && ch <= "8") {
                file += Number(ch);
                if (file > 8) {
                    throw new Error(`parseFEN(): rank ${r + 1} overflows 8 files`);
                }
            }
            else {
                if (!allowedPieces.has(ch)) {
                    throw new Error(`parseFEN(): invalid piece '${ch}' in board`);
                }
                if (file >= 8) {
                    throw new Error(`parseFEN(): too many files in rank ${r + 1}`);
                }
                board[r][file] = ch;
                if (ch === "K")
                    whiteKing++;
                else if (ch === "k")
                    blackKing++;
                file++;
            }
        }
        if (file !== 8) {
            throw new Error(`parseFEN(): rank ${r + 1} does not fill 8 files`);
        }
    }
    if (whiteKing !== 1 || blackKing !== 1) {
        throw new Error(`parseFEN(): expected exactly one white king and one black king (found K=${whiteKing}, k=${blackKing})`);
    }
    return { board, turn, castling, enPassant, halfMoveClock, fullMoveNumber };
}
/**
 * Convert a ChessPosition object to a FEN string
 */
export function toFEN(position) {
    let fen = "";
    // Board
    for (let rank = 0; rank < 8; rank++) {
        let emptyCount = 0;
        for (let file = 0; file < 8; file++) {
            const piece = position.board[rank][file];
            if (piece === "") {
                emptyCount++;
            }
            else {
                if (emptyCount > 0) {
                    fen += emptyCount;
                    emptyCount = 0;
                }
                fen += piece;
            }
        }
        if (emptyCount > 0) {
            fen += emptyCount;
        }
        if (rank < 7)
            fen += "/";
    }
    // Turn
    fen += ` ${position.turn}`;
    // Castling
    fen += ` ${position.castling}`;
    // En passant
    fen += ` ${position.enPassant || "-"}`;
    // Half move clock
    fen += ` ${position.halfMoveClock}`;
    // Full move number
    fen += ` ${position.fullMoveNumber}`;
    return fen;
}
/**
 * Convert a chess square (e.g., "e4") to array coordinates [rank, file]
 */
export function squareToCoords(square) {
    const file = square.charCodeAt(0) - "a".charCodeAt(0);
    const rank = 8 - parseInt(square[1]);
    return [rank, file];
}
/**
 * Convert array coordinates [rank, file] to a chess square (e.g., "e4")
 */
export function coordsToSquare(rank, file) {
    const fileChar = String.fromCharCode("a".charCodeAt(0) + file);
    const rankChar = (8 - rank).toString();
    return `${fileChar}${rankChar}`;
}
/**
 * Check if a string is a valid chess square
 */
export function isValidSquare(square) {
    if (square.length !== 2)
        return false;
    const file = square[0];
    const rank = square[1];
    return file >= "a" && file <= "h" && rank >= "1" && rank <= "8";
}
/**
 * Get piece at a specific square from FEN string
 */
export function getPieceAtSquareFromFEN(square, fen) {
    const position = parseFEN(fen);
    const [rank, file] = squareToCoords(square);
    return position.board[rank][file];
}
/**
 * Verify FEN encoding invariants (lightweight):
 * - Correct 6 fields and basic syntax (delegates to parseFEN)
 * - En-passant square is either '-' or empty and on the correct rank
 * - Optional: if en-passant set, there exists a capturable pawn scenario
 */
export function verifyFenEncoding(fen, options = {}) {
    const errors = [];
    let pos;
    try {
        pos = parseFEN(fen);
    }
    catch (e) {
        errors.push(e?.message || String(e));
        return { ok: false, errors };
    }
    // En-passant basic rank/location rule
    const ep = pos.enPassant;
    if (ep && ep !== "-") {
        if (!isValidSquare(ep)) {
            errors.push(`En-passant square '${ep}' is not a valid square`);
        }
        else {
            const [er, ef] = squareToCoords(ep);
            const epRank = 8 - Number(ep[1]);
            // White to move => black just moved => ep must be on rank 6 (from white POV => ep[1] === '6')
            // Black to move => white just moved => ep rank should be 3
            const expectedRank = pos.turn === "w" ? "6" : "3";
            if (ep[1] !== expectedRank) {
                errors.push(`En-passant '${ep}' has unexpected rank for turn '${pos.turn}' (expected rank ${expectedRank})`);
            }
            // EP square must be empty
            if (pos.board[er][ef] !== "") {
                errors.push(`En-passant target square '${ep}' is not empty`);
            }
            if (options.strictEnPassant) {
                // There should be an opponent pawn that just advanced two and a side-to-move pawn adjacent that can capture
                // Identify the pawn that moved (behind ep square from mover's perspective)
                // When white to move: black pawn moved from rank 7 to 5; ep target is on rank 6; pawn stands on rank 5 at same file
                const movedPawnRank = pos.turn === "w" ? epRank + 1 : epRank - 1;
                const movedPawnSquare = coordsToSquare(movedPawnRank, ef);
                const movedPawn = pos.board[movedPawnRank][ef];
                const expectedPawn = pos.turn === "w" ? "p" : "P";
                if (movedPawn !== expectedPawn) {
                    errors.push(`Strict EP: expected moved pawn ${expectedPawn} at ${movedPawnSquare}, found '${movedPawn || ""}'`);
                }
                // Check there is a side-to-move pawn adjacent that can capture onto ep square
                const sidePawn = pos.turn === "w" ? "P" : "p";
                const candidateFiles = [ef - 1, ef + 1].filter((f) => f >= 0 && f < 8);
                const capturerExists = candidateFiles.some((f) => {
                    const [cr, cf] = pos.turn === "w" ? [er + 1, f] : [er - 1, f];
                    if (cr < 0 || cr > 7)
                        return false;
                    return pos.board[cr][cf] === sidePawn;
                });
                if (!capturerExists) {
                    errors.push(`Strict EP: no ${sidePawn} adjacent pawn can capture onto '${ep}'`);
                }
            }
        }
    }
    return { ok: errors.length === 0, errors };
}
//# sourceMappingURL=fen-utils.js.map