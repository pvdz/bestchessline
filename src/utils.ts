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
import {
  PIECE_TYPES,
} from "./utils/notation-utils.js";



export function getPieceColor(piece: PieceNotation): ColorNotation {
  return piece === piece.toUpperCase()
    ? createColorNotation("w")
    : createColorNotation("b");
}



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





























/**
 * Get the starting player from a FEN string
 */
export function getStartingPlayer(fen: string): PlayerColor {
  const position = parseFEN(fen);
  return position.turn;
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
