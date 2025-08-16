import { ChessMove, PLAYER_COLORS, createPieceNotation } from "./types.js";
import { parseFEN, squareToCoords } from "./fen-utils.js";
import {
  findFromSquare,
  findFromSquareWithDisambiguation,
} from "./move-parser.js";
import { validateMove, PIECES } from "./move-validator.js";
import { log } from "./logging.js";
import { applyMoveToFEN } from "./fen-manipulation.js";
import { assertFenParsable } from "./assert-utils.js";

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
export function parseMove(
  moveText: string,
  currentFEN: string,
  justThrow = false,
): ChessMove | null {
  try {
    log("Parsing move:", moveText, "from FEN:", currentFEN);
  } catch {}

  const position = parseFEN(currentFEN);
  const isWhiteTurn = position.turn === PLAYER_COLORS.WHITE;

  // Handle castling
  if (moveText === "O-O" || moveText === "0-0") {
    if (isWhiteTurn) {
      return {
        from: "e1",
        to: "g1",
        piece: PIECES.WHITE_KING,
        special: "castling",
        rookFrom: "h1",
        rookTo: "f1",
      };
    } else {
      return {
        from: "e8",
        to: "g8",
        piece: PIECES.BLACK_KING,
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
        piece: PIECES.WHITE_KING,
        special: "castling",
        rookFrom: "a1",
        rookTo: "d1",
      };
    } else {
      return {
        from: "e8",
        to: "c8",
        piece: PIECES.BLACK_KING,
        special: "castling",
        rookFrom: "a8",
        rookTo: "d8",
      };
    }
  }

  // Handle pawn moves (both white and black)
  if (moveText.match(/^[a-h][1-8]$/)) {
    // Simple pawn move
    const toSquare = moveText;

    // Try both colors to handle ambiguous cases
    let fromSquare = findFromSquare(PIECES.WHITE_PAWN, toSquare, currentFEN);
    let piece = PIECES.WHITE_PAWN;

    if (!fromSquare) {
      fromSquare = findFromSquare(PIECES.BLACK_PAWN, toSquare, currentFEN);
      piece = PIECES.BLACK_PAWN;
    }

    if (fromSquare) {
      return { from: fromSquare, to: toSquare, piece };
    }
  }

  // Handle plain long coordinate notation (e.g., a2a3, g1f3)
  const longCoord = moveText.match(/^([a-h][1-8])([a-h][1-8])([qrbnQRBN])?$/);
  if (longCoord) {
    const fromSquare = longCoord[1];
    const toSquare = longCoord[2];
    const promotion = longCoord[3];

    const pos = parseFEN(currentFEN);
    const [fromRank, fromFile] = squareToCoords(fromSquare);
    if (fromRank >= 0 && fromRank < 8 && fromFile >= 0 && fromFile < 8) {
      const boardPiece = pos.board[fromRank][fromFile];
      if (boardPiece) {
        const move: ChessMove = {
          from: fromSquare,
          to: toSquare,
          piece: boardPiece,
        };
        if (promotion) {
          // normalize promotion letter to correct case based on moving color
          const isWhite = boardPiece === boardPiece.toUpperCase();
          move.promotion = isWhite
            ? promotion.toUpperCase()
            : promotion.toLowerCase();
        }
        return move;
      }
    }
  }

  // Handle long algebraic notation moves (e.g., Pa7a6, Nf3g5, Qd8a5)
  const longAlgebraicMatch = moveText.match(
    /^([KQRBNPkqrbnp])([a-h][1-8])([a-h][1-8])([+#])?$/,
  );
  if (longAlgebraicMatch) {
    const pieceType = longAlgebraicMatch[1];
    const fromSquare = longAlgebraicMatch[2];
    const toSquare = longAlgebraicMatch[3];

    // Try the piece as written first
    let pieceNotation = createPieceNotation(pieceType);

    // Verify the piece is actually at the from square
    const position = parseFEN(currentFEN);
    const [fromRank, fromFile] = squareToCoords(fromSquare);
    const boardPiece = position.board[fromRank][fromFile];

    if (boardPiece === pieceNotation) {
      // Check if this is a king move of 2 squares - treat as castling
      if (pieceType.toUpperCase() === "K") {
        const fromFileIndex = fromSquare.charCodeAt(0) - "a".charCodeAt(0);
        const toFileIndex = toSquare.charCodeAt(0) - "a".charCodeAt(0);
        const fileDistance = Math.abs(toFileIndex - fromFileIndex);

        if (fileDistance === 2) {
          // This is a castling move
          const isKingside = toFileIndex > fromFileIndex;
          const rookFrom = isKingside
            ? isWhiteTurn
              ? "h1"
              : "h8"
            : isWhiteTurn
              ? "a1"
              : "a8";
          const rookTo = isKingside
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
            rookFrom,
            rookTo,
          };
        }
      }

      return { from: fromSquare, to: toSquare, piece: pieceNotation };
    } else {
      // Try the opposite case if the first attempt fails
      const oppositeCase =
        pieceType === pieceType.toUpperCase()
          ? pieceType.toLowerCase()
          : pieceType.toUpperCase();
      pieceNotation = createPieceNotation(oppositeCase);

      if (boardPiece === pieceNotation) {
        // Check if this is a king move of 2 squares - treat as castling
        if (pieceType.toUpperCase() === "K") {
          const fromFileIndex = fromSquare.charCodeAt(0) - "a".charCodeAt(0);
          const toFileIndex = toSquare.charCodeAt(0) - "a".charCodeAt(0);
          const fileDistance = Math.abs(toFileIndex - fromFileIndex);

          if (fileDistance === 2) {
            // This is a castling move
            const isKingside = toFileIndex > fromFileIndex;
            const rookFrom = isKingside
              ? isWhiteTurn
                ? "h1"
                : "h8"
              : isWhiteTurn
                ? "a1"
                : "a8";
            const rookTo = isKingside
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
              rookFrom,
              rookTo,
            };
          }
        }

        return { from: fromSquare, to: toSquare, piece: pieceNotation };
      }
    }
  }

  // Handle king moves that might be castling (e.g., Kg1, Kc1, Kg8, Kc8)
  if (moveText.match(/^K[a-h][1-8]$/)) {
    const toSquare = moveText.substring(1);
    const isWhiteTurn = position.turn === PLAYER_COLORS.WHITE;

    if (isWhiteTurn) {
      // Check if this is a castling move for white
      if (toSquare === "g1") {
        // Kingside castling
        return {
          from: "e1",
          to: "g1",
          piece: PIECES.WHITE_KING,
          special: "castling",
          rookFrom: "h1",
          rookTo: "f1",
        };
      } else if (toSquare === "c1") {
        // Queenside castling
        return {
          from: "e1",
          to: "c1",
          piece: PIECES.WHITE_KING,
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
          piece: PIECES.BLACK_KING,
          special: "castling",
          rookFrom: "h8",
          rookTo: "f8",
        };
      } else if (toSquare === "c8") {
        // Queenside castling
        return {
          from: "e8",
          to: "c8",
          piece: PIECES.BLACK_KING,
          special: "castling",
          rookFrom: "a8",
          rookTo: "d8",
        };
      }
    }
  }

  // Handle piece moves (SAN like 'Nd7', 'Bxe4', with optional disambiguation)
  const pieceMatch = moveText.match(
    /^([KQRBNPkqrbnp])([a-h]?[1-8]?)?x?([a-h][1-8])([+#])?$/,
  );
  if (pieceMatch) {
    const rawPieceType = pieceMatch[1];
    const disambiguation = pieceMatch[2] || "";
    const toSquare = pieceMatch[3];

    // SAN uses uppercase letters for both colors; color is determined by side to move.
    // Normalize type to uppercase and then set case by turn.
    const normalizedType = rawPieceType.toUpperCase();
    const pieceNotation = createPieceNotation(
      isWhiteTurn ? normalizedType : normalizedType.toLowerCase(),
    );

    // Try to find a matching piece from this side that can reach the square with optional disambiguation
    let fromSquare = findFromSquareWithDisambiguation(
      pieceNotation,
      toSquare,
      disambiguation,
      currentFEN,
    );

    // As a fallback, try the opposite case only if input explicitly provided lowercase/uppercase mismatching SAN conventions
    if (!fromSquare && rawPieceType !== normalizedType) {
      const oppositeNotation = createPieceNotation(
        isWhiteTurn ? normalizedType.toLowerCase() : normalizedType,
      );
      fromSquare = findFromSquareWithDisambiguation(
        oppositeNotation,
        toSquare,
        disambiguation,
        currentFEN,
      );
      if (fromSquare) {
        return { from: fromSquare, to: toSquare, piece: oppositeNotation };
      }
    }

    if (fromSquare) {
      return { from: fromSquare, to: toSquare, piece: pieceNotation };
    }
  }

  // Handle pawn captures (both white and black)
  if (moveText.match(/^[a-h]x[a-h][1-8]$/)) {
    const fromFile = moveText[0]; // The disambiguation file (e.g., 'd' in 'dxe6')
    const toSquare = moveText.substring(2);
    const position = parseFEN(currentFEN);
    const isWhiteTurn = position.turn === PLAYER_COLORS.WHITE;

    // Try both colors to handle ambiguous cases
    let fromSquare: string | null = null;
    let piece: string = "";

    // Try the current player's pawn first
    const currentPlayerPawn = isWhiteTurn
      ? PIECES.WHITE_PAWN
      : PIECES.BLACK_PAWN;
    const currentPlayerRank = isWhiteTurn ? 2 : 7; // Start with typical starting rank
    const currentPlayerFromSquare = `${fromFile}${currentPlayerRank}`;
    const [currentRank, currentFile] = squareToCoords(currentPlayerFromSquare);
    if (
      currentRank >= 0 &&
      currentRank < 8 &&
      currentFile >= 0 &&
      currentFile < 8
    ) {
      const currentPiece = position.board[currentRank][currentFile];
      if (currentPiece === currentPlayerPawn) {
        fromSquare = currentPlayerFromSquare;
        piece = currentPlayerPawn;
      }
    }

    // Try the other player's pawn if current player's pawn not found
    if (!fromSquare) {
      const otherPlayerPawn = isWhiteTurn
        ? PIECES.BLACK_PAWN
        : PIECES.WHITE_PAWN;
      const otherPlayerRank = isWhiteTurn ? 7 : 2; // Opposite starting rank
      const otherPlayerFromSquare = `${fromFile}${otherPlayerRank}`;
      const [otherRank, otherFile] = squareToCoords(otherPlayerFromSquare);
      if (otherRank >= 0 && otherRank < 8 && otherFile >= 0 && otherFile < 8) {
        const otherPiece = position.board[otherRank][otherFile];
        if (otherPiece === otherPlayerPawn) {
          fromSquare = otherPlayerFromSquare;
          piece = otherPlayerPawn;
        }
      }
    }

    // If still not found, try more sophisticated inference based on the destination square
    if (!fromSquare) {
      const toRank = parseInt(toSquare[1]);

      // For black pawns (moving down), look for pawns on higher ranks
      if (!isWhiteTurn) {
        for (let rank = toRank + 1; rank <= 7; rank++) {
          const inferredSquare = `${fromFile}${rank}`;
          const [inferredRank, inferredFile] = squareToCoords(inferredSquare);
          if (
            inferredRank >= 0 &&
            inferredRank < 8 &&
            inferredFile >= 0 &&
            inferredFile < 8
          ) {
            const inferredPiece = position.board[inferredRank][inferredFile];
            if (inferredPiece === PIECES.BLACK_PAWN) {
              fromSquare = inferredSquare;
              piece = PIECES.BLACK_PAWN;
              break;
            }
          }
        }
      } else {
        // For white pawns (moving up), look for pawns on lower ranks
        for (let rank = toRank - 1; rank >= 2; rank--) {
          const inferredSquare = `${fromFile}${rank}`;
          const [inferredRank, inferredFile] = squareToCoords(inferredSquare);
          if (
            inferredRank >= 0 &&
            inferredRank < 8 &&
            inferredFile >= 0 &&
            inferredFile < 8
          ) {
            const inferredPiece = position.board[inferredRank][inferredFile];
            if (inferredPiece === PIECES.WHITE_PAWN) {
              fromSquare = inferredSquare;
              piece = PIECES.WHITE_PAWN;
              break;
            }
          }
        }
      }
    }

    if (fromSquare) {
      return { from: fromSquare, to: toSquare, piece };
    }
  }

  // Extra debug context to trace upstream generators
  if (justThrow)
    throw new Error(
      `Failed to parse move: ${moveText} from FEN: ${currentFEN}`,
    );
  console.trace(
    `[parseMove] Failed to parse move: ${moveText} from FEN: ${currentFEN}`,
  );

  // Emit a global event so higher-level logic can backtrack (e.g., bypass cache)
  try {
    if (typeof window !== "undefined" && window.dispatchEvent) {
      window.dispatchEvent(
        new CustomEvent("move-parse-failed", {
          detail: { move: moveText, fen: currentFEN },
        }),
      );
    }
  } catch {}

  return null;
}

/**
 * Parse game notation into moves
 */
export function parseGameNotation(
  notation: string,
  initialFEN: string,
): ChessMove[] {
  // Clean the notation
  let cleanNotation = notation
    .replace(/\{[^}]*\}/g, "") // Remove comments
    .replace(/\([^)]*\)/g, "") // Remove annotations
    .replace(/\$\d+/g, "") // Remove evaluation symbols
    .replace(/[!?]+/g, "") // Remove move annotations
    .replace(/\d+\./g, "") // Remove move numbers
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();

  console.log("Cleaned notation:", cleanNotation);

  const moves: ChessMove[] = [];
  const tokens = cleanNotation.split(/\s+/);

  // Apply moves sequentially to maintain board context
  let currentFEN = initialFEN;

  for (const token of tokens) {
    if (
      !token ||
      token === "1-0" ||
      token === "0-1" ||
      token === "1/2-1/2" ||
      token === "*"
    ) {
      continue;
    }

    const move = parseMove(token, currentFEN);
    if (move) {
      // Determine move effects using the move validator
      const position = parseFEN(currentFEN);
      const validationResult = validateMove(position, move);

      if (validationResult.isValid) {
        // Add effect information to the move
        move.effect = validationResult.effect;
        moves.push(move);
        // Apply move to current FEN for next iteration
        currentFEN = applyMoveToFEN(currentFEN, move);
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
