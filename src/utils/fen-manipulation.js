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
var __spreadArray =
  (this && this.__spreadArray) ||
  function (to, from, pack) {
    if (pack || arguments.length === 2)
      for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
          if (!ar) ar = Array.prototype.slice.call(from, 0, i);
          ar[i] = from[i];
        }
      }
    return to.concat(ar || Array.prototype.slice.call(from));
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyMoveToFEN = applyMoveToFEN;
var types_js_1 = require("./types.js");
var fen_utils_js_1 = require("./fen-utils.js");
var notation_utils_js_1 = require("./notation-utils.js");
/**
 * FEN Manipulation Functions
 *
 * Provides functions for manipulating FEN strings, including applying moves
 * and updating position state.
 */
/**
 * Apply a chess move to a FEN string and return the new FEN
 */
function applyMoveToFEN(fen, move) {
  var position = (0, fen_utils_js_1.parseFEN)(fen);
  var _a = (0, fen_utils_js_1.squareToCoords)(move.from),
    fromRank = _a[0],
    fromFile = _a[1];
  var _b = (0, fen_utils_js_1.squareToCoords)(move.to),
    toRank = _b[0],
    toFile = _b[1];
  // Create new board
  var newBoard = position.board.map(function (row) {
    return __spreadArray([], row, true);
  });
  newBoard[toRank][toFile] = newBoard[fromRank][fromFile];
  newBoard[fromRank][fromFile] = "";
  // Handle special moves
  if (move.special === "castling") {
    if (move.rookFrom && move.rookTo) {
      var _c = (0, fen_utils_js_1.squareToCoords)(move.rookFrom),
        rookFromRank = _c[0],
        rookFromFile = _c[1];
      var _d = (0, fen_utils_js_1.squareToCoords)(move.rookTo),
        rookToRank = _d[0],
        rookToFile = _d[1];
      newBoard[rookToRank][rookToFile] = newBoard[rookFromRank][rookFromFile];
      newBoard[rookFromRank][rookFromFile] = "";
    }
  }
  // Auto-detect castling when king moves two squares, even if not explicitly marked
  else if (move.piece.toUpperCase() === notation_utils_js_1.PIECE_TYPES.KING) {
    var fromFileIndex = move.from.charCodeAt(0) - "a".charCodeAt(0);
    var toFileIndex = move.to.charCodeAt(0) - "a".charCodeAt(0);
    var fileDistance = Math.abs(toFileIndex - fromFileIndex);
    if (fileDistance === 2) {
      var isWhite = move.piece === move.piece.toUpperCase();
      var isKingside = toFileIndex > fromFileIndex;
      var rookFrom = isWhite
        ? isKingside
          ? "h1"
          : "a1"
        : isKingside
          ? "h8"
          : "a8";
      var rookTo = isWhite
        ? isKingside
          ? "f1"
          : "d1"
        : isKingside
          ? "f8"
          : "d8";
      var _e = (0, fen_utils_js_1.squareToCoords)(rookFrom),
        rookFromRank = _e[0],
        rookFromFile = _e[1];
      var _f = (0, fen_utils_js_1.squareToCoords)(rookTo),
        rookToRank = _f[0],
        rookToFile = _f[1];
      // Only move rook if it exists at the expected square
      if (newBoard[rookFromRank][rookFromFile]) {
        newBoard[rookToRank][rookToFile] = newBoard[rookFromRank][rookFromFile];
        newBoard[rookFromRank][rookFromFile] = "";
      }
    }
  }
  // Update castling rights
  var newCastling = position.castling;
  // Remove castling rights when king moves
  if (move.piece.toUpperCase() === notation_utils_js_1.PIECE_TYPES.KING) {
    if (move.piece === "K") {
      // White king moved
      newCastling = newCastling.replace(/[KQ]/g, "");
    } else {
      // Black king moved
      newCastling = newCastling.replace(/[kq]/g, "");
    }
  }
  // Remove castling rights when rooks move
  if (move.piece.toUpperCase() === notation_utils_js_1.PIECE_TYPES.ROOK) {
    if (move.from === "a1") newCastling = newCastling.replace("Q", "");
    if (move.from === "h1") newCastling = newCastling.replace("K", "");
    if (move.from === "a8") newCastling = newCastling.replace("q", "");
    if (move.from === "h8") newCastling = newCastling.replace("k", "");
  }
  // Update en passant
  var newEnPassant = null;
  if (move.piece.toUpperCase() === notation_utils_js_1.PIECE_TYPES.PAWN) {
    var _g = (0, fen_utils_js_1.squareToCoords)(move.from),
      fromRank_1 = _g[0],
      fromFile_1 = _g[1];
    var _h = (0, fen_utils_js_1.squareToCoords)(move.to),
      toRank_1 = _h[0],
      _toFile = _h[1];
    // Check if it's a double pawn move
    if (Math.abs(fromRank_1 - toRank_1) === 2) {
      var enPassantRank = fromRank_1 + (toRank_1 > fromRank_1 ? 1 : -1);
      newEnPassant = (0, fen_utils_js_1.coordsToSquare)(
        enPassantRank,
        fromFile_1,
      );
    }
  } else {
    // Clear en passant for non-pawn moves
    newEnPassant = null;
  }
  // Update position
  var newPosition = __assign(__assign({}, position), {
    board: newBoard,
    turn:
      position.turn === types_js_1.PLAYER_COLORS.WHITE
        ? types_js_1.PLAYER_COLORS.BLACK
        : types_js_1.PLAYER_COLORS.WHITE,
    castling: newCastling || "-",
    enPassant: newEnPassant,
  });
  return (0, fen_utils_js_1.toFEN)(newPosition);
}
