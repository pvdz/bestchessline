"use strict";
var __assign =
  (this && this.__assign) ||
  function () {
    __assign =
      Object.assign ||
      function (t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
          s = arguments[i];
          for (var p in s)
            if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
        return t;
      };
    return __assign.apply(this, arguments);
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPieceColor = getPieceColor;
exports.getPieceType = getPieceType;
exports.setGlobalCurrentMoveIndex = setGlobalCurrentMoveIndex;
exports.getGlobalCurrentMoveIndex = getGlobalCurrentMoveIndex;
exports.getFENWithCorrectMoveCounter = getFENWithCorrectMoveCounter;
exports.getStartingPlayer = getStartingPlayer;
var types_js_1 = require("../line/types.js");
var fen_utils_js_1 = require("./fen-utils.js");
function getPieceColor(piece) {
  return piece === piece.toUpperCase()
    ? (0, types_js_1.createColorNotation)("w")
    : (0, types_js_1.createColorNotation)("b");
}
function getPieceType(piece) {
  return (0, types_js_1.createPieceTypeNotation)(piece.toUpperCase());
}
// Global variable to store current move index
var globalCurrentMoveIndex = -1;
/**
 * Set the global current move index
 */
function setGlobalCurrentMoveIndex(moveIndex) {
  globalCurrentMoveIndex = moveIndex;
}
/**
 * Get the global current move index
 */
function getGlobalCurrentMoveIndex() {
  return globalCurrentMoveIndex;
}
/**
 * Get FEN with correct move counter based on current move index
 */
function getFENWithCorrectMoveCounter(
  boardFEN,
  currentMoveIndex,
  castling,
  enPassant,
) {
  var position = (0, fen_utils_js_1.parseFEN)(boardFEN);
  // Calculate the correct move number based on current move index
  var correctMoveNumber = Math.floor(currentMoveIndex / 2) + 1;
  // Create new position with correct move number and optional castling/en-passant
  var correctedPosition = __assign(__assign({}, position), {
    fullMoveNumber: correctMoveNumber,
    castling: castling !== undefined ? castling : position.castling,
    enPassant: enPassant !== undefined ? enPassant : position.enPassant,
  });
  return (0, fen_utils_js_1.toFEN)(correctedPosition);
}
/**
 * Get the starting player from a FEN string
 */
function getStartingPlayer(fen) {
  var position = (0, fen_utils_js_1.parseFEN)(fen);
  return position.turn;
}
