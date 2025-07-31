import {
  ChessMove,
  NotationFormat,
  PieceFormat,
  PieceTypeNotation,
  ColorNotation,
  PieceNotation,
  createPieceNotation,
  createColorNotation,
} from "../types.js";
import { parseFEN } from "./fen-utils.js";

/**
 * Chess Notation Utility Functions
 *
 * Provides functions for converting chess moves to various notation formats,
 * handling piece symbols, and formatting principal variations (PV).
 */

// Constants for piece types (uppercase, used for type matching)
export const PIECE_TYPES = {
  KING: "K",
  QUEEN: "Q",
  ROOK: "R",
  BISHOP: "B",
  KNIGHT: "N",
  PAWN: "P",
} as const;

/**
 * Convert a chess move to notation
 */
export function moveToNotation(
  move: ChessMove,
  format: NotationFormat = "short",
  pieceFormat: PieceFormat = "unicode",
  fen?: string,
): string {
  const pieceNotation = createPieceNotation(move.piece);
  const piece = getPieceType(pieceNotation);
  const color = getPieceColor(pieceNotation);

  if (!piece || !color) return `${move.from}-${move.to}`;

  const pieceSymbol = getPieceSymbol(piece, color, pieceFormat);

  if (format === "long") {
    return `${pieceSymbol}${move.from}-${move.to}`;
  } else {
    // Standard algebraic notation
    let notation = "";

    if (piece === PIECE_TYPES.PAWN) {
      // Pawn moves
      if (move.from.charAt(0) === move.to.charAt(0)) {
        // Same file (e.g., e2e4 -> e4)
        notation = move.to;
      } else {
        // Capture (e.g., e2d3 -> exd3)
        notation = `${move.from.charAt(0)}x${move.to}`;
      }
    } else {
      // Piece moves
      const pieceChar = pieceFormat === "unicode" ? pieceSymbol : piece;
      // Check if it's a capture by looking at the target square or move effect
      let isCapture = false;

      if (move.effect?.isCapture) {
        isCapture = true;
      } else if (fen) {
        const position = parseFEN(fen);
        const toRank = 8 - parseInt(move.to[1]);
        const toFile = move.to.charCodeAt(0) - "a".charCodeAt(0);
        const targetPiece = position.board[toRank][toFile];
        isCapture = Boolean(targetPiece && targetPiece !== "");
      }

      if (isCapture) {
        notation = `${pieceChar}x${move.to}`;
      } else {
        notation = `${pieceChar}${move.to}`;
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
export function getPieceSymbol(
  type: PieceTypeNotation,
  color: ColorNotation,
  format: PieceFormat = "unicode",
): string {
  if (format === "english") {
    return type;
  }

  // Unicode symbols
  const symbols = {
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

  return (
    symbols[color as "w" | "b"][type as "K" | "Q" | "R" | "B" | "N" | "P"] ||
    type
  );
}

/**
 * Convert a principal variation (PV) to notation
 */
export function pvToNotation(
  pv: ChessMove[],
  format: NotationFormat = "short",
  pieceFormat: PieceFormat = "unicode",
  fen?: string,
): string {
  if (pv.length === 0) return "";

  // Process moves in the context of the actual position
  const moves = pv.map((move: ChessMove, index: number) => {
    // For now, use the original position for all moves
    // In a more sophisticated implementation, we'd update the position after each move
    return moveToNotation(move, format, pieceFormat, fen);
  });

  if (format === "long") {
    // Long format: just show the moves with piece symbols
    return moves.join(" ");
  } else {
    // Short format: standard game notation with move numbers
    let result = "";
    for (let i = 0; i < moves.length; i++) {
      if (i % 2 === 0) {
        // White move
        const moveNumber = Math.floor(i / 2) + 1;
        result += `${moveNumber}.${moves[i]}`;
      } else {
        // Black move
        result += ` ${moves[i]}`;
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
function getPieceType(piece: PieceNotation): PieceTypeNotation {
  return piece.toUpperCase() as PieceTypeNotation;
}

/**
 * Helper function to get piece color from notation
 */
function getPieceColor(piece: PieceNotation): ColorNotation {
  return piece === piece.toUpperCase()
    ? createColorNotation("w")
    : createColorNotation("b");
}
