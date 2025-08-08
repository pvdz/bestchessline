"use strict";
// Core chess types shared between utils and line modules
// These types are used by utils files and should not depend on line-specific types
Object.defineProperty(exports, "__esModule", { value: true });
exports.PLAYER_COLORS = void 0;
exports.isPieceTypeNotation = isPieceTypeNotation;
exports.isColorNotation = isColorNotation;
exports.isPieceNotation = isPieceNotation;
exports.isWhitePieceNotation = isWhitePieceNotation;
exports.isBlackPieceNotation = isBlackPieceNotation;
exports.createPieceTypeNotation = createPieceTypeNotation;
exports.createColorNotation = createColorNotation;
exports.createPieceNotation = createPieceNotation;
exports.createWhitePieceNotation = createWhitePieceNotation;
exports.createBlackPieceNotation = createBlackPieceNotation;
exports.getPieceNotation = getPieceNotation;
exports.getPieceTypeFromNotation = getPieceTypeFromNotation;
exports.getColorFromNotation = getColorFromNotation;
// Player color constants to avoid magic literals
exports.PLAYER_COLORS = {
  WHITE: "w",
  BLACK: "b",
};
// Type guards for piece notation
function isPieceTypeNotation(value) {
  return /^[PNBRQK]$/.test(value);
}
function isColorNotation(value) {
  return /^[wb]$/.test(value);
}
function isPieceNotation(value) {
  return /^[PNBRQKpnbrqk]$/.test(value);
}
function isWhitePieceNotation(value) {
  return /^[PNBRQK]$/.test(value);
}
function isBlackPieceNotation(value) {
  return /^[pnbrqk]$/.test(value);
}
// Factory functions for piece notation
function createPieceTypeNotation(value) {
  if (!isPieceTypeNotation(value)) {
    throw new Error("Invalid piece type notation: ".concat(value));
  }
  return value;
}
function createColorNotation(value) {
  if (!isColorNotation(value)) {
    throw new Error("Invalid color notation: ".concat(value));
  }
  return value;
}
function createPieceNotation(value) {
  if (!isPieceNotation(value)) {
    throw new Error("Invalid piece notation: ".concat(value));
  }
  return value;
}
function createWhitePieceNotation(value) {
  if (!isWhitePieceNotation(value)) {
    throw new Error("Invalid white piece notation: ".concat(value));
  }
  return value;
}
function createBlackPieceNotation(value) {
  if (!isBlackPieceNotation(value)) {
    throw new Error("Invalid black piece notation: ".concat(value));
  }
  return value;
}
// Utility functions for piece notation
function getPieceNotation(type, color) {
  var _a;
  var pieceMap = {
    P: { w: "P", b: "p" },
    N: { w: "N", b: "n" },
    B: { w: "B", b: "b" },
    R: { w: "R", b: "r" },
    Q: { w: "Q", b: "q" },
    K: { w: "K", b: "k" },
  };
  var notation =
    (_a = pieceMap[type]) === null || _a === void 0 ? void 0 : _a[color];
  if (!notation) {
    throw new Error(
      "Invalid piece type or color: ".concat(type, ", ").concat(color),
    );
  }
  return createPieceNotation(notation);
}
function getPieceTypeFromNotation(piece) {
  var upperPiece = piece.toUpperCase();
  if (!isPieceTypeNotation(upperPiece)) {
    throw new Error("Invalid piece notation: ".concat(piece));
  }
  return createPieceTypeNotation(upperPiece);
}
function getColorFromNotation(piece) {
  var isUpperCase = piece === piece.toUpperCase();
  return createColorNotation(isUpperCase ? "w" : "b");
}
