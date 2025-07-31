import {
  ChessMove,
  PLAYER_COLORS,
  createPieceNotation,
} from "../types.js";
import { parseFEN } from "./fen-utils.js";
import { findFromSquare, findFromSquareWithDisambiguation } from "./move-parser.js";
import { validateMove, PIECES } from "../move-validator.js";
import { log } from "./logging.js";
import { applyMoveToFEN } from "./fen-manipulation.js";

/**
 * Move Parsing Utility Functions
 * 
 * Provides functions for parsing chess notation, importing games,
 * and converting between different move formats.
 */

/**
 * Parse individual move from algebraic notation
 */
export function parseMove(moveText: string, currentFEN: string): ChessMove | null {
  log("Parsing move:", moveText, "from FEN:", currentFEN);

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
    const piece = isWhiteTurn ? PIECES.WHITE_PAWN : PIECES.BLACK_PAWN;
    const fromSquare = findFromSquare(piece, toSquare, currentFEN);
    if (fromSquare) {
      return { from: fromSquare, to: toSquare, piece };
    }
  }

  // Handle pawn captures (both white and black)
  if (moveText.match(/^[a-h]x[a-h][1-8]$/)) {
    const fromFile = moveText[0];
    const toSquare = moveText.substring(2);
    const piece = isWhiteTurn ? PIECES.WHITE_PAWN : PIECES.BLACK_PAWN;
    const fromSquare = findFromSquare(piece, toSquare, currentFEN);
    if (fromSquare) {
      return { from: fromSquare, to: toSquare, piece };
    }
  }

  // Handle piece moves
  const pieceMatch = moveText.match(
    /^([KQRBN])([a-h]?[1-8]?)?x?([a-h][1-8])([+#])?$/,
  );
  if (pieceMatch) {
    const pieceType = pieceMatch[1];
    const disambiguation = pieceMatch[2] || "";
    const toSquare = pieceMatch[3];
    const pieceNotation = createPieceNotation(
      isWhiteTurn ? pieceType : pieceType.toLowerCase(),
    );
    const fromSquare = findFromSquareWithDisambiguation(
      pieceNotation,
      toSquare,
      disambiguation,
      currentFEN,
    );
    if (fromSquare) {
      const piece = isWhiteTurn ? pieceType : pieceType.toLowerCase();
      return { from: fromSquare, to: toSquare, piece };
    }
  }

  console.log("Failed to parse move:", moveText);
  return null;
}

/**
 * Parse game notation into moves
 */
export function parseGameNotation(notation: string, initialFEN: string): ChessMove[] {
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