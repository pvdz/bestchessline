"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rawMoveToSAN = exports.PIECE_TYPES = void 0;
exports.moveToNotation = moveToNotation;
exports.getPieceSymbol = getPieceSymbol;
exports.pvToNotation = pvToNotation;
exports.sanToLongNotation = sanToLongNotation;
exports.convertLineToLongNotation = convertLineToLongNotation;
exports.convertSANLineToLongNotation = convertSANLineToLongNotation;
exports.getPieceCapitalized = getPieceCapitalized;
var types_js_1 = require("../line/types.js");
var fen_utils_js_1 = require("./fen-utils.js");
var move_parsing_js_1 = require("./move-parsing.js");
var fen_manipulation_js_1 = require("./fen-manipulation.js");
/**
 * Chess Notation Utility Functions
 *
 * Provides functions for converting chess moves to various notation formats,
 * handling piece symbols, and formatting principal variations (PV).
 */
// Constants for piece types (uppercase, used for type matching)
exports.PIECE_TYPES = {
  KING: "K",
  QUEEN: "Q",
  ROOK: "R",
  BISHOP: "B",
  KNIGHT: "N",
  PAWN: "P",
};
/**
 * Convert a chess move to notation
 */
function moveToNotation(move, format, pieceFormat, fen) {
  var _a;
  if (format === void 0) {
    format = "short";
  }
  if (pieceFormat === void 0) {
    pieceFormat = "unicode";
  }
  var pieceNotation = (0, types_js_1.createPieceNotation)(move.piece);
  var piece = getPieceType(pieceNotation);
  var color = getPieceColor(pieceNotation);
  if (!piece || !color) return "".concat(move.from, "-").concat(move.to);
  var pieceSymbol = getPieceSymbol(piece, color, pieceFormat);
  if (format === "long") {
    return "".concat(pieceSymbol).concat(move.from, "-").concat(move.to);
  } else {
    // Standard algebraic notation
    var notation = "";
    // Handle castling first
    if (move.special === "castling") {
      var fromFileIndex = move.from.charCodeAt(0) - "a".charCodeAt(0);
      var toFileIndex = move.to.charCodeAt(0) - "a".charCodeAt(0);
      var isKingside = toFileIndex > fromFileIndex;
      return isKingside ? "O-O" : "O-O-O";
    }
    // Detect castling moves for kings (king moves 2 squares)
    if (piece === exports.PIECE_TYPES.KING) {
      var fromFileIndex = move.from.charCodeAt(0) - "a".charCodeAt(0);
      var toFileIndex = move.to.charCodeAt(0) - "a".charCodeAt(0);
      var fileDistance = Math.abs(toFileIndex - fromFileIndex);
      if (fileDistance === 2) {
        // This is a castling move
        var isKingside = toFileIndex > fromFileIndex;
        return isKingside ? "O-O" : "O-O-O";
      }
    }
    if (piece === exports.PIECE_TYPES.PAWN) {
      // Pawn moves
      if (move.from.charAt(0) === move.to.charAt(0)) {
        // Same file (e.g., e2e4 -> e4)
        notation = move.to;
      } else {
        // Capture (e.g., e2d3 -> exd3)
        notation = "".concat(move.from.charAt(0), "x").concat(move.to);
      }
    } else {
      // Piece moves
      var pieceChar = pieceFormat === "unicode" ? pieceSymbol : piece;
      // Check if it's a capture by looking at the target square or move effect
      var isCapture = false;
      if (
        (_a = move.effect) === null || _a === void 0 ? void 0 : _a.isCapture
      ) {
        isCapture = true;
      } else if (fen) {
        var position = (0, fen_utils_js_1.parseFEN)(fen);
        var toRank = 8 - parseInt(move.to[1]);
        var toFile = move.to.charCodeAt(0) - "a".charCodeAt(0);
        var targetPiece = position.board[toRank][toFile];
        isCapture = Boolean(targetPiece && targetPiece !== "");
      }
      if (isCapture) {
        notation = "".concat(pieceChar, "x").concat(move.to);
      } else {
        notation = "".concat(pieceChar).concat(move.to);
      }
    }
    // Add effect indicators
    if (move.effect) {
      if (move.effect.isMate) {
        notation += "#";
      } else if (move.effect.isCheck) {
        notation += "+";
      }
    }
    return notation;
  }
}
/**
 * Get the symbol for a piece type and color
 */
function getPieceSymbol(type, color, format) {
  if (format === void 0) {
    format = "unicode";
  }
  if (format === "english") {
    return type;
  }
  // Safety checks for undefined values
  if (!type || !color) {
    console.warn("getPieceSymbol: Invalid type or color", {
      type: type,
      color: color,
    });
    return "?";
  }
  // Unicode symbols
  var symbols = {
    w: {
      K: "♔",
      Q: "♕",
      R: "♖",
      B: "♗",
      N: "♘",
      P: "♙",
    },
    b: {
      K: "♚",
      Q: "♛",
      R: "♜",
      B: "♝",
      N: "♞",
      P: "♟",
    },
  };
  var colorKey = color;
  var typeKey = type;
  // Check if both color and type are valid
  if (symbols[colorKey] && symbols[colorKey][typeKey]) {
    return symbols[colorKey][typeKey];
  }
  // Fallback to type if symbol not found
  console.warn("getPieceSymbol: Symbol not found", {
    type: type,
    color: color,
    typeKey: typeKey,
    colorKey: colorKey,
  });
  return type;
}
/**
 * Convert a principal variation (PV) to notation
 */
function pvToNotation(pv, format, pieceFormat, fen) {
  if (format === void 0) {
    format = "short";
  }
  if (pieceFormat === void 0) {
    pieceFormat = "unicode";
  }
  if (pv.length === 0) return "";
  // Process moves in the context of the actual position
  var moves = pv.map(function (move, _index) {
    // For now, use the original position for all moves
    // In a more sophisticated implementation, we'd update the position after each move
    return moveToNotation(move, format, pieceFormat, fen);
  });
  if (format === "long") {
    // Long format: just show the moves with piece symbols
    return moves.join(" ");
  } else {
    // Short format: standard game notation with move numbers
    var result = "";
    for (var i = 0; i < moves.length; i++) {
      if (i % 2 === 0) {
        // White move
        var moveNumber = Math.floor(i / 2) + 1;
        result += "".concat(moveNumber, ".").concat(moves[i]);
      } else {
        // Black move
        result += " ".concat(moves[i]);
      }
      // Add line breaks every 6 moves (3 full moves)
      if ((i + 1) % 6 === 0 && i < moves.length - 1) {
        result += "\n";
      } else if (i < moves.length - 1) {
        result += " ";
      }
    }
    return result;
  }
}
/**
 * Helper function to get piece type from notation
 */
function getPieceType(piece) {
  return piece.toUpperCase();
}
/**
 * Helper function to get piece color from notation
 */
function getPieceColor(piece) {
  return piece === piece.toUpperCase()
    ? (0, types_js_1.createColorNotation)("w")
    : (0, types_js_1.createColorNotation)("b");
}
/**
 * Convert raw move (e.g., "b8c6") to short algebraic notation (e.g., "Nc6")
 * This is needed because Stockfish returns raw moves but parseMove expects SAN
 */
var rawMoveToSAN = function (rawMove, fen) {
  if (rawMove.length !== 4) return rawMove; // Not a raw move, return as-is
  var from = rawMove.substring(0, 2);
  var to = rawMove.substring(2, 4);
  // Handle castling FIRST
  if ((from === "e1" && to === "g1") || (from === "e8" && to === "g8"))
    return "O-O";
  if ((from === "e1" && to === "c1") || (from === "e8" && to === "c8"))
    return "O-O-O";
  // If from and to are the same, return raw move
  if (from === to) return rawMove;
  // Parse the position to get piece information
  var position = (0, fen_utils_js_1.parseFEN)(fen);
  var board = position.board;
  // Convert square to coordinates
  var fileToIndex = function (file) {
    return file.charCodeAt(0) - "a".charCodeAt(0);
  };
  var rankToIndex = function (rank) {
    return 8 - parseInt(rank);
  };
  var fromFile = fileToIndex(from[0]);
  var fromRank = rankToIndex(from[1]);
  var toFile = fileToIndex(to[0]);
  var toRank = rankToIndex(to[1]);
  if (
    fromRank < 0 ||
    fromRank >= 8 ||
    fromFile < 0 ||
    fromFile >= 8 ||
    toRank < 0 ||
    toRank >= 8 ||
    toFile < 0 ||
    toFile >= 8
  ) {
    return rawMove; // Invalid square, return as-is
  }
  var piece = board[fromRank][fromFile];
  if (!piece) return rawMove; // No piece at square, return as-is
  // Check if destination is occupied (capture)
  var destPiece = board[toRank][toFile];
  var isCapture = destPiece && destPiece !== "";
  // If it's a pawn move, handle pawn-specific logic
  if (piece === "P" || piece === "p") {
    if (from[0] === to[0]) {
      // Same file (e.g., e2e4 -> e4)
      return to;
    } else {
      // Different file (capture)
      return "".concat(from[0], "x").concat(to);
    }
  }
  // Convert piece to SAN notation
  var pieceMap = {
    P: "", // Pawns don't get a letter
    p: "", // Black pawns don't get a letter
    R: "R",
    r: "R", // Black rooks still get R
    N: "N",
    n: "N", // Black knights still get N
    B: "B",
    b: "B", // Black bishops still get B
    Q: "Q",
    q: "Q", // Black queens still get Q
    K: "K",
    k: "K", // Black kings still get K
  };
  var pieceLetter = pieceMap[piece] || "";
  if (isCapture) {
    return "".concat(pieceLetter, "x").concat(to);
  } else {
    return "".concat(pieceLetter).concat(to);
  }
};
exports.rawMoveToSAN = rawMoveToSAN;
/**
 * Convert SAN move to long notation (from-to square format)
 * @param sanMove - The SAN move (e.g., "Nf3", "dxe6")
 * @param fen - The current FEN position
 * @returns The long notation move (e.g., "g1f3", "d5e6") or null if parsing fails
 */
function sanToLongNotation(sanMove, fen) {
  try {
    var parsedMove = (0, move_parsing_js_1.parseMove)(sanMove, fen);
    if (parsedMove) {
      return "".concat(parsedMove.from).concat(parsedMove.to);
    }
    return null;
  } catch (error) {
    console.warn(
      'Failed to convert SAN to long notation: "'
        .concat(sanMove, '" in "')
        .concat(fen, '"'),
      error,
    );
    return null;
  }
}
/**
 * Convert a line of SAN moves to long notation
 * @param sanLine - Line of SAN moves (e.g., "1. Nf3 Nf6 2. d4 d5")
 * @param startingFEN - Starting FEN position
 * @returns Line with long notation moves
 */
function convertLineToLongNotation(sanLine, startingFEN) {
  // Remove move numbers and comments
  var cleanLine = sanLine
    .replace(/\d+\./g, "")
    .replace(/\s*\/\/.*$/, "")
    .trim();
  var moves = cleanLine.split(/\s+/).filter(function (move) {
    return move.length > 0;
  });
  return convertSANLineToLongNotation(moves, startingFEN);
}
/**
 * Convert a line of SAN moves to long notation with piece names and move numbers
 * @param sanMoves - Array of SAN moves (e.g., ["Nf3", "Nf6", "d4"])
 * @param startingFEN - Starting FEN position
 * @returns String with long notation moves (e.g., "1. Ng1f3 g8f6 2. d2d4 d7d5")
 */
function convertSANLineToLongNotation(sanMoves, startingFEN) {
  var currentFEN = startingFEN;
  var longMoves = [];
  var moveNumber = 1;
  var whiteMove = "";
  for (var i = 0; i < sanMoves.length; i++) {
    var move = sanMoves[i];
    try {
      // Handle castling moves specially
      if (move === "O-O" || move === "O-O-O") {
        var longMove = move; // Keep castling notation as-is
        // Determine if this is white's move (even index) or black's move (odd index)
        if (i % 2 === 0) {
          // White's move
          whiteMove = longMove;
          if (i === sanMoves.length - 1) {
            // Last move and it's white's turn - add the move number and white move
            longMoves.push("".concat(moveNumber, ". ").concat(whiteMove));
          }
        } else {
          // Black's move - add the move number and both moves
          longMoves.push(
            "".concat(moveNumber, ". ").concat(whiteMove, " ").concat(longMove),
          );
          moveNumber++;
          whiteMove = "";
        }
        // Apply castling move to FEN
        var parsedMove_1 = (0, move_parsing_js_1.parseMove)(move, currentFEN);
        if (parsedMove_1) {
          currentFEN = (0, fen_manipulation_js_1.applyMoveToFEN)(
            currentFEN,
            parsedMove_1,
          );
        }
        continue;
      }
      var parsedMove = (0, move_parsing_js_1.parseMove)(move, currentFEN);
      if (parsedMove) {
        // Get piece name (always capital)
        var pieceName = getPieceCapitalized(parsedMove.piece);
        var longMove = ""
          .concat(pieceName)
          .concat(parsedMove.from)
          .concat(parsedMove.to);
        // Determine if this is white's move (even index) or black's move (odd index)
        if (i % 2 === 0) {
          // White's move
          whiteMove = longMove;
          if (i === sanMoves.length - 1) {
            // Last move and it's white's turn - add the move number and white move
            longMoves.push("".concat(moveNumber, ". ").concat(whiteMove));
          }
        } else {
          // Black's move - add the move number and both moves
          longMoves.push(
            "".concat(moveNumber, ". ").concat(whiteMove, " ").concat(longMove),
          );
          moveNumber++;
          whiteMove = "";
        }
        currentFEN = (0, fen_manipulation_js_1.applyMoveToFEN)(
          currentFEN,
          parsedMove,
        );
      } else {
        console.warn("Failed to parse move: ".concat(move));
        // Skip this move if we can't parse it
      }
    } catch (error) {
      console.warn("Error parsing move ".concat(move, ":"), error);
      // Skip this move if there's an error
    }
  }
  return longMoves.join(" ");
}
/**
 * Get piece name from piece character (always capital)
 * @param piece - Piece character from FEN (P, N, B, R, Q, K, p, n, b, r, q, k)
 * @returns Piece name (P, N, B, R, Q, K)
 */
function getPieceCapitalized(piece) {
  var pieceMap = {
    P: "P",
    p: "P", // Pawn
    N: "N",
    n: "N", // Knight
    B: "B",
    b: "B", // Bishop
    R: "R",
    r: "R", // Rook
    Q: "Q",
    q: "Q", // Queen
    K: "K",
    k: "K", // King
  };
  return pieceMap[piece] || "P"; // Default to pawn if unknown
}
