"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseFEN = parseFEN;
exports.toFEN = toFEN;
exports.squareToCoords = squareToCoords;
exports.coordsToSquare = coordsToSquare;
exports.isValidSquare = isValidSquare;
exports.getPieceAtSquareFromFEN = getPieceAtSquareFromFEN;
/**
 * FEN Utility Functions
 *
 * Provides functions for parsing and manipulating FEN (Forsyth-Edwards Notation) strings,
 * coordinate conversion between chess squares and array indices, and square validation.
 */
/**
 * Parse a FEN string into a ChessPosition object
 */
function parseFEN(fen) {
  var parts = fen.split(" ");
  var boardPart = parts[0];
  if (parts[1] !== "w" && parts[1] !== "b")
    console.warn(
      "Warning: parseFEN() received a FEN where the current turn character was not as expected",
      parts,
      [fen],
    );
  var turn = parts[1];
  var castling = parts[2];
  var enPassant = parts[3] === "-" ? null : parts[3];
  var halfMoveClock = parseInt(parts[4]);
  var fullMoveNumber = parseInt(parts[5]);
  var board = Array(8)
    .fill(null)
    .map(function () {
      return Array(8).fill("");
    });
  var ranks = boardPart.split("/");
  for (var rank = 0; rank < 8; rank++) {
    var file = 0;
    for (var _i = 0, _a = ranks[rank]; _i < _a.length; _i++) {
      var char = _a[_i];
      if (char >= "1" && char <= "8") {
        file += parseInt(char);
      } else {
        board[rank][file] = char;
        file++;
      }
    }
  }
  return {
    board: board,
    turn: turn,
    castling: castling,
    enPassant: enPassant,
    halfMoveClock: halfMoveClock,
    fullMoveNumber: fullMoveNumber,
  };
}
/**
 * Convert a ChessPosition object to a FEN string
 */
function toFEN(position) {
  var fen = "";
  // Board
  for (var rank = 0; rank < 8; rank++) {
    var emptyCount = 0;
    for (var file = 0; file < 8; file++) {
      var piece = position.board[rank][file];
      if (piece === "") {
        emptyCount++;
      } else {
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
    if (rank < 7) fen += "/";
  }
  // Turn
  fen += " ".concat(position.turn);
  // Castling
  fen += " ".concat(position.castling);
  // En passant
  fen += " ".concat(position.enPassant || "-");
  // Half move clock
  fen += " ".concat(position.halfMoveClock);
  // Full move number
  fen += " ".concat(position.fullMoveNumber);
  return fen;
}
/**
 * Convert a chess square (e.g., "e4") to array coordinates [rank, file]
 */
function squareToCoords(square) {
  var file = square.charCodeAt(0) - "a".charCodeAt(0);
  var rank = 8 - parseInt(square[1]);
  return [rank, file];
}
/**
 * Convert array coordinates [rank, file] to a chess square (e.g., "e4")
 */
function coordsToSquare(rank, file) {
  var fileChar = String.fromCharCode("a".charCodeAt(0) + file);
  var rankChar = (8 - rank).toString();
  return "".concat(fileChar).concat(rankChar);
}
/**
 * Check if a string is a valid chess square
 */
function isValidSquare(square) {
  if (square.length !== 2) return false;
  var file = square[0];
  var rank = square[1];
  return file >= "a" && file <= "h" && rank >= "1" && rank <= "8";
}
/**
 * Get piece at a specific square from FEN string
 */
function getPieceAtSquareFromFEN(square, fen) {
  var position = parseFEN(fen);
  var _a = squareToCoords(square),
    rank = _a[0],
    file = _a[1];
  return position.board[rank][file];
}
