"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseSimpleMove = parseSimpleMove;
exports.parseMoveFromNotation = parseMoveFromNotation;
exports.findFromSquare = findFromSquare;
exports.findFromSquareWithDisambiguation = findFromSquareWithDisambiguation;
exports.canPieceMoveTo = canPieceMoveTo;
exports.canPawnMoveTo = canPawnMoveTo;
exports.canRookMoveTo = canRookMoveTo;
exports.canKnightMoveTo = canKnightMoveTo;
exports.canBishopMoveTo = canBishopMoveTo;
exports.canQueenMoveTo = canQueenMoveTo;
exports.canKingMoveTo = canKingMoveTo;
exports.selectCorrectMove = selectCorrectMove;
var types_js_1 = require("./types.js");
var fen_utils_js_1 = require("./fen-utils.js");
var types_js_2 = require("../line/types.js");
var logging_js_1 = require("./logging.js");
/**
 * Move Parser and Validation Functions
 *
 * Provides functions for parsing chess moves from notation and validating
 * whether pieces can move from one square to another.
 */
/**
 * Parse a simple move string and return a ChessMove object
 */
function parseSimpleMove(moveText, fen) {
  var position = (0, fen_utils_js_1.parseFEN)(fen);
  var isWhiteTurn = position.turn === types_js_1.PLAYER_COLORS.WHITE;
  // Clean the move text
  var cleanMove = moveText.replace(/[+#?!]/, ""); // Remove check/checkmate symbols
  // Handle castling
  if (cleanMove === "O-O" || cleanMove === "0-0") {
    if (isWhiteTurn) {
      return {
        from: "e1",
        to: "g1",
        piece: "K",
        special: "castling",
        rookFrom: "h1",
        rookTo: "f1",
      };
    } else {
      return {
        from: "e8",
        to: "g8",
        piece: "k",
        special: "castling",
        rookFrom: "h8",
        rookTo: "f8",
      };
    }
  }
  if (cleanMove === "O-O-O" || cleanMove === "0-0-0") {
    if (isWhiteTurn) {
      return {
        from: "e1",
        to: "c1",
        piece: "K",
        special: "castling",
        rookFrom: "a1",
        rookTo: "d1",
      };
    } else {
      return {
        from: "e8",
        to: "c8",
        piece: "k",
        special: "castling",
        rookFrom: "a8",
        rookTo: "d8",
      };
    }
  }
  // Handle pawn moves (e4, e5, etc.)
  if (cleanMove.match(/^[a-h][1-8]$/)) {
    var toSquare = cleanMove;
    var piece = isWhiteTurn ? "P" : "p";
    var fromSquare = findFromSquare(piece, toSquare, fen);
    if (fromSquare) {
      return { from: fromSquare, to: toSquare, piece: piece };
    }
  }
  // Handle pawn captures (exd5, etc.)
  if (cleanMove.match(/^[a-h]x[a-h][1-8]$/)) {
    var fromFile_1 = cleanMove[0];
    var toSquare_1 = cleanMove.substring(2);
    var piece = isWhiteTurn ? "P" : "p";
    // Find all pawns that can capture to the destination
    var position_1 = (0, fen_utils_js_1.parseFEN)(fen);
    var candidates = [];
    for (var rank = 0; rank < 8; rank++) {
      for (var file = 0; file < 8; file++) {
        var square = (0, fen_utils_js_1.coordsToSquare)(rank, file);
        if (position_1.board[rank][file] === piece) {
          candidates.push(square);
        }
      }
    }
    // Filter candidates that can actually move to the destination
    var validCandidates = candidates.filter(function (fromSquare) {
      return canPawnMoveTo(fromSquare, toSquare_1, position_1.board);
    });
    // Use the file information to disambiguate
    var fileCandidates = validCandidates.filter(function (fromSquare) {
      return fromSquare[0] === fromFile_1;
    });
    if (fileCandidates.length === 1) {
      return { from: fileCandidates[0], to: toSquare_1, piece: piece };
    }
  }
  // Handle pawn promotions (e8=Q, e8Q, etc.)
  var promotionMatch = cleanMove.match(/^([a-h][18])=?([QRBN])$/);
  if (promotionMatch) {
    var toSquare = promotionMatch[1];
    var promotionPiece = promotionMatch[2];
    var piece = isWhiteTurn ? "P" : "p";
    var fromSquare = inferPawnFromSquare(toSquare, isWhiteTurn);
    if (fromSquare) {
      return {
        from: fromSquare,
        to: toSquare,
        piece: piece,
        promotion: isWhiteTurn ? promotionPiece : promotionPiece.toLowerCase(),
      };
    }
  }
  // Handle piece moves (Nf3, Rg1, etc.) - including disambiguation
  var pieceMatch = cleanMove.match(/^([KQRBN])([a-h]?[1-8]?)?x?([a-h][1-8])$/);
  if (pieceMatch) {
    var pieceType = pieceMatch[1];
    var disambiguation = pieceMatch[2] || "";
    var toSquare = pieceMatch[3];
    var pieceNotation = isWhiteTurn ? pieceType : pieceType.toLowerCase();
    var fromSquare = findFromSquareWithDisambiguation(
      pieceNotation,
      toSquare,
      disambiguation,
      fen,
    );
    if (fromSquare) {
      var piece = isWhiteTurn ? pieceType : pieceType.toLowerCase();
      return { from: fromSquare, to: toSquare, piece: piece };
    }
  }
  // Handle piece captures (Nxe4, etc.) - including disambiguation
  var captureMatch = cleanMove.match(/^([KQRBN])([a-h]?[1-8]?)?x([a-h][1-8])$/);
  if (captureMatch) {
    var pieceType = captureMatch[1];
    var disambiguation = captureMatch[2] || "";
    var toSquare = captureMatch[3];
    var pieceNotation = isWhiteTurn ? pieceType : pieceType.toLowerCase();
    var fromSquare = findFromSquareWithDisambiguation(
      pieceNotation,
      toSquare,
      disambiguation,
      fen,
    );
    if (fromSquare) {
      var piece = isWhiteTurn ? pieceType : pieceType.toLowerCase();
      return { from: fromSquare, to: toSquare, piece: piece };
    }
  }
  // Handle promotion captures (exd8=Q, exd8Q, etc.)
  var promotionCaptureMatch = cleanMove.match(
    /^([a-h])x([a-h][18])=?([QRBN])$/,
  );
  if (promotionCaptureMatch) {
    // const _fromFile = promotionCaptureMatch[1];
    var toSquare = promotionCaptureMatch[2];
    var promotionPiece = promotionCaptureMatch[3];
    var piece = isWhiteTurn ? "P" : "p";
    var fromSquare = findFromSquare(piece, toSquare, fen);
    if (fromSquare) {
      return {
        from: fromSquare,
        to: toSquare,
        piece: piece,
        promotion: isWhiteTurn ? promotionPiece : promotionPiece.toLowerCase(),
      };
    }
  }
  // Handle en passant captures (exd6) - must be after regular pawn captures
  var enPassantMatch = cleanMove.match(/^([a-h])x([a-h][1-8])$/);
  if (enPassantMatch) {
    // const fromFile = enPassantMatch[1];
    var toSquare = enPassantMatch[2];
    var piece = isWhiteTurn ? "P" : "p";
    var fromSquare = findFromSquare(piece, toSquare, fen);
    if (fromSquare) {
      return {
        from: fromSquare,
        to: toSquare,
        piece: piece,
        special: "en-passant",
      };
    }
  }
  // Console warning for unparseable moves
  var warningDetail = {
    move: moveText,
    fen: fen,
    message: 'Cannot parse move: "'
      .concat(moveText, '" in position: ')
      .concat(fen.substring(0, 30), "..."),
  };
  if (typeof window !== "undefined" && window.dispatchEvent) {
    window.dispatchEvent(
      new CustomEvent("move-parse-warning", { detail: warningDetail }),
    );
  }
  console.warn("\u26A0\uFE0F  ".concat(warningDetail.message));
  (0, logging_js_1.logError)("Unknown move: ".concat(moveText));
  return null;
}
/**
 * Parse a move string purely from notation without position validation
 * This is useful for the Line Fisher where we want to parse user input moves
 * without checking if they're actually legal in the current position
 */
function parseMoveFromNotation(moveText, isWhiteTurn) {
  if (isWhiteTurn === void 0) {
    isWhiteTurn = true;
  }
  // Clean the move text - remove check/checkmate/evaluation symbols
  var cleanMove = moveText.replace(/[+#?!]/, "");
  // Handle castling
  if (cleanMove === "O-O" || cleanMove === "0-0") {
    if (isWhiteTurn) {
      return {
        from: "e1",
        to: "g1",
        piece: "K",
        special: "castling",
        rookFrom: "h1",
        rookTo: "f1",
      };
    } else {
      return {
        from: "e8",
        to: "g8",
        piece: "k",
        special: "castling",
        rookFrom: "h8",
        rookTo: "f8",
      };
    }
  }
  if (cleanMove === "O-O-O" || cleanMove === "0-0-0") {
    if (isWhiteTurn) {
      return {
        from: "e1",
        to: "c1",
        piece: "K",
        special: "castling",
        rookFrom: "a1",
        rookTo: "d1",
      };
    } else {
      return {
        from: "e8",
        to: "c8",
        piece: "k",
        special: "castling",
        rookFrom: "a8",
        rookTo: "d8",
      };
    }
  }
  // Handle pawn moves (e4, e5, etc.)
  if (cleanMove.match(/^[a-h][1-8]$/)) {
    var toSquare = cleanMove;
    var piece = isWhiteTurn ? "P" : "p";
    // For pure parsing, we need to infer the from square based on the destination
    var fromSquare = inferPawnFromSquare(toSquare, isWhiteTurn);
    if (fromSquare) {
      return { from: fromSquare, to: toSquare, piece: piece };
    }
  }
  // Handle pawn captures (exd5, etc.)
  if (cleanMove.match(/^[a-h]x[a-h][1-8]$/)) {
    var fromFile = cleanMove[0];
    var toSquare = cleanMove.substring(2);
    var piece = isWhiteTurn ? "P" : "p";
    var fromSquare = inferPawnFromSquareForCapture(
      fromFile,
      toSquare,
      isWhiteTurn,
    );
    if (fromSquare) {
      return { from: fromSquare, to: toSquare, piece: piece };
    }
  }
  // Handle pawn promotions (e8=Q, e8Q, etc.)
  var promotionMatch = cleanMove.match(/^([a-h][18])=?([QRBN])$/);
  if (promotionMatch) {
    var toSquare = promotionMatch[1];
    var promotionPiece = promotionMatch[2];
    var piece = isWhiteTurn ? "P" : "p";
    // Extract to square from the move part
    var fromSquare = inferPawnFromSquare(toSquare, isWhiteTurn);
    if (fromSquare) {
      return {
        from: fromSquare,
        to: toSquare,
        piece: piece,
        promotion: isWhiteTurn ? promotionPiece : promotionPiece.toLowerCase(),
      };
    }
  }
  // Handle piece moves (Nf3, Rg1, etc.) - including disambiguation
  var pieceMatch = cleanMove.match(/^([KQRBN])([a-h]?[1-8]?)?x?([a-h][1-8])$/);
  if (pieceMatch) {
    var pieceType = pieceMatch[1];
    var disambiguation = pieceMatch[2] || "";
    var toSquare = pieceMatch[3];
    var pieceNotation = isWhiteTurn ? pieceType : pieceType.toLowerCase();
    var fromSquare = inferPieceFromSquareWithDisambiguation(
      pieceNotation,
      toSquare,
      disambiguation,
      isWhiteTurn,
    );
    if (fromSquare) {
      var piece = isWhiteTurn ? pieceType : pieceType.toLowerCase();
      return { from: fromSquare, to: toSquare, piece: piece };
    }
  }
  // Handle piece captures (Nxe4, etc.) - including disambiguation
  var captureMatch = cleanMove.match(/^([KQRBN])([a-h]?[1-8]?)?x([a-h][1-8])$/);
  if (captureMatch) {
    var pieceType = captureMatch[1];
    var disambiguation = captureMatch[2] || "";
    var toSquare = captureMatch[3];
    var pieceNotation = isWhiteTurn ? pieceType : pieceType.toLowerCase();
    var fromSquare = inferPieceFromSquareWithDisambiguation(
      pieceNotation,
      toSquare,
      disambiguation,
      isWhiteTurn,
    );
    if (fromSquare) {
      var piece = isWhiteTurn ? pieceType : pieceType.toLowerCase();
      return { from: fromSquare, to: toSquare, piece: piece };
    }
  }
  // Handle promotion captures (exd8=Q, exd8Q, etc.)
  var promotionCaptureMatch = cleanMove.match(
    /^([a-h])x([a-h][18])=?([QRBN])$/,
  );
  if (promotionCaptureMatch) {
    var fromFile = promotionCaptureMatch[1];
    var toSquare = promotionCaptureMatch[2];
    var promotionPiece = promotionCaptureMatch[3];
    var piece = isWhiteTurn ? "P" : "p";
    var fromSquare = inferPawnFromSquareForCapture(
      fromFile,
      toSquare,
      isWhiteTurn,
    );
    if (fromSquare) {
      return {
        from: fromSquare,
        to: toSquare,
        piece: piece,
        promotion: isWhiteTurn ? promotionPiece : promotionPiece.toLowerCase(),
      };
    }
  }
  // Handle en passant captures (exd6) - must be after regular pawn captures
  var enPassantMatch = cleanMove.match(/^([a-h])x([a-h][1-8])$/);
  if (enPassantMatch) {
    var fromFile = enPassantMatch[1];
    var toSquare = enPassantMatch[2];
    var piece = isWhiteTurn ? "P" : "p";
    var fromSquare = inferPawnFromSquareForCapture(
      fromFile,
      toSquare,
      isWhiteTurn,
    );
    if (fromSquare) {
      return {
        from: fromSquare,
        to: toSquare,
        piece: piece,
        special: "en-passant",
      };
    }
  }
  return null;
}
/**
 * Find the from square for a piece moving to a destination
 */
function findFromSquare(piece, toSquare, currentFEN) {
  var position = (0, fen_utils_js_1.parseFEN)(currentFEN);
  var candidates = [];
  // Find all squares with the specified piece
  for (var rank = 0; rank < 8; rank++) {
    for (var file = 0; file < 8; file++) {
      var square = (0, fen_utils_js_1.coordsToSquare)(rank, file);
      if (position.board[rank][file] === piece) {
        candidates.push(square);
      }
    }
  }
  // Filter candidates that can actually move to the destination
  var validCandidates = candidates.filter(function (fromSquare) {
    return canPieceMoveTo(fromSquare, toSquare, piece, position.board);
  });
  if (validCandidates.length === 1) {
    return validCandidates[0];
  }
  if (validCandidates.length > 1) {
    // Multiple candidates - need disambiguation
    return null;
  }
  return null;
}
/**
 * Find the from square with disambiguation
 */
function findFromSquareWithDisambiguation(
  piece,
  toSquare,
  disambiguation,
  currentFEN,
) {
  var position = (0, fen_utils_js_1.parseFEN)(currentFEN);
  var candidates = [];
  // Find all squares with the specified piece
  for (var rank = 0; rank < 8; rank++) {
    for (var file = 0; file < 8; file++) {
      var square = (0, fen_utils_js_1.coordsToSquare)(rank, file);
      var boardPiece = position.board[rank][file];
      if (boardPiece === piece) {
        candidates.push(square);
      }
    }
  }
  // Filter candidates that can actually move to the destination
  var validCandidates = candidates.filter(function (fromSquare) {
    return canPieceMoveTo(fromSquare, toSquare, piece, position.board);
  });
  if (validCandidates.length === 1) {
    return validCandidates[0];
  }
  if (validCandidates.length > 1) {
    // Use disambiguation to select the correct move
    return selectCorrectMove(
      validCandidates,
      toSquare,
      piece,
      position.board,
      disambiguation,
    );
  }
  return null;
}
/**
 * Check if a piece can move from one square to another
 */
function canPieceMoveTo(fromSquare, toSquare, piece, board) {
  var pieceType = (0, types_js_2.getPieceTypeFromNotation)(piece);
  var color = (0, types_js_2.getColorFromNotation)(piece);
  var _a = (0, fen_utils_js_1.squareToCoords)(toSquare),
    toRank = _a[0],
    toFile = _a[1];
  // Check if destination is occupied by same color piece
  var destPiece = board[toRank][toFile];
  if (
    destPiece &&
    getPieceColor((0, types_js_2.createPieceNotation)(destPiece)) === color
  ) {
    return false;
  }
  switch (pieceType) {
    case "P":
      return canPawnMoveTo(fromSquare, toSquare, board);
    case "R":
      return canRookMoveTo(fromSquare, toSquare, board);
    case "N":
      return canKnightMoveTo(fromSquare, toSquare, board);
    case "B":
      return canBishopMoveTo(fromSquare, toSquare, board);
    case "Q":
      return canQueenMoveTo(fromSquare, toSquare, board);
    case "K":
      return canKingMoveTo(fromSquare, toSquare, board);
    default:
      return false;
  }
}
/**
 * Check if a pawn can move from one square to another
 */
function canPawnMoveTo(fromSquare, toSquare, board) {
  var _a = (0, fen_utils_js_1.squareToCoords)(fromSquare),
    fromRank = _a[0],
    fromFile = _a[1];
  var _b = (0, fen_utils_js_1.squareToCoords)(toSquare),
    toRank = _b[0],
    toFile = _b[1];
  var piece = board[fromRank][fromFile];
  var isWhite = piece === "P";
  // Check if it's a capture
  var isCapture = fromFile !== toFile;
  var destPiece = board[toRank][toFile];
  if (isCapture) {
    // Must be diagonal move and destination must be occupied by opponent
    if (Math.abs(fromFile - toFile) !== 1 || !destPiece) {
      return false;
    }
    // Check that destination piece is opponent's piece
    var destIsWhite = destPiece === destPiece.toUpperCase();
    if (destIsWhite === isWhite) {
      return false;
    }
  } else {
    // Forward move - destination must be empty
    if (destPiece) {
      return false;
    }
  }
  // Check move distance
  var rankDiff = toRank - fromRank;
  if (isWhite) {
    if (rankDiff > 0) {
      return false; // White pawns move up (decreasing rank)
    }
    if (rankDiff < -2) {
      return false; // Can't move more than 2 squares
    }
    if (rankDiff === -2 && fromRank !== 6) {
      return false; // Double move only from starting position
    }
    if (isCapture && rankDiff !== -1) {
      return false; // Captures must be exactly 1 square
    }
  } else {
    if (rankDiff < 0) {
      return false; // Black pawns move down (increasing rank)
    }
    if (rankDiff > 2) {
      return false; // Can't move more than 2 squares
    }
    if (rankDiff === 2 && fromRank !== 1) {
      return false; // Double move only from starting position
    }
    if (isCapture && rankDiff !== 1) {
      return false; // Captures must be exactly 1 square
    }
  }
  return true;
}
/**
 * Check if a rook can move from one square to another
 */
function canRookMoveTo(fromSquare, toSquare, board) {
  var _a = (0, fen_utils_js_1.squareToCoords)(fromSquare),
    fromRank = _a[0],
    fromFile = _a[1];
  var _b = (0, fen_utils_js_1.squareToCoords)(toSquare),
    toRank = _b[0],
    toFile = _b[1];
  // Rooks move in straight lines
  if (fromRank !== toRank && fromFile !== toFile) {
    return false;
  }
  // Check if path is clear
  if (fromRank === toRank) {
    // Horizontal move
    var start = Math.min(fromFile, toFile);
    var end = Math.max(fromFile, toFile);
    for (var file = start + 1; file < end; file++) {
      if (board[fromRank][file] !== "") {
        return false;
      }
    }
  } else {
    // Vertical move
    var start = Math.min(fromRank, toRank);
    var end = Math.max(fromRank, toRank);
    for (var rank = start + 1; rank < end; rank++) {
      if (board[rank][fromFile] !== "") {
        return false;
      }
    }
  }
  return true;
}
/**
 * Check if a knight can move from one square to another
 */
function canKnightMoveTo(fromSquare, toSquare, _board) {
  var _a = (0, fen_utils_js_1.squareToCoords)(fromSquare),
    fromRank = _a[0],
    fromFile = _a[1];
  var _b = (0, fen_utils_js_1.squareToCoords)(toSquare),
    toRank = _b[0],
    toFile = _b[1];
  var rankDiff = Math.abs(fromRank - toRank);
  var fileDiff = Math.abs(fromFile - toFile);
  return (
    (rankDiff === 2 && fileDiff === 1) || (rankDiff === 1 && fileDiff === 2)
  );
}
/**
 * Check if a bishop can move from one square to another
 */
function canBishopMoveTo(fromSquare, toSquare, board) {
  var _a = (0, fen_utils_js_1.squareToCoords)(fromSquare),
    fromRank = _a[0],
    fromFile = _a[1];
  var _b = (0, fen_utils_js_1.squareToCoords)(toSquare),
    toRank = _b[0],
    toFile = _b[1];
  // Bishops move diagonally
  if (Math.abs(fromRank - toRank) !== Math.abs(fromFile - toFile)) {
    return false;
  }
  // Check if path is clear
  var rankStep = fromRank < toRank ? 1 : -1;
  var fileStep = fromFile < toFile ? 1 : -1;
  var rank = fromRank + rankStep;
  var file = fromFile + fileStep;
  while (rank !== toRank && file !== toFile) {
    if (board[rank][file] !== "") {
      return false;
    }
    rank += rankStep;
    file += fileStep;
  }
  return true;
}
/**
 * Check if a queen can move from one square to another
 */
function canQueenMoveTo(fromSquare, toSquare, board) {
  // Queen combines rook and bishop moves
  return (
    canRookMoveTo(fromSquare, toSquare, board) ||
    canBishopMoveTo(fromSquare, toSquare, board)
  );
}
/**
 * Check if a king can move from one square to another
 */
function canKingMoveTo(fromSquare, toSquare, _board) {
  var _a = (0, fen_utils_js_1.squareToCoords)(fromSquare),
    fromRank = _a[0],
    fromFile = _a[1];
  var _b = (0, fen_utils_js_1.squareToCoords)(toSquare),
    toRank = _b[0],
    toFile = _b[1];
  var rankDiff = Math.abs(fromRank - toRank);
  var fileDiff = Math.abs(fromFile - toFile);
  // King moves one square in any direction
  if (rankDiff <= 1 && fileDiff <= 1) {
    return true;
  }
  // Handle castling moves (king moves 2 squares horizontally)
  if (rankDiff === 0 && fileDiff === 2) {
    // This is a castling move - always allow it
    // The actual castling validation should be done elsewhere
    return true;
  }
  return false;
}
/**
 * Select the correct move from multiple candidates using disambiguation
 */
function selectCorrectMove(
  candidates,
  _toSquare,
  _piece,
  _board,
  disambiguation,
) {
  // If no disambiguation provided, return first candidate
  if (!disambiguation) {
    return candidates[0];
  }
  // Handle different types of disambiguation
  if (disambiguation.length === 1) {
    // Single character disambiguation (file or rank)
    var char = disambiguation.toLowerCase();
    if (char >= "a" && char <= "h") {
      // File disambiguation (e.g., "Nbd2" - 'b' means knight on b-file)
      var file_1 = char.charCodeAt(0) - "a".charCodeAt(0);
      var fileCandidates = candidates.filter(function (square) {
        var _a = (0, fen_utils_js_1.squareToCoords)(square),
          squareFile = _a[1];
        return squareFile === file_1;
      });
      return fileCandidates.length > 0 ? fileCandidates[0] : candidates[0];
    } else if (char >= "1" && char <= "8") {
      // Rank disambiguation (e.g., "N1d2" - '1' means knight on rank 1)
      var rank_1 = parseInt(char) - 1;
      var rankCandidates = candidates.filter(function (square) {
        var squareRank = (0, fen_utils_js_1.squareToCoords)(square)[0];
        return squareRank === rank_1;
      });
      return rankCandidates.length > 0 ? rankCandidates[0] : candidates[0];
    }
  } else if (disambiguation.length === 2) {
    // Full square disambiguation (e.g., "Nc3d2" - 'c3' means knight on c3)
    var disambiguationSquare_1 = disambiguation.toLowerCase();
    var exactCandidates = candidates.filter(function (square) {
      return square.toLowerCase() === disambiguationSquare_1;
    });
    return exactCandidates.length > 0 ? exactCandidates[0] : candidates[0];
  }
  // Fallback to first candidate if disambiguation doesn't match
  return candidates[0];
}
/**
 * Helper function to get piece color
 */
function getPieceColor(piece) {
  return piece === piece.toUpperCase() ? "w" : "b";
}
/**
 * Infer the from square for a pawn move based on destination
 */
function inferPawnFromSquare(toSquare, isWhiteTurn) {
  var file = toSquare[0];
  var rank = parseInt(toSquare[1]);
  if (isWhiteTurn) {
    // White pawns start on rank 2
    if (rank === 8) {
      // Promotion - pawn must be on rank 7
      return "".concat(file, "7");
    } else if (rank === 7) {
      // Could be from rank 6
      return "".concat(file, "6");
    } else if (rank === 6) {
      // Could be from rank 5
      return "".concat(file, "5");
    } else if (rank === 5) {
      // Could be from rank 4
      return "".concat(file, "4");
    } else if (rank === 4) {
      // Could be from rank 3
      return "".concat(file, "3");
    } else if (rank === 3) {
      // Could be from rank 2
      return "".concat(file, "2");
    } else if (rank === 2) {
      // Could be from rank 1
      return "".concat(file, "1");
    } else {
      // rank 1 - must be from rank 2
      return "".concat(file, "2");
    }
  } else {
    // Black pawns start on rank 7
    if (rank === 1) {
      // Promotion - pawn must be on rank 2
      return "".concat(file, "2");
    } else if (rank === 2) {
      // Could be from rank 3
      return "".concat(file, "3");
    } else if (rank === 3) {
      // Could be from rank 4
      return "".concat(file, "4");
    } else if (rank === 4) {
      // Could be from rank 5
      return "".concat(file, "5");
    } else if (rank === 5) {
      // Could be from rank 6
      return "".concat(file, "6");
    } else if (rank === 6) {
      // Could be from rank 7
      return "".concat(file, "7");
    } else if (rank === 7) {
      // Could be from rank 8
      return "".concat(file, "8");
    } else {
      // rank 8 - must be from rank 7
      return "".concat(file, "7");
    }
  }
}
/**
 * Infer the from square for a pawn capture based on file and destination
 */
function inferPawnFromSquareForCapture(fromFile, toSquare, isWhiteTurn) {
  var toRank = parseInt(toSquare[1]);
  if (isWhiteTurn) {
    // White pawns capture diagonally up
    if (toRank === 8) {
      // Promotion capture - pawn must be on rank 7
      return "".concat(fromFile, "7");
    } else if (toRank === 7) {
      // Could be from rank 6
      return "".concat(fromFile, "6");
    } else if (toRank === 6) {
      // Could be from rank 5
      return "".concat(fromFile, "5");
    } else if (toRank === 5) {
      // Could be from rank 4
      return "".concat(fromFile, "4");
    } else if (toRank === 4) {
      // Could be from rank 3
      return "".concat(fromFile, "3");
    } else if (toRank === 3) {
      // Could be from rank 2
      return "".concat(fromFile, "2");
    } else {
      // rank 2 - must be from rank 1
      return "".concat(fromFile, "1");
    }
  } else {
    // Black pawns capture diagonally down
    if (toRank === 1) {
      // Promotion capture - pawn must be on rank 2
      return "".concat(fromFile, "2");
    } else if (toRank === 2) {
      // Could be from rank 3
      return "".concat(fromFile, "3");
    } else if (toRank === 3) {
      // Could be from rank 4
      return "".concat(fromFile, "4");
    } else if (toRank === 4) {
      // Could be from rank 5
      return "".concat(fromFile, "5");
    } else if (toRank === 5) {
      // Could be from rank 6
      return "".concat(fromFile, "6");
    } else if (toRank === 6) {
      // Could be from rank 7
      return "".concat(fromFile, "7");
    } else {
      // rank 7 - must be from rank 8
      return "".concat(fromFile, "8");
    }
  }
}
/**
 * Infer the from square for a piece move with disambiguation
 */
function inferPieceFromSquareWithDisambiguation(
  piece,
  toSquare,
  disambiguation,
  isWhiteTurn,
) {
  var pieceType = (0, types_js_2.getPieceTypeFromNotation)(piece);
  // Handle different types of disambiguation
  if (disambiguation.length === 1) {
    // Single character disambiguation (file or rank)
    var char = disambiguation.toLowerCase();
    if (char >= "a" && char <= "h") {
      // File disambiguation (e.g., "Nbd2" - 'b' means knight on b-file)
      var file = char.charCodeAt(0) - "a".charCodeAt(0);
      var rank = inferRankForPiece(pieceType, toSquare, isWhiteTurn);
      return (0, fen_utils_js_1.coordsToSquare)(rank, file);
    } else if (char >= "1" && char <= "8") {
      // Rank disambiguation (e.g., "N1d2" - '1' means knight on rank 1)
      var rank = parseInt(char) - 1;
      var file = inferFileForPiece(pieceType, toSquare, isWhiteTurn);
      return (0, fen_utils_js_1.coordsToSquare)(rank, file);
    }
  } else if (disambiguation.length === 2) {
    // Full square disambiguation (e.g., "Nc3d2" - 'c3' means knight on c3)
    return disambiguation.toLowerCase();
  }
  // No disambiguation or fallback - infer based on piece type and destination
  return inferPieceFromSquare(piece, toSquare, isWhiteTurn);
}
/**
 * Infer the from square for a piece move
 */
function inferPieceFromSquare(piece, toSquare, isWhiteTurn) {
  var pieceType = (0, types_js_2.getPieceTypeFromNotation)(piece);
  switch (pieceType) {
    case "N":
      return inferKnightFromSquare(toSquare, isWhiteTurn);
    case "R":
      return inferRookFromSquare(toSquare, isWhiteTurn);
    case "B":
      return inferBishopFromSquare(toSquare, isWhiteTurn);
    case "Q":
      return inferQueenFromSquare(toSquare, isWhiteTurn);
    case "K":
      return inferKingFromSquare(toSquare, isWhiteTurn);
    default:
      return "a1"; // Fallback
  }
}
/**
 * Infer rank for piece based on destination
 */
function inferRankForPiece(pieceType, toSquare, isWhiteTurn) {
  var toRank = parseInt(toSquare[1]) - 1;
  if (isWhiteTurn) {
    // White pieces typically start on ranks 0-1
    return pieceType === "P" ? Math.min(toRank + 1, 6) : 0;
  } else {
    // Black pieces typically start on ranks 6-7
    return pieceType === "P" ? Math.max(toRank - 1, 1) : 7;
  }
}
/**
 * Infer file for piece based on destination
 */
function inferFileForPiece(pieceType, toSquare, isWhiteTurn) {
  var toFile = toSquare.charCodeAt(0) - "a".charCodeAt(0);
  // For most pieces, infer based on typical starting positions
  switch (pieceType) {
    case "N":
      return isWhiteTurn ? 1 : 6; // b1 or g8
    case "R":
      return isWhiteTurn ? 0 : 7; // a1 or h8
    case "B":
      return isWhiteTurn ? 2 : 5; // c1 or f8
    case "Q":
      return 3; // d1 or d8
    case "K":
      return 4; // e1 or e8
    default:
      return toFile; // For pawns, use destination file
  }
}
/**
 * Infer knight from square
 */
function inferKnightFromSquare(toSquare, isWhiteTurn) {
  var toFile = toSquare.charCodeAt(0) - "a".charCodeAt(0);
  // For white pieces, use typical game positions
  if (isWhiteTurn) {
    // If moving to e4, likely from f3 (common development)
    if (toSquare === "e4") return "f3";
    if (toSquare === "d4") return "c3";
    if (toSquare === "c4") return "b3";
    if (toSquare === "f4") return "g3";
    if (toSquare === "g4") return "h3";
    if (toSquare === "b4") return "a3";
    if (toSquare === "h4") return "g3";
    if (toSquare === "a4") return "b3";
    // Default fallback
    return toFile <= 3 ? "b1" : "g1";
  } else {
    // For black pieces, use typical game positions
    if (toSquare === "e5") return "f6";
    if (toSquare === "d5") return "c6";
    if (toSquare === "c5") return "b6";
    if (toSquare === "f5") return "g6";
    if (toSquare === "g5") return "h6";
    if (toSquare === "b5") return "a6";
    if (toSquare === "h5") return "g6";
    if (toSquare === "a5") return "b6";
    // Default fallback
    return toFile <= 3 ? "b8" : "g8";
  }
}
/**
 * Infer rook from square
 */
function inferRookFromSquare(_toSquare, isWhiteTurn) {
  return isWhiteTurn ? "a1" : "h8";
}
/**
 * Infer bishop from square
 */
function inferBishopFromSquare(toSquare, isWhiteTurn) {
  // For white pieces, use typical game positions
  if (isWhiteTurn) {
    if (toSquare === "e4") return "f1";
    if (toSquare === "d4") return "e1";
    if (toSquare === "c4") return "d1";
    if (toSquare === "f4") return "g1";
    if (toSquare === "g4") return "h1";
    if (toSquare === "b4") return "c1";
    if (toSquare === "h4") return "g1";
    if (toSquare === "a4") return "b1";
    return "c1";
  } else {
    // For black pieces, use typical game positions
    if (toSquare === "e5") return "f8";
    if (toSquare === "d5") return "e8";
    if (toSquare === "c5") return "d8";
    if (toSquare === "f5") return "g8";
    if (toSquare === "g5") return "h8";
    if (toSquare === "b5") return "c8";
    if (toSquare === "h5") return "g8";
    if (toSquare === "a5") return "b8";
    return "f8";
  }
}
/**
 * Infer queen from square
 */
function inferQueenFromSquare(_toSquare, isWhiteTurn) {
  return isWhiteTurn ? "d1" : "d8";
}
/**
 * Infer king from square
 */
function inferKingFromSquare(_toSquare, isWhiteTurn) {
  return isWhiteTurn ? "e1" : "e8";
}
