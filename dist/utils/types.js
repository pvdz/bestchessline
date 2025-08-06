// Core chess types shared between utils and line modules
// These types are used by utils files and should not depend on line-specific types
// Player color constants to avoid magic literals
export const PLAYER_COLORS = {
    WHITE: "w",
    BLACK: "b",
};
// Type guards for piece notation
export function isPieceTypeNotation(value) {
    return /^[PNBRQK]$/.test(value);
}
export function isColorNotation(value) {
    return /^[wb]$/.test(value);
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
// Factory functions for piece notation
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
// Utility functions for piece notation
export function getPieceNotation(type, color) {
    const pieceMap = {
        P: { w: "P", b: "p" },
        N: { w: "N", b: "n" },
        B: { w: "B", b: "b" },
        R: { w: "R", b: "r" },
        Q: { w: "Q", b: "q" },
        K: { w: "K", b: "k" },
    };
    const notation = pieceMap[type]?.[color];
    if (!notation) {
        throw new Error(`Invalid piece type or color: ${type}, ${color}`);
    }
    return createPieceNotation(notation);
}
export function getPieceTypeFromNotation(piece) {
    const upperPiece = piece.toUpperCase();
    if (!isPieceTypeNotation(upperPiece)) {
        throw new Error(`Invalid piece notation: ${piece}`);
    }
    return createPieceTypeNotation(upperPiece);
}
export function getColorFromNotation(piece) {
    const isUpperCase = piece === piece.toUpperCase();
    return createColorNotation(isUpperCase ? "w" : "b");
}
//# sourceMappingURL=types.js.map