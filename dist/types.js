// Player color constants to avoid magic literals
export const PLAYER_COLORS = {
    WHITE: "w",
    BLACK: "b",
};
// ============================================================================
// TYPE GUARDS FOR PIECE NOTATIONS
// ============================================================================
export function isPieceTypeNotation(value) {
    return /^[PNBRQK]$/.test(value);
}
export function isColorNotation(value) {
    return value === "w" || value === "b";
}
export function isPieceNotation(value) {
    return /^[PNBRQKpnbrqk]$/.test(value);
}
export function isWhitePieceNotation(value) {
    return /^[PNBRQK]$/.test(value);
}
export function isBlackPieceNotation(value) {
    return /^[pnbrqk]$/.test(value);
}
// ============================================================================
// CONSTRUCTOR FUNCTIONS FOR PIECE NOTATIONS
// ============================================================================
export function createPieceTypeNotation(value) {
    if (!isPieceTypeNotation(value)) {
        throw new Error(`Invalid piece type notation: ${value}`);
    }
    return value;
}
export function createColorNotation(value) {
    if (!isColorNotation(value)) {
        throw new Error(`Invalid color notation: ${value}`);
    }
    return value;
}
export function createPieceNotation(value) {
    if (!isPieceNotation(value)) {
        throw new Error(`Invalid piece notation: ${value}`);
    }
    return value;
}
export function createWhitePieceNotation(value) {
    if (!isWhitePieceNotation(value)) {
        throw new Error(`Invalid white piece notation: ${value}`);
    }
    return value;
}
export function createBlackPieceNotation(value) {
    if (!isBlackPieceNotation(value)) {
        throw new Error(`Invalid black piece notation: ${value}`);
    }
    return value;
}
// ============================================================================
// CONSTANTS FOR PIECE NOTATIONS
// ============================================================================
export const PIECE_TYPE_NOTATIONS = {
    PAWN: createPieceTypeNotation("P"),
    ROOK: createPieceTypeNotation("R"),
    KNIGHT: createPieceTypeNotation("N"),
    BISHOP: createPieceTypeNotation("B"),
    QUEEN: createPieceTypeNotation("Q"),
    KING: createPieceTypeNotation("K"),
};
export const COLOR_NOTATIONS = {
    WHITE: createColorNotation("w"),
    BLACK: createColorNotation("b"),
};
export const WHITE_PIECE_NOTATIONS = {
    PAWN: createWhitePieceNotation("P"),
    ROOK: createWhitePieceNotation("R"),
    KNIGHT: createWhitePieceNotation("N"),
    BISHOP: createWhitePieceNotation("B"),
    QUEEN: createWhitePieceNotation("Q"),
    KING: createWhitePieceNotation("K"),
};
export const BLACK_PIECE_NOTATIONS = {
    PAWN: createBlackPieceNotation("p"),
    ROOK: createBlackPieceNotation("r"),
    KNIGHT: createBlackPieceNotation("n"),
    BISHOP: createBlackPieceNotation("b"),
    QUEEN: createBlackPieceNotation("q"),
    KING: createBlackPieceNotation("k"),
};
// ============================================================================
// UTILITY FUNCTIONS FOR PIECE NOTATIONS
// ============================================================================
export function getPieceNotation(type, color) {
    if (color === COLOR_NOTATIONS.WHITE) {
        return createPieceNotation(type);
    }
    else {
        return createPieceNotation(type.toLowerCase());
    }
}
export function getPieceTypeFromNotation(piece) {
    // Runtime validation
    if (!piece || typeof piece !== "string") {
        throw new Error(`Invalid piece notation: ${piece}`);
    }
    const upperPiece = piece.toUpperCase();
    if (!isPieceTypeNotation(upperPiece)) {
        throw new Error(`Invalid piece type: ${upperPiece} from ${piece}`);
    }
    return createPieceTypeNotation(upperPiece);
}
export function getColorFromNotation(piece) {
    // Runtime validation
    if (!piece || typeof piece !== "string") {
        throw new Error(`Invalid piece notation: ${piece}`);
    }
    if (!isPieceNotation(piece)) {
        throw new Error(`Invalid piece notation: ${piece}`);
    }
    const isWhite = piece === piece.toUpperCase();
    return createColorNotation(isWhite ? "w" : "b");
}
// ============================================================================
// TREE DIGGER STATE PERSISTENCE TYPES
// ============================================================================
/**
 * Version tracking for state format compatibility
 */
export const TREE_DIGGER_STATE_VERSION = "1.0.0";
//# sourceMappingURL=types.js.map