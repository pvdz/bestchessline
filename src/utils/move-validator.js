"use strict";
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
exports.PIECE_TYPES = exports.PIECES = void 0;
exports.validateMove = validateMove;
exports.analyzeMove = analyzeMove;
exports.getLegalMoves = getLegalMoves;
var types_js_1 = require("../line/types.js");
var utils_js_1 = require("./utils.js");
var fen_utils_js_1 = require("./fen-utils.js");
// Constants for piece types
exports.PIECES = {
  WHITE_KING: (0, types_js_1.createPieceNotation)("K"),
  WHITE_QUEEN: (0, types_js_1.createPieceNotation)("Q"),
  WHITE_ROOK: (0, types_js_1.createPieceNotation)("R"),
  WHITE_BISHOP: (0, types_js_1.createPieceNotation)("B"),
  WHITE_KNIGHT: (0, types_js_1.createPieceNotation)("N"),
  WHITE_PAWN: (0, types_js_1.createPieceNotation)("P"),
  BLACK_KING: (0, types_js_1.createPieceNotation)("k"),
  BLACK_QUEEN: (0, types_js_1.createPieceNotation)("q"),
  BLACK_ROOK: (0, types_js_1.createPieceNotation)("r"),
  BLACK_BISHOP: (0, types_js_1.createPieceNotation)("b"),
  BLACK_KNIGHT: (0, types_js_1.createPieceNotation)("n"),
  BLACK_PAWN: (0, types_js_1.createPieceNotation)("p"),
};
// Constants for piece types (uppercase, used for type matching)
exports.PIECE_TYPES = {
  KING: (0, types_js_1.createPieceTypeNotation)("K"),
  QUEEN: (0, types_js_1.createPieceTypeNotation)("Q"),
  ROOK: (0, types_js_1.createPieceTypeNotation)("R"),
  BISHOP: (0, types_js_1.createPieceTypeNotation)("B"),
  KNIGHT: (0, types_js_1.createPieceTypeNotation)("N"),
  PAWN: (0, types_js_1.createPieceTypeNotation)("P"),
};
/**
 * Validates a chess move and determines its effects
 */
function validateMove(position, move) {
  // Basic validation
  if (
    !(0, fen_utils_js_1.isValidSquare)(move.from) ||
    !(0, fen_utils_js_1.isValidSquare)(move.to)
  ) {
    return {
      isValid: false,
      effect: createEmptyEffect(),
      error: "Invalid square coordinates",
    };
  }
  var _a = (0, fen_utils_js_1.squareToCoords)(move.from),
    fromRank = _a[0],
    fromFile = _a[1];
  // Check if source square has a piece
  var sourcePiece = position.board[fromRank][fromFile];
  if (!sourcePiece) {
    return {
      isValid: false,
      effect: createEmptyEffect(),
      error: "No piece at source square",
    };
  }
  // Check if it's the correct player's turn
  var pieceColor = (0, utils_js_1.getPieceColor)(
    (0, types_js_1.createPieceNotation)(sourcePiece),
  );
  if (pieceColor !== position.turn) {
    return {
      isValid: false,
      effect: createEmptyEffect(),
      error: "Not your turn",
    };
  }
  // Check if the move is legal for the piece type
  var isLegal = isLegalMove(position, move);
  if (!isLegal) {
    return {
      isValid: false,
      effect: createEmptyEffect(),
      error: "Illegal move for piece type",
    };
  }
  // Apply the move to get the resulting position
  var newPosition = applyMove(position, move);
  // Check if the move leaves the king in check (illegal)
  if (isKingInCheck(newPosition, position.turn)) {
    return {
      isValid: false,
      effect: createEmptyEffect(),
      error: "Move would leave king in check",
    };
  }
  // Determine the effects of the move
  var effect = determineMoveEffect(position, move, newPosition);
  return {
    isValid: true,
    effect: effect,
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
  var _a = (0, fen_utils_js_1.squareToCoords)(move.from),
    fromRank = _a[0],
    fromFile = _a[1];
  var _b = (0, fen_utils_js_1.squareToCoords)(move.to),
    toRank = _b[0],
    toFile = _b[1];
  var piece = position.board[fromRank][fromFile];
  var pieceType = (0, utils_js_1.getPieceType)(
    (0, types_js_1.createPieceNotation)(piece),
  );
  var pieceColor = (0, utils_js_1.getPieceColor)(
    (0, types_js_1.createPieceNotation)(piece),
  );
  if (!pieceType || !pieceColor) {
    return false;
  }
  // Check if target square is occupied by same color piece
  var targetPiece = position.board[toRank][toFile];
  if (
    targetPiece &&
    (0, utils_js_1.getPieceColor)(
      (0, types_js_1.createPieceNotation)(targetPiece),
    ) === pieceColor
  ) {
    return false;
  }
  // Check if target square contains a king (illegal to capture king)
  if (
    targetPiece &&
    (targetPiece === exports.PIECES.WHITE_KING ||
      targetPiece === exports.PIECES.BLACK_KING)
  ) {
    return false;
  }
  // Handle castling
  if (move.special === "castling") {
    return isLegalCastlingMove(position, move);
  }
  // Use pieceType for switch statement (uppercase for both colors)
  switch (pieceType) {
    case exports.PIECE_TYPES.PAWN:
      return isLegalPawnMove(position, move);
    case exports.PIECE_TYPES.ROOK:
      return isLegalRookMove(position, move);
    case exports.PIECE_TYPES.KNIGHT:
      return isLegalKnightMove(position, move);
    case exports.PIECE_TYPES.BISHOP:
      return isLegalBishopMove(position, move);
    case exports.PIECE_TYPES.QUEEN:
      return isLegalQueenMove(position, move);
    case exports.PIECE_TYPES.KING:
      return isLegalKingMove(position, move);
    default:
      return false;
  }
}
/**
 * Checks if a pawn move is legal
 */
function isLegalPawnMove(position, move) {
  var _a = (0, fen_utils_js_1.squareToCoords)(move.from),
    fromRank = _a[0],
    fromFile = _a[1];
  var _b = (0, fen_utils_js_1.squareToCoords)(move.to),
    toRank = _b[0],
    toFile = _b[1];
  var piece = position.board[fromRank][fromFile];
  var color = (0, utils_js_1.getPieceColor)(
    (0, types_js_1.createPieceNotation)(piece),
  );
  var direction = color === types_js_1.PLAYER_COLORS.WHITE ? -1 : 1; // White moves up (decreasing rank), black moves down
  var rankDiff = toRank - fromRank;
  var fileDiff = Math.abs(toFile - fromFile);
  // Forward move
  if (fileDiff === 0) {
    // Single square move
    if (rankDiff === direction) {
      return position.board[toRank][toFile] === "";
    }
    // Double square move from starting position
    if (rankDiff === 2 * direction) {
      var startRank = color === types_js_1.PLAYER_COLORS.WHITE ? 6 : 1;
      if (fromRank === startRank) {
        var middleRank = fromRank + direction;
        return (
          position.board[middleRank][toFile] === "" &&
          position.board[toRank][toFile] === ""
        );
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
      var capturedRank = fromRank;
      var capturedFile = toFile;
      var capturedPiece = position.board[capturedRank][capturedFile];
      return (
        capturedPiece !== "" &&
        (0, utils_js_1.getPieceColor)(
          (0, types_js_1.createPieceNotation)(capturedPiece),
        ) !== color
      );
    }
  }
  return false;
}
/**
 * Checks if a rook move is legal
 */
function isLegalRookMove(position, move) {
  var _a = (0, fen_utils_js_1.squareToCoords)(move.from),
    fromRank = _a[0],
    fromFile = _a[1];
  var _b = (0, fen_utils_js_1.squareToCoords)(move.to),
    toRank = _b[0],
    toFile = _b[1];
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
  var _a = (0, fen_utils_js_1.squareToCoords)(move.from),
    fromRank = _a[0],
    fromFile = _a[1];
  var _b = (0, fen_utils_js_1.squareToCoords)(move.to),
    toRank = _b[0],
    toFile = _b[1];
  var rankDiff = Math.abs(toRank - fromRank);
  var fileDiff = Math.abs(toFile - fromFile);
  // Knight moves in L-shape: 2 squares in one direction, 1 square perpendicular
  var isValidKnightMove =
    (rankDiff === 2 && fileDiff === 1) || (rankDiff === 1 && fileDiff === 2);
  return isValidKnightMove;
}
/**
 * Checks if a bishop move is legal
 */
function isLegalBishopMove(position, move) {
  var _a = (0, fen_utils_js_1.squareToCoords)(move.from),
    fromRank = _a[0],
    fromFile = _a[1];
  var _b = (0, fen_utils_js_1.squareToCoords)(move.to),
    toRank = _b[0],
    toFile = _b[1];
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
  var _a = (0, fen_utils_js_1.squareToCoords)(move.from),
    fromRank = _a[0],
    fromFile = _a[1];
  var _b = (0, fen_utils_js_1.squareToCoords)(move.to),
    toRank = _b[0],
    toFile = _b[1];
  // Queen moves like rook or bishop
  var rankDiff = Math.abs(toRank - fromRank);
  var fileDiff = Math.abs(toFile - fromFile);
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
  var _a = (0, fen_utils_js_1.squareToCoords)(move.from),
    fromRank = _a[0],
    fromFile = _a[1];
  var _b = (0, fen_utils_js_1.squareToCoords)(move.to),
    toRank = _b[0],
    toFile = _b[1];
  var rankDiff = Math.abs(toRank - fromRank);
  var fileDiff = Math.abs(toFile - fromFile);
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
  if (!move.rookFrom || !move.rookTo) return false;
  var _a = (0, fen_utils_js_1.squareToCoords)(move.from),
    kingFromRank = _a[0],
    kingFromFile = _a[1];
  var _b = (0, fen_utils_js_1.squareToCoords)(move.rookFrom),
    rookFromRank = _b[0],
    rookFromFile = _b[1];
  // Check that king and rook are in correct positions
  var kingPiece = position.board[kingFromRank][kingFromFile];
  var rookPiece = position.board[rookFromRank][rookFromFile];
  if (!kingPiece || !rookPiece) return false;
  var kingColor = (0, utils_js_1.getPieceColor)(
    (0, types_js_1.createPieceNotation)(kingPiece),
  );
  var rookColor = (0, utils_js_1.getPieceColor)(
    (0, types_js_1.createPieceNotation)(rookPiece),
  );
  if (kingColor !== rookColor) return false;
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
  var rankStep =
    fromRank === toRank ? 0 : (toRank - fromRank) / Math.abs(toRank - fromRank);
  var fileStep =
    fromFile === toFile ? 0 : (toFile - fromFile) / Math.abs(toFile - fromFile);
  var currentRank = fromRank + rankStep;
  var currentFile = fromFile + fileStep;
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
  var newPosition = {
    board: position.board.map(function (row) {
      return __spreadArray([], row, true);
    }),
    turn:
      position.turn === types_js_1.PLAYER_COLORS.WHITE
        ? types_js_1.PLAYER_COLORS.BLACK
        : types_js_1.PLAYER_COLORS.WHITE,
    castling: position.castling,
    enPassant: null,
    halfMoveClock: position.halfMoveClock + 1,
    fullMoveNumber: position.fullMoveNumber,
  };
  var _a = (0, fen_utils_js_1.squareToCoords)(move.from),
    fromRank = _a[0],
    fromFile = _a[1];
  var _b = (0, fen_utils_js_1.squareToCoords)(move.to),
    toRank = _b[0],
    toFile = _b[1];
  // Move the piece
  var piece = newPosition.board[fromRank][fromFile];
  newPosition.board[fromRank][fromFile] = "";
  // Move the piece
  newPosition.board[toRank][toFile] = piece;
  // Handle en passant capture
  if (move.special === "en-passant" && move.capturedSquare) {
    var _c = (0, fen_utils_js_1.squareToCoords)(move.capturedSquare),
      capturedRank = _c[0],
      capturedFile = _c[1];
    newPosition.board[capturedRank][capturedFile] = "";
  }
  // Handle castling
  if (move.special === "castling" && move.rookFrom && move.rookTo) {
    var _d = (0, fen_utils_js_1.squareToCoords)(move.rookFrom),
      rookFromRank = _d[0],
      rookFromFile = _d[1];
    var _e = (0, fen_utils_js_1.squareToCoords)(move.rookTo),
      rookToRank = _e[0],
      rookToFile = _e[1];
    var rook = newPosition.board[rookFromRank][rookFromFile];
    newPosition.board[rookFromRank][rookFromFile] = "";
    newPosition.board[rookToRank][rookToFile] = rook;
  }
  // Update en passant square for double pawn push
  var pieceType = (0, utils_js_1.getPieceType)(
    (0, types_js_1.createPieceNotation)(piece),
  );
  if (pieceType === exports.PIECE_TYPES.PAWN) {
    var rankDiff = Math.abs(toRank - fromRank);
    if (rankDiff === 2) {
      var enPassantRank = fromRank + (toRank - fromRank) / 2;
      newPosition.enPassant = (0, fen_utils_js_1.coordsToSquare)(
        enPassantRank,
        fromFile,
      );
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
  var kingSquare = findKing(position, color);
  if (!kingSquare) return false;
  // Check if any opponent piece can attack the king
  var opponentColor = color === "w" ? "b" : "w";
  for (var rank = 0; rank < 8; rank++) {
    for (var file = 0; file < 8; file++) {
      var piece = position.board[rank][file];
      if (
        piece &&
        (0, utils_js_1.getPieceColor)(
          (0, types_js_1.createPieceNotation)(piece),
        ) === opponentColor
      ) {
        // Add debugging to see what pieces are being found
        var pieceType = (0, utils_js_1.getPieceType)(
          (0, types_js_1.createPieceNotation)(piece),
        );
        if (pieceType) {
          // For check detection, we need to allow moves to the king's square
          // Create a temporary move validation that bypasses king capture prevention
          var pieceNotation = (0, types_js_1.createPieceNotation)(piece);
          var canAttackKing = canPieceAttackSquare(
            position,
            pieceNotation,
            (0, fen_utils_js_1.coordsToSquare)(rank, file),
            kingSquare,
          );
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
  var _a = (0, fen_utils_js_1.squareToCoords)(fromSquare),
    _fromRank = _a[0],
    fromFile = _a[1];
  var _b = (0, fen_utils_js_1.squareToCoords)(toSquare),
    toRank = _b[0],
    toFile = _b[1];
  var pieceType = (0, types_js_1.getPieceTypeFromNotation)(piece);
  var color = (0, types_js_1.getColorFromNotation)(piece);
  if (!pieceType || !color) {
    return false;
  }
  // Check if target square has own piece (but allow king capture for check detection)
  var targetPiece = position.board[toRank][toFile];
  if (
    targetPiece &&
    (0, utils_js_1.getPieceColor)(
      (0, types_js_1.createPieceNotation)(targetPiece),
    ) === color &&
    targetPiece !== exports.PIECES.BLACK_KING &&
    targetPiece !== exports.PIECES.WHITE_KING
  ) {
    return false;
  }
  // Handle castling
  if (
    (piece === exports.PIECES.WHITE_KING ||
      piece === exports.PIECES.BLACK_KING) &&
    Math.abs(toFile - fromFile) === 2
  ) {
    return false; // Castling is not an attack
  }
  // Use pieceType for switch statement (uppercase for both colors)
  switch (pieceType) {
    case exports.PIECE_TYPES.PAWN:
      return canPawnAttackSquare(position, piece, fromSquare, toSquare);
    case exports.PIECE_TYPES.ROOK:
      return canRookAttackSquare(position, fromSquare, toSquare);
    case exports.PIECE_TYPES.KNIGHT:
      return canKnightAttackSquare(fromSquare, toSquare);
    case exports.PIECE_TYPES.BISHOP:
      return canBishopAttackSquare(position, fromSquare, toSquare);
    case exports.PIECE_TYPES.QUEEN:
      return canQueenAttackSquare(position, fromSquare, toSquare);
    case exports.PIECE_TYPES.KING:
      return canKingAttackSquare(fromSquare, toSquare);
    default:
      return false;
  }
}
/**
 * Checks if a knight can attack a square
 */
function canKnightAttackSquare(fromSquare, toSquare) {
  var _a = (0, fen_utils_js_1.squareToCoords)(fromSquare),
    fromRank = _a[0],
    fromFile = _a[1];
  var _b = (0, fen_utils_js_1.squareToCoords)(toSquare),
    toRank = _b[0],
    toFile = _b[1];
  var rankDiff = Math.abs(toRank - fromRank);
  var fileDiff = Math.abs(toFile - fromFile);
  // Knight moves in L-shape: 2 squares in one direction, 1 square perpendicular
  return (
    (rankDiff === 2 && fileDiff === 1) || (rankDiff === 1 && fileDiff === 2)
  );
}
/**
 * Checks if a king can attack a square
 */
function canKingAttackSquare(fromSquare, toSquare) {
  var _a = (0, fen_utils_js_1.squareToCoords)(fromSquare),
    fromRank = _a[0],
    fromFile = _a[1];
  var _b = (0, fen_utils_js_1.squareToCoords)(toSquare),
    toRank = _b[0],
    toFile = _b[1];
  var rankDiff = Math.abs(toRank - fromRank);
  var fileDiff = Math.abs(toFile - fromFile);
  // King moves one square in any direction
  return rankDiff <= 1 && fileDiff <= 1 && (rankDiff !== 0 || fileDiff !== 0);
}
/**
 * Checks if a rook can attack a square
 */
function canRookAttackSquare(position, fromSquare, toSquare) {
  var _a = (0, fen_utils_js_1.squareToCoords)(fromSquare),
    fromRank = _a[0],
    fromFile = _a[1];
  var _b = (0, fen_utils_js_1.squareToCoords)(toSquare),
    toRank = _b[0],
    toFile = _b[1];
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
  var _a = (0, fen_utils_js_1.squareToCoords)(fromSquare),
    fromRank = _a[0],
    fromFile = _a[1];
  var _b = (0, fen_utils_js_1.squareToCoords)(toSquare),
    toRank = _b[0],
    toFile = _b[1];
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
  var _a = (0, fen_utils_js_1.squareToCoords)(fromSquare),
    fromRank = _a[0],
    fromFile = _a[1];
  var _b = (0, fen_utils_js_1.squareToCoords)(toSquare),
    toRank = _b[0],
    toFile = _b[1];
  // Queen moves like rook or bishop
  var rankDiff = Math.abs(toRank - fromRank);
  var fileDiff = Math.abs(toFile - fromFile);
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
  var _a = (0, fen_utils_js_1.squareToCoords)(fromSquare),
    fromRank = _a[0],
    fromFile = _a[1];
  var _b = (0, fen_utils_js_1.squareToCoords)(toSquare),
    toRank = _b[0],
    toFile = _b[1];
  var color = (0, types_js_1.getColorFromNotation)(piece);
  var direction = color === types_js_1.PLAYER_COLORS.WHITE ? -1 : 1; // White moves up (decreasing rank), black moves down
  var rankDiff = toRank - fromRank;
  var fileDiff = Math.abs(toFile - fromFile);
  // Pawns can only attack diagonally
  if (fileDiff !== 1 || rankDiff !== direction) {
    return false;
  }
  // Check if there's a piece to capture (including king for check detection)
  var targetPiece = position.board[toRank][toFile];
  return targetPiece !== "";
}
/**
 * Finds the square of a king of the given color
 */
function findKing(position, color) {
  var kingPiece =
    color === types_js_1.PLAYER_COLORS.WHITE
      ? exports.PIECES.WHITE_KING
      : exports.PIECES.BLACK_KING;
  for (var rank = 0; rank < 8; rank++) {
    for (var file = 0; file < 8; file++) {
      if (position.board[rank][file] === kingPiece) {
        return (0, fen_utils_js_1.coordsToSquare)(rank, file);
      }
    }
  }
  return null;
}
/**
 * Determines the effects of a move
 */
function determineMoveEffect(originalPosition, move, newPosition) {
  var effect = {
    isCapture: false,
    isCheck: false,
    isMate: false,
    isEnPassant: false,
  };
  // Check for capture
  var _a = (0, fen_utils_js_1.squareToCoords)(move.to),
    toRank = _a[0],
    toFile = _a[1];
  var capturedPiece = originalPosition.board[toRank][toFile];
  if (capturedPiece && capturedPiece !== "") {
    // Don't count king capture as a valid capture
    if (
      capturedPiece !== exports.PIECES.WHITE_KING &&
      capturedPiece !== exports.PIECES.BLACK_KING
    ) {
      effect.isCapture = true;
      effect.capturedPiece = capturedPiece;
      effect.capturedSquare = move.to;
    }
  }
  // Check for en passant
  if (
    move.special === "en-passant" ||
    (originalPosition.enPassant === move.to &&
      (0, utils_js_1.getPieceType)(
        (0, types_js_1.createPieceNotation)(move.piece),
      ) === exports.PIECE_TYPES.PAWN)
  ) {
    effect.isEnPassant = true;
    effect.isCapture = true;
    if (move.capturedSquare) {
      effect.capturedSquare = move.capturedSquare;
      var _b = (0, fen_utils_js_1.squareToCoords)(move.capturedSquare),
        capturedRank = _b[0],
        capturedFile = _b[1];
      effect.capturedPiece = originalPosition.board[capturedRank][capturedFile];
    }
  }
  // Check for check/mate
  var opponentColor =
    originalPosition.turn === types_js_1.PLAYER_COLORS.WHITE
      ? types_js_1.PLAYER_COLORS.BLACK
      : types_js_1.PLAYER_COLORS.WHITE;
  var kingInCheck = isKingInCheck(newPosition, opponentColor);
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
  var kingSquare = findKing(position, color);
  if (!kingSquare) return true;
  var _a = (0, fen_utils_js_1.squareToCoords)(kingSquare),
    kingRank = _a[0],
    kingFile = _a[1];
  // Check all 8 possible king moves
  for (var dRank = -1; dRank <= 1; dRank++) {
    for (var dFile = -1; dFile <= 1; dFile++) {
      if (dRank === 0 && dFile === 0) continue;
      var newRank = kingRank + dRank;
      var newFile = kingFile + dFile;
      if (newRank >= 0 && newRank < 8 && newFile >= 0 && newFile < 8) {
        var targetPiece = position.board[newRank][newFile];
        // Check if the target square is safe (no opponent piece or own piece)
        if (
          !targetPiece ||
          (0, utils_js_1.getPieceColor)(
            (0, types_js_1.createPieceNotation)(targetPiece),
          ) !== color
        ) {
          // Create a king move to test
          var kingMove = {
            from: kingSquare,
            to: (0, fen_utils_js_1.coordsToSquare)(newRank, newFile),
            piece:
              color === types_js_1.PLAYER_COLORS.WHITE
                ? exports.PIECES.WHITE_KING
                : exports.PIECES.BLACK_KING,
          };
          // Validate the king move
          var moveValidation = validateMove(position, kingMove);
          if (moveValidation.isValid) {
            // Check if this move would capture the opponent's king (illegal)
            if (
              targetPiece &&
              (targetPiece === exports.PIECES.WHITE_KING ||
                targetPiece === exports.PIECES.BLACK_KING)
            ) {
              // Skip moves that would capture the king
              continue;
            }
            // Create a temporary position to test the move
            var tempPosition = {
              board: position.board.map(function (row) {
                return __spreadArray([], row, true);
              }),
              turn: color,
              castling: position.castling,
              enPassant: position.enPassant,
              halfMoveClock: position.halfMoveClock,
              fullMoveNumber: position.fullMoveNumber,
            };
            tempPosition.board[kingRank][kingFile] = "";
            tempPosition.board[newRank][newFile] =
              color === types_js_1.PLAYER_COLORS.WHITE
                ? exports.PIECES.WHITE_KING
                : exports.PIECES.BLACK_KING;
            if (!isKingInCheck(tempPosition, color)) {
              return false; // King can escape
            }
          }
        }
      }
    }
  }
  for (var rank = 0; rank < 8; rank++) {
    for (var file = 0; file < 8; file++) {
      var piece = position.board[rank][file];
      if (
        piece &&
        (0, utils_js_1.getPieceColor)(
          (0, types_js_1.createPieceNotation)(piece),
        ) === color
      ) {
        var fromSquare = (0, fen_utils_js_1.coordsToSquare)(rank, file);
        // Check all possible target squares
        for (var toRank = 0; toRank < 8; toRank++) {
          for (var toFile = 0; toFile < 8; toFile++) {
            var toSquare = (0, fen_utils_js_1.coordsToSquare)(toRank, toFile);
            var pieceType = (0, utils_js_1.getPieceType)(
              (0, types_js_1.createPieceNotation)(piece),
            );
            if (pieceType) {
              var move = {
                from: fromSquare,
                to: toSquare,
                piece: piece, // Use the actual piece, not the type
              };
              // Test if this move can escape check
              // First validate that this move is legal
              var moveValidation = validateMove(position, move);
              if (moveValidation.isValid) {
                // Check if this move would capture the opponent's king (illegal)
                var targetPiece = position.board[toRank][toFile];
                if (
                  targetPiece &&
                  (targetPiece === exports.PIECES.WHITE_KING ||
                    targetPiece === exports.PIECES.BLACK_KING)
                ) {
                  // Skip moves that would capture the king
                  continue;
                }
                var tempPosition = applyMove(position, move);
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
function analyzeMove(fen, move) {
  var position = (0, fen_utils_js_1.parseFEN)(fen);
  return validateMove(position, move);
}
/**
 * Gets all legal moves for a position (simplified)
 */
function getLegalMoves(position) {
  var moves = [];
  for (var rank = 0; rank < 8; rank++) {
    for (var file = 0; file < 8; file++) {
      var piece = position.board[rank][file];
      if (
        piece &&
        (0, utils_js_1.getPieceColor)(
          (0, types_js_1.createPieceNotation)(piece),
        ) === position.turn
      ) {
        var fromSquare = (0, fen_utils_js_1.coordsToSquare)(rank, file);
        // Check all possible target squares
        for (var toRank = 0; toRank < 8; toRank++) {
          for (var toFile = 0; toFile < 8; toFile++) {
            var toSquare = (0, fen_utils_js_1.coordsToSquare)(toRank, toFile);
            var move = {
              from: fromSquare,
              to: toSquare,
              piece: piece,
            };
            var result = validateMove(position, move);
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
