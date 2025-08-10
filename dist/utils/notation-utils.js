import { createPieceNotation, createColorNotation } from "../line/types.js";
import { parseFEN } from "./fen-utils.js";
import { parseMove } from "./move-parsing.js";
import { applyMoveToFEN } from "./fen-manipulation.js";
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
};
/**
 * Convert a chess move to notation
 */
export function moveToNotation(
  move,
  format = "short",
  pieceFormat = "unicode",
  fen,
) {
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
    // Handle castling first
    if (move.special === "castling") {
      const fromFileIndex = move.from.charCodeAt(0) - "a".charCodeAt(0);
      const toFileIndex = move.to.charCodeAt(0) - "a".charCodeAt(0);
      const isKingside = toFileIndex > fromFileIndex;
      return isKingside ? "O-O" : "O-O-O";
    }
    // Detect castling moves for kings (king moves 2 squares)
    if (piece === PIECE_TYPES.KING) {
      const fromFileIndex = move.from.charCodeAt(0) - "a".charCodeAt(0);
      const toFileIndex = move.to.charCodeAt(0) - "a".charCodeAt(0);
      const fileDistance = Math.abs(toFileIndex - fromFileIndex);
      if (fileDistance === 2) {
        // This is a castling move
        const isKingside = toFileIndex > fromFileIndex;
        return isKingside ? "O-O" : "O-O-O";
      }
    }
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
export function getPieceSymbol(type, color, format = "unicode") {
  if (format === "english") {
    return type;
  }
  // Safety checks for undefined values
  if (!type || !color) {
    console.warn("getPieceSymbol: Invalid type or color", { type, color });
    return "?";
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
  const colorKey = color;
  const typeKey = type;
  // Check if both color and type are valid
  if (symbols[colorKey] && symbols[colorKey][typeKey]) {
    return symbols[colorKey][typeKey];
  }
  // Fallback to type if symbol not found
  console.warn("getPieceSymbol: Symbol not found", {
    type,
    color,
    typeKey,
    colorKey,
  });
  return type;
}
/**
 * Convert a principal variation (PV) to notation
 */
export function pvToNotation(
  pv,
  format = "short",
  pieceFormat = "unicode",
  fen,
) {
  if (pv.length === 0) return "";
  // Process moves in the context of the actual position
  const moves = pv.map((move, _index) => {
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
function getPieceType(piece) {
  return piece.toUpperCase();
}
/**
 * Helper function to get piece color from notation
 */
function getPieceColor(piece) {
  return piece === piece.toUpperCase()
    ? createColorNotation("w")
    : createColorNotation("b");
}
/**
 * Convert raw move (e.g., "b8c6") to short algebraic notation (e.g., "Nc6")
 * This is needed because Stockfish returns raw moves but parseMove expects SAN
 */
export const rawMoveToSAN = (rawMove, fen) => {
  if (rawMove.length !== 4) return rawMove; // Not a raw move, return as-is
  const from = rawMove.substring(0, 2);
  const to = rawMove.substring(2, 4);
  // Handle castling FIRST
  if ((from === "e1" && to === "g1") || (from === "e8" && to === "g8"))
    return "O-O";
  if ((from === "e1" && to === "c1") || (from === "e8" && to === "c8"))
    return "O-O-O";
  // If from and to are the same, return raw move
  if (from === to) return rawMove;
  // Parse the position to get piece information
  const position = parseFEN(fen);
  const board = position.board;
  // Convert square to coordinates
  const fileToIndex = (file) => file.charCodeAt(0) - "a".charCodeAt(0);
  const rankToIndex = (rank) => 8 - parseInt(rank);
  const fromFile = fileToIndex(from[0]);
  const fromRank = rankToIndex(from[1]);
  const toFile = fileToIndex(to[0]);
  const toRank = rankToIndex(to[1]);
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
  const piece = board[fromRank][fromFile];
  if (!piece) return rawMove; // No piece at square, return as-is
  // Check if destination is occupied (capture)
  const destPiece = board[toRank][toFile];
  const isCapture = destPiece && destPiece !== "";
  // If it's a pawn move, handle pawn-specific logic
  if (piece === "P" || piece === "p") {
    if (from[0] === to[0]) {
      // Same file (e.g., e2e4 -> e4)
      return to;
    } else {
      // Different file (capture)
      return `${from[0]}x${to}`;
    }
  }
  // Convert piece to SAN notation
  const pieceMap = {
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
  const pieceLetter = pieceMap[piece] || "";
  if (isCapture) {
    return `${pieceLetter}x${to}`;
  } else {
    return `${pieceLetter}${to}`;
  }
};
/**
 * Convert SAN move to long notation (from-to square format)
 * @param sanMove - The SAN move (e.g., "Nf3", "dxe6")
 * @param fen - The current FEN position
 * @returns The long notation move (e.g., "g1f3", "d5e6") or null if parsing fails
 */
export function sanToLongNotation(sanMove, fen) {
  try {
    const parsedMove = parseMove(sanMove, fen);
    if (parsedMove) {
      return `${parsedMove.from}${parsedMove.to}`;
    }
    return null;
  } catch (error) {
    console.warn(
      `Failed to convert SAN to long notation: "${sanMove}" in "${fen}"`,
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
export function convertLineToLongNotation(sanLine, startingFEN) {
  // Remove move numbers and comments
  const cleanLine = sanLine
    .replace(/\d+\./g, "")
    .replace(/\s*\/\/.*$/, "")
    .trim();
  const moves = cleanLine.split(/\s+/).filter((move) => move.length > 0);
  return convertSANLineToLongNotation(moves, startingFEN);
}
/**
 * Convert a line of SAN moves to long notation with piece names and move numbers
 * @param sanMoves - Array of SAN moves (e.g., ["Nf3", "Nf6", "d4"])
 * @param startingFEN - Starting FEN position
 * @returns String with long notation moves (e.g., "1. Ng1f3 g8f6 2. d2d4 d7d5")
 */
export function convertSANLineToLongNotation(sanMoves, startingFEN) {
  let currentFEN = startingFEN;
  const longMoves = [];
  let moveNumber = 1;
  let whiteMove = "";
  for (let i = 0; i < sanMoves.length; i++) {
    const move = sanMoves[i];
    try {
      // Handle castling moves specially
      if (move === "O-O" || move === "O-O-O") {
        const longMove = move; // Keep castling notation as-is
        // Determine if this is white's move (even index) or black's move (odd index)
        if (i % 2 === 0) {
          // White's move
          whiteMove = longMove;
          if (i === sanMoves.length - 1) {
            // Last move and it's white's turn - add the move number and white move
            longMoves.push(`${moveNumber}. ${whiteMove}`);
          }
        } else {
          // Black's move - add the move number and both moves
          longMoves.push(`${moveNumber}. ${whiteMove} ${longMove}`);
          moveNumber++;
          whiteMove = "";
        }
        // Apply castling move to FEN
        const parsedMove = parseMove(move, currentFEN);
        if (parsedMove) {
          currentFEN = applyMoveToFEN(currentFEN, parsedMove);
        }
        continue;
      }
      const parsedMove = parseMove(move, currentFEN);
      if (parsedMove) {
        // Get piece name (always capital)
        const pieceName = getPieceCapitalized(parsedMove.piece);
        const longMove = `${pieceName}${parsedMove.from}${parsedMove.to}`;
        // Determine if this is white's move (even index) or black's move (odd index)
        if (i % 2 === 0) {
          // White's move
          whiteMove = longMove;
          if (i === sanMoves.length - 1) {
            // Last move and it's white's turn - add the move number and white move
            longMoves.push(`${moveNumber}. ${whiteMove}`);
          }
        } else {
          // Black's move - add the move number and both moves
          longMoves.push(`${moveNumber}. ${whiteMove} ${longMove}`);
          moveNumber++;
          whiteMove = "";
        }
        currentFEN = applyMoveToFEN(currentFEN, parsedMove);
      } else {
        console.warn(
          `convertSANLineToLongNotation: Failed to parse move: ${move}`,
          "starting at",
          [startingFEN],
          "step",
          i,
          " while applying this line:",
          sanMoves,
        );
        // Skip this move if we can't parse it
      }
    } catch (error) {
      console.warn(`Error parsing move ${move}:`, error);
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
export function getPieceCapitalized(piece) {
  const pieceMap = {
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
//# sourceMappingURL=notation-utils.js.map
