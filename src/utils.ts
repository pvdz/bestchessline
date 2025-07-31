import {
  ChessPosition,
  ChessMove,
  Square,
  NotationFormat,
  PieceFormat,
  PieceTypeNotation,
  ColorNotation,
  PieceNotation,
  createPieceTypeNotation,
  createColorNotation,
  createPieceNotation,
  getPieceTypeFromNotation,
  getColorFromNotation,
  PLAYER_COLORS,
  PlayerColor,
} from "./types.js";
import { logError } from "./utils/logging.js";
import {
  parseFEN,
  toFEN,
  squareToCoords,
  coordsToSquare,
} from "./utils/fen-utils.js";
import {
  canPieceMoveTo,
  canPawnMoveTo,
  canRookMoveTo,
  canKnightMoveTo,
  canBishopMoveTo,
  canQueenMoveTo,
  canKingMoveTo,
  selectCorrectMove,
} from "./utils/move-parser.js";



export function getPieceColor(piece: PieceNotation): ColorNotation {
  return piece === piece.toUpperCase()
    ? createColorNotation("w")
    : createColorNotation("b");
}

// Constants for piece types (uppercase, used for type matching)
export const PIECE_TYPES = {
  KING: createPieceTypeNotation("K"),
  QUEEN: createPieceTypeNotation("Q"),
  ROOK: createPieceTypeNotation("R"),
  BISHOP: createPieceTypeNotation("B"),
  KNIGHT: createPieceTypeNotation("N"),
  PAWN: createPieceTypeNotation("P"),
} as const;

export function getPieceType(piece: PieceNotation): PieceTypeNotation {
  return createPieceTypeNotation(piece.toUpperCase());
}

/**
 * Format a score with proper mate notation using mateIn
 * @param score The score in centipawns
 * @param mateIn The number of moves required for mate (0 if not a mate)
 * @returns Formatted score string
 */
export function formatScoreWithMateIn(score: number, mateIn: number): string {
  if (mateIn > 0) {
    // Mate in X moves
    return score > 0 ? `+M${mateIn}` : `-M${mateIn}`;
  } else if (Math.abs(score) >= 10000) {
    // Mate but mateIn is 0 (shouldn't happen, but fallback. or maybe that's just the current board state? #)
    return score > 0 ? `+#` : `-#`;
  } else {
    // Regular score in pawns
    const scoreInPawns = score / 100;
    return score > 0
      ? `+${scoreInPawns.toFixed(1)}`
      : `${scoreInPawns.toFixed(1)}`;
  }
}

export function formatTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

// Global variable to store current move index
let globalCurrentMoveIndex = -1;

/**
 * Set the global current move index
 */
export function setGlobalCurrentMoveIndex(moveIndex: number): void {
  globalCurrentMoveIndex = moveIndex;
}

/**
 * Get the global current move index
 */
export function getGlobalCurrentMoveIndex(): number {
  return globalCurrentMoveIndex;
}

/**
 * Get FEN with correct move counter based on current move index
 */
export function getFENWithCorrectMoveCounter(
  boardFEN: string,
  currentMoveIndex: number,
  castling?: string,
  enPassant?: string | null,
): string {
  const position = parseFEN(boardFEN);

  // Calculate the correct move number based on current move index
  const correctMoveNumber = Math.floor(currentMoveIndex / 2) + 1;

  // Create new position with correct move number and optional castling/en-passant
  const correctedPosition: ChessPosition = {
    ...position,
    fullMoveNumber: correctMoveNumber,
    castling: castling !== undefined ? castling : position.castling,
    enPassant: enPassant !== undefined ? enPassant : position.enPassant,
  };

  return toFEN(correctedPosition);
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Chess notation utilities
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
 * Apply a chess move to a FEN string and return the new FEN
 */
export function applyMoveToFEN(fen: string, move: ChessMove): string {
  const position = parseFEN(fen);
  const [fromRank, fromFile] = squareToCoords(move.from);
  const [toRank, toFile] = squareToCoords(move.to);

  // Create new board
  const newBoard = position.board.map((row) => [...row]);
  newBoard[toRank][toFile] = newBoard[fromRank][fromFile];
  newBoard[fromRank][fromFile] = "";

  // Handle special moves
  if (move.special === "castling") {
    if (move.rookFrom && move.rookTo) {
      const [rookFromRank, rookFromFile] = squareToCoords(move.rookFrom);
      const [rookToRank, rookToFile] = squareToCoords(move.rookTo);
      newBoard[rookToRank][rookToFile] = newBoard[rookFromRank][rookFromFile];
      newBoard[rookFromRank][rookFromFile] = "";
    }
  }

  // Update castling rights
  let newCastling = position.castling;

  // Remove castling rights when king moves
  if (move.piece.toUpperCase() === PIECE_TYPES.KING) {
    if (move.piece === "K") {
      // White king moved
      newCastling = newCastling.replace(/[KQ]/g, "");
    } else {
      // Black king moved
      newCastling = newCastling.replace(/[kq]/g, "");
    }
  }

  // Remove castling rights when rooks move
  if (move.piece.toUpperCase() === PIECE_TYPES.ROOK) {
    if (move.from === "a1") newCastling = newCastling.replace("Q", "");
    if (move.from === "h1") newCastling = newCastling.replace("K", "");
    if (move.from === "a8") newCastling = newCastling.replace("q", "");
    if (move.from === "h8") newCastling = newCastling.replace("k", "");
  }

  // Update en passant
  let newEnPassant = null;
  if (move.piece.toUpperCase() === PIECE_TYPES.PAWN) {
    const [fromRank, fromFile] = squareToCoords(move.from);
    const [toRank, toFile] = squareToCoords(move.to);

    // Check if it's a double pawn move
    if (Math.abs(fromRank - toRank) === 2) {
      const enPassantRank = fromRank + (toRank > fromRank ? 1 : -1);
      newEnPassant = coordsToSquare(enPassantRank, fromFile);
    }
  } else {
    // Clear en passant for non-pawn moves
    newEnPassant = null;
  }

  // Update position
  const newPosition: ChessPosition = {
    ...position,
    board: newBoard,
    turn:
      position.turn === PLAYER_COLORS.WHITE
        ? PLAYER_COLORS.BLACK
        : PLAYER_COLORS.WHITE,
    castling: newCastling || "-",
    enPassant: newEnPassant,
  };

  return toFEN(newPosition);
}

















/**
 * Get the starting player from a FEN string
 */
export function getStartingPlayer(fen: string): PlayerColor {
  const position = parseFEN(fen);
  return position.turn;
}

/**
 * Compare two analysis moves for sorting. The moves should always be for the same player
 * from the same position, maybe even the same piece (with different targets).
 * Mate is always the best move. When two moves mate or have same score, use consistent ordering.
 *
 * @param a First analysis move. Score is negative if in favor of black, otherwise in favor of white
 * @param b Second analysis move. Score is negative if in favor of black, otherwise in favor of white
 * @param currentPlayer The player whose turn it is ("w" for white, "b" for black)
 * @returns Negative if a should come before b, positive if b should come before a, 0 if equal
 */
export function compareAnalysisMoves(
  a: { score: number; depth: number; mateIn: number },
  b: { score: number; depth: number; mateIn: number },
  direction: "asc" | "desc" = "desc",
): number {
  // Determine if moves are mate moves (|score| > 9000 indicates mate)
  const aIsMate = Math.abs(a.score) > 9000;
  const bIsMate = Math.abs(b.score) > 9000;

  // Handle mate moves with highest priority
  if (aIsMate && !bIsMate) return -1; // a is mate, b is not
  if (!aIsMate && bIsMate) return 1; // b is mate, a is not
  if (aIsMate && bIsMate) {
    // Both are mate moves, prefer shorter mates (lower mateIn value)
    return a.mateIn - b.mateIn;
  }

  // Prefer scores that have been checked deeper. Neither is mate so then it's just a move.
  if (a.depth !== b.depth) return b.depth - a.depth;

  // Both are non-mate moves, sort by score based on direction
  if (direction === "asc") {
    // Ascending order: low to high scores (good for black's turn)
    return a.score - b.score;
  } else {
    // Descending order: high to low scores (good for white's turn)
    return b.score - a.score;
  }
}



/**
 * Calculate total positions with overrides
 */
export function calculateTotalPositionsWithOverrides(
  maxDepth: number,
  responderResponses: number,
  firstReplyOverride: number = 0,
  secondReplyOverride: number = 0,
): number {
  if (responderResponses === 1) {
    // Special case: if n=1, it's just maxDepth + 1
    return maxDepth + 1;
  }

  let total = 1; // Start with root node

  for (let i = 1; i <= maxDepth; i++) {
    let nextN = responderResponses;
    if (i === 0) nextN = firstReplyOverride || responderResponses;
    else if (i === 1) nextN = secondReplyOverride || responderResponses;

    total += 2 * Math.pow(nextN, i);
  }

  return total;
}

/**
 * Show a toast notification
 * @param message The message to display
 * @param background The background color (default: #333)
 * @param duration How long to show (ms, default: 4000)
 */
export function showToast(
  message: string,
  background = "#333",
  duration = 4000,
) {
  const toast = document.createElement("div");
  toast.textContent = message;
  toast.style.position = "fixed";
  toast.style.bottom = "64px";
  toast.style.left = "50%";
  toast.style.transform = "translateX(-50%)";
  toast.style.background = background;
  toast.style.color = "#fff";
  toast.style.padding = "8px 16px";
  toast.style.borderRadius = "6px";
  toast.style.zIndex = "9999";
  toast.style.fontWeight = "bold";
  toast.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), duration);
}
