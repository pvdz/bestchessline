import { createPieceTypeNotation, createPieceNotation, getPieceTypeFromNotation, getColorFromNotation, PLAYER_COLORS, } from "../line/types.js";
import { getPieceColor, getPieceType } from "./utils.js";
import { parseFEN, squareToCoords, coordsToSquare, isValidSquare, } from "./fen-utils.js";
// Constants for piece types
export const PIECES = {
    WHITE_KING: createPieceNotation("K"),
    WHITE_QUEEN: createPieceNotation("Q"),
    WHITE_ROOK: createPieceNotation("R"),
    WHITE_BISHOP: createPieceNotation("B"),
    WHITE_KNIGHT: createPieceNotation("N"),
    WHITE_PAWN: createPieceNotation("P"),
    BLACK_KING: createPieceNotation("k"),
    BLACK_QUEEN: createPieceNotation("q"),
    BLACK_ROOK: createPieceNotation("r"),
    BLACK_BISHOP: createPieceNotation("b"),
    BLACK_KNIGHT: createPieceNotation("n"),
    BLACK_PAWN: createPieceNotation("p"),
};
// Constants for piece types (uppercase, used for type matching)
export const PIECE_TYPES = {
    KING: createPieceTypeNotation("K"),
    QUEEN: createPieceTypeNotation("Q"),
    ROOK: createPieceTypeNotation("R"),
    BISHOP: createPieceTypeNotation("B"),
    KNIGHT: createPieceTypeNotation("N"),
    PAWN: createPieceTypeNotation("P"),
};
/**
 * Validates a chess move and determines its effects
 */
export function validateMove(position, move) {
    // Basic validation
    if (!isValidSquare(move.from) || !isValidSquare(move.to)) {
        return {
            isValid: false,
            effect: createEmptyEffect(),
            error: "Invalid square coordinates",
        };
    }
    const [fromRank, fromFile] = squareToCoords(move.from);
    // Check if source square has a piece
    const sourcePiece = position.board[fromRank][fromFile];
    if (!sourcePiece) {
        return {
            isValid: false,
            effect: createEmptyEffect(),
            error: "No piece at source square",
        };
    }
    // Check if it's the correct player's turn
    const pieceColor = getPieceColor(createPieceNotation(sourcePiece));
    if (pieceColor !== position.turn) {
        return {
            isValid: false,
            effect: createEmptyEffect(),
            error: "Not your turn",
        };
    }
    // Check if the move is legal for the piece type
    const isLegal = isLegalMove(position, move);
    if (!isLegal) {
        return {
            isValid: false,
            effect: createEmptyEffect(),
            error: "Illegal move for piece type",
        };
    }
    // Apply the move to get the resulting position
    const newPosition = applyMove(position, move);
    // Check if the move leaves the king in check (illegal)
    if (isKingInCheck(newPosition, position.turn)) {
        return {
            isValid: false,
            effect: createEmptyEffect(),
            error: "Move would leave king in check",
        };
    }
    // Determine the effects of the move
    const effect = determineMoveEffect(position, move, newPosition);
    return {
        isValid: true,
        effect,
    };
}
/**
 * Creates an empty move effect
 */
function createEmptyEffect() {
    return {
        isCapture: false,
        isCheck: false,
        isMate: false,
        isEnPassant: false,
    };
}
/**
 * Checks if a move is legal for the piece type (basic rules only)
 */
function isLegalMove(position, move) {
    const [fromRank, fromFile] = squareToCoords(move.from);
    const [toRank, toFile] = squareToCoords(move.to);
    const piece = position.board[fromRank][fromFile];
    const pieceType = getPieceType(createPieceNotation(piece));
    const pieceColor = getPieceColor(createPieceNotation(piece));
    if (!pieceType || !pieceColor) {
        return false;
    }
    // Check if target square is occupied by same color piece
    const targetPiece = position.board[toRank][toFile];
    if (targetPiece &&
        getPieceColor(createPieceNotation(targetPiece)) === pieceColor) {
        return false;
    }
    // Check if target square contains a king (illegal to capture king)
    if (targetPiece &&
        (targetPiece === PIECES.WHITE_KING || targetPiece === PIECES.BLACK_KING)) {
        return false;
    }
    // Handle castling
    if (move.special === "castling") {
        return isLegalCastlingMove(position, move);
    }
    // Use pieceType for switch statement (uppercase for both colors)
    switch (pieceType) {
        case PIECE_TYPES.PAWN:
            return isLegalPawnMove(position, move);
        case PIECE_TYPES.ROOK:
            return isLegalRookMove(position, move);
        case PIECE_TYPES.KNIGHT:
            return isLegalKnightMove(position, move);
        case PIECE_TYPES.BISHOP:
            return isLegalBishopMove(position, move);
        case PIECE_TYPES.QUEEN:
            return isLegalQueenMove(position, move);
        case PIECE_TYPES.KING:
            return isLegalKingMove(position, move);
        default:
            return false;
    }
}
/**
 * Checks if a pawn move is legal
 */
function isLegalPawnMove(position, move) {
    const [fromRank, fromFile] = squareToCoords(move.from);
    const [toRank, toFile] = squareToCoords(move.to);
    const piece = position.board[fromRank][fromFile];
    const color = getPieceColor(createPieceNotation(piece));
    const direction = color === PLAYER_COLORS.WHITE ? -1 : 1; // White moves up (decreasing rank), black moves down
    const rankDiff = toRank - fromRank;
    const fileDiff = Math.abs(toFile - fromFile);
    // Forward move
    if (fileDiff === 0) {
        // Single square move
        if (rankDiff === direction) {
            return position.board[toRank][toFile] === "";
        }
        // Double square move from starting position
        if (rankDiff === 2 * direction) {
            const startRank = color === PLAYER_COLORS.WHITE ? 6 : 1;
            if (fromRank === startRank) {
                const middleRank = fromRank + direction;
                return (position.board[middleRank][toFile] === "" &&
                    position.board[toRank][toFile] === "");
            }
        }
        return false;
    }
    // Diagonal move (capture or en passant)
    if (fileDiff === 1 && rankDiff === direction) {
        // Normal capture
        if (position.board[toRank][toFile] !== "") {
            return true;
        }
        // En passant
        if (position.enPassant === move.to) {
            const capturedRank = fromRank;
            const capturedFile = toFile;
            const capturedPiece = position.board[capturedRank][capturedFile];
            return (capturedPiece !== "" &&
                getPieceColor(createPieceNotation(capturedPiece)) !== color);
        }
    }
    return false;
}
/**
 * Checks if a rook move is legal
 */
function isLegalRookMove(position, move) {
    const [fromRank, fromFile] = squareToCoords(move.from);
    const [toRank, toFile] = squareToCoords(move.to);
    // Rook moves horizontally or vertically
    if (fromRank !== toRank && fromFile !== toFile) {
        return false;
    }
    // Check path is clear
    return isPathClear(position, fromRank, fromFile, toRank, toFile);
}
/**
 * Checks if a knight move is legal
 */
function isLegalKnightMove(_position, move) {
    const [fromRank, fromFile] = squareToCoords(move.from);
    const [toRank, toFile] = squareToCoords(move.to);
    const rankDiff = Math.abs(toRank - fromRank);
    const fileDiff = Math.abs(toFile - fromFile);
    // Knight moves in L-shape: 2 squares in one direction, 1 square perpendicular
    const isValidKnightMove = (rankDiff === 2 && fileDiff === 1) || (rankDiff === 1 && fileDiff === 2);
    return isValidKnightMove;
}
/**
 * Checks if a bishop move is legal
 */
function isLegalBishopMove(position, move) {
    const [fromRank, fromFile] = squareToCoords(move.from);
    const [toRank, toFile] = squareToCoords(move.to);
    // Bishop moves diagonally
    if (Math.abs(toRank - fromRank) !== Math.abs(toFile - fromFile)) {
        return false;
    }
    // Check path is clear
    return isPathClear(position, fromRank, fromFile, toRank, toFile);
}
/**
 * Checks if a queen move is legal
 */
function isLegalQueenMove(position, move) {
    const [fromRank, fromFile] = squareToCoords(move.from);
    const [toRank, toFile] = squareToCoords(move.to);
    // Queen moves like rook or bishop
    const rankDiff = Math.abs(toRank - fromRank);
    const fileDiff = Math.abs(toFile - fromFile);
    // Horizontal or vertical move (like rook)
    if (fromRank === toRank || fromFile === toFile) {
        return isPathClear(position, fromRank, fromFile, toRank, toFile);
    }
    // Diagonal move (like bishop)
    if (rankDiff === fileDiff) {
        return isPathClear(position, fromRank, fromFile, toRank, toFile);
    }
    return false;
}
/**
 * Checks if a king move is legal
 */
function isLegalKingMove(_position, move) {
    const [fromRank, fromFile] = squareToCoords(move.from);
    const [toRank, toFile] = squareToCoords(move.to);
    const rankDiff = Math.abs(toRank - fromRank);
    const fileDiff = Math.abs(toFile - fromFile);
    // King moves one square in any direction
    if (rankDiff <= 1 && fileDiff <= 1) {
        return true;
    }
    // Castling (simplified - would need more complex logic for full implementation)
    if (rankDiff === 0 && fileDiff === 2) {
        // This is a basic check - full castling validation would be more complex
        // For now, only allow castling if it's explicitly marked as a castling move
        if (move.special === "castling") {
            return true;
        }
        return false;
    }
    return false;
}
/**
 * Checks if a castling move is legal
 */
function isLegalCastlingMove(position, move) {
    // Simplified castling check - in a real implementation, you'd check:
    // 1. King and rook haven't moved
    // 2. No pieces between king and rook
    // 3. King not in check
    // 4. King doesn't pass through check
    if (!move.rookFrom || !move.rookTo)
        return false;
    const [kingFromRank, kingFromFile] = squareToCoords(move.from);
    const [rookFromRank, rookFromFile] = squareToCoords(move.rookFrom);
    // Check that king and rook are in correct positions
    const kingPiece = position.board[kingFromRank][kingFromFile];
    const rookPiece = position.board[rookFromRank][rookFromFile];
    if (!kingPiece || !rookPiece)
        return false;
    const kingColor = getPieceColor(createPieceNotation(kingPiece));
    const rookColor = getPieceColor(createPieceNotation(rookPiece));
    if (kingColor !== rookColor)
        return false;
    // For now, just check that the move is to the expected squares
    return true;
}
/**
 * Checks if the path between two squares is clear
 */
function isPathClear(position, fromRank, fromFile, toRank, toFile) {
    // If it's the same square, no path to check
    if (fromRank === toRank && fromFile === toFile) {
        return true;
    }
    const rankStep = fromRank === toRank ? 0 : (toRank - fromRank) / Math.abs(toRank - fromRank);
    const fileStep = fromFile === toFile ? 0 : (toFile - fromFile) / Math.abs(toFile - fromFile);
    let currentRank = fromRank + rankStep;
    let currentFile = fromFile + fileStep;
    // Check each square along the path (excluding the destination square)
    while (currentRank !== toRank || currentFile !== toFile) {
        if (position.board[currentRank][currentFile] !== "") {
            return false;
        }
        currentRank += rankStep;
        currentFile += fileStep;
    }
    return true;
}
/**
 * Applies a move to a position and returns the new position
 */
function applyMove(position, move) {
    const newPosition = {
        board: position.board.map((row) => [...row]),
        turn: position.turn === PLAYER_COLORS.WHITE
            ? PLAYER_COLORS.BLACK
            : PLAYER_COLORS.WHITE,
        castling: position.castling,
        enPassant: null,
        halfMoveClock: position.halfMoveClock + 1,
        fullMoveNumber: position.fullMoveNumber,
    };
    const [fromRank, fromFile] = squareToCoords(move.from);
    const [toRank, toFile] = squareToCoords(move.to);
    // Move the piece
    const piece = newPosition.board[fromRank][fromFile];
    newPosition.board[fromRank][fromFile] = "";
    // Move the piece
    newPosition.board[toRank][toFile] = piece;
    // Handle en passant capture
    if (move.special === "en-passant" && move.capturedSquare) {
        const [capturedRank, capturedFile] = squareToCoords(move.capturedSquare);
        newPosition.board[capturedRank][capturedFile] = "";
    }
    // Handle castling
    if (move.special === "castling" && move.rookFrom && move.rookTo) {
        const [rookFromRank, rookFromFile] = squareToCoords(move.rookFrom);
        const [rookToRank, rookToFile] = squareToCoords(move.rookTo);
        const rook = newPosition.board[rookFromRank][rookFromFile];
        newPosition.board[rookFromRank][rookFromFile] = "";
        newPosition.board[rookToRank][rookToFile] = rook;
    }
    // Update en passant square for double pawn push
    const pieceType = getPieceType(createPieceNotation(piece));
    if (pieceType === PIECE_TYPES.PAWN) {
        const rankDiff = Math.abs(toRank - fromRank);
        if (rankDiff === 2) {
            const enPassantRank = fromRank + (toRank - fromRank) / 2;
            newPosition.enPassant = coordsToSquare(enPassantRank, fromFile);
        }
    }
    // Update full move number
    if (position.turn === "b") {
        newPosition.fullMoveNumber++;
    }
    return newPosition;
}
/**
 * Checks if a king is in check
 */
function isKingInCheck(position, color) {
    // Find the king
    const kingSquare = findKing(position, color);
    if (!kingSquare)
        return false;
    // Check if any opponent piece can attack the king
    const opponentColor = color === "w" ? "b" : "w";
    for (let rank = 0; rank < 8; rank++) {
        for (let file = 0; file < 8; file++) {
            const piece = position.board[rank][file];
            if (piece &&
                getPieceColor(createPieceNotation(piece)) === opponentColor) {
                // Add debugging to see what pieces are being found
                const pieceType = getPieceType(createPieceNotation(piece));
                if (pieceType) {
                    // For check detection, we need to allow moves to the king's square
                    // Create a temporary move validation that bypasses king capture prevention
                    const pieceNotation = createPieceNotation(piece);
                    const canAttackKing = canPieceAttackSquare(position, pieceNotation, coordsToSquare(rank, file), kingSquare);
                    if (canAttackKing) {
                        return true;
                    }
                }
            }
        }
    }
    return false;
}
/**
 * Checks if a piece can attack a square (for check detection)
 * This function bypasses king capture prevention
 */
function canPieceAttackSquare(position, piece, fromSquare, toSquare) {
    const [_fromRank, fromFile] = squareToCoords(fromSquare);
    const [toRank, toFile] = squareToCoords(toSquare);
    const pieceType = getPieceTypeFromNotation(piece);
    const color = getColorFromNotation(piece);
    if (!pieceType || !color) {
        return false;
    }
    // Check if target square has own piece (but allow king capture for check detection)
    const targetPiece = position.board[toRank][toFile];
    if (targetPiece &&
        getPieceColor(createPieceNotation(targetPiece)) === color &&
        targetPiece !== PIECES.BLACK_KING &&
        targetPiece !== PIECES.WHITE_KING) {
        return false;
    }
    // Handle castling
    if ((piece === PIECES.WHITE_KING || piece === PIECES.BLACK_KING) &&
        Math.abs(toFile - fromFile) === 2) {
        return false; // Castling is not an attack
    }
    // Use pieceType for switch statement (uppercase for both colors)
    switch (pieceType) {
        case PIECE_TYPES.PAWN:
            return canPawnAttackSquare(position, piece, fromSquare, toSquare);
        case PIECE_TYPES.ROOK:
            return canRookAttackSquare(position, fromSquare, toSquare);
        case PIECE_TYPES.KNIGHT:
            return canKnightAttackSquare(fromSquare, toSquare);
        case PIECE_TYPES.BISHOP:
            return canBishopAttackSquare(position, fromSquare, toSquare);
        case PIECE_TYPES.QUEEN:
            return canQueenAttackSquare(position, fromSquare, toSquare);
        case PIECE_TYPES.KING:
            return canKingAttackSquare(fromSquare, toSquare);
        default:
            return false;
    }
}
/**
 * Checks if a knight can attack a square
 */
function canKnightAttackSquare(fromSquare, toSquare) {
    const [fromRank, fromFile] = squareToCoords(fromSquare);
    const [toRank, toFile] = squareToCoords(toSquare);
    const rankDiff = Math.abs(toRank - fromRank);
    const fileDiff = Math.abs(toFile - fromFile);
    // Knight moves in L-shape: 2 squares in one direction, 1 square perpendicular
    return ((rankDiff === 2 && fileDiff === 1) || (rankDiff === 1 && fileDiff === 2));
}
/**
 * Checks if a king can attack a square
 */
function canKingAttackSquare(fromSquare, toSquare) {
    const [fromRank, fromFile] = squareToCoords(fromSquare);
    const [toRank, toFile] = squareToCoords(toSquare);
    const rankDiff = Math.abs(toRank - fromRank);
    const fileDiff = Math.abs(toFile - fromFile);
    // King moves one square in any direction
    return rankDiff <= 1 && fileDiff <= 1 && (rankDiff !== 0 || fileDiff !== 0);
}
/**
 * Checks if a rook can attack a square
 */
function canRookAttackSquare(position, fromSquare, toSquare) {
    const [fromRank, fromFile] = squareToCoords(fromSquare);
    const [toRank, toFile] = squareToCoords(toSquare);
    // Rook moves horizontally or vertically
    if (fromRank !== toRank && fromFile !== toFile) {
        return false;
    }
    // Check path is clear
    return isPathClear(position, fromRank, fromFile, toRank, toFile);
}
/**
 * Checks if a bishop can attack a square
 */
function canBishopAttackSquare(position, fromSquare, toSquare) {
    const [fromRank, fromFile] = squareToCoords(fromSquare);
    const [toRank, toFile] = squareToCoords(toSquare);
    // Bishop moves diagonally
    if (Math.abs(toRank - fromRank) !== Math.abs(toFile - fromFile)) {
        return false;
    }
    // Check path is clear
    return isPathClear(position, fromRank, fromFile, toRank, toFile);
}
/**
 * Checks if a queen can attack a square
 */
function canQueenAttackSquare(position, fromSquare, toSquare) {
    const [fromRank, fromFile] = squareToCoords(fromSquare);
    const [toRank, toFile] = squareToCoords(toSquare);
    // Queen moves like rook or bishop
    const rankDiff = Math.abs(toRank - fromRank);
    const fileDiff = Math.abs(toFile - fromFile);
    // Horizontal or vertical move (like rook)
    if (fromRank === toRank || fromFile === toFile) {
        return isPathClear(position, fromRank, fromFile, toRank, toFile);
    }
    // Diagonal move (like bishop)
    if (rankDiff === fileDiff) {
        return isPathClear(position, fromRank, fromFile, toRank, toFile);
    }
    return false;
}
/**
 * Checks if a pawn can attack a square
 */
function canPawnAttackSquare(position, piece, fromSquare, toSquare) {
    const [fromRank, fromFile] = squareToCoords(fromSquare);
    const [toRank, toFile] = squareToCoords(toSquare);
    const color = getColorFromNotation(piece);
    const direction = color === PLAYER_COLORS.WHITE ? -1 : 1; // White moves up (decreasing rank), black moves down
    const rankDiff = toRank - fromRank;
    const fileDiff = Math.abs(toFile - fromFile);
    // Pawns can only attack diagonally
    if (fileDiff !== 1 || rankDiff !== direction) {
        return false;
    }
    // Check if there's a piece to capture (including king for check detection)
    const targetPiece = position.board[toRank][toFile];
    return targetPiece !== "";
}
/**
 * Finds the square of a king of the given color
 */
function findKing(position, color) {
    const kingPiece = color === PLAYER_COLORS.WHITE ? PIECES.WHITE_KING : PIECES.BLACK_KING;
    for (let rank = 0; rank < 8; rank++) {
        for (let file = 0; file < 8; file++) {
            if (position.board[rank][file] === kingPiece) {
                return coordsToSquare(rank, file);
            }
        }
    }
    return null;
}
/**
 * Determines the effects of a move
 */
function determineMoveEffect(originalPosition, move, newPosition) {
    const effect = {
        isCapture: false,
        isCheck: false,
        isMate: false,
        isEnPassant: false,
    };
    // Check for capture
    const [toRank, toFile] = squareToCoords(move.to);
    const capturedPiece = originalPosition.board[toRank][toFile];
    if (capturedPiece && capturedPiece !== "") {
        // Don't count king capture as a valid capture
        if (capturedPiece !== PIECES.WHITE_KING &&
            capturedPiece !== PIECES.BLACK_KING) {
            effect.isCapture = true;
            effect.capturedPiece = capturedPiece;
            effect.capturedSquare = move.to;
        }
    }
    // Check for en passant
    if (move.special === "en-passant" ||
        (originalPosition.enPassant === move.to &&
            getPieceType(createPieceNotation(move.piece)) === PIECE_TYPES.PAWN)) {
        effect.isEnPassant = true;
        effect.isCapture = true;
        if (move.capturedSquare) {
            effect.capturedSquare = move.capturedSquare;
            const [capturedRank, capturedFile] = squareToCoords(move.capturedSquare);
            effect.capturedPiece = originalPosition.board[capturedRank][capturedFile];
        }
    }
    // Check for check/mate
    const opponentColor = originalPosition.turn === PLAYER_COLORS.WHITE
        ? PLAYER_COLORS.BLACK
        : PLAYER_COLORS.WHITE;
    const kingInCheck = isKingInCheck(newPosition, opponentColor);
    effect.isCheck = kingInCheck;
    if (effect.isCheck) {
        effect.isMate = isCheckMate(newPosition, opponentColor);
    }
    return effect;
}
/**
 * Checks if a position is checkmate (simplified implementation)
 */
function isCheckMate(position, color) {
    // Check if the king is in check
    if (!isKingInCheck(position, color)) {
        return false;
    }
    // Check if the king can move to escape check
    const kingSquare = findKing(position, color);
    if (!kingSquare)
        return true;
    const [kingRank, kingFile] = squareToCoords(kingSquare);
    // Check all 8 possible king moves
    for (let dRank = -1; dRank <= 1; dRank++) {
        for (let dFile = -1; dFile <= 1; dFile++) {
            if (dRank === 0 && dFile === 0)
                continue;
            const newRank = kingRank + dRank;
            const newFile = kingFile + dFile;
            if (newRank >= 0 && newRank < 8 && newFile >= 0 && newFile < 8) {
                const targetPiece = position.board[newRank][newFile];
                // Check if the target square is safe (no opponent piece or own piece)
                if (!targetPiece ||
                    getPieceColor(createPieceNotation(targetPiece)) !== color) {
                    // Create a king move to test
                    const kingMove = {
                        from: kingSquare,
                        to: coordsToSquare(newRank, newFile),
                        piece: color === PLAYER_COLORS.WHITE
                            ? PIECES.WHITE_KING
                            : PIECES.BLACK_KING,
                    };
                    // Validate the king move
                    const moveValidation = validateMove(position, kingMove);
                    if (moveValidation.isValid) {
                        // Check if this move would capture the opponent's king (illegal)
                        if (targetPiece &&
                            (targetPiece === PIECES.WHITE_KING ||
                                targetPiece === PIECES.BLACK_KING)) {
                            // Skip moves that would capture the king
                            continue;
                        }
                        // Create a temporary position to test the move
                        const tempPosition = {
                            board: position.board.map((row) => [...row]),
                            turn: color,
                            castling: position.castling,
                            enPassant: position.enPassant,
                            halfMoveClock: position.halfMoveClock,
                            fullMoveNumber: position.fullMoveNumber,
                        };
                        tempPosition.board[kingRank][kingFile] = "";
                        tempPosition.board[newRank][newFile] =
                            color === PLAYER_COLORS.WHITE
                                ? PIECES.WHITE_KING
                                : PIECES.BLACK_KING;
                        if (!isKingInCheck(tempPosition, color)) {
                            return false; // King can escape
                        }
                    }
                }
            }
        }
    }
    for (let rank = 0; rank < 8; rank++) {
        for (let file = 0; file < 8; file++) {
            const piece = position.board[rank][file];
            if (piece && getPieceColor(createPieceNotation(piece)) === color) {
                const fromSquare = coordsToSquare(rank, file);
                // Check all possible target squares
                for (let toRank = 0; toRank < 8; toRank++) {
                    for (let toFile = 0; toFile < 8; toFile++) {
                        const toSquare = coordsToSquare(toRank, toFile);
                        const pieceType = getPieceType(createPieceNotation(piece));
                        if (pieceType) {
                            const move = {
                                from: fromSquare,
                                to: toSquare,
                                piece: piece, // Use the actual piece, not the type
                            };
                            // Test if this move can escape check
                            // First validate that this move is legal
                            const moveValidation = validateMove(position, move);
                            if (moveValidation.isValid) {
                                // Check if this move would capture the opponent's king (illegal)
                                const targetPiece = position.board[toRank][toFile];
                                if (targetPiece &&
                                    (targetPiece === PIECES.WHITE_KING ||
                                        targetPiece === PIECES.BLACK_KING)) {
                                    // Skip moves that would capture the king
                                    continue;
                                }
                                const tempPosition = applyMove(position, move);
                                if (!isKingInCheck(tempPosition, color)) {
                                    return false; // Found an escape move
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    // If we get here, no escape is possible - it's checkmate
    return true;
}
/**
 * Validates a move and returns detailed information about its effects
 */
export function analyzeMove(fen, move) {
    const position = parseFEN(fen);
    return validateMove(position, move);
}
/**
 * Gets all legal moves for a position (simplified)
 */
export function getLegalMoves(position) {
    const moves = [];
    for (let rank = 0; rank < 8; rank++) {
        for (let file = 0; file < 8; file++) {
            const piece = position.board[rank][file];
            if (piece &&
                getPieceColor(createPieceNotation(piece)) === position.turn) {
                const fromSquare = coordsToSquare(rank, file);
                // Check all possible target squares
                for (let toRank = 0; toRank < 8; toRank++) {
                    for (let toFile = 0; toFile < 8; toFile++) {
                        const toSquare = coordsToSquare(toRank, toFile);
                        const move = {
                            from: fromSquare,
                            to: toSquare,
                            piece: piece,
                        };
                        const result = validateMove(position, move);
                        if (result.isValid) {
                            moves.push(move);
                        }
                    }
                }
            }
        }
    }
    return moves;
}
//# sourceMappingURL=move-validator.js.map