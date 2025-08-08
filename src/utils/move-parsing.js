"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseMove = parseMove;
exports.parseGameNotation = parseGameNotation;
var types_js_1 = require("./types.js");
var fen_utils_js_1 = require("./fen-utils.js");
var move_parser_js_1 = require("./move-parser.js");
var move_validator_js_1 = require("./move-validator.js");
var logging_js_1 = require("./logging.js");
var fen_manipulation_js_1 = require("./fen-manipulation.js");
/**
 * Move Parsing Utility Functions
 *
 * Provides functions for parsing chess notation, importing games,
 * and converting between different move formats.
 */
/**
 * Parse individual move string
 * Input can be SAN, PCN, or long notation
 */
function parseMove(moveText, currentFEN) {
  (0, logging_js_1.log)("Parsing move:", moveText, "from FEN:", currentFEN);
  var position = (0, fen_utils_js_1.parseFEN)(currentFEN);
  var isWhiteTurn = position.turn === types_js_1.PLAYER_COLORS.WHITE;
  // Handle castling
  if (moveText === "O-O" || moveText === "0-0") {
    if (isWhiteTurn) {
      return {
        from: "e1",
        to: "g1",
        piece: move_validator_js_1.PIECES.WHITE_KING,
        special: "castling",
        rookFrom: "h1",
        rookTo: "f1",
      };
    } else {
      return {
        from: "e8",
        to: "g8",
        piece: move_validator_js_1.PIECES.BLACK_KING,
        special: "castling",
        rookFrom: "h8",
        rookTo: "f8",
      };
    }
  }
  if (moveText === "O-O-O" || moveText === "0-0-0") {
    if (isWhiteTurn) {
      return {
        from: "e1",
        to: "c1",
        piece: move_validator_js_1.PIECES.WHITE_KING,
        special: "castling",
        rookFrom: "a1",
        rookTo: "d1",
      };
    } else {
      return {
        from: "e8",
        to: "c8",
        piece: move_validator_js_1.PIECES.BLACK_KING,
        special: "castling",
        rookFrom: "a8",
        rookTo: "d8",
      };
    }
  }
  // Handle pawn moves (both white and black)
  if (moveText.match(/^[a-h][1-8]$/)) {
    // Simple pawn move
    var toSquare = moveText;
    // Try both colors to handle ambiguous cases
    var fromSquare = (0, move_parser_js_1.findFromSquare)(
      move_validator_js_1.PIECES.WHITE_PAWN,
      toSquare,
      currentFEN,
    );
    var piece = move_validator_js_1.PIECES.WHITE_PAWN;
    if (!fromSquare) {
      fromSquare = (0, move_parser_js_1.findFromSquare)(
        move_validator_js_1.PIECES.BLACK_PAWN,
        toSquare,
        currentFEN,
      );
      piece = move_validator_js_1.PIECES.BLACK_PAWN;
    }
    if (fromSquare) {
      return { from: fromSquare, to: toSquare, piece: piece };
    }
  }
  // Handle plain long coordinate notation (e.g., a2a3, g1f3)
  var longCoord = moveText.match(/^([a-h][1-8])([a-h][1-8])([qrbnQRBN])?$/);
  if (longCoord) {
    var fromSquare = longCoord[1];
    var toSquare = longCoord[2];
    var promotion = longCoord[3];
    var pos = (0, fen_utils_js_1.parseFEN)(currentFEN);
    var _a = (0, fen_utils_js_1.squareToCoords)(fromSquare),
      fromRank = _a[0],
      fromFile = _a[1];
    if (fromRank >= 0 && fromRank < 8 && fromFile >= 0 && fromFile < 8) {
      var boardPiece = pos.board[fromRank][fromFile];
      if (boardPiece) {
        var move = {
          from: fromSquare,
          to: toSquare,
          piece: boardPiece,
        };
        if (promotion) {
          // normalize promotion letter to correct case based on moving color
          var isWhite = boardPiece === boardPiece.toUpperCase();
          move.promotion = isWhite
            ? promotion.toUpperCase()
            : promotion.toLowerCase();
        }
        return move;
      }
    }
  }
  // Handle long algebraic notation moves (e.g., Pa7a6, Nf3g5, Qd8a5)
  var longAlgebraicMatch = moveText.match(
    /^([KQRBNPkqrbnp])([a-h][1-8])([a-h][1-8])([+#])?$/,
  );
  if (longAlgebraicMatch) {
    var pieceType = longAlgebraicMatch[1];
    var fromSquare = longAlgebraicMatch[2];
    var toSquare = longAlgebraicMatch[3];
    // Try the piece as written first
    var pieceNotation = (0, types_js_1.createPieceNotation)(pieceType);
    // Verify the piece is actually at the from square
    var position_1 = (0, fen_utils_js_1.parseFEN)(currentFEN);
    var _b = (0, fen_utils_js_1.squareToCoords)(fromSquare),
      fromRank = _b[0],
      fromFile = _b[1];
    var boardPiece = position_1.board[fromRank][fromFile];
    if (boardPiece === pieceNotation) {
      // Check if this is a king move of 2 squares - treat as castling
      if (pieceType.toUpperCase() === "K") {
        var fromFileIndex = fromSquare.charCodeAt(0) - "a".charCodeAt(0);
        var toFileIndex = toSquare.charCodeAt(0) - "a".charCodeAt(0);
        var fileDistance = Math.abs(toFileIndex - fromFileIndex);
        if (fileDistance === 2) {
          // This is a castling move
          var isKingside = toFileIndex > fromFileIndex;
          var rookFrom = isKingside
            ? isWhiteTurn
              ? "h1"
              : "h8"
            : isWhiteTurn
              ? "a1"
              : "a8";
          var rookTo = isKingside
            ? isWhiteTurn
              ? "f1"
              : "f8"
            : isWhiteTurn
              ? "d1"
              : "d8";
          return {
            from: fromSquare,
            to: toSquare,
            piece: pieceNotation,
            special: "castling",
            rookFrom: rookFrom,
            rookTo: rookTo,
          };
        }
      }
      return { from: fromSquare, to: toSquare, piece: pieceNotation };
    } else {
      // Try the opposite case if the first attempt fails
      var oppositeCase =
        pieceType === pieceType.toUpperCase()
          ? pieceType.toLowerCase()
          : pieceType.toUpperCase();
      pieceNotation = (0, types_js_1.createPieceNotation)(oppositeCase);
      if (boardPiece === pieceNotation) {
        // Check if this is a king move of 2 squares - treat as castling
        if (pieceType.toUpperCase() === "K") {
          var fromFileIndex = fromSquare.charCodeAt(0) - "a".charCodeAt(0);
          var toFileIndex = toSquare.charCodeAt(0) - "a".charCodeAt(0);
          var fileDistance = Math.abs(toFileIndex - fromFileIndex);
          if (fileDistance === 2) {
            // This is a castling move
            var isKingside = toFileIndex > fromFileIndex;
            var rookFrom = isKingside
              ? isWhiteTurn
                ? "h1"
                : "h8"
              : isWhiteTurn
                ? "a1"
                : "a8";
            var rookTo = isKingside
              ? isWhiteTurn
                ? "f1"
                : "f8"
              : isWhiteTurn
                ? "d1"
                : "d8";
            return {
              from: fromSquare,
              to: toSquare,
              piece: pieceNotation,
              special: "castling",
              rookFrom: rookFrom,
              rookTo: rookTo,
            };
          }
        }
        return { from: fromSquare, to: toSquare, piece: pieceNotation };
      }
    }
  }
  // Handle king moves that might be castling (e.g., Kg1, Kc1, Kg8, Kc8)
  if (moveText.match(/^K[a-h][1-8]$/)) {
    var toSquare = moveText.substring(1);
    var isWhiteTurn_1 = position.turn === types_js_1.PLAYER_COLORS.WHITE;
    if (isWhiteTurn_1) {
      // Check if this is a castling move for white
      if (toSquare === "g1") {
        // Kingside castling
        return {
          from: "e1",
          to: "g1",
          piece: move_validator_js_1.PIECES.WHITE_KING,
          special: "castling",
          rookFrom: "h1",
          rookTo: "f1",
        };
      } else if (toSquare === "c1") {
        // Queenside castling
        return {
          from: "e1",
          to: "c1",
          piece: move_validator_js_1.PIECES.WHITE_KING,
          special: "castling",
          rookFrom: "a1",
          rookTo: "d1",
        };
      }
    } else {
      // Check if this is a castling move for black
      if (toSquare === "g8") {
        // Kingside castling
        return {
          from: "e8",
          to: "g8",
          piece: move_validator_js_1.PIECES.BLACK_KING,
          special: "castling",
          rookFrom: "h8",
          rookTo: "f8",
        };
      } else if (toSquare === "c8") {
        // Queenside castling
        return {
          from: "e8",
          to: "c8",
          piece: move_validator_js_1.PIECES.BLACK_KING,
          special: "castling",
          rookFrom: "a8",
          rookTo: "d8",
        };
      }
    }
  }
  // Handle piece moves
  var pieceMatch = moveText.match(
    /^([KQRBNPkqrbnp])([a-h]?[1-8]?)?x?([a-h][1-8])([+#])?$/,
  );
  if (pieceMatch) {
    var pieceType = pieceMatch[1];
    var disambiguation = pieceMatch[2] || "";
    var toSquare = pieceMatch[3];
    // Try the piece as written first
    var pieceNotation = (0, types_js_1.createPieceNotation)(pieceType);
    var fromSquare = (0, move_parser_js_1.findFromSquareWithDisambiguation)(
      pieceNotation,
      toSquare,
      disambiguation,
      currentFEN,
    );
    // If that fails, try the opposite case
    if (!fromSquare) {
      var oppositeCase =
        pieceType === pieceType.toUpperCase()
          ? pieceType.toLowerCase()
          : pieceType.toUpperCase();
      pieceNotation = (0, types_js_1.createPieceNotation)(oppositeCase);
      fromSquare = (0, move_parser_js_1.findFromSquareWithDisambiguation)(
        pieceNotation,
        toSquare,
        disambiguation,
        currentFEN,
      );
    }
    if (fromSquare) {
      // Use the piece notation that actually worked
      var piece = pieceNotation;
      return { from: fromSquare, to: toSquare, piece: piece };
    }
  }
  // Handle pawn captures (both white and black)
  if (moveText.match(/^[a-h]x[a-h][1-8]$/)) {
    var fromFile = moveText[0]; // The disambiguation file (e.g., 'd' in 'dxe6')
    var toSquare = moveText.substring(2);
    var position_2 = (0, fen_utils_js_1.parseFEN)(currentFEN);
    var isWhiteTurn_2 = position_2.turn === types_js_1.PLAYER_COLORS.WHITE;
    // Try both colors to handle ambiguous cases
    var fromSquare = null;
    var piece = "";
    // Try the current player's pawn first
    var currentPlayerPawn = isWhiteTurn_2
      ? move_validator_js_1.PIECES.WHITE_PAWN
      : move_validator_js_1.PIECES.BLACK_PAWN;
    var currentPlayerRank = isWhiteTurn_2 ? 2 : 7; // Start with typical starting rank
    var currentPlayerFromSquare = "".concat(fromFile).concat(currentPlayerRank);
    var _c = (0, fen_utils_js_1.squareToCoords)(currentPlayerFromSquare),
      currentRank = _c[0],
      currentFile = _c[1];
    if (
      currentRank >= 0 &&
      currentRank < 8 &&
      currentFile >= 0 &&
      currentFile < 8
    ) {
      var currentPiece = position_2.board[currentRank][currentFile];
      if (currentPiece === currentPlayerPawn) {
        fromSquare = currentPlayerFromSquare;
        piece = currentPlayerPawn;
      }
    }
    // Try the other player's pawn if current player's pawn not found
    if (!fromSquare) {
      var otherPlayerPawn = isWhiteTurn_2
        ? move_validator_js_1.PIECES.BLACK_PAWN
        : move_validator_js_1.PIECES.WHITE_PAWN;
      var otherPlayerRank = isWhiteTurn_2 ? 7 : 2; // Opposite starting rank
      var otherPlayerFromSquare = "".concat(fromFile).concat(otherPlayerRank);
      var _d = (0, fen_utils_js_1.squareToCoords)(otherPlayerFromSquare),
        otherRank = _d[0],
        otherFile = _d[1];
      if (otherRank >= 0 && otherRank < 8 && otherFile >= 0 && otherFile < 8) {
        var otherPiece = position_2.board[otherRank][otherFile];
        if (otherPiece === otherPlayerPawn) {
          fromSquare = otherPlayerFromSquare;
          piece = otherPlayerPawn;
        }
      }
    }
    // If still not found, try more sophisticated inference based on the destination square
    if (!fromSquare) {
      var toRank = parseInt(toSquare[1]);
      var toFile = toSquare.charCodeAt(0) - "a".charCodeAt(0);
      // For black pawns (moving down), look for pawns on higher ranks
      if (!isWhiteTurn_2) {
        for (var rank = toRank + 1; rank <= 7; rank++) {
          var inferredSquare = "".concat(fromFile).concat(rank);
          var _e = (0, fen_utils_js_1.squareToCoords)(inferredSquare),
            inferredRank = _e[0],
            inferredFile = _e[1];
          if (
            inferredRank >= 0 &&
            inferredRank < 8 &&
            inferredFile >= 0 &&
            inferredFile < 8
          ) {
            var inferredPiece = position_2.board[inferredRank][inferredFile];
            if (inferredPiece === move_validator_js_1.PIECES.BLACK_PAWN) {
              fromSquare = inferredSquare;
              piece = move_validator_js_1.PIECES.BLACK_PAWN;
              break;
            }
          }
        }
      } else {
        // For white pawns (moving up), look for pawns on lower ranks
        for (var rank = toRank - 1; rank >= 2; rank--) {
          var inferredSquare = "".concat(fromFile).concat(rank);
          var _f = (0, fen_utils_js_1.squareToCoords)(inferredSquare),
            inferredRank = _f[0],
            inferredFile = _f[1];
          if (
            inferredRank >= 0 &&
            inferredRank < 8 &&
            inferredFile >= 0 &&
            inferredFile < 8
          ) {
            var inferredPiece = position_2.board[inferredRank][inferredFile];
            if (inferredPiece === move_validator_js_1.PIECES.WHITE_PAWN) {
              fromSquare = inferredSquare;
              piece = move_validator_js_1.PIECES.WHITE_PAWN;
              break;
            }
          }
        }
      }
    }
    if (fromSquare) {
      return { from: fromSquare, to: toSquare, piece: piece };
    }
  }
  console.log(
    "[parseMove] Failed to parse move: "
      .concat(moveText, " from FEN: ")
      .concat(currentFEN),
  );
  return null;
}
/**
 * Parse game notation into moves
 */
function parseGameNotation(notation, initialFEN) {
  // Clean the notation
  var cleanNotation = notation
    .replace(/\{[^}]*\}/g, "") // Remove comments
    .replace(/\([^)]*\)/g, "") // Remove annotations
    .replace(/\$\d+/g, "") // Remove evaluation symbols
    .replace(/[!?]+/g, "") // Remove move annotations
    .replace(/\d+\./g, "") // Remove move numbers
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();
  console.log("Cleaned notation:", cleanNotation);
  var moves = [];
  var tokens = cleanNotation.split(/\s+/);
  // Apply moves sequentially to maintain board context
  var currentFEN = initialFEN;
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (
      !token ||
      token === "1-0" ||
      token === "0-1" ||
      token === "1/2-1/2" ||
      token === "*"
    ) {
      continue;
    }
    var move = parseMove(token, currentFEN);
    if (move) {
      // Determine move effects using the move validator
      var position = (0, fen_utils_js_1.parseFEN)(currentFEN);
      var validationResult = (0, move_validator_js_1.validateMove)(
        position,
        move,
      );
      if (validationResult.isValid) {
        // Add effect information to the move
        move.effect = validationResult.effect;
        moves.push(move);
        // Apply move to current FEN for next iteration
        currentFEN = (0, fen_manipulation_js_1.applyMoveToFEN)(
          currentFEN,
          move,
        );
      } else {
        console.warn(
          "Invalid move during parsing:",
          token,
          validationResult.error,
        );
      }
    }
  }
  return moves;
}
